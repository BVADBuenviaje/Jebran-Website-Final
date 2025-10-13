"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import UserViewSet
from api.views import PingView
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

router = DefaultRouter()  # or DefaultRouter(trailing_slash=False) if you dislike / at the end
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', RedirectView.as_view(url='/api/ping/', permanent=False)),
    path('admin/', admin.site.urls),
    path('api/ping/', PingView.as_view(), name='ping'),
    path('api/', include(router.urls)),  # <-- gives /api/users/ and /api/users/{id}/
    path('api/accounts/', include('accounts.urls')),
    path('api/inventory/', include('inventory.urls'))
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
