from django.contrib import admin
from .models import (
    Ingredient,
    IngredientBatch,
    Supplier,
    IngredientSupplier,
    Product,
    ResupplyOrder,
    ResupplyOrderItem,
    Order,
    OrderItem,
)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "unit_of_measurement",
        "default_unit_price",
        "restock_level",
        "is_active",
        "total_stock",
        "next_expiry_date",
    )
    readonly_fields = ("total_stock", "next_expiry_date")
    search_fields = ("name",)
    list_filter = ("is_active",)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_number", "email", "address", "is_active")
    search_fields = ("name", "email")
    list_filter = ("is_active",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "status", "image")
    search_fields = ("name",)
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
    list_display = (
        "order",
        "ingredient",
        "quantity_ordered",
        "quantity_received",
        "is_fully_received",
    )
    readonly_fields = ("quantity_received", "is_fully_received")
    search_fields = ("order__id", "ingredient__name")
    list_filter = ("ingredient",)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "quantity", "price_at_purchase", "subtotal"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "payment_method", "total_price", "status", "created_at"]
    list_editable = ["status"]
    list_filter = ["status", "payment_method", "created_at"]
    search_fields = ["user__username", "id"]
    inlines = [OrderItemInline]
    readonly_fields = ["user", "payment_method", "total_price", "created_at", "address"]

    def has_add_permission(self, request):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user").prefetch_related("items", "items__product")

    def subtotal(self, obj):
        return obj.total_price


# register batches (simple registration)
admin.site.register(IngredientBatch)