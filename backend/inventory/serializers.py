from rest_framework import serializers
import json
from .models import Ingredient, Supplier, IngredientSupplier
from .models import Product, ProductIngredient, Cart, CartItem
from .models import Product, ProductIngredient
from .models import ResupplyOrder, ResupplyOrderItem, Order, OrderItem
from rest_framework import serializers
from .models import Sale, Order, CheckoutSession, PAYMENT_METHOD_CHOICES, PAYMENT_STATUS_CHOICES

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
    # Write: accept JSON string of ingredient items
    ingredient_items = serializers.CharField(write_only=True, required=False)

    # ingredient_items = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
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


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, source='product')
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "quantity", "price_at_purchase", "subtotal"]

    def get_subtotal(self, obj):
        return float(obj.price_at_purchase * obj.quantity)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "user", "created_at", "total_price", "payment_method", "payment_status", 
            "address", "status", "payment_reference", "items", "is_temporary",
            "paymongo_payment_intent_id", "paymongo_payment_method_id", 
            "paymongo_client_key", "paymongo_status"
        ]

    def create(self, validated_data):
        # This will be handled in the view
        return super().create(validated_data)


class CheckoutSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PAYMENT_METHOD_CHOICES)
    address = serializers.CharField(max_length=500)
    selected_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )

class SaleSerializer(serializers.ModelSerializer):
    order_details = OrderSerializer(source='order', read_only=True)
    handled_by_name = serializers.CharField(source='handled_by.username', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            "id", "order", "order_details", "total_paid", "payment_method", "payment_status",
            "payment_reference", "payment_date", "handled_by", "handled_by_name", "notes"
        ]
        read_only_fields = ["id", "order", "total_paid", "payment_date", "handled_by"]

class PaymentConfirmSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PAYMENT_METHOD_CHOICES)
    payment_status = serializers.ChoiceField(choices=PAYMENT_STATUS_CHOICES)
    payment_reference = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class CheckoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckoutSession
        fields = "__all__"
        read_only_fields = ("id", "paymongo_session_id", "status", "created_at", "metadata")
