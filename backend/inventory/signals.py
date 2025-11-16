from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ProductIngredient, Ingredient, ProductionBatch, Product
from .production import ProductionService
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Product)
def recalculate_pending_batches_on_product_change(sender, instance, **kwargs):
    """
    Recalculate requirements snapshots for all pending batches when:
    - A Product's status changes (Active/Inactive)
    
    This ensures the disabled products indicator is always accurate in real-time.
    """
    # Only recalculate for pending batches that might contain this product
    # We check if the product is in any orders that are in pending batches
    # Find pending batches that have orders containing this product
    pending_batches = ProductionBatch.objects.filter(
        status='pending',
        batch_orders__order__items__product=instance
    ).distinct()
    
    if not pending_batches.exists():
        return
    
    service = ProductionService()
    count = 0
    
    for batch in pending_batches:
        try:
            service.recalculate_and_save_batch_requirements(batch)
            count += 1
        except Exception as e:
            logger.error(f"Failed to recalculate batch {batch.id}: {e}")
    
    if count > 0:
        logger.info(f"Recalculated {count} pending batch(es) after Product status change: {instance.name} ({instance.status})")


@receiver(post_save, sender=Ingredient)
@receiver(post_save, sender=ProductIngredient)
def recalculate_pending_batches_on_ingredient_change(sender, instance, **kwargs):
    """
    Recalculate requirements snapshots for all pending batches when:
    - An Ingredient's is_active flag changes
    - A ProductIngredient is created, updated (especially is_enabled), or modified
    
    This ensures the disabled ingredients indicator is always accurate in real-time.
    """
    # Only recalculate for pending batches
    pending_batches = ProductionBatch.objects.filter(status='pending')
    
    if not pending_batches.exists():
        return
    
    service = ProductionService()
    count = 0
    
    for batch in pending_batches:
        try:
            service.recalculate_and_save_batch_requirements(batch)
            count += 1
        except Exception as e:
            logger.error(f"Failed to recalculate batch {batch.id}: {e}")
    
    model_name = sender.__name__
    if model_name == "Ingredient":
        logger.info(f"Recalculated {count} pending batch(es) after Ingredient change: {instance.name}")
    else:
        logger.info(f"Recalculated {count} pending batch(es) after ProductIngredient change: {instance.product.name}")


@receiver(post_delete, sender=Ingredient)
@receiver(post_delete, sender=ProductIngredient)
def recalculate_pending_batches_on_ingredient_delete(sender, instance, **kwargs):
    """
    Recalculate requirements snapshots for all pending batches when:
    - An Ingredient is deleted from the system
    - A ProductIngredient relationship is removed
    """
    pending_batches = ProductionBatch.objects.filter(status='pending')
    
    if not pending_batches.exists():
        return
    
    service = ProductionService()
    count = 0
    
    for batch in pending_batches:
        try:
            service.recalculate_and_save_batch_requirements(batch)
            count += 1
        except Exception as e:
            logger.error(f"Failed to recalculate batch {batch.id}: {e}")
    
    model_name = sender.__name__
    if model_name == "Ingredient":
        logger.info(f"Recalculated {count} pending batch(es) after Ingredient deletion: {instance.name}")
    else:
        logger.info(f"Recalculated {count} pending batch(es) after ProductIngredient deletion: {instance.product.name}")
