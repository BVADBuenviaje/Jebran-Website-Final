import json
import logging
import requests
import re
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
)

from .models import (
    Ingredient,
    Supplier,
    IngredientSupplier,
    Product,
    Cart,
    CartItem,
    ResupplyOrder,
    ResupplyOrderItem,
    IngredientBatch,
    Order,
    OrderItem,
    Sale,
    CheckoutSession,
    PAYMENT_STATUS_CHOICES,
)
from .serializers import (
    IngredientSerializer,
    SupplierSerializer,
    IngredientSupplierSerializer,
    ProductSerializer,
    CartSerializer,
    CartItemSerializer,
    ResupplyOrderSerializer,
    ResupplyOrderItemSerializer,
    IngredientBatchSerializer,
    OrderSerializer,
    SaleSerializer,
    CheckoutSerializer,
    CheckoutSessionSerializer,
    PaymentConfirmSerializer,
)
from .services import PayMongoService

logger = logging.getLogger(__name__)


class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "unit_of_measurement", "category"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "category"]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "email"]
    filterset_fields = ["is_active"]

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        supplier = self.get_object()
        supplier.is_active = False
        supplier.save()
        return Response(self.get_serializer(supplier).data)

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        supplier = self.get_object()
        supplier.is_active = True
        supplier.save()
        return Response(self.get_serializer(supplier).data)


class IngredientSupplierViewSet(viewsets.ModelViewSet):
    queryset = IngredientSupplier.objects.all()
    serializer_class = IngredientSupplierSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["supplier__name", "ingredient__name"]
    filterset_fields = ["supplier", "ingredient", "is_active"]

    @action(detail=False, methods=['post'], url_path='deactivate-by-supplier/(?P<supplier_id>[^/.]+)')
    def deactivate_by_supplier(self, request, supplier_id=None):
        qs = self.get_queryset().filter(supplier_id=supplier_id, is_active=True)
        count = qs.update(is_active=False)
        return Response({'deactivated': count}, status=status.HTTP_200_OK)

    def get_queryset(self):
        queryset = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        return queryset


class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_or_create_cart(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    def list(self, request):
        cart = self._get_or_create_cart(request)
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"], url_path="add")
    def add_item(self, request):
        cart = self._get_or_create_cart(request)
        serializer = CartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", 1)
        item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": quantity})
        if not created:
            item.quantity += quantity
            item.save()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"], url_path="update")
    def update_item(self, request):
        cart = self._get_or_create_cart(request)
        product_id = request.data.get("product_id")
        quantity = request.data.get("quantity")
        if not product_id or quantity is None:
            return Response({"detail": "product_id and quantity required"}, status=400)
        try:
            item = CartItem.objects.get(cart=cart, product_id=product_id)
            item.quantity = quantity
            item.save()
        except CartItem.DoesNotExist:
            return Response({"detail": "Item not found in cart"}, status=404)
        return Response(CartSerializer(cart).data)
        
    @action(detail=False, methods=["post"], url_path="remove")
    def remove_item(self, request):
        cart = self._get_or_create_cart(request)
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id required"}, status=400)
        try:
            item = CartItem.objects.get(cart=cart, product_id=product_id)
            item.delete()
        except CartItem.DoesNotExist:
            return Response({"detail": "Item not found in cart"}, status=404)
        return Response(CartSerializer(cart).data)
    
    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        cart = self._get_or_create_cart(request)
        cart.items.all().delete()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        print("Updating IngredientSupplier for supplier:", serializer.validated_data.get("supplier"))
        serializer.save()

class ResupplyOrderViewSet(viewsets.ModelViewSet):
    queryset = ResupplyOrder.objects.all()
    serializer_class = ResupplyOrderSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["supplier__name"]
    filterset_fields = ["status", "supplier"]

    def perform_create(self, serializer):
        order = serializer.save()

        # build email content
        supplier_email = getattr(order.supplier, "email", None)
        item_lines = [
            f"- {item.ingredient.name}: {getattr(item, 'quantity_ordered', None) or ''} {item.ingredient.unit_of_measurement}"
            for item in order.items.all()
        ]
        subject = "New Resupply Order"
        message = (
            f"Dear {order.supplier.name},\n\n"
            f"You have a new resupply order:\n"
            + "\n".join(item_lines)
            + f"\n\nStatus: {order.status}\nDate: {order.order_date.strftime('%Y-%m-%d %H:%M')}\n\n"
            "Please process this order as soon as possible.\n\nThank you!"
        )

        # send email after transaction commit to ensure order/items exist in DB
        def _send():
            if not supplier_email:
                return
            try:
                send_mail(subject, message, getattr(settings, "DEFAULT_FROM_EMAIL", None), [supplier_email])
            except Exception as exc:
                logger.exception("Failed to send resupply order email to %s: %s", supplier_email, exc)

        try:
            transaction.on_commit(_send)
        except Exception:
            # fallback: try to send directly (will be ignored if fails)
            try:
                _send()
            except Exception:
                logger.exception("Failed to queue/fallback send resupply order email")

    def update(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        old_status = instance.status
        was_delivered = instance.was_delivered
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get("status", instance.status)
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()

        # When order marked Delivered, create IngredientBatch entries for pending qty
        if old_status != "Delivered" and new_status == "Delivered" and not was_delivered:
            for item in instance.items.select_related("ingredient"):
                ordered = getattr(item, "quantity_ordered", None) or Decimal("0")
                received = item.quantity_received or Decimal("0")
                pending = Decimal(ordered) - Decimal(received)
                if pending > 0:
                    IngredientBatch.objects.create(
                        ingredient=item.ingredient,
                        order_item=item,
                        quantity_received=pending,
                        current_quantity=pending,
                        expiry_date=None,
                        supplier_batch_code=None,
                        received_date=timezone.now(),
                    )
            instance.was_delivered = True
            instance.save(update_fields=["was_delivered"])
        return response


class ResupplyOrderItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ResupplyOrderItem.objects.select_related("ingredient", "order").all()
    serializer_class = ResupplyOrderItemSerializer

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        """
        Accepts payload like {"quantity_received": 10, "expiry_date": "2025-11-12"}
        This endpoint:
         - validates requested qty
         - computes pending = quantity_ordered - quantity_received
         - if pending <= 0 or requested <= 0 -> no-op (no batch created), returns 200
         - otherwise creates a batch for the actual amount received (min(requested, pending))
        """
        item = self.get_object()

        # parse incoming quantity (accept different keys for compatibility)
        raw_qty = request.data.get("quantity_received") or request.data.get("quantity") or 0
        try:
            qty_req = Decimal(str(raw_qty))
        except Exception:
            return Response({"quantity_received": ["Invalid number"]}, status=status.HTTP_400_BAD_REQUEST)

        # Do not create zero-quantity batches
        if qty_req <= 0:
            return Response({"detail": "No quantity to receive (must be > 0)."}, status=status.HTTP_200_OK)

        ordered = Decimal(getattr(item, "quantity_ordered", 0) or 0)
        already_received = Decimal(getattr(item, "quantity_received", 0) or 0)
        pending = ordered - already_received

        # If already fully received, do nothing (no new batch)
        if pending <= 0:
            return Response({"detail": "Item already fully received."}, status=status.HTTP_200_OK)

        to_apply = min(qty_req, pending)
        if to_apply <= 0:
            return Response({"detail": "No quantity to record."}, status=status.HTTP_200_OK)

        expiry_date = request.data.get("expiry_date")  # keep existing validation/formatting downstream

        # perform DB updates and batch creation atomically
        with transaction.atomic():
            # REMOVE these lines:
            # item.quantity_received = (already_received + to_apply)
            # item.save(update_fields=["quantity_received"])

            # create ingredient batch only for to_apply > 0
            IngredientBatch.objects.create(
                ingredient=item.ingredient,
                order_item=item,
                quantity_received=to_apply,
                current_quantity=to_apply if hasattr(IngredientBatch, "current_quantity") else None,
                expiry_date=expiry_date,
                supplier_batch_code=None,
                received_date=timezone.now(),
            )

        return Response({"detail": "Received recorded", "received": float(to_apply)}, status=status.HTTP_200_OK)

class IngredientBatchViewSet(viewsets.ModelViewSet):
    queryset = IngredientBatch.objects.select_related("ingredient", "order_item").all()
    serializer_class = IngredientBatchSerializer
    permission_classes = [IsAuthenticated]


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "role", None) == "admin" or user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        data = request.data.copy()

        if getattr(user, "role", None) != "admin" and not user.is_staff:
            allowed = {}
            if "status" in data:
                new_status = data.get("status")
                if new_status != "Cancelled":
                    return Response({"detail": "Only cancellation is allowed."}, status=status.HTTP_400_BAD_REQUEST)
                if instance.status != "Pending":
                    return Response({"detail": "Only pending orders can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
                allowed["status"] = "Cancelled"
            else:
                return Response({"detail": "No updatable fields provided."}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(instance, data=allowed, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # --- Sale sync logic ---
        if "payment_status" in data:
            if data["payment_status"] == "Unpaid":
                # Delete related Sale if it exists
                try:
                    sale = instance.sale
                    sale.delete()
                except Sale.DoesNotExist:
                    pass
            elif data["payment_status"] == "Paid":
                # Create Sale if it doesn't exist
                if not hasattr(instance, "sale"):
                    Sale.objects.create(
                        order=instance,
                        total_paid=instance.total_price,
                        payment_method=instance.payment_method,
                        payment_status="Paid",
                        payment_reference=instance.payment_reference or "",
                        handled_by=request.user if request.user.is_staff else None,
                        notes="Marked as paid via admin",
                    )
# --- End Sale sync logic ---

        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        instance = self.get_object()
        new_status = request.data.get("status")
        if new_status in dict(Order.STATUS_CHOICES):
            instance.status = new_status
            instance.save(update_fields=["status"])
            return Response(self.get_serializer(instance).data)
        return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # This view is simplified; reuse CreateCheckoutSessionAPIView for full flow
        return Response({"detail": "Use create-checkout-session/ endpoint"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="confirm-payment", permission_classes=[IsAuthenticated])
    def confirm_payment(self, request, pk=None):
        order = self.get_object()
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PaymentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            order.payment_method = data["payment_method"]
            order.payment_status = data["payment_status"]
            order.payment_reference = data.get("payment_reference", "") or ""
            order.save(update_fields=["payment_method", "payment_status", "payment_reference"])
            if order.payment_status == "Paid" and not hasattr(order, "sale"):
                Sale.objects.create(
                    order=order,
                    total_paid=order.total_price,
                    payment_method=order.payment_method,
                    payment_status=order.payment_status,
                    payment_reference=order.payment_reference or "",
                    handled_by=request.user if request.user.is_staff else None,
                    notes=data.get("notes", ""),
                )
        return Response({"detail": "Payment updated", "order_id": order.id})

    # --- GCash/PayMongo endpoints below ---

    @action(detail=True, methods=["post"], url_path="create-gcash-payment", permission_classes=[IsAuthenticated])
    def create_gcash_payment(self, request, pk=None):
        """
        Create a GCash payment intent for the order
        """
        order = self.get_object()
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_method != 'GCash':
            return Response({"detail": f"Order is not set for GCash payment. Current method: {order.payment_method}"}, status=status.HTTP_400_BAD_REQUEST)
        if order.payment_status == 'Paid':
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .services import PayMongoService
            paymongo_service = PayMongoService()
            payment_data = paymongo_service.process_gcash_payment(
                amount=str(order.total_price),
                description=f"Order #{order.id} - {order.user.username}",
                order_id=order.id
            )
            order.paymongo_payment_intent_id = payment_data['payment_intent_id']
            order.paymongo_client_key = payment_data['client_key']
            order.paymongo_status = payment_data['status']
            order.payment_status = 'Pending'
            order.save()
            return Response({
                "payment_intent_id": payment_data['payment_intent_id'],
                "client_key": payment_data['client_key'],
                "next_action": payment_data['next_action'],
                "status": payment_data['status']
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="create-gcash-payment-method", permission_classes=[IsAuthenticated])
    def create_gcash_payment_method(self, request, pk=None):
        """
        Create a GCash payment method and get redirect URL
        """
        order = self.get_object()
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_method != 'GCash':
            return Response({"detail": f"Order is not set for GCash payment. Current method: {order.payment_method}"}, status=status.HTTP_400_BAD_REQUEST)
        if order.payment_status == 'Paid':
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .services import PayMongoService
            paymongo_service = PayMongoService()
            client_key = request.data.get('clientKey')
            payment_intent_id = request.data.get('paymentIntentId')
            if not client_key:
                return Response({"detail": "Client key is required"}, status=status.HTTP_400_BAD_REQUEST)
            actual_payment_intent_id = payment_intent_id or order.paymongo_payment_intent_id
            checkout_session = paymongo_service.create_checkout_session(
                amount=float(order.total_price),
                description=f"Order #{order.id} - GCash Payment",
                success_url=f"{settings.FRONTEND_URL}/orders/{order.id}/payment?status=success",
                cancel_url=f"{settings.FRONTEND_URL}/orders/{order.id}/payment?status=failed&reason=payment_failed"
            )
            redirect_url = checkout_session.get('attributes', {}).get('checkout_url')
            return Response({
                "checkout_session_id": checkout_session.get('id'),
                "redirect_url": redirect_url,
                "status": checkout_session.get('attributes', {}).get('status', 'pending'),
                "client_key": client_key,
                "payment_intent_id": actual_payment_intent_id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="verify-payment", permission_classes=[IsAuthenticated])
    def verify_payment(self, request, pk=None):
        """
        Verify payment status with PayMongo
        """
        order = self.get_object()
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        if not getattr(order, "paymongo_payment_intent_id", None):
            return Response({"detail": "No PayMongo payment intent found."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .services import PayMongoService
            paymongo_service = PayMongoService()
            payment_intent = paymongo_service.get_payment_intent(order.paymongo_payment_intent_id)
            paymongo_status = payment_intent['attributes']['status']
            order.paymongo_status = paymongo_status
            if paymongo_status == 'succeeded':
                order.payment_status = 'Paid'
                order.payment_reference = payment_intent['id']
                if not hasattr(order, "sale"):
                    Sale.objects.create(
                        order=order,
                        total_paid=order.total_price,
                        payment_method=order.payment_method,
                        payment_status='Paid',
                        payment_reference=payment_intent['id'],
                        handled_by=request.user if request.user.is_staff else None,
                        notes="Payment processed via PayMongo GCash"
                    )
            elif paymongo_status == 'failed':
                order.payment_status = 'Failed'
            order.save()
            return Response({
                "payment_status": order.payment_status,
                "paymongo_status": paymongo_status,
                "payment_reference": order.payment_reference
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="create-gcash-checkout")
    def create_gcash_checkout(self, request):
        """
        Create GCash checkout session for new orders (before order creation)
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        cart_items = cart.items.all()
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        total_price = sum(item.subtotal for item in cart_items)
        try:
            from .services import PayMongoService
            paymongo_service = PayMongoService()
            checkout_session = paymongo_service.create_checkout_session(
                amount=float(total_price),
                description=f"GCash Payment - ₱{total_price}",
                success_url=f"{settings.FRONTEND_URL}/payment/gcash?status=success",
                cancel_url=f"{settings.FRONTEND_URL}/payment/gcash?status=failed&reason=payment_failed"
            )
            redirect_url = checkout_session.get('attributes', {}).get('checkout_url')
            return Response({
                "checkout_session_id": checkout_session.get('id'),
                "redirect_url": redirect_url,
                "status": checkout_session.get('attributes', {}).get('status', 'pending')
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="create-after-gcash-payment")
    def create_after_gcash_payment(self, request):
        """
        Create order after successful GCash payment
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        cart_items = cart.items.all()
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        total_price = sum(item.subtotal for item in cart_items)
        order = Order.objects.create(
            user=request.user,
            total_price=total_price,
            payment_method='GCash',
            payment_status='Paid',
            address=serializer.validated_data['address'],
            status='Pending'
        )
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price_at_purchase=cart_item.product.price or 0
            )
        cart.items.all().delete()
        Sale.objects.create(
            order=order,
            total_paid=total_price,
            payment_method='GCash',
            payment_status='Paid',
            payment_reference=request.data.get('payment_reference', ''),
            handled_by=None,
            notes="Payment processed via PayMongo GCash"
        )
        order_serializer = OrderSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="confirm-payment-success")
    def confirm_payment_success(self, request, pk=None):
        """
        Confirm payment success for a temporary GCash order.
        Makes the temporary order permanent and marks it as paid.
        """
        try:
            order = self.get_object()
            if not order.is_temporary:
                return Response({"detail": "Order is not temporary"}, status=status.HTTP_400_BAD_REQUEST)
            if order.payment_status != 'Unpaid':
                return Response({"detail": "Order is already paid"}, status=status.HTTP_400_BAD_REQUEST)
            order.is_temporary = False
            order.payment_status = 'Paid'
            order.save(update_fields=['is_temporary', 'payment_status'])
            if not hasattr(order, "sale"):
                Sale.objects.create(
                    order=order,
                    total_paid=order.total_price,
                    payment_method=order.payment_method,
                    payment_status='Paid',
                    payment_reference=order.payment_reference or 'GCash Payment',
                    handled_by=None,
                    notes='Payment confirmed via GCash'
                )
            try:
                cart = Cart.objects.get(user=order.user)
                cart.items.all().delete()
            except Cart.DoesNotExist:
                pass
            order_serializer = OrderSerializer(order)
            return Response({
                "detail": "Payment confirmed successfully",
                "order": order_serializer.data
            }, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path="cancel-temporary")
    def cancel_temporary(self, request, pk=None):
        """
        Cancel and delete a temporary order (e.g., when user goes back or payment fails).
        """
        try:
            order = self.get_object()
            if not order.is_temporary:
                return Response({"detail": "Order is not temporary"}, status=status.HTTP_400_BAD_REQUEST)
            order.delete()
            return Response({"detail": "Temporary order cancelled"}, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SalesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.all().order_by("-payment_date")
    serializer_class = SaleSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["order__user__username", "payment_reference", "notes"]
    filterset_fields = ["payment_method", "payment_status"]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """
        Returns comprehensive sales summary for the last X days (default 7)
        """
        days = int(request.query_params.get("days", 7))
        since = timezone.now() - timedelta(days=days)
        qs = Sale.objects.filter(payment_date__gte=since)

        totals = qs.aggregate(total_revenue=Sum("total_paid"), total_sales=Count("id"))
        by_method = qs.values("payment_method").annotate(
            count=Count("id"),
            revenue=Sum("total_paid")
        )

        by_method_dict = {b["payment_method"]: {"count": b["count"], "revenue": float(b["revenue"] or 0)} for b in by_method}

        return Response({
            "total_revenue": float(totals["total_revenue"] or 0),
            "total_sales": totals["total_sales"] or 0,
            "by_method": by_method_dict
        })

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        """
        Returns detailed sales analytics including trends, top products, etc.
        """
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)
        
        # Daily sales trend
        daily_sales = Sale.objects.filter(payment_date__gte=since).extra(
            select={'day': 'date(payment_date)'}
        ).values('day').annotate(
            revenue=Sum('total_paid'),
            count=Count('id')
        ).order_by('day')

        # Top products by sales
        top_products = OrderItem.objects.filter(
            order__sale__payment_date__gte=since
        ).values('product__name').annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('price_at_purchase')
        ).order_by('-total_quantity')[:10]

        # Sales by status
        sales_by_status = Sale.objects.filter(payment_date__gte=since).values('payment_status').annotate(
            count=Count('id'),
            revenue=Sum('total_paid')
        )

        # Monthly comparison
        current_month = timezone.now().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        
        current_month_sales = Sale.objects.filter(
            payment_date__gte=current_month
        ).aggregate(
            revenue=Sum('total_paid'),
            count=Count('id')
        )
        
        last_month_sales = Sale.objects.filter(
            payment_date__gte=last_month,
            payment_date__lt=current_month
        ).aggregate(
            revenue=Sum('total_paid'),
            count=Count('id')
        )

        return Response({
            "daily_trend": list(daily_sales),
            "top_products": list(top_products),
            "sales_by_status": list(sales_by_status),
            "monthly_comparison": {
                "current_month": {
                    "revenue": float(current_month_sales["revenue"] or 0),
                    "count": current_month_sales["count"] or 0
                },
                "last_month": {
                    "revenue": float(last_month_sales["revenue"] or 0),
                    "count": last_month_sales["count"] or 0
                }
            }
        })

    @action(detail=False, methods=["get"])
    def reports(self, request):
        """
        Generate sales reports with filtering options
        """
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        payment_method = request.query_params.get('payment_method')
        
        qs = Sale.objects.all()
        
        if start_date:
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
            
        # Generate detailed report
        sales_data = qs.select_related('order', 'order__user').order_by('-payment_date')
        
        report_data = []
        for sale in sales_data:
            order_items = sale.order.items.all()
            report_data.append({
                'sale_id': sale.id,
                'order_id': sale.order.id,
                'customer': sale.order.user.username,
                'payment_date': sale.payment_date,
                'payment_method': sale.payment_method,
                'payment_status': sale.payment_status,
                'total_amount': float(sale.total_paid),
                'items': [
                    {
                        'product_name': item.product.name,
                        'quantity': item.quantity,
                        'price': float(item.price_at_purchase),
                        'subtotal': float(item.subtotal)
                    } for item in order_items
                ],
                'payment_reference': sale.payment_reference,
                'notes': sale.notes
            })
        
        return Response({
            'report_data': report_data,
            'summary': {
                'total_sales': len(report_data),
                'total_revenue': sum(item['total_amount'] for item in report_data),
                'date_range': {
                    'start': start_date,
                    'end': end_date
                }
            }
        })


class CreateCheckoutSessionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Expected body:
        {
          "items": [{ "product_id": 1, "name":"...", "quantity":2, "price": 120.00 }, ...],
          "payment_method": "gcash" or "cod",
          "currency": "PHP",
          "success_url": "https://.../success",
          "cancel_url": "https://.../cancel",
          "address": "Shipping address"
        }
        """
        data = request.data
        items = data.get("items", [])
        payment_method = data.get("payment_method", "gcash")
        currency = data.get("currency", "PHP")
        success_url = data.get("success_url")
        cancel_url = data.get("cancel_url")
        address = data.get("address", "")
        
        if not items or not success_url or not cancel_url:
            return Response({
                "detail": "items, success_url and cancel_url required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Calculate amount in centavos (PayMongo expects amount in integer, e.g., PHP 100.00 -> 10000)
        subtotal = sum(Decimal(i.get("price") or 0) * int(i.get("quantity") or 1) for i in items)
        tax = (subtotal * Decimal("0.12")).quantize(Decimal("0.01"))
        shipping = Decimal("50.00") if subtotal > 0 else Decimal("0.00")
        total = (subtotal + tax + shipping).quantize(Decimal("0.01"))
        amount_in_centavos = int((total * 100).to_integral_value())

        # Handle COD flow - create order immediately
        if payment_method.lower() == "cod":
            try:
                # Create order immediately for COD
                order = Order.objects.create(
                    user=request.user,
                    total_price=total,
                    payment_method="COD",
                    payment_status="Unpaid",
                    status="Pending",
                    address=address,
                    is_temporary=False
                )
                
                # Create order items
                for item in items:
                    try:
                        product = Product.objects.get(pk=item.get("product_id"))
                        OrderItem.objects.create(
                            order=order,
                            product=product,
                            quantity=int(item.get("quantity", 1)),
                            price_at_purchase=Decimal(item.get("price", 0))
                        )
                    except Product.DoesNotExist:
                        continue
                
                # Clear cart
                try:
                    cart = Cart.objects.get(user=request.user)
                    cart_items_count = cart.items.count()
                    cart.items.all().delete()
                    logger.info(f"✅ COD cart cleared: {cart_items_count} items removed for user {request.user.id}")
                except Cart.DoesNotExist:
                    logger.info(f"⚠️  No cart found for COD user {request.user.id}")
                    pass
                
                return Response({
                    "order_id": order.id,
                    "message": "COD order created successfully",
                    "redirect_url": f"/orders/{order.id}"
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response({
                    "detail": f"Failed to create COD order: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # For GCash, create CheckoutSession and call PayMongo
        try:
            logger.info(f"🔵 Creating CheckoutSession for user {request.user.id}")
            logger.info(f"🔵 Items: {items}")
            logger.info(f"🔵 Amount: {total}")
            logger.info(f"🔵 Payment method: {payment_method}")
            
            # Create local CheckoutSession first (without paymongo_session_id)
            cs = CheckoutSession.objects.create(
                user=request.user,
                cart_snapshot=items,
                amount=total,
                currency=currency,
                payment_method=payment_method,
                address=address,
            )
            
            logger.info(f"✅ CheckoutSession created: {cs.id}")

            # Build PayMongo payload with tax and shipping
            line_items = []
            
            # Add product items
            for it in items:
                line_items.append({
                    "name": it.get("name") or f"Product {it.get('product_id')}",
                    "amount": int(Decimal(it.get("price") or 0) * 100),
                    "currency": currency,
                    "quantity": int(it.get("quantity") or 1),
                    "description": it.get("name", "")
                })
            
            # Add tax as a line item
            if tax > 0:
                line_items.append({
                    "name": "Tax (12% VAT)",
                    "amount": int(tax * 100),
                    "currency": currency,
                    "quantity": 1,
                    "description": "Value Added Tax"
                })
            
            # Add shipping as a line item
            if shipping > 0:
                line_items.append({
                    "name": "Shipping Fee",
                    "amount": int(shipping * 100),
                    "currency": currency,
                    "quantity": 1,
                    "description": "Delivery fee"
                })

            logger.info(f"🔵 PayMongo line items: {line_items}")
            logger.info(f"🔵 Total amount: {total} PHP ({amount_in_centavos} centavos)")

            # Use PayMongo service
            paymongo_service = PayMongoService()
            checkout_session = paymongo_service.create_checkout_session(
                amount=amount_in_centavos,
                description=f"Order #{cs.id}",
                success_url=success_url,
                cancel_url=cancel_url,
                line_items=line_items
            )

            logger.info(f"✅ PayMongo checkout session created: {checkout_session.get('id')}")

            # Update CheckoutSession with PayMongo data
            cs.paymongo_session_id = checkout_session.get("id")
            cs.metadata = checkout_session
            cs.save(update_fields=["paymongo_session_id", "metadata"])
            
            logger.info(f"✅ CheckoutSession updated with PayMongo ID: {cs.paymongo_session_id}")

            return Response({
                "checkout_url": checkout_session.get("attributes", {}).get("checkout_url"),
                "session_id": checkout_session.get("id"),
                "checkout_session_id": cs.id
            })

        except Exception as e:
            # Clean up local pending session or mark failed
            if 'cs' in locals():
                cs.status = "failed"
                cs.save(update_fields=["status"])
            
            return Response({
                "detail": f"Failed to create PayMongo session: {str(e)}"
            }, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["POST"])
@permission_classes([AllowAny])
def PaymongoWebhookAPIView(request):
    try:
        payload = request.data
        logger.info(f"PayMongo Webhook payload: {json.dumps(payload, indent=2)}")

        event = payload.get("data", {}) or {}
        attrs = event.get("attributes", {}) or {}

        # 1) Correct event type
        event_type = attrs.get("type")  # e.g., "payment.paid"

        # 2) Drill into the payment object
        payment_obj = attrs.get("data", {}) or {}
        payment_attrs = payment_obj.get("attributes", {}) or {}

        status_attr = payment_attrs.get("status")  # "paid"
        payment_intent_id = payment_attrs.get("payment_intent_id")
        description = payment_attrs.get("description")  # e.g., "Order #19"

        logger.info(f"etype={event_type} status={status_attr} pi={payment_intent_id} desc={description}")

        # If you created CheckoutSession with description=f"Order #{cs.id}",
        # you can recover the local CheckoutSession id from description.
        cs_id = None
        if description:
            m = re.search(r"Order\s+#(\d+)", description)
            if m:
                cs_id = int(m.group(1))

        # Try to locate the CheckoutSession
        cs = None
        if cs_id:
            try:
                cs = CheckoutSession.objects.get(id=cs_id)
            except CheckoutSession.DoesNotExist:
                logger.warning(f"No CheckoutSession by id (from description): {cs_id}")

        # (Optional but recommended) if you also store the PayMongo session id or payment_intent_id
        # on CheckoutSession, you can add fallbacks here to resolve cs by those fields.

        # Create order on "payment.paid"
        if event_type == "payment.paid" and status_attr == "paid" and cs:
            if cs.status != "paid":
                order = Order.objects.create(
                    user=cs.user,
                    total_price=cs.amount,
                    payment_method="GCash",
                    payment_status="Paid",
                    status="Pending",
                    address=cs.address,
                    payment_reference=payment_intent_id or cs.paymongo_session_id,
                    is_temporary=False,
                )
                for it in cs.cart_snapshot:
                    product = Product.objects.filter(pk=it.get("product_id")).first()
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=int(it.get("quantity") or 1),
                        price_at_purchase=Decimal(it.get("price") or 0),
                    )
                Sale.objects.create(
                    order=order,
                    total_paid=order.total_price,
                    payment_method="GCash",
                    payment_status="Paid",
                    payment_reference=order.payment_reference,
                    handled_by=None,
                )
                try:
                    cart = Cart.objects.get(user=cs.user)
                    cart.items.all().delete()
                except Cart.DoesNotExist:
                    pass
                cs.status = "paid"
                cs.save(update_fields=["status"])

            return Response({"ok": True})

        # Mark failed/cancel if you want to handle other events here

        return Response({"ok": True})
    except Exception:
        logger.exception("Webhook processing failed")
        return Response({"error": "webhook processing failed"}, status=500)