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
    ProductionBatch,
    ProductionBatchOrder,
    ProductionWindowConfig,
    IngredientConsumption,
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
    list_display = ["id", "user", "payment_method", "total_price", "status", "production_batch", "created_at"]
    list_editable = ["status"]
    list_filter = ["status", "payment_method", "created_at"]
    search_fields = ["user__username", "id"]
    inlines = [OrderItemInline]
    readonly_fields = [
        "user",
        "payment_method",
        "total_price",
        "created_at",
        "address",
        "production_batch",
        "production_batch_assigned_at",
        "production_batch_assigned_by",
    ]

    def has_add_permission(self, request):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user").prefetch_related("items", "items__product")

    def subtotal(self, obj):
        return obj.total_price


# register batches (simple registration)
admin.site.register(IngredientBatch)


@admin.register(ProductionBatch)
class ProductionBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "window_start", "window_end", "status", "created_by", "produced_at")
    list_filter = ("status",)
    search_fields = ("notes",)
    readonly_fields = ("created_at", "updated_at", "produced_at", "produced_by", "cancelled_at", "cancelled_by")


@admin.register(ProductionBatchOrder)
class ProductionBatchOrderAdmin(admin.ModelAdmin):
    list_display = ("order", "batch", "sequence", "assigned_by", "assigned_at")
    list_filter = ("batch",)
    search_fields = ("order__id", "order__user__username")
    autocomplete_fields = ("batch", "order", "assigned_by")


@admin.register(IngredientConsumption)
class IngredientConsumptionAdmin(admin.ModelAdmin):
    list_display = ("production_batch", "ingredient", "ingredient_batch", "quantity_used", "recorded_at")
    list_filter = ("production_batch", "ingredient")
    search_fields = ("ingredient__name", "production_batch__id")


@admin.register(ProductionWindowConfig)
class ProductionWindowConfigAdmin(admin.ModelAdmin):
    list_display = ("default_start_time", "default_end_time", "timezone", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False