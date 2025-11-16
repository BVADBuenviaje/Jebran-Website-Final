from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "password",
            "full_name", "email", "role",
            "contact_number", "shop_name", "shop_address",
            "proof_of_business",
            "date_joined",        # <-- Add this
            "last_active",        # <-- Add this
             "is_blocked",  # <-- Add this line
        ]
        read_only_fields = ["date_joined", "last_active"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        # Prevent creating superadmin via serializer unless explicitly allowed
        if validated_data.get("role") == "superadmin":
            raise serializers.ValidationError("Cannot create superadmin via signup.")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        # Prevent changing role if user is superadmin
        if instance.role == "superadmin" and "role" in validated_data and validated_data["role"] != "superadmin":
            raise serializers.ValidationError("You cannot change the role of a superadmin.")
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance