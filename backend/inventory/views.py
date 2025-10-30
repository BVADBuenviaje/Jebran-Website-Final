from django.shortcuts import render
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters
from .models import Ingredient, Supplier, IngredientSupplier, Cart, CartItem, Order, OrderItem, Sale, CheckoutSession, PAYMENT_STATUS_CHOICES
from .serializers import IngredientSerializer, SupplierSerializer, IngredientSupplierSerializer, CartSerializer, CartItemSerializer, OrderSerializer, CheckoutSerializer, CheckoutSessionSerializer
from .services import PayMongoService
from rest_framework import viewsets, filters, status
from .models import Ingredient, Supplier, IngredientSupplier, Product, ResupplyOrder
from .serializers import (
    IngredientSerializer, SupplierSerializer, IngredientSupplierSerializer,
    ProductSerializer, ResupplyOrderSerializer
)
from django.core.mail import send_mail
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from rest_framework import status
from rest_framework.views import APIView
from rest_framework import permissions
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.utils import timezone
import requests
import json
from .models import Product
from .serializers import ProductSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Sale
from .serializers import SaleSerializer, PaymentConfirmSerializer
from django.db import transaction
from django.db.models import Sum, Count
from datetime import timedelta
from django.utils import timezone

class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "unit_of_measurement", "category"]

    def perform_create(self, serializer):
        serializer.save()

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "category"]

    def perform_create(self, serializer):
        serializer.save()

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "email"]
    filterset_fields = ["is_active"]

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        supplier = self.get_object()
        supplier.is_active = False
        supplier.save()
        serializer = self.get_serializer(supplier)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        supplier = self.get_object()
        supplier.is_active = True
        supplier.save()
        serializer = self.get_serializer(supplier)
        return Response(serializer.data, status=status.HTTP_200_OK)

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

    def perform_create(self, serializer):
        print("Creating IngredientSupplier for supplier:", serializer.validated_data.get("supplier"))
        serializer.save()


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
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="update")
    def update_item(self, request):
        cart = self._get_or_create_cart(request)
        serializer = CartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", 1)
        try:
            item = CartItem.objects.get(cart=cart, product=product)
        except CartItem.DoesNotExist:
            return Response({"detail": "Item not in cart"}, status=status.HTTP_404_NOT_FOUND)
        if quantity <= 0:
            item.delete()
        else:
            item.quantity = quantity
            item.save()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="remove")
    def remove_item(self, request):
        cart = self._get_or_create_cart(request)
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

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
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["supplier__name"]
    filterset_fields = ["status", "supplier"]

    def perform_create(self, serializer):
        order = serializer.save()
        supplier_email = order.supplier.email
        item_lines = [
            f"- {item.ingredient.name}: {item.quantity} {item.ingredient.unit_of_measurement}"
            for item in order.items.all()
        ]
        subject = "New Resupply Order"
        message = (
            f"Dear {order.supplier.name},\n\n"
            f"You have a new resupply order:\n"
            + "\n".join(item_lines) +
            f"\n\nStatus: {order.status}\nDate: {order.order_date.strftime('%Y-%m-%d %H:%M')}\n\n"
            "Please process this order as soon as possible.\n\n"
            "Thank you!"
        )
        send_mail(subject, message, None, [supplier_email])

    def update(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        old_status = instance.status
        was_delivered = instance.was_delivered
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get("status", instance.status)
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()  # Get updated was_delivered

        # If status changed to Delivered and not already delivered, add stock
        if old_status != "Delivered" and new_status == "Delivered" and not was_delivered:
            for item in instance.items.all():
                ingredient = item.ingredient
                ingredient.current_stock = (ingredient.current_stock or Decimal("0")) + (item.quantity or Decimal("0"))
                ingredient.save()
            instance.was_delivered = True
            instance.save()
        # If status changed from Delivered to Pending or Canceled, revert stock
        elif old_status == "Delivered" and new_status in ["Pending", "Canceled"] and was_delivered:
            for item in instance.items.all():
                ingredient = item.ingredient
                ingredient.current_stock = (ingredient.current_stock or Decimal("0")) - (item.quantity or Decimal("0"))
                ingredient.save()
            instance.was_delivered = False
            instance.save()
        return response


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            # If user has role attribute and is admin, return all orders
            if getattr(user, 'role', None) == 'admin':
                return Order.objects.all()
        except Exception:
            pass
        # Default: only the user's own orders
        return Order.objects.filter(user=user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        data = request.data.copy()

        # Only allow status change for non-admins, and only to Cancelled from Pending
        if getattr(user, 'role', None) != 'admin':
            # Limit updatable fields to 'status' only
            allowed = {}
            if 'status' in data:
                new_status = data.get('status')
                if new_status != 'Cancelled':
                    return Response({"detail": "Only cancellation is allowed."}, status=status.HTTP_400_BAD_REQUEST)
                if instance.status != 'Pending':
                    return Response({"detail": "Only pending orders can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
                allowed['status'] = 'Cancelled'
            else:
                return Response({"detail": "No updatable fields provided."}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(instance, data=allowed, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)

        # Admins can update status freely (other fields are typically managed by system)
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        instance = self.get_object()
        new_status = request.data.get("status")
        
        # Handle payment status updates (Paid, Unpaid, etc.)
        if new_status in dict(PAYMENT_STATUS_CHOICES):
            user = request.user
            if not (user.is_staff or instance.user == user):
                return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
            
            instance.payment_status = new_status
            instance.save(update_fields=["payment_status"])
            
            # Create Sale when payment becomes Paid and sale doesn't exist
            if new_status == "Paid":
                if not hasattr(instance, "sale"):
                    sale = Sale.objects.create(
                        order=instance,
                        total_paid=instance.total_price,
                        payment_method=instance.payment_method,
                        payment_status=instance.payment_status,
                        payment_reference=instance.payment_reference or "",
                        handled_by=user if user.is_staff else None,
                        notes="Payment confirmed via GCash" if instance.payment_method == "GCash" else "Payment confirmed via admin interface"
                    )
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        
        # Handle order status updates (Pending, Delivered, etc.)
        elif new_status in dict(Order.STATUS_CHOICES):
            user = request.user
            if getattr(user, 'role', None) != 'admin':
                # Non-admins can only cancel their own pending orders
                if new_status != 'Cancelled' or instance.status != 'Pending' or instance.user_id != user.id:
                    return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

            instance.status = new_status
            instance.save(update_fields=["status"])
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        
        else:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request):
        orders = self.get_queryset()
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            order = self.get_queryset().get(pk=pk)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get user's cart
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        cart_items = cart.items.all()
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle selected items
        selected_items_data = serializer.validated_data.get('selected_items', [])
        
        if selected_items_data:
            # Filter cart items based on selected items
            selected_product_ids = [item['product_id'] for item in selected_items_data]
            selected_quantities = {item['product_id']: item['quantity'] for item in selected_items_data}
            
            # Validate that all selected items exist in cart
            cart_product_ids = set(cart_items.values_list('product_id', flat=True))
            invalid_ids = set(selected_product_ids) - cart_product_ids
            if invalid_ids:
                return Response({"detail": f"Invalid product IDs: {list(invalid_ids)}"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Filter cart items to only selected ones
            cart_items = cart_items.filter(product_id__in=selected_product_ids)
            
            # Update quantities if different from cart
            for cart_item in cart_items:
                if cart_item.product_id in selected_quantities:
                    cart_item.quantity = selected_quantities[cart_item.product_id]
                    cart_item.save()
        else:
            # If no selected items specified, use all cart items
            pass
        
        if not cart_items.exists():
            return Response({"detail": "No items selected for checkout"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate total price
        total_price = sum(item.subtotal for item in cart_items)
        
        # Create order
        payment_method = serializer.validated_data['payment_method']
        is_temporary = payment_method == 'GCash'  # Temporary for GCash until payment confirmed
        
        order = Order.objects.create(
            user=request.user,
            total_price=total_price,
            payment_method=payment_method,
            payment_status='Unpaid',  # Explicitly set payment status
            address=serializer.validated_data['address'],
            status='Pending',
            is_temporary=is_temporary
        )
        
        # Create order items
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price_at_purchase=cart_item.product.price or 0
            )
        
        # Don't clear cart during checkout - wait for payment confirmation
        # Cart will be cleared after successful payment confirmation
        
        # Return order details
        order_serializer = OrderSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=["post"], url_path="confirm-payment", permission_classes=[IsAuthenticated])
    def confirm_payment(self, request, pk=None):
        """
        Confirm or update payment for an order.
        Admins can confirm any order; users can mark their own orders as 'Paid' only if allowed.
        If payment_status == 'Paid' and no Sale exists, a Sale record is created.
        """
        order = self.get_object()

        # Basic permission: staff can confirm any; otherwise user must own the order
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

            # Create Sale when payment becomes PAID and sale doesn't exist
            if order.payment_status == "Paid":
                # Only create sale if not already present
                if not hasattr(order, "sale"):
                    sale = Sale.objects.create(
                        order=order,
                        total_paid=getattr(order, "total_price", 0) or 0,
                        payment_method=order.payment_method,
                        payment_status=order.payment_status,
                        payment_reference=order.payment_reference or "",
                        handled_by=request.user if request.user.is_staff else None,
                        notes=data.get("notes", "")
                    )
                else:
                    # Update existing sale status/reference if necessary
                    sale = order.sale
                    sale.payment_status = order.payment_status
                    sale.payment_reference = order.payment_reference or ""
                    sale.notes = (sale.notes or "") + ("\n" + (data.get("notes") or "")) if data.get("notes") else sale.notes
                    sale.save()

        return Response({"detail": "Payment updated", "order_id": order.id}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=["post"], url_path="create-gcash-payment", permission_classes=[IsAuthenticated])
    def create_gcash_payment(self, request, pk=None):
        """
        Create a GCash payment intent for the order
        """
        order = self.get_object()
        
        # Debug logging
        print(f"Order ID: {order.id}")
        print(f"Order user: {order.user}")
        print(f"Request user: {request.user}")
        print(f"Order payment method: {order.payment_method}")
        print(f"Order payment status: {order.payment_status}")
        print(f"Order total price: {order.total_price}")
        
        # Check if user owns the order or is admin
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow GCash payments for orders with GCash payment method
        if order.payment_method != 'GCash':
            return Response({"detail": f"Order is not set for GCash payment. Current method: {order.payment_method}"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if payment is already processed
        if order.payment_status == 'Paid':
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            paymongo_service = PayMongoService()
            
            # Debug logging
            print(f"Creating GCash payment for order {order.id}")
            print(f"Order total: {order.total_price}")
            print(f"Order payment method: {order.payment_method}")
            print(f"Order payment status: {order.payment_status}")
            
            # Create GCash payment
            payment_data = paymongo_service.process_gcash_payment(
                amount=str(order.total_price),
                description=f"Order #{order.id} - {order.user.username}",
                order_id=order.id
            )
            
            print(f"Payment data received: {payment_data}")
            print(f"Payment data keys: {payment_data.keys()}")
            print(f"Next action: {payment_data.get('next_action', 'NOT_FOUND')}")
            
            # Update order with PayMongo data
            order.paymongo_payment_intent_id = payment_data['payment_intent_id']
            order.paymongo_client_key = payment_data['client_key']
            order.paymongo_status = payment_data['status']
            order.payment_status = 'Pending'  # Set to pending while processing
            order.save()
            
            response_data = {
                "payment_intent_id": payment_data['payment_intent_id'],
                "client_key": payment_data['client_key'],
                "next_action": payment_data['next_action'],
                "status": payment_data['status']
            }
            
            print(f"Response data: {response_data}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error creating GCash payment: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=["post"], url_path="create-gcash-payment-method", permission_classes=[IsAuthenticated])
    def create_gcash_payment_method(self, request, pk=None):
        """
        Create a GCash payment method and get redirect URL
        """
        order = self.get_object()
        
        # Check if user owns the order or is admin
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow GCash payments for orders with GCash payment method
        if order.payment_method != 'GCash':
            return Response({"detail": f"Order is not set for GCash payment. Current method: {order.payment_method}"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if payment is already processed
        if order.payment_status == 'Paid':
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            paymongo_service = PayMongoService()
            client_key = request.data.get('clientKey')
            payment_intent_id = request.data.get('paymentIntentId')
            
            if not client_key:
                return Response({"detail": "Client key is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"Creating GCash payment method for order {order.id}")
            print(f"Client key: {client_key}")
            print(f"Payment intent ID: {payment_intent_id}")
            
            # For GCash, we'll use PayMongo Checkout Sessions API
            # This creates a proper checkout session that PayMongo generates
            actual_payment_intent_id = payment_intent_id or order.paymongo_payment_intent_id
            
            # Create PayMongo Checkout Session
            checkout_session = paymongo_service.create_checkout_session(
                amount=float(order.total_price),
                description=f"Order #{order.id} - GCash Payment",
                success_url=f"{settings.FRONTEND_URL}/orders/{order.id}/payment?status=success",
                cancel_url=f"{settings.FRONTEND_URL}/orders/{order.id}/payment?status=failed&reason=payment_failed"
            )
            
            # Get the checkout URL from the response
            redirect_url = checkout_session.get('attributes', {}).get('checkout_url')
            
            print(f"PayMongo Checkout Session created: {checkout_session}")
            print(f"Checkout URL: {redirect_url}")
            
            return Response({
                "checkout_session_id": checkout_session.get('id'),
                "redirect_url": redirect_url,
                "status": checkout_session.get('attributes', {}).get('status', 'pending'),
                "client_key": client_key,
                "payment_intent_id": actual_payment_intent_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error creating GCash payment method: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=["post"], url_path="verify-payment", permission_classes=[IsAuthenticated])
    def verify_payment(self, request, pk=None):
        """
        Verify payment status with PayMongo
        """
        order = self.get_object()
        
        # Check if user owns the order or is admin
        if not (request.user.is_staff or order.user == request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        
        if not order.paymongo_payment_intent_id:
            return Response({"detail": "No PayMongo payment intent found."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            paymongo_service = PayMongoService()
            payment_intent = paymongo_service.get_payment_intent(order.paymongo_payment_intent_id)
            
            # Update order status based on PayMongo status
            paymongo_status = payment_intent['attributes']['status']
            order.paymongo_status = paymongo_status
            
            if paymongo_status == 'succeeded':
                order.payment_status = 'Paid'
                order.payment_reference = payment_intent['id']
                
                # Create Sale record
                if not hasattr(order, "sale"):
                    sale = Sale.objects.create(
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
        This endpoint is called from PaymentPage for GCash checkout flow
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get user's cart
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        cart_items = cart.items.all()
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle selected items
        selected_items_data = serializer.validated_data.get('selected_items', [])
        
        if selected_items_data:
            # Filter cart items based on selected items
            selected_product_ids = [item['product_id'] for item in selected_items_data]
            selected_quantities = {item['product_id']: item['quantity'] for item in selected_items_data}
            
            # Validate that all selected items exist in cart
            cart_product_ids = set(cart_items.values_list('product_id', flat=True))
            invalid_ids = set(selected_product_ids) - cart_product_ids
            if invalid_ids:
                return Response({"detail": f"Invalid product IDs: {list(invalid_ids)}"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Filter cart items to only selected ones
            cart_items = cart_items.filter(product_id__in=selected_product_ids)
            
            # Update quantities if different from cart
            for cart_item in cart_items:
                if cart_item.product_id in selected_quantities:
                    cart_item.quantity = selected_quantities[cart_item.product_id]
                    cart_item.save()
        else:
            # If no selected items specified, use all cart items
            pass
        
        if not cart_items.exists():
            return Response({"detail": "No items selected for checkout"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate total price
        total_price = sum(item.subtotal for item in cart_items)
        
        try:
            paymongo_service = PayMongoService()
            
            print(f"Creating GCash checkout session for new order")
            print(f"Total price: {total_price}")
            
            # Create PayMongo Checkout Session
            checkout_session = paymongo_service.create_checkout_session(
                amount=float(total_price),
                description=f"GCash Payment - ₱{total_price}",
                success_url=f"{settings.FRONTEND_URL}/payment/gcash?status=success",
                cancel_url=f"{settings.FRONTEND_URL}/payment/gcash?status=failed&reason=payment_failed"
            )
            
            # Get the checkout URL from the response
            redirect_url = checkout_session.get('attributes', {}).get('checkout_url')
            
            print(f"PayMongo Checkout Session created: {checkout_session}")
            print(f"Checkout URL: {redirect_url}")
            
            return Response({
                "checkout_session_id": checkout_session.get('id'),
                "redirect_url": redirect_url,
                "status": checkout_session.get('attributes', {}).get('status', 'pending')
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error creating GCash checkout session: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=["post"], url_path="create-after-gcash-payment")
    def create_after_gcash_payment(self, request):
        """
        Create order after successful GCash payment
        This endpoint is called from PaymentPage after payment success
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get user's cart
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        cart_items = cart.items.all()
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle selected items
        selected_items_data = serializer.validated_data.get('selected_items', [])
        
        if selected_items_data:
            # Filter cart items based on selected items
            selected_product_ids = [item['product_id'] for item in selected_items_data]
            selected_quantities = {item['product_id']: item['quantity'] for item in selected_items_data}
            
            # Validate that all selected items exist in cart
            cart_product_ids = set(cart_items.values_list('product_id', flat=True))
            invalid_ids = set(selected_product_ids) - cart_product_ids
            if invalid_ids:
                return Response({"detail": f"Invalid product IDs: {list(invalid_ids)}"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Filter cart items to only selected ones
            cart_items = cart_items.filter(product_id__in=selected_product_ids)
            
            # Update quantities if different from cart
            for cart_item in cart_items:
                if cart_item.product_id in selected_quantities:
                    cart_item.quantity = selected_quantities[cart_item.product_id]
                    cart_item.save()
        else:
            # If no selected items specified, use all cart items
            pass
        
        if not cart_items.exists():
            return Response({"detail": "No items selected for checkout"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate total price
        total_price = sum(item.subtotal for item in cart_items)
        
        # Create order with GCash payment method and Paid status
        order = Order.objects.create(
            user=request.user,
            total_price=total_price,
            payment_method='GCash',
            payment_status='Paid',  # GCash payment is already confirmed
            address=serializer.validated_data['address'],
            status='Pending'
        )
        
        # Create order items
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price_at_purchase=cart_item.product.price or 0
            )
        
        # Clear cart after successful order creation
        if selected_items_data:
            cart_items.delete()
        else:
            # If no selection specified, clear entire cart
            cart.items.all().delete()
        
        # Create sale record for GCash payment
        Sale.objects.create(
            order=order,
            total_paid=total_price,
            payment_method='GCash',
            payment_status='Paid',
            payment_reference=request.data.get('payment_reference', ''),
            handled_by=None,  # Automated
            notes="Payment processed via PayMongo GCash"
        )
        
        # Return order details
        order_serializer = OrderSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)
    
class SalesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.all().order_by("-payment_date")
    serializer_class = SaleSerializer
    permission_classes = [IsAdminUser]  # restrict to admins
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
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
            
            # Make order permanent and mark as paid
            order.is_temporary = False
            order.payment_status = 'Paid'
            order.save(update_fields=['is_temporary', 'payment_status'])
            
            # Create sale record
            if not hasattr(order, "sale"):
                Sale.objects.create(
                    order=order,
                    total_paid=order.total_price,
                    payment_method=order.payment_method,
                    payment_status='Paid',
                    payment_reference=order.payment_reference or 'GCash Payment',
                    handled_by=None,  # Automated
                    notes='Payment confirmed via GCash'
                )
            
            # Clear user's cart
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
            
            # Delete the temporary order
            order.delete()
            
            return Response({"detail": "Temporary order cancelled"}, status=status.HTTP_200_OK)
            
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Checkout Session API Endpoints
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
                    print(f"✅ COD cart cleared: {cart_items_count} items removed for user {request.user.id}")
                except Cart.DoesNotExist:
                    print(f"⚠️  No cart found for COD user {request.user.id}")
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
            print(f"🔵 Creating CheckoutSession for user {request.user.id}")
            print(f"🔵 Items: {items}")
            print(f"🔵 Amount: {total}")
            print(f"🔵 Payment method: {payment_method}")
            
            # Create local CheckoutSession first (without paymongo_session_id)
            cs = CheckoutSession.objects.create(
                user=request.user,
                cart_snapshot=items,
                amount=total,
                currency=currency,
                payment_method=payment_method,
                address=address,
            )
            
            print(f"✅ CheckoutSession created: {cs.id}")

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

            print(f"🔵 PayMongo line items: {line_items}")
            print(f"🔵 Total amount: {total} PHP ({amount_in_centavos} centavos)")

            # Use PayMongo service
            paymongo_service = PayMongoService()
            checkout_session = paymongo_service.create_checkout_session(
                amount=amount_in_centavos,
                description=f"Order #{cs.id}",
                success_url=success_url,
                cancel_url=cancel_url,
                line_items=line_items
            )

            print(f"✅ PayMongo checkout session created: {checkout_session.get('id')}")

            # Update CheckoutSession with PayMongo data
            cs.paymongo_session_id = checkout_session.get("id")
            cs.metadata = checkout_session
            cs.save(update_fields=["paymongo_session_id", "metadata"])
            
            print(f"✅ CheckoutSession updated with PayMongo ID: {cs.paymongo_session_id}")

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


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])  # PayMongo can't authenticate; validate payload
def PaymongoWebhookAPIView(request):
    """
    PayMongo webhook handler to create orders on payment success
    """
    print("🚨 WEBHOOK FUNCTION CALLED - PaymongoWebhookAPIView")
    print("=== PAYMONGO WEBHOOK CALLED ===")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    
    # Log raw body for debugging
    payload = request.data  # DRF parses JSON automatically
    print("PayMongo Webhook Payload:", json.dumps(payload, indent=2))
    
    # TEMPORARILY DISABLED: Signature verification for testing
    # TODO: Re-enable signature verification once basic flow works
    print("⚠️  SIGNATURE VERIFICATION TEMPORARILY DISABLED FOR TESTING")
    
    # IMPORTANT: in production, verify signature or validate by fetching from PayMongo API

    try:
        data = payload.get("data", {})
        event_type = data.get("type")
        attributes = data.get("attributes", {})
        
        # For checkout_session.payment.paid events, the session ID is nested deeper
        if event_type == "event" and attributes.get("type") == "checkout_session.payment.paid":
            # Extract the checkout session data from the nested structure
            checkout_data = attributes.get("data", {})
            session_id = checkout_data.get("id")  # This is the actual checkout session ID
            checkout_attributes = checkout_data.get("attributes", {})
            status_attr = checkout_attributes.get("status")  # 'active' means paid
        else:
            # Original logic for direct checkout session events
            session_id = data.get("id")
            status_attr = attributes.get("status")

        print(f"Webhook Event: {event_type}, Session ID: {session_id}, Status: {status_attr}")
        print(f"Full webhook data: {json.dumps(data, indent=2)}")

        # For some events you might find 'payment' object nested; log to see exact shape
        # If status==paid or status==active, finalize
        if session_id:
            try:
                cs = CheckoutSession.objects.get(paymongo_session_id=session_id)
                print(f"Found CheckoutSession: {cs.id}, Current Status: {cs.status}")
            except CheckoutSession.DoesNotExist:
                # unknown session - log and return 200
                print(f"❌ CheckoutSession not found for session_id: {session_id}")
                print(f"Available CheckoutSessions: {list(CheckoutSession.objects.values_list('paymongo_session_id', 'status'))}")
                return Response({"ok": True})

            # If PayMongo reports paid (status can be 'paid' or 'active')
            if status_attr in ["paid", "active"]:
                if cs.status != "paid":
                    print(f"✅ Creating order for CheckoutSession {cs.id}")
                    
                    # Create Order from cs.cart_snapshot
                    order = Order.objects.create(
                        user=cs.user,
                        total_price=cs.amount,
                        payment_method="GCash",  # Fixed case
                        payment_status="Paid",
                        status="Pending",  # Keep delivery status as Pending
                        address=cs.address,
                        payment_reference=cs.paymongo_session_id,
                        is_temporary=False
                    )
                    
                    print(f"✅ Order created: {order.id}")
                    
                    # Loop items and create OrderItem records
                    for it in cs.cart_snapshot:
                        product_id = it.get("product_id")
                        qty = int(it.get("quantity") or 1)
                        product = None
                        try:
                            product = Product.objects.get(pk=product_id)
                        except Product.DoesNotExist:
                            product = None
                        
                        OrderItem.objects.create(
                            order=order,
                            product=product,
                            quantity=qty,
                            price_at_purchase=Decimal(it.get("price") or 0)
                        )
                    
                    print(f"✅ OrderItems created for order {order.id}")
                    
                    # Create sale record
                    Sale.objects.create(
                        order=order,
                        total_paid=order.total_price,
                        payment_method="GCash",  # Fixed case
                        payment_status='Paid',
                        payment_reference=order.payment_reference,
                        handled_by=None,
                        notes='Payment confirmed via GCash webhook'
                    )
                    
                    print(f"✅ Sale record created for order {order.id}")
                    
                    # Clear user's cart
                    try:
                        cart = Cart.objects.get(user=cs.user)
                        cart.items.all().delete()
                        print(f"✅ Cart cleared for user {cs.user.id}")
                    except Cart.DoesNotExist:
                        print(f"⚠️  No cart found for user {cs.user.id}")
                    
                    cs.status = "paid"
                    cs.save(update_fields=["status"])
                    
                    print(f"✅ Order {order.id} created successfully from CheckoutSession {cs.id}")
                else:
                    print(f"⚠️  CheckoutSession {cs.id} already marked as paid")
            elif status_attr in ("cancelled", "failed"):
                cs.status = "failed"
                cs.save(update_fields=["status"])
                print(f"❌ CheckoutSession {cs.id} marked as failed")
            else:
                print(f"⚠️  Unknown status: {status_attr}")
        else:
            print(f"❌ No session_id in webhook payload")

    except Exception as e:
        # log for debugging
        print("Webhook processing error:", e)
        return Response({"error": str(e)}, status=500)

    return Response({"ok": True})