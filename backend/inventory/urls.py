from rest_framework.routers import DefaultRouter
from .views import IngredientViewSet, SupplierViewSet

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'suppliers', SupplierViewSet)

urlpatterns = router.urls