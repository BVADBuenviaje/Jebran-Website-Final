from django.contrib import admin
from .models import Ingredient, Supplier, IngredientSupplier, Product, ResupplyOrder, ResupplyOrderItem

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("name", "unit_of_measurement", "default_unit_price", "restock_level", "is_active", "current_stock")
    search_fields = ("name",)
    list_filter = ("is_active",)

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_number", "email", "address", "is_active")
    search_fields = ("name", "email")
    list_filter = ("is_active",)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "stock", "status")
    search_fields = ("name", "category")
    list_filter = ("status",)

@admin.register(IngredientSupplier)
class IngredientSupplierAdmin(admin.ModelAdmin):
    list_display = ("supplier", "ingredient", "price")
    search_fields = ("supplier__name", "ingredient__name")
    list_filter = ("supplier", "ingredient")

@admin.register(ResupplyOrder)
class ResupplyOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "supplier", "status", "order_date")
    search_fields = ("supplier__name",)
    list_filter = ("status", "supplier")

@admin.register(ResupplyOrderItem)
class ResupplyOrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "ingredient", "quantity")
    search_fields = ("order__id", "ingredient__name")
    list_filter = ("ingredient",)