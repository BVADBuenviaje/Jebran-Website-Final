# Generated manually to fix checkout error

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0023_alter_sale_options_sale_handled_by_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='payment_status',
            field=models.CharField(choices=[('Unpaid', 'Unpaid'), ('Paid', 'Paid'), ('Pending', 'Pending'), ('Failed', 'Failed'), ('Refunded', 'Refunded')], default='Unpaid', max_length=20),
        ),
    ]
