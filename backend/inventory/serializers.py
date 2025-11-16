from decimal import Decimal
from rest_framework import serializers
import json

from .models import (
    Ingredient,
    Supplier,
    IngredientSupplier,
    Product,
    ProductIngredient,
    Cart,
    CartItem,
    ResupplyOrder,
    ResupplyOrderItem,
    IngredientBatch,
    Order,
    OrderItem,
    Sale,
    CheckoutSession,
    ProductionWindowConfig,
    ProductionBatch,
    ProductionBatchOrder,
    IngredientConsumption,
    PAYMENT_METHOD_CHOICES,
    PAYMENT_STATUS_CHOICES,
)


class IngredientSerializer(serializers.ModelSerializer):
    total_stock = serializers.DecimalField(max_digits=18, decimal_places=3, read_only=True)
    next_expiry_date = serializers.DateField(read_only=True)

    class Meta:
        model = Ingredient
        fields = ["id", "name", "unit_of_measurement", "default_unit_price", "restock_level", "is_active", "category", "total_stock", "next_expiry_date"]


class SupplierIngredientDetailSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)
    id = serializers.IntegerField(read_only=True)
    supplier = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = IngredientSupplier
        fields = ["id", "supplier", "ingredient", "price", "is_active"]


class SupplierSerializer(serializers.ModelSerializer):
    ingredients_supplied = SupplierIngredientDetailSerializer(
        source="ingredient_suppliers", many=True, read_only=True
    )

    class Meta:
        model = Supplier
        fields = "__all__"


class IngredientSupplierSerializer(serializers.ModelSerializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    ingredient_detail = IngredientSerializer(source="ingredient", read_only=True)

    class Meta:
        model = IngredientSupplier
        fields = ["id", "supplier", "ingredient", "ingredient_detail", "price", "is_active"]


class ProductIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="ingredient.name")

    class Meta:
        model = ProductIngredient
        fields = ["name", "quantity", "uom", "is_enabled"]


class ProductSerializer(serializers.ModelSerializer):
    ingredients = ProductIngredientReadSerializer(source="product_ingredients", many=True, read_only=True)
    ingredient_items = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "status", "description", "image", "ingredients", "ingredient_items"]

    def _get_or_create_ingredient(self, name):
        return Ingredient.objects.get_or_create(name=name, defaults={
            "unit_of_measurement": "piece",
            "restock_level": Decimal("0"),
        })[0]

    def _set_items(self, product, items):
        ProductIngredient.objects.filter(product=product).delete()
        bulk = []
        for item in items or []:
            name = (item.get("name") or "").strip()
            if not name:
                continue
            ing = self._get_or_create_ingredient(name)
            quantity = item.get("quantity")
            uom = (item.get("uom") or "").strip()
            is_enabled = item.get("is_enabled", True)
            bulk.append(
                ProductIngredient(
                    product=product,
                    ingredient=ing,
                    quantity=quantity,
                    uom=uom,
                    is_enabled=is_enabled,
                )
            )
        if bulk:
            ProductIngredient.objects.bulk_create(bulk)

    def create(self, validated_data):
        items_json = validated_data.pop("ingredient_items", "[]")
        try:
            items = json.loads(items_json) if items_json else []
        except json.JSONDecodeError:
            items = []
        product = super().create(validated_data)
        self._set_items(product, items)
        return product

    def update(self, instance, validated_data):
        items_json = validated_data.pop("ingredient_items", None)
        try:
            items = json.loads(items_json) if items_json else []
        except json.JSONDecodeError:
            items = []
        product = super().update(instance, validated_data)
        if items_json is not None:
            self._set_items(product, items)
        return product


class ResupplyOrderItemSerializer(serializers.ModelSerializer):
    # don't require 'order' when creating nested items
    order = serializers.PrimaryKeyRelatedField(read_only=True)

    # accept frontend payload that may send "quantity" by mapping it to quantity_ordered
    quantity = serializers.DecimalField(
        max_digits=12, decimal_places=3, write_only=True, required=False, source="quantity_ordered"
    )

    ingredient_detail = IngredientSerializer(source="ingredient", read_only=True)
    quantity_ordered = serializers.DecimalField(max_digits=12, decimal_places=3, required=False)
    
    quantity_received = serializers.SerializerMethodField()

    def get_quantity_received(self, obj):
        return obj.quantity_received
        
    is_fully_received = serializers.BooleanField(read_only=True)

    class Meta:
        model = ResupplyOrderItem
        fields = [
            "id",
            "order",
            "ingredient",
            "ingredient_detail",
            "quantity",            # write-only alias accepted from frontend
            "quantity_ordered",
            "quantity_received",
            "is_fully_received",
        ]

class ResupplyOrderSerializer(serializers.ModelSerializer):
    # allow requests that create the order first (items optional on initial create)
    items = ResupplyOrderItemSerializer(many=True, required=False)
    supplier_detail = SupplierSerializer(source="supplier", read_only=True)

    class Meta:
        model = ResupplyOrder
        fields = ["id", "supplier", "supplier_detail", "status", "order_date", "items"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order = ResupplyOrder.objects.create(**validated_data)
        for item_data in items_data:
            ResupplyOrderItem.objects.create(order=order, **item_data)
        return order


class IngredientBatchSerializer(serializers.ModelSerializer):
    ingredient_detail = IngredientSerializer(source="ingredient", read_only=True)

    class Meta:
        model = IngredientBatch
        fields = [
            "id", "ingredient", "ingredient_detail", "order_item",
            "quantity_received", "current_quantity", "expiry_date",
            "received_date", "supplier_batch_code"
        ]
        read_only_fields = ["id", "received_date"]

    def validate(self, data):
        # Get values from data or instance (for partial updates)
        current_quantity = data.get('current_quantity', getattr(self.instance, 'current_quantity', None))
        quantity_received = data.get('quantity_received', getattr(self.instance, 'quantity_received', None))
        if current_quantity is not None and quantity_received is not None:
            if current_quantity > quantity_received:
                raise serializers.ValidationError({
                    "current_quantity": "current_quantity cannot exceed quantity_received"
                })
        return data



class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, source='product')
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        price = obj.product.price or 0
        return float(price) * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_price", "created_at"]

    def get_total_price(self, obj):
        return float(sum((item.product.price or 0) * item.quantity for item in obj.items.all()))


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, source='product')
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "quantity", "price_at_purchase", "subtotal"]

    def get_subtotal(self, obj):
        return float(obj.price_at_purchase * obj.quantity)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    production_batch = serializers.PrimaryKeyRelatedField(read_only=True)
    production_batch_assigned_by_username = serializers.CharField(source="production_batch_assigned_by.username", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "created_at",
            "total_price",
            "payment_method",
            "payment_status",
            "address",
            "status",
            "payment_reference",
            "items",
            "is_temporary",
            "paymongo_payment_intent_id",
            "paymongo_payment_method_id",
            "paymongo_client_key",
            "paymongo_status",
            "production_batch",
            "production_batch_assigned_at",
            "production_batch_assigned_by",
            "production_batch_assigned_by_username",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "items",
            "production_batch",
            "production_batch_assigned_at",
            "production_batch_assigned_by",
            "production_batch_assigned_by_username",
        ]


class CheckoutSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PAYMENT_METHOD_CHOICES)
    address = serializers.CharField(max_length=500)
    selected_items = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)


class SaleSerializer(serializers.ModelSerializer):
    order_details = OrderSerializer(source='order', read_only=True)
    handled_by_name = serializers.CharField(source='handled_by.username', read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id", "order", "order_details", "total_paid", "payment_method", "payment_status",
            "payment_reference", "payment_date", "handled_by", "handled_by_name", "notes"
        ]
        read_only_fields = ["id", "order", "total_paid", "payment_date", "handled_by"]


class PaymentConfirmSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PAYMENT_METHOD_CHOICES)
    payment_status = serializers.ChoiceField(choices=PAYMENT_STATUS_CHOICES)
    payment_reference = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class CheckoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckoutSession
        fields = "__all__"
        read_only_fields = ("id", "paymongo_session_id", "status", "created_at", "metadata")


class ProductionWindowConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionWindowConfig
        fields = ["default_start_time", "default_end_time", "timezone", "allow_custom_windows"]


class ProductionBatchOrderSerializer(serializers.ModelSerializer):
    order_detail = OrderSerializer(source="order", read_only=True)
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True)

    class Meta:
        model = ProductionBatchOrder
        fields = [
            "id",
            "batch",
            "order",
            "order_detail",
            "sequence",
            "adjustment_payload",
            "notes",
            "assigned_at",
            "assigned_by",
            "assigned_by_username",
        ]
        read_only_fields = ["id", "assigned_at", "assigned_by", "assigned_by_username"]


class ProductionBatchListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for batch list views.
    For pending batches, recalculates requirements to ensure real-time accuracy.
    For non-pending batches, reads from pre-calculated requirements_snapshot.
    """
    orders_count = serializers.SerializerMethodField()
    has_disabled_items = serializers.SerializerMethodField()
    has_disabled_products = serializers.SerializerMethodField()
    has_disabled_ingredients = serializers.SerializerMethodField()
    disabled_product_count = serializers.SerializerMethodField()
    disabled_ingredient_count = serializers.SerializerMethodField()
    has_only_expired_stock = serializers.SerializerMethodField()
    
    def _get_requirements_payload(self, obj):
        """Get requirements payload, recalculating for pending batches to ensure freshness"""
        # For pending batches, always recalculate to get real-time data
        # This ensures expired stock indicators update immediately
        if obj.status == ProductionBatch.STATUS_PENDING:
            try:
                from .production import ProductionService
                service = ProductionService()
                req = service.calculate_requirements(obj)
                return service.build_requirements_payload(req)
            except Exception:
                # Fallback to snapshot if recalculation fails
                if obj.requirements_snapshot:
                    return obj.requirements_snapshot
                return {}
        
        # For non-pending batches, use snapshot
        if obj.requirements_snapshot:
            return obj.requirements_snapshot
        return {}

    class Meta:
        model = ProductionBatch
        fields = [
            "id",
            "window_start",
            "window_end",
            "status",
            "orders_count",
            "has_disabled_items",
            "has_disabled_products",
            "has_disabled_ingredients",
            "disabled_product_count",
            "disabled_ingredient_count",
            "has_only_expired_stock",
        ]

    def get_orders_count(self, obj):
        """Read from annotation or snapshot - no query"""
        annotated = getattr(obj, "orders_count", None)
        if annotated is not None:
            return annotated
        if obj.orders_snapshot:
            return len(obj.orders_snapshot)
        return 0

    def get_has_disabled_items(self, obj):
        """Check if there are any disabled items (products or ingredients)"""
        payload = self._get_requirements_payload(obj)
        disabled_list = payload.get("disabled", [])
        return len(disabled_list) > 0

    def get_has_disabled_products(self, obj):
        """Check for disabled products"""
        payload = self._get_requirements_payload(obj)
        disabled_list = payload.get("disabled", [])
        return any(item.get("reason") == "product_disabled" for item in disabled_list)

    def get_has_disabled_ingredients(self, obj):
        """Check for disabled ingredients"""
        payload = self._get_requirements_payload(obj)
        disabled_list = payload.get("disabled", [])
        return any(item.get("reason") in ("ingredient_disabled", "recipe_disabled") for item in disabled_list)

    def get_disabled_product_count(self, obj):
        """Count unique disabled products"""
        payload = self._get_requirements_payload(obj)
        disabled_list = payload.get("disabled", [])
        unique_products = {
            item.get("product") for item in disabled_list 
            if item.get("reason") == "product_disabled" and item.get("product")
        }
        return len(unique_products)

    def get_disabled_ingredient_count(self, obj):
        """Count unique disabled ingredients"""
        payload = self._get_requirements_payload(obj)
        disabled_list = payload.get("disabled", [])
        unique_ingredients = {
            item.get("ingredient") for item in disabled_list 
            if item.get("ingredient") and item.get("reason") in ("ingredient_disabled", "recipe_disabled")
        }
        return len(unique_ingredients)

    def get_has_only_expired_stock(self, obj):
        """Check for expired stock, recalculating for pending batches to ensure real-time accuracy"""
        payload = self._get_requirements_payload(obj)
        return payload.get("has_only_expired_stock", False)


class ProductionBatchSerializer(serializers.ModelSerializer):
    produced_by_username = serializers.CharField(source="produced_by.username", read_only=True)
    cancelled_by_username = serializers.CharField(source="cancelled_by.username", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    orders_count = serializers.SerializerMethodField()
    has_disabled_items = serializers.SerializerMethodField()
    has_disabled_products = serializers.SerializerMethodField()
    has_disabled_ingredients = serializers.SerializerMethodField()
    disabled_product_count = serializers.SerializerMethodField()
    disabled_ingredient_count = serializers.SerializerMethodField()
    has_only_expired_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductionBatch
        fields = [
            "id",
            "window_start",
            "window_end",
            "status",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_username",
            "produced_at",
            "produced_by",
            "produced_by_username",
            "cancelled_at",
            "cancelled_by",
            "cancelled_by_username",
            "cancelled_reason",
            "notes",
            "requirements_snapshot",
            "requirements_snapshot_captured_at",
            "orders_snapshot",
            "orders_snapshot_captured_at",
            "orders_count",
            "has_disabled_items",
            "has_disabled_products",
            "has_disabled_ingredients",
            "disabled_product_count",
            "disabled_ingredient_count",
            "has_only_expired_stock",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_username",
            "produced_at",
            "produced_by",
            "produced_by_username",
            "cancelled_at",
            "cancelled_by",
            "cancelled_by_username",
            "requirements_snapshot",
            "requirements_snapshot_captured_at",
            "orders_snapshot",
            "orders_snapshot_captured_at",
            "orders_count",
            "has_disabled_items",
            "has_disabled_products",
            "has_disabled_ingredients",
            "disabled_product_count",
            "disabled_ingredient_count",
            "has_only_expired_stock",
        ]

    def get_orders_count(self, obj):
        annotated = getattr(obj, "orders_count", None)
        if obj.orders_snapshot:
            return len(obj.orders_snapshot)
        if annotated is not None:
            return annotated
        return obj.orders.count()

    def _requirements_payload(self, obj):
        snap = obj.requirements_snapshot
        if isinstance(snap, dict):
            return snap
        # Only compute for pending batches to avoid expensive recalculation for historical ones
        if obj.status == obj.STATUS_PENDING:
            try:
                from .production import ProductionService
                service = ProductionService()
                req = service.calculate_requirements(obj)
                return service.build_requirements_payload(req)
            except Exception:
                return {}
        return {}

    def get_has_disabled_items(self, obj):
        payload = self._requirements_payload(obj)
        disabled = payload.get("disabled", [])
        return bool(disabled)

    def get_has_disabled_products(self, obj):
        payload = self._requirements_payload(obj)
        disabled = payload.get("disabled", [])
        return any(item.get("reason") == "product_disabled" for item in disabled)

    def get_has_disabled_ingredients(self, obj):
        payload = self._requirements_payload(obj)
        disabled = payload.get("disabled", [])
        return any(item.get("reason") in ("ingredient_disabled", "recipe_disabled") for item in disabled)

    def get_disabled_product_count(self, obj):
        payload = self._requirements_payload(obj)
        disabled = payload.get("disabled", [])
        unique_products = {
            item.get("product") for item in disabled 
            if item.get("reason") == "product_disabled" and item.get("product")
        }
        return len(unique_products)

    def get_disabled_ingredient_count(self, obj):
        payload = self._requirements_payload(obj)
        disabled = payload.get("disabled", [])
        unique_ingredients = {
            item.get("ingredient") for item in disabled 
            if item.get("ingredient") and item.get("reason") in ("ingredient_disabled", "recipe_disabled")
        }
        return len(unique_ingredients)

    def get_has_only_expired_stock(self, obj):
        payload = self._requirements_payload(obj)
        return payload.get("has_only_expired_stock", False)


class IngredientConsumptionSerializer(serializers.ModelSerializer):
    ingredient_detail = IngredientSerializer(source="ingredient", read_only=True)
    ingredient_batch_detail = IngredientBatchSerializer(source="ingredient_batch", read_only=True)

    class Meta:
        model = IngredientConsumption
        fields = [
            "id",
            "production_batch",
            "ingredient",
            "ingredient_detail",
            "ingredient_batch",
            "ingredient_batch_detail",
            "quantity_used",
            "recorded_at",
            "unit_cost_snapshot",
        ]
        read_only_fields = ["id", "recorded_at"]