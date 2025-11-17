from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    IngredientViewSet,
    SupplierViewSet,
    ProductViewSet,
    IngredientSupplierViewSet,
    CartViewSet,
    ResupplyOrderViewSet,
    ResupplyOrderItemViewSet,
    IngredientBatchViewSet,
    OrderViewSet,
    SalesViewSet,
    ProductionBatchViewSet,
    ProductionBatchOrderViewSet,
    IngredientConsumptionViewSet,
    ProductionWindowConfigView,
    CreateCheckoutSessionAPIView,
    PaymongoWebhookAPIView,
    orders_summary,
)

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'products', ProductViewSet)
router.register(r'ingredient-suppliers', IngredientSupplierViewSet)
router.register(r'resupply-orders', ResupplyOrderViewSet)
router.register(r'order-items', ResupplyOrderItemViewSet, basename='order-items')
router.register(r'batches', IngredientBatchViewSet, basename='batches')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'sales', SalesViewSet, basename='sales')
router.register(r'production-batches', ProductionBatchViewSet, basename='production-batches')
router.register(r'production-batch-orders', ProductionBatchOrderViewSet, basename='production-batch-orders')
router.register(r'production-consumptions', IngredientConsumptionViewSet, basename='production-consumptions')

urlpatterns = [
    path('create-checkout-session/', CreateCheckoutSessionAPIView.as_view(), name='create-checkout-session'),
    path('webhook/paymongo/', PaymongoWebhookAPIView, name='paymongo-webhook-new'),
    path('production/window-config/', ProductionWindowConfigView.as_view(), name='production-window-config'),
    path('orders/summary/', orders_summary, name='orders-summary'),
] + router.urls