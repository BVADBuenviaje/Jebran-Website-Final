from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0035_remove_ingredient_current_stock_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductionWindowConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("default_start_time", models.TimeField(default=datetime.time(22, 0))),
                ("default_end_time", models.TimeField(default=datetime.time(21, 59))),
                ("timezone", models.CharField(default="Asia/Manila", max_length=64)),
                ("allow_custom_windows", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Production Window Configuration",
                "verbose_name_plural": "Production Window Configuration",
            },
        ),
        migrations.CreateModel(
            name="ProductionBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("window_start", models.DateTimeField()),
                ("window_end", models.DateTimeField()),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("completed", "Completed"), ("cancelled", "Cancelled")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("produced_at", models.DateTimeField(blank=True, null=True)),
                ("cancelled_at", models.DateTimeField(blank=True, null=True)),
                ("cancelled_reason", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "cancelled_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="cancelled_batches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_batches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "produced_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="produced_batches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Production Batch",
                "verbose_name_plural": "Production Batches",
                "ordering": ["-window_start"],
                "indexes": [
                    models.Index(fields=["status"], name="inventory_pr_status_idx"),
                    models.Index(fields=["window_start", "window_end"], name="inventory_pr_window_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="ProductionBatchOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sequence", models.PositiveIntegerField(default=0, help_text="Manual ordering within the batch")),
                (
                    "adjustment_payload",
                    models.JSONField(blank=True, help_text="Overrides applied for this order before production", null=True),
                ),
                ("notes", models.TextField(blank=True)),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                (
                    "assigned_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="batch_order_assignments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "batch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="batch_orders",
                        to="inventory.productionbatch",
                    ),
                ),
                (
                    "order",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="batch_assignment",
                        to="inventory.order",
                    ),
                ),
            ],
            options={
                "verbose_name": "Production Batch Order",
                "verbose_name_plural": "Production Batch Orders",
                "ordering": ["sequence", "order_id"],
            },
        ),
        migrations.CreateModel(
            name="IngredientConsumption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity_used", models.DecimalField(decimal_places=3, max_digits=12)),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "unit_cost_snapshot",
                    models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True,
                                        help_text="Optional capture of cost basis"),
                ),
                (
                    "ingredient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="production_consumptions",
                        to="inventory.ingredient",
                    ),
                ),
                (
                    "ingredient_batch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="production_consumptions",
                        to="inventory.ingredientbatch",
                    ),
                ),
                (
                    "production_batch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ingredient_consumptions",
                        to="inventory.productionbatch",
                    ),
                ),
            ],
            options={
                "verbose_name": "Ingredient Consumption",
                "verbose_name_plural": "Ingredient Consumptions",
                "indexes": [
                    models.Index(fields=["production_batch", "ingredient"], name="inventory_ic_batch_ing_idx"),
                ],
            },
        ),
        migrations.AddField(
            model_name="productingredient",
            name="is_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Disable to temporarily exclude this ingredient from production calculations",
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="production_batch",
            field=models.ForeignKey(
                blank=True,
                help_text="Production batch this order is assigned to",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="orders",
                to="inventory.productionbatch",
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="production_batch_assigned_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="production_batch_assigned_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_batch_orders",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
