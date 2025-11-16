from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.generics import ListAPIView
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from .serializers import UserSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated, AllowAny

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from rest_framework import serializers

from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

User = get_user_model()

class UserViewSet(ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAdminUser]  # Only admins for all actions except 'me' and 'create'

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        if self.action in ["retrieve", "me"]:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        user = self.get_object()
        old_role = user.role
        requesting_user = request.user

        # Blocking permission checks
        if "is_blocked" in request.data:
            # SUPERADMIN cannot block other SUPERADMIN
            if requesting_user.role == "superadmin" and user.role == "superadmin":
                return Response(
                    {"detail": "Superadmin cannot block/unblock other superadmin accounts."},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Only SUPERADMIN can block/unblock ADMIN
            if requesting_user.role != "superadmin":
                if user.role in ["superadmin", "admin"]:
                    return Response(
                        {"detail": "Only superadmin can block/unblock admin accounts."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            # ADMIN can only block/unblock CUSTOMER and RESELLER
            if requesting_user.role == "admin":
                if user.role in ["superadmin", "admin"]:
                    return Response(
                        {"detail": "Admins can only block/unblock customer or reseller accounts."},
                        status=status.HTTP_403_FORBIDDEN
                    )

        # Prevent changing role if user is superadmin
        if old_role == "superadmin" and "role" in request.data and request.data["role"] != "superadmin":
            return Response({"detail": "You cannot change the role of a superadmin."}, status=status.HTTP_403_FORBIDDEN)

        # Prevent superadmin from changing their own role
        if requesting_user.id == user.id and user.role == "superadmin" and "role" in request.data:
            return Response({"detail": "Superadmin cannot change their own role."}, status=status.HTTP_403_FORBIDDEN)

        # Admins cannot grant or remove admin privileges
        if requesting_user.role == "admin":
            if "role" in request.data:
                # Only allow changing reseller/customer to reseller/customer
                if old_role in ["reseller", "customer"] and request.data["role"] in ["reseller", "customer"]:
                    pass  # allowed
                elif request.data["role"] == "admin" or old_role == "admin":
                    return Response({"detail": "Admins cannot grant or remove admin privileges."}, status=status.HTTP_403_FORBIDDEN)
                else:
                    return Response({"detail": "Invalid role change."}, status=status.HTTP_403_FORBIDDEN)

        response = super().update(request, *args, **kwargs)
        user.refresh_from_db()
        # Staff sync logic
        if user.role == "admin" and not user.is_staff:
            user.is_staff = True
            user.save(update_fields=["is_staff"])
        elif user.role != "admin" and user.is_staff:
            user.is_staff = False
            user.save(update_fields=["is_staff"])
        # Automated email when promoted from customer to reseller
        if old_role == "customer" and user.role == "reseller":
            subject = "Jebran Account Verified"
            message = (
                f"Congratulations, {user.full_name}! "
                "Your Jebran account has been verified. You are now able to login and order from our shop. "
                "Thank you for choosing Jebran as your local noodle supplier."
            )
            send_mail(subject, message, None, [user.email])
        # Automated email when demoted to customer
        if old_role == "reseller" and user.role == "customer":
            subject = "Jebran Account Update"
            message = (
                f"Hello {user.full_name},\n\n"
                "Your account has been changed to a customer account. You no longer have reseller privileges. "
                "If you believe this is a mistake, please contact our support team.\n\n"
                "Thank you for being part of the Jebran family."
            )
            send_mail(subject, message, None, [user.email])
        return response
    
    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        # Only allow admin or the user themselves
        if request.user.is_staff or request.user.id == user.id:
            return super().retrieve(request, *args, **kwargs)
        raise PermissionDenied("You do not have permission to view this profile.")

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def promote(self, request, pk=None):
        user = self.get_object()
        if user.role == "customer":
            user.role = "reseller"
            user.save()
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"detail": "User is not a customer."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def check(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        username_exists = User.objects.filter(username=username).exists() if username else False
        email_exists = User.objects.filter(email=email).exists() if email else False
        return Response({
            "username_exists": username_exists,
            "email_exists": email_exists,
        })

class UserListView(ListAPIView):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if getattr(user, "is_blocked", False):  # <-- Prevent blocked users from logging in
            raise serializers.ValidationError("This account is blocked.")
        user.last_active = timezone.now()
        user.save(update_fields=["last_active"])
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer



