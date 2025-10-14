from rest_framework import serializers
from .models import Ingredient, Supplier, IngredientSupplier
from .models import Product, ProductIngredient
from .models import ResupplyOrder, ResupplyOrderItem

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = "__all__"

class SupplierIngredientDetailSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)
    class Meta:
        model = IngredientSupplier
        fields = ["ingredient", "price", "is_active"]

class SupplierSerializer(serializers.ModelSerializer):
    ingredients_supplied = SupplierIngredientDetailSerializer(
        source="ingredient_suppliers", many=True, read_only=True
    )
    class Meta:
        model = Supplier
        fields = "__all__"

class IngredientSupplierSerializer(serializers.ModelSerializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    ingredient_detail = IngredientSerializer(source='ingredient', read_only=True)
    class Meta:
        model = IngredientSupplier
        fields = ["id", "supplier", "ingredient", "ingredient_detail", "price", "is_active"]

class ProductIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='ingredient.name')
    class Meta:
        model = ProductIngredient
        fields = ["name", "quantity", "uom"]

class ProductSerializer(serializers.ModelSerializer):
    ingredients = ProductIngredientReadSerializer(source='product_ingredients', many=True, read_only=True)
    ingredient_items = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    class Meta:
        model = Product
        fields = ["id", "name", "category", "price", "stock", "status", "ingredients", "ingredient_items"]

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
        items = validated_data.pop("ingredient_items", [])
        product = super().create(validated_data)
        self._set_items(product, items)
        return product

    def update(self, instance, validated_data):
        items = validated_data.pop("ingredient_items", None)
        product = super().update(instance, validated_data)
        if items is not None:
            self._set_items(product, items)
        return product

class ResupplyOrderItemSerializer(serializers.ModelSerializer):
    ingredient_detail = IngredientSerializer(source='ingredient', read_only=True)
    class Meta:
        model = ResupplyOrderItem
        fields = ["ingredient", "ingredient_detail", "quantity"]

class ResupplyOrderSerializer(serializers.ModelSerializer):
    items = ResupplyOrderItemSerializer(many=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = ResupplyOrder
        fields = ["id", "supplier", "supplier_detail", "status", "order_date", "items"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = ResupplyOrder.objects.create(**validated_data)
        for item_data in items_data:
            ResupplyOrderItem.objects.create(order=order, **item_data)
        return order