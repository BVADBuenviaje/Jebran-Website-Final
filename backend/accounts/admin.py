from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # show your extra fields in the admin UI
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Business", {"fields": ("full_name", "role", "contact_number", "shop_name", "shop_address", "proof_of_business")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Business", {"fields": ("full_name", "role", "contact_number", "shop_name", "shop_address", "proof_of_business")}),
    )
    list_display = ("username", "full_name", "role", "shop_name", "is_staff", "is_superuser")
    list_filter = ("role", "is_staff", "is_superuser")
    search_fields = ("username", "email", "full_name", "shop_name")
