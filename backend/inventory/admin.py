from django.contrib import admin
from .models import Ingredient
from .models import Supplier

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("name", "unit_of_measurement", "default_unit_price", "restock_level", "is_active")
    search_fields = ("name",)
    list_filter = ("is_active",)

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_number", "email", "address", "is_active")
    search_fields = ("name", "email")
    list_filter = ("is_active",)