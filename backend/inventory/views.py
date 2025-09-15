from django.shortcuts import render
from rest_framework import viewsets, filters
from .models import Ingredient
from .serializers import IngredientSerializer
from .models import Supplier
from .serializers import SupplierSerializer

class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "unit_of_measurement", "category"]

    def perform_create(self, serializer):
        serializer.save()

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "email"]

    def perform_create(self, serializer):
        serializer.save()
