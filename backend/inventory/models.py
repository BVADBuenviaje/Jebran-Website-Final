from django.db import models

class Ingredient(models.Model):
    name = models.CharField(max_length=100, unique=True)
    unit_of_measurement = models.CharField(max_length=20, help_text="e.g. kg, liter, piece")
    default_unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    restock_level = models.DecimalField(max_digits=12, decimal_places=3, help_text="Minimum quantity before restocking")
    is_active = models.BooleanField(default=True)
    # New fields
    category = models.CharField(max_length=50, blank=True, help_text="e.g. Produce, Meat, Dry Goods")
    expiry_date = models.DateField(null=True, blank=True)
    current_stock = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, help_text="Current available quantity")

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]
        verbose_name = "Ingredient"
        verbose_name_plural = "Ingredients"

class Product(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, blank=True, help_text="e.g. Produce, Meat, Dry Goods")
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock = models.IntegerField(null=True, blank=True, help_text="Current stock quantity")
    status = models.CharField(max_length=20, choices=[("Active", "Active"), ("Out of Stock", "Out of Stock"), ("Low Stock", "Low Stock")], default="Active")
    # through will be defined below; placeholder for type reference
    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]
        verbose_name = "Product"
        verbose_name_plural = "Products"

class ProductIngredient(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="product_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="ingredient_products")
    quantity = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    uom = models.CharField(max_length=20, blank=True, help_text="e.g. kg, L, piece")

    class Meta:
        unique_together = ("product", "ingredient")
        verbose_name = "Product Ingredient"
        verbose_name_plural = "Product Ingredients"

# Define M2M using through model after classes exist
Product.add_to_class('ingredients', models.ManyToManyField(Ingredient, through=ProductIngredient, related_name="products", blank=True))

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