from django.db import models

class Ingredient(models.Model):
    name = models.CharField(max_length=100, unique=True)
    unit_of_measurement = models.CharField(max_length=20, help_text="e.g. kg, liter, piece")
    default_unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    restock_level = models.DecimalField(max_digits=12, decimal_places=3, help_text="Minimum quantity before restocking")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]
        verbose_name = "Ingredient"
        verbose_name_plural = "Ingredients"

class Supplier(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_number = models.CharField(max_length=30, blank=True)
    email = models.EmailField(max_length=100, blank=True)
    address = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)  # Added is_active field

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"