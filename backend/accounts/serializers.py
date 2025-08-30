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
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance