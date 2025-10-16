from django.db import models
from django.conf import settings

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
    # category = models.CharField(max_length=50, blank=True, help_text="e.g. Produce, Meat, Dry Goods")
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # stock = models.IntegerField(null=True, blank=True, help_text="Current stock quantity")
    status = models.CharField(max_length=20, choices=[("Active", "Active"), ("Inactive", "Inactive")], default="Active")
    image = models.ImageField(upload_to='products/', null=True, blank=True, help_text="Product image")
    description = models.TextField(blank=True, help_text="Detailed description of the product")  # <-- added field

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

class IngredientSupplier(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="ingredient_suppliers")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="ingredient_suppliers")
    price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Supplier-specific price for this ingredient")
    is_active = models.BooleanField(default=True)


    class Meta:
        unique_together = ("supplier", "ingredient")
        verbose_name = "Ingredient Supplier"
        verbose_name_plural = "Ingredient Suppliers"

    def __str__(self):
        return f"{self.supplier.name} supplies {self.ingredient.name} at {self.price}"

class ResupplyOrder(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="resupply_orders")
    status = models.CharField(
        max_length=20,
        choices=[
            ("Pending", "Pending"),
            ("Delivered", "Delivered"),
            ("Canceled", "Canceled")   # <-- Add this line
        ],
        default="Pending"
    )
    order_date = models.DateTimeField(auto_now_add=True)
    was_delivered = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Resupply Order"
        verbose_name_plural = "Resupply Orders"
        ordering = ["-order_date"]

    def __str__(self):
        return f"Order {self.id} for {self.supplier.name}"

class ResupplyOrderItem(models.Model):
    order = models.ForeignKey(ResupplyOrder, related_name="items", on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, help_text="Quantity ordered")

    def __str__(self):
        return f"{self.quantity} {self.ingredient.unit_of_measurement} of {self.ingredient.name}"

class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s Cart"

    @property
    def total_price(self):
        return sum(item.subtotal for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"

    @property
    def subtotal(self):
        return (self.product.price or 0) * self.quantity
    
PAYMENT_METHOD_CHOICES = [
        ('COD', 'Cash on Delivery'),
        ('Online', 'Online Payment'),
        ('GCash', 'gcash'),
    ]
    
PAYMENT_STATUS_CHOICES = [
        ("Unpaid", "Unpaid"),
        ("Paid", "Paid"),
        ("Pending", "Pending"),
        ("Failed", "Failed"),
        ("Refunded", "Refunded"),
    ]

class Order(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
        ('Delivery Failed', 'Delivery Failed'),
    ]
    

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='COD')
    address = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return f"Order {self.id} by {self.user.username}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Order"
        verbose_name_plural = "Orders"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price_at_purchase = models.DecimalField(max_digits=12, decimal_places=2)
    
    def __str__(self):
        return f"{self.product.name} × {self.quantity} in Order {self.order.id}"
    
    @property
    def subtotal(self):
        return self.price_at_purchase * self.quantity
    
    class Meta:
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"
        
class Sale(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="sale",
        help_text="Order associated with this sale"
    )
    total_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Sale #{self.id} — Order #{self.order.id} — {self.payment_status} — {self.amount}"