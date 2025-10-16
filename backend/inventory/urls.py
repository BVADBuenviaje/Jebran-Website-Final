from rest_framework.routers import DefaultRouter
from .views import IngredientViewSet, SupplierViewSet, ProductViewSet, IngredientSupplierViewSet, CartViewSet, ResupplyOrderViewSet, OrderViewSet

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'products', ProductViewSet)
router.register(r'ingredient-suppliers', IngredientSupplierViewSet)
router.register(r'resupply-orders', ResupplyOrderViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = router.urls