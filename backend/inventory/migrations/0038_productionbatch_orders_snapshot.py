from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0037_productionbatch_requirements_snapshot"),
    ]

    operations = [
        migrations.AddField(
            model_name="productionbatch",
            name="orders_snapshot",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="productionbatch",
            name="orders_snapshot_captured_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
