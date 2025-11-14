from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Iterable, List, Optional, Tuple

import json
import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from .models import (
    Ingredient,
    IngredientBatch,
    IngredientConsumption,
    Order,
    ProductionBatch,
    ProductionBatchOrder,
    ProductionWindowConfig,
)

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - Python <3.9 fallback
    from backports.zoneinfo import ZoneInfo  # type: ignore

User = get_user_model()
logger = logging.getLogger(__name__)


class ProductionError(Exception):
    """Base exception for production workflow."""


class InsufficientStockError(ProductionError):
    def __init__(self, shortages, requirements):
        super().__init__("Insufficient stock for batch production.")
        self.shortages = shortages
        self.requirements = requirements


class DisabledIngredientError(ProductionError):
    def __init__(self, disabled_details, requirements):
        super().__init__("Disabled ingredients present in production batch.")
        self.disabled_details = disabled_details
        self.requirements = requirements


@dataclass
class IngredientLot:
    batch_id: int
    available_quantity: Decimal
    expiry_date: Optional[str]
    received_date: Optional[str]


@dataclass
class IngredientRequirement:
    ingredient: Ingredient
    required_quantity: Decimal
    available_quantity: Decimal
    shortage_quantity: Decimal
    lots: List[IngredientLot]


@dataclass
class BatchRequirements:
    requirements: List[IngredientRequirement]
    shortages: List[IngredientRequirement]
    disabled: List[Dict]
    warnings: List[str]

    @property
    def can_produce(self) -> bool:
        return not self.shortages


class ProductionService:
    def __init__(self):
        self.config = ProductionWindowConfig.load()
        self._tz = self._resolve_timezone(self.config.timezone)

    @staticmethod
    def _serialize_decimal(value: Decimal) -> str:
        return str(Decimal(value))

    def _snapshot_orders(self, batch: ProductionBatch) -> List[Dict]:
        assignments = (
            batch.batch_orders.select_related("order", "order__user", "assigned_by")
            .prefetch_related("order__items", "order__items__product")
            .order_by("sequence", "order_id")
        )
        if not assignments:
            return []
        from .serializers import ProductionBatchOrderSerializer

        serializer = ProductionBatchOrderSerializer(assignments, many=True)
        data = serializer.data
        return json.loads(json.dumps(data))

    def _build_requirements_payload(
        self,
        requirements: BatchRequirements,
        *,
        timestamp: Optional[timezone.datetime] = None,
        can_produce_override: Optional[bool] = None,
        status: Optional[str] = None,
    ) -> Dict:
        ingredients_payload = []
        shortages_payload = []
        seen_disabled = set()
        disabled_payload = []

        for req in requirements.requirements:
            ingredients_payload.append(
                {
                    "ingredient_id": req.ingredient.id,
                    "ingredient_name": req.ingredient.name,
                    "unit_of_measurement": req.ingredient.unit_of_measurement,
                    "required_quantity": self._serialize_decimal(req.required_quantity),
                    "available_quantity": self._serialize_decimal(req.available_quantity),
                    "shortage_quantity": self._serialize_decimal(req.shortage_quantity),
                    "lots": [
                        {
                            "ingredient_batch_id": lot.batch_id,
                            "available_quantity": self._serialize_decimal(lot.available_quantity),
                            "expiry_date": lot.expiry_date,
                            "received_date": lot.received_date,
                        }
                        for lot in req.lots
                    ],
                }
            )

        shortage_ids = {req.ingredient.id for req in requirements.shortages}
        for entry in ingredients_payload:
            if entry["ingredient_id"] in shortage_ids:
                shortages_payload.append(entry)

        for detail in requirements.disabled:
            key = (detail.get("ingredient_id"), detail.get("reason"))
            if key in seen_disabled:
                continue
            seen_disabled.add(key)
            disabled_payload.append(detail)

        payload = {
            "ingredients": ingredients_payload,
            "shortages": shortages_payload,
            "disabled": disabled_payload,
            "warnings": requirements.warnings,
            "requires_disabled_override": bool(disabled_payload),
            "generated_at": (timestamp or timezone.now()).isoformat(),
        }
        if status:
            payload["status"] = status

        if can_produce_override is not None:
            payload["can_produce"] = can_produce_override
        else:
            payload["can_produce"] = not payload["shortages"] and not payload["requires_disabled_override"]

        return payload
    def build_requirements_payload(
        self,
        requirements: BatchRequirements,
        *,
        timestamp: Optional[timezone.datetime] = None,
        can_produce_override: Optional[bool] = None,
        status: Optional[str] = None,
    ) -> Dict:
        return self._build_requirements_payload(
            requirements,
            timestamp=timestamp,
            can_produce_override=can_produce_override,
            status=status,
        )

    @staticmethod
    def _resolve_timezone(tz_name: str):
        if not tz_name:
            return timezone.get_current_timezone()
        try:
            return ZoneInfo(tz_name)
        except Exception:
            return timezone.get_current_timezone()

    def _local_now(self):
        return timezone.now().astimezone(self._tz)

    def calculate_window_for(self, reference: Optional[timezone.datetime] = None) -> Tuple[timezone.datetime, timezone.datetime]:
        reference = reference or timezone.now()
        if timezone.is_naive(reference):
            reference = timezone.make_aware(reference, timezone=self._tz)
        else:
            reference = reference.astimezone(self._tz)

        start_time = self.config.default_start_time
        end_time = self.config.default_end_time

        window_start = reference.replace(
            hour=start_time.hour,
            minute=start_time.minute,
            second=getattr(start_time, "second", 0),
            microsecond=0,
        )

        if reference.time() < start_time:
            window_start = window_start - timezone.timedelta(days=1)

        if start_time <= end_time:
            window_end = window_start.replace(
                hour=end_time.hour,
                minute=end_time.minute,
                second=getattr(end_time, "second", 59),
                microsecond=999999,
            )
            if window_end <= window_start:
                window_end = window_end + timezone.timedelta(days=1)
        else:
            window_end = window_start + timezone.timedelta(days=1)
            window_end = window_end.replace(
                hour=end_time.hour,
                minute=end_time.minute,
                second=getattr(end_time, "second", 59),
                microsecond=999999,
            )

        default_tz = timezone.get_default_timezone()
        window_start = window_start.astimezone(default_tz)
        window_end = window_end.astimezone(default_tz)
        return window_start, window_end

    def get_or_create_batch_for_reference(self, reference: Optional[timezone.datetime] = None, user: Optional[User] = None) -> ProductionBatch:
        window_start, window_end = self.calculate_window_for(reference)
        defaults = {}
        if user:
            defaults["created_by"] = user
        batch, _ = ProductionBatch.objects.get_or_create(
            window_start=window_start,
            window_end=window_end,
            defaults=defaults,
        )
        return batch

    @transaction.atomic
    def assign_order_to_batch(
        self,
        order: Order,
        *,
        user: Optional[User] = None,
        target_batch: Optional[ProductionBatch] = None,
        reference: Optional[timezone.datetime] = None,
    ) -> ProductionBatch:
        if target_batch is None:
            target_batch = self.get_or_create_batch_for_reference(reference or order.created_at, user=user)

        existing_count = ProductionBatchOrder.objects.filter(batch=target_batch).count()

        assignment, created = ProductionBatchOrder.objects.get_or_create(
            order=order,
            defaults={
                "batch": target_batch,
                "sequence": existing_count,
                "assigned_by": user,
            },
        )

        update_fields = []
        if not created:
            if assignment.batch_id != target_batch.id:
                assignment.batch = target_batch
                assignment.sequence = existing_count
                update_fields.extend(["batch", "sequence"])
            if user and assignment.assigned_by_id != getattr(user, "id", None):
                assignment.assigned_by = user
                update_fields.append("assigned_by")
            if update_fields:
                assignment.assigned_at = timezone.now()
                update_fields.append("assigned_at")
        else:
            assignment.assigned_at = timezone.now()
            assignment.save(update_fields=["assigned_at"])

        if update_fields:
            assignment.save(update_fields=update_fields)

        if order.production_batch_id != target_batch.id:
            order.production_batch = target_batch
            order.production_batch_assigned_at = timezone.now()
            order.production_batch_assigned_by = user
            order.save(update_fields=["production_batch", "production_batch_assigned_at", "production_batch_assigned_by"])

        # Recalculate requirements snapshot whenever an order is assigned
        self.recalculate_and_save_batch_requirements(target_batch)

        return target_batch

    def _collect_adjustments(self, assignment: Optional[ProductionBatchOrder]) -> Dict[str, Dict]:
        if not assignment or not assignment.adjustment_payload:
            return {}
        payload = assignment.adjustment_payload
        return payload.get("order_items", {}) if isinstance(payload, dict) else {}

    def _prefetch_orders(self, batch: ProductionBatch) -> Iterable[Order]:
        orders = (
            Order.objects.filter(production_batch=batch)
            .select_related("batch_assignment")
            .prefetch_related(
                "items__product__product_ingredients__ingredient",
            )
        )
        return orders

    def calculate_requirements(self, batch: ProductionBatch) -> BatchRequirements:
        today_local = self._local_now().date()
        ingredient_totals: Dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
        ingredient_objs: Dict[int, Ingredient] = {}
        warnings: List[str] = []
        disabled_details: List[Dict] = []

        orders = self._prefetch_orders(batch)

        for order in orders:
            assignment = getattr(order, "batch_assignment", None)
            adjustments = self._collect_adjustments(assignment)
            
            for item in order.items.all():
                adjusted = adjustments.get(str(item.id)) or adjustments.get(str(item.product_id)) or {}
                skip_flag = bool(adjusted.get("skip"))
                if skip_flag:
                    # We will still include ingredients for visibility, but mark warning and do not exclude from totals
                    warnings.append(
                        f"Order {order.id} item {item.id} marked skipped; showing ingredients regardless."
                    )
                # Use adjusted quantity if provided and valid, otherwise fall back to item.quantity
                adj_q = adjusted.get("quantity", None)
                if adj_q is None or adj_q == "":
                    quantity = Decimal(item.quantity or 0)
                else:
                    try:
                        quantity = Decimal(str(adj_q))
                    except Exception:
                        quantity = Decimal(item.quantity or 0)
                
                if quantity <= 0:
                    continue
                
                product = item.product
                for recipe in product.product_ingredients.all():
                    if recipe.quantity is None:
                        continue
                    
                    required_amount = Decimal(recipe.quantity) * quantity
                    if required_amount <= 0:
                        continue
                    
                    ingredient_objs[recipe.ingredient_id] = recipe.ingredient
                    ingredient_disabled = not getattr(recipe.ingredient, "is_active", True)
                    recipe_disabled = not recipe.is_enabled
                    
                    if ingredient_disabled or recipe_disabled:
                        disabled_details.append(
                            {
                                "ingredient_id": recipe.ingredient_id,
                                "ingredient": recipe.ingredient.name,
                                "product": product.name,
                                "order_id": order.id,
                                "reason": "ingredient_disabled" if ingredient_disabled else "recipe_disabled",
                            }
                        )
                        continue
                    
                    # Always accumulate ingredients for requirements calculation
                    ingredient_totals[recipe.ingredient_id] += required_amount

        if not ingredient_totals:
            logger.warning(f"Batch {batch.id} has no ingredient requirements calculated (empty totals)")
            return BatchRequirements(requirements=[], shortages=[], disabled=disabled_details, warnings=warnings)

        ingredient_ids = list(ingredient_totals.keys())

        lot_queryset = (
            IngredientBatch.objects.filter(ingredient_id__in=ingredient_ids, current_quantity__gt=0)
            .order_by("expiry_date", "received_date", "id")
            .select_related("ingredient")
        )

        lots_map: Dict[int, List[IngredientLot]] = defaultdict(list)
        available_map: Dict[int, Decimal] = defaultdict(lambda: Decimal("0"))

        for lot in lot_queryset:
            if lot.expiry_date and lot.expiry_date < today_local:
                continue
            available = Decimal(lot.current_quantity or 0)
            if available <= 0:
                continue
            available_map[lot.ingredient_id] += available
            lots_map[lot.ingredient_id].append(
                IngredientLot(
                    batch_id=lot.id,
                    available_quantity=available,
                    expiry_date=str(lot.expiry_date) if lot.expiry_date else None,
                    received_date=lot.received_date.isoformat() if lot.received_date else None,
                )
            )

        requirements: List[IngredientRequirement] = []
        shortages: List[IngredientRequirement] = []

        for ingredient_id, required in ingredient_totals.items():
            ingredient = ingredient_objs.get(ingredient_id) or Ingredient.objects.get(pk=ingredient_id)
            available = available_map.get(ingredient_id, Decimal("0"))
            shortage = required - available
            shortage = shortage if shortage > 0 else Decimal("0")
            lots = lots_map.get(ingredient_id, [])
            requirement = IngredientRequirement(
                ingredient=ingredient,
                required_quantity=required,
                available_quantity=available,
                shortage_quantity=shortage,
                lots=lots,
            )
            requirements.append(requirement)
            if shortage > 0:
                shortages.append(requirement)

        return BatchRequirements(
            requirements=requirements,
            shortages=shortages,
            disabled=disabled_details,
            warnings=warnings,
        )

    @transaction.atomic
    def produce_batch(
        self,
        batch: ProductionBatch,
        *,
        user: User,
        allow_disabled: bool = False,
    ) -> BatchRequirements:
        if batch.status == ProductionBatch.STATUS_COMPLETED:
            raise ProductionError("Batch already produced.")
        if batch.status == ProductionBatch.STATUS_CANCELLED:
            raise ProductionError("Batch already cancelled.")

        snapshot_time = timezone.now()
        requirements = self.calculate_requirements(batch)

        if requirements.disabled and not allow_disabled:
            raise DisabledIngredientError(requirements.disabled, requirements)
        if requirements.shortages:
            raise InsufficientStockError(requirements.shortages, requirements)

        requirements_snapshot = self._build_requirements_payload(
            requirements,
            status=ProductionBatch.STATUS_COMPLETED,
            can_produce_override=False,
        )
        orders_snapshot = self._snapshot_orders(batch)

        today_local = self._local_now().date()

        for requirement in requirements.requirements:
            remaining = requirement.required_quantity
            if remaining <= 0:
                continue
            lots = (
                IngredientBatch.objects.select_for_update()
                .filter(ingredient=requirement.ingredient, current_quantity__gt=0)
                .order_by("expiry_date", "received_date", "id")
            )
            for lot in lots:
                if lot.expiry_date and lot.expiry_date < today_local:
                    continue
                available = Decimal(lot.current_quantity or 0)
                if available <= 0:
                    continue
                to_use = min(available, remaining)
                if to_use <= 0:
                    continue
                lot.reduce(to_use)
                lot.save(update_fields=["current_quantity"])
                IngredientConsumption.objects.create(
                    production_batch=batch,
                    ingredient=requirement.ingredient,
                    ingredient_batch=lot,
                    quantity_used=to_use,
                )
                remaining -= to_use
                if remaining <= 0:
                    break

            if remaining > 0:
                raise InsufficientStockError([requirement], requirements)

        batch.status = ProductionBatch.STATUS_COMPLETED
        batch.produced_at = snapshot_time
        batch.produced_by = user
        batch.requirements_snapshot = requirements_snapshot
        batch.requirements_snapshot_captured_at = snapshot_time
        batch.orders_snapshot = orders_snapshot
        batch.orders_snapshot_captured_at = snapshot_time
        batch.save(
            update_fields=[
                "status",
                "produced_at",
                "produced_by",
                "requirements_snapshot",
                "requirements_snapshot_captured_at",
                "orders_snapshot",
                "orders_snapshot_captured_at",
            ]
        )

        return requirements

    @transaction.atomic
    def cancel_batch(self, batch: ProductionBatch, *, user: User, reason: str = "") -> Optional[ProductionBatch]:
        if batch.status != ProductionBatch.STATUS_COMPLETED:
            raise ProductionError("Only completed batches can be cancelled.")
        if batch.status == ProductionBatch.STATUS_CANCELLED:
            return None

        snapshot_time = timezone.now()
        requirements = self.calculate_requirements(batch)
        requirements_snapshot = self._build_requirements_payload(
            requirements,
            status=ProductionBatch.STATUS_CANCELLED,
            can_produce_override=False,
        )
        orders_snapshot = self._snapshot_orders(batch)

        consumptions = (
            IngredientConsumption.objects.select_for_update()
            .filter(production_batch=batch)
            .select_related("ingredient_batch")
        )

        for consumption in consumptions:
            lot = consumption.ingredient_batch
            if not lot:
                continue
            lot.current_quantity = (Decimal(lot.current_quantity or 0) + Decimal(consumption.quantity_used or 0))
            max_qty = Decimal(lot.quantity_received or 0)
            if lot.current_quantity > max_qty:
                lot.current_quantity = max_qty
            lot.save(update_fields=["current_quantity"])

        batch.status = ProductionBatch.STATUS_CANCELLED
        batch.cancelled_at = snapshot_time
        batch.cancelled_by = user
        batch.cancelled_reason = reason
        batch.requirements_snapshot = requirements_snapshot
        batch.requirements_snapshot_captured_at = snapshot_time
        batch.orders_snapshot = orders_snapshot
        batch.orders_snapshot_captured_at = snapshot_time
        batch.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancelled_reason",
                "requirements_snapshot",
                "requirements_snapshot_captured_at",
                "orders_snapshot",
                "orders_snapshot_captured_at",
            ]
        )

        orders_to_reassign = list(batch.orders.select_related("batch_assignment").all())
        if not orders_to_reassign:
            return None

        new_batch = ProductionBatch.objects.create(
            window_start=batch.window_start,
            window_end=batch.window_end,
            status=ProductionBatch.STATUS_PENDING,
            created_by=user,
            notes=(batch.notes or "") + ("\n" if batch.notes else "") + "Recreated automatically after cancellation.",
        )

        for order in orders_to_reassign:
            self.assign_order_to_batch(order, user=user, target_batch=new_batch, reference=batch.window_start)

        return new_batch

    def recalculate_and_save_batch_requirements(self, batch: ProductionBatch):
        """Calculates and saves the requirements snapshot for a given batch."""
        if batch.status != ProductionBatch.STATUS_PENDING:
            return

        requirements = self.calculate_requirements(batch)
        payload = self.build_requirements_payload(requirements)
        batch.requirements_snapshot = payload
        batch.requirements_snapshot_captured_at = timezone.now()
        batch.save(update_fields=["requirements_snapshot", "requirements_snapshot_captured_at"])

    @transaction.atomic
    def move_order(self, order: Order, target_batch: ProductionBatch, *, user: Optional[User] = None):
        original_batch = order.production_batch

        self.assign_order_to_batch(order, user=user, target_batch=target_batch)

        # Recalculate requirements for both batches outside the initial transaction
        # to ensure the order's move is committed first.
        self.recalculate_and_save_batch_requirements(target_batch)
        if original_batch and original_batch.id != target_batch.id:
            self.recalculate_and_save_batch_requirements(original_batch)

    def annotate_batches(self, queryset):
        return queryset.annotate(orders_count=Count("batch_orders__order", distinct=True))

    def get_pending_batch_for_today(self, user: Optional[User] = None) -> ProductionBatch:
        reference = timezone.now()
        batch = self.get_or_create_batch_for_reference(reference, user=user)
        return batch

    def get_or_create_next_batch(self, batch: ProductionBatch, user: Optional[User] = None) -> ProductionBatch:
        reference = batch.window_end or batch.window_start
        if reference is None:
            reference = timezone.now()
        if timezone.is_naive(reference):
            reference = timezone.make_aware(reference, timezone=timezone.get_default_timezone())
        reference = reference + timezone.timedelta(minutes=1)
        return self.get_or_create_batch_for_reference(reference, user=user)


__all__ = [
    "ProductionService",
    "ProductionError",
    "InsufficientStockError",
    "DisabledIngredientError",
    "BatchRequirements",
    "IngredientRequirement",
]
