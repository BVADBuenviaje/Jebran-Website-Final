from django.shortcuts import render
from rest_framework import viewsets, filters
from .models import Ingredient, Supplier, IngredientSupplier, Cart, CartItem, Order, OrderItem
from .serializers import IngredientSerializer, SupplierSerializer, IngredientSupplierSerializer, CartSerializer, CartItemSerializer, OrderSerializer, CheckoutSerializer
from rest_framework import viewsets, filters, status
from .models import Ingredient, Supplier, IngredientSupplier, Product, ResupplyOrder
from .serializers import (
    IngredientSerializer, SupplierSerializer, IngredientSupplierSerializer,
    ProductSerializer, ResupplyOrderSerializer
)
from django_filters.rest_framework import DjangoFilterBackend
from django.core.mail import send_mail
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from rest_framework import status
from .models import Product
from .serializers import ProductSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

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
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if getattr(user, 'role', None) != 'admin':
            # Non-admins can only cancel their own pending orders
            if new_status != 'Cancelled' or instance.status != 'Pending' or instance.user_id != user.id:
                return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        instance.status = new_status
        instance.save(update_fields=["status"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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
        order = Order.objects.create(
            user=request.user,
            total_price=total_price,
            payment_method=serializer.validated_data['payment_method'],
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
        
        # Remove only the selected items from cart
        if selected_items_data:
            cart_items.delete()
        else:
            # If no selection specified, clear entire cart
            cart.items.all().delete()
        
        # Return order details
        order_serializer = OrderSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)