from rest_framework import serializers
from .models import Ingredient
from .models import Supplier
from .models import Product, ProductIngredient

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = "__all__"

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"

class ProductIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='ingredient.name')

    class Meta:
        model = ProductIngredient
        fields = ["name", "quantity", "uom"]

class ProductSerializer(serializers.ModelSerializer):
    # Read: list ingredient items
    ingredients = ProductIngredientReadSerializer(source='product_ingredients', many=True, read_only=True)
    # Write: accept list of {name, quantity, uom}
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