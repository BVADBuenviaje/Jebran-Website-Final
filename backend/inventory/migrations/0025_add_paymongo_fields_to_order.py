# Generated manually for PayMongo integration

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0024_add_payment_status_to_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='paymongo_payment_intent_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='paymongo_payment_method_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='paymongo_client_key',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='paymongo_status',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
