# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0022_order_payment_reference_alter_order_payment_method_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_temporary',
            field=models.BooleanField(default=False, help_text='True if this is a temporary order pending payment confirmation'),
        ),
    ]
