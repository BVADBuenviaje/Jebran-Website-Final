from rest_framework.routers import DefaultRouter
from .views import IngredientViewSet, SupplierViewSet, ProductViewSet, IngredientSupplierViewSet

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'products', ProductViewSet)
router.register(r'ingredient-suppliers', IngredientSupplierViewSet)

urlpatterns = router.urls