from django.db import migrations, models
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Min


def forwards(apps, schema_editor):
    Ingredient = apps.get_model('inventory', 'Ingredient')
    IngredientBatch = apps.get_model('inventory', 'IngredientBatch')
    ResupplyOrderItem = apps.get_model('inventory', 'ResupplyOrderItem')

    now = timezone.now()

    # Create one initial IngredientBatch per Ingredient using legacy fields
    for ing in Ingredient.objects.all():
        old_qty = getattr(ing, 'current_stock', None)
        old_expiry = getattr(ing, 'expiry_date', None)
        try:
            qty_val = Decimal(old_qty) if old_qty is not None else None
        except Exception:
            qty_val = None
        if qty_val and qty_val > 0:
            IngredientBatch.objects.create(
                ingredient_id=ing.id,
                order_item=None,
                quantity_received=qty_val,
                current_quantity=qty_val,
                expiry_date=old_expiry,
                received_date=now,
                supplier_batch_code=None
            )

    # Copy legacy ResupplyOrderItem.quantity -> quantity_ordered when not set
    for item in ResupplyOrderItem.objects.all():
        legacy_qty = getattr(item, 'quantity', None)
        if getattr(item, 'quantity_ordered', None) in (None, '') and legacy_qty is not None:
            try:
                item.quantity_ordered = Decimal(legacy_qty)
                item.save(update_fields=['quantity_ordered'])
            except Exception:
                continue


def backwards(apps, schema_editor):
    Ingredient = apps.get_model('inventory', 'Ingredient')
    IngredientBatch = apps.get_model('inventory', 'IngredientBatch')
    ResupplyOrderItem = apps.get_model('inventory', 'ResupplyOrderItem')

    # Aggregate batches back into Ingredient.current_stock and expiry_date (min expiry)
    for ing in Ingredient.objects.all():
        agg = IngredientBatch.objects.filter(ingredient_id=ing.id).aggregate(total=Sum('current_quantity'), min_exp=Min('expiry_date'))
        total = agg.get('total') or 0
        min_exp = agg.get('min_exp')
        if hasattr(ing, 'current_stock'):
            ing.current_stock = Decimal(total)
        if hasattr(ing, 'expiry_date'):
            ing.expiry_date = min_exp
        ing.save(update_fields=[f for f in ['current_stock', 'expiry_date'] if hasattr(ing, f)])

    # Copy quantity_ordered back to legacy quantity when appropriate
    for item in ResupplyOrderItem.objects.all():
        q_ord = getattr(item, 'quantity_ordered', None)
        if q_ord is not None and getattr(item, 'quantity', None) in (None, 0):
            try:
                item.quantity = Decimal(q_ord)
                item.save(update_fields=['quantity'])
            except Exception:
                continue


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0033_resupplyorderitem_quantity_ordered_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]