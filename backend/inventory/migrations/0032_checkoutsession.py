# Generated manually for CheckoutSession model - handles existing table

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0031_merge_20251017_1240'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # First, check if the table exists and drop it if it does
        migrations.RunSQL(
            "DROP TABLE IF EXISTS inventory_checkoutsession CASCADE;",
            reverse_sql="-- No reverse operation needed"
        ),
        # Then create the table properly
        migrations.CreateModel(
            name='CheckoutSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cart_snapshot', models.JSONField(help_text='Store items: [{product_id, name, qty, price}, ...]')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(default='PHP', max_length=8)),
                ('payment_method', models.CharField(help_text='gcash, cod, etc.', max_length=32)),
                ('paymongo_session_id', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('metadata', models.JSONField(blank=True, help_text='Optional extra data from PayMongo', null=True)),
                ('address', models.TextField(blank=True, help_text='Shipping address for this checkout session')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Checkout Session',
                'verbose_name_plural': 'Checkout Sessions',
                'ordering': ['-created_at'],
            },
        ),
    ]
