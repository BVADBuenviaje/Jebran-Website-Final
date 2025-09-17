from rest_framework.routers import DefaultRouter
from .views import IngredientViewSet, SupplierViewSet, ProductViewSet

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'products', ProductViewSet)

urlpatterns = router.urls