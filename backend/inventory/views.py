from django.shortcuts import render
from rest_framework import viewsets, filters
from .models import Ingredient, Supplier, IngredientSupplier
from .serializers import IngredientSerializer, SupplierSerializer, IngredientSupplierSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Product
from .serializers import ProductSerializer
from django_filters.rest_framework import DjangoFilterBackend

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
    filterset_fields = ["supplier", "ingredient"]  # <-- Add this line

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