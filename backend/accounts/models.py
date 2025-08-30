from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ADMIN = "admin", "Admin"
        RESELLER = "reseller", "Reseller"  # Added reseller role

    full_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True, blank=False)  # <-- Add this line
    last_active = models.DateTimeField(null=True, blank=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
    )

    contact_number = models.CharField(
        max_length=30,
        blank=True,
        validators=[RegexValidator(r'^[0-9+\-() ]*$', 'Enter a valid phone number.')],
    )

    shop_name = models.CharField(max_length=150, blank=True)
    shop_address = models.TextField(blank=True)

    proof_of_business = models.ImageField(
        upload_to='proofs/',
        blank=True,
        null=True
    )

    is_blocked = models.BooleanField(default=False)  # <-- Add this line

    def __str__(self):
        return self.username or self.email or f"User {self.pk}"