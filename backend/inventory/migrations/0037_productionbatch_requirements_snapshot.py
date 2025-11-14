from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0036_production_workflow"),
    ]

    operations = [
        migrations.AddField(
            model_name="productionbatch",
            name="requirements_snapshot",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="productionbatch",
            name="requirements_snapshot_captured_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
