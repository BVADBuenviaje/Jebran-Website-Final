from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserListView
from .views import CustomTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users-list/', UserListView.as_view(), name='user-list'),  # Renamed to avoid conflict
    path('', include(router.urls)),  # This includes /users/ and /users/<id>/promote/
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
]