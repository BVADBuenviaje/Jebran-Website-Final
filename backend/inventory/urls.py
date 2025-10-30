from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import IngredientViewSet, SupplierViewSet, ProductViewSet, IngredientSupplierViewSet, CartViewSet, ResupplyOrderViewSet, OrderViewSet, SalesViewSet, CreateCheckoutSessionAPIView, PaymongoWebhookAPIView
from .webhooks import PayMongoWebhookView

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'products', ProductViewSet)
router.register(r'ingredient-suppliers', IngredientSupplierViewSet)
router.register(r'resupply-orders', ResupplyOrderViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'sales', SalesViewSet, basename='sales')

urlpatterns = router.urls + [
    path('create-checkout-session/', CreateCheckoutSessionAPIView.as_view(), name='create-checkout-session'),
    path('webhook/paymongo/', PaymongoWebhookAPIView, name='paymongo-webhook-new'),
]