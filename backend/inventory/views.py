from django.shortcuts import render
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