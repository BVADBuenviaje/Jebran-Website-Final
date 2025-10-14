from rest_framework import serializers
import json
from .models import Ingredient, Supplier, IngredientSupplier
from .models import Product, ProductIngredient, Cart, CartItem

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = "__all__"

class SupplierIngredientDetailSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)
    class Meta:
        model = IngredientSupplier
        fields = ["ingredient", "price", "is_active"]  # <-- Add is_active here

class SupplierSerializer(serializers.ModelSerializer):
    ingredients_supplied = SupplierIngredientDetailSerializer(
        source="ingredient_suppliers", many=True, read_only=True
    )

    class Meta:
        model = Supplier
        fields = "__all__"

class IngredientSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngredientSupplier
        fields = ["id", "supplier", "ingredient", "price", "is_active"]

class ProductIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='ingredient.name')

    class Meta:
        model = ProductIngredient
        fields = ["name", "quantity", "uom"]

class ProductSerializer(serializers.ModelSerializer):
    # Read: list ingredient items
    ingredients = ProductIngredientReadSerializer(source='product_ingredients', many=True, read_only=True)
    # Write: accept JSON string of ingredient items
    ingredient_items = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "status", "description", "image", "ingredients", "ingredient_items"]

    def _get_or_create_ingredient(self, name):
        return Ingredient.objects.get_or_create(name=name, defaults={
            "unit_of_measurement": "piece",
            "restock_level": 0,
            "current_stock": 0,
        })[0]

    def _set_items(self, product, items):
        ProductIngredient.objects.filter(product=product).delete()
        bulk = []
        for item in items or []:
            name = (item.get("name") or "").strip()
            if not name:
                continue
            ing = self._get_or_create_ingredient(name)
            quantity = item.get("quantity")
            uom = (item.get("uom") or "").strip()
            bulk.append(ProductIngredient(product=product, ingredient=ing, quantity=quantity, uom=uom))
        if bulk:
            ProductIngredient.objects.bulk_create(bulk)

    def create(self, validated_data):
        items_json = validated_data.pop("ingredient_items", "[]")
        try:
            items = json.loads(items_json) if items_json else []
        except json.JSONDecodeError:
            items = []
        product = super().create(validated_data)
        self._set_items(product, items)
        return product

    def update(self, instance, validated_data):
        items_json = validated_data.pop("ingredient_items", None)
        try:
            items = json.loads(items_json) if items_json else []
        except json.JSONDecodeError:
            items = []
        product = super().update(instance, validated_data)
        if items_json is not None:
            self._set_items(product, items)
        return product


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, source='product')
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        price = obj.product.price or 0
        return float(price) * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_price", "created_at"]

    def get_total_price(self, obj):
        return float(sum((item.product.price or 0) * item.quantity for item in obj.items.all()))