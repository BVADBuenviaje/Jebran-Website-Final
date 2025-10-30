from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.views import View
from django.db import models
import json
import logging
from .models import Order, Sale
from .services import PayMongoService
from django.conf import settings

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class PayMongoWebhookView(View):
    """
    Handle PayMongo webhook events
    """
    
    def post(self, request):
        try:
            # Get the raw body and signature
            payload = request.body.decode('utf-8')
            signature = request.headers.get('Paymongo-Signature', '')
            
            # TEMPORARILY DISABLED: Verify webhook signature for testing
            # paymongo_service = PayMongoService()
            # if not paymongo_service.verify_webhook_signature(payload, signature):
            #     logger.warning("Invalid webhook signature")
            #     return JsonResponse({"error": "Invalid signature"}, status=400)
            
            logger.info("⚠️  SIGNATURE VERIFICATION TEMPORARILY DISABLED IN OLD WEBHOOK FOR TESTING")
            
            # Parse the webhook data
            data = json.loads(payload)
            event_type = data.get('type')
            event_data = data.get('data', {})
            
            logger.info(f"Received PayMongo webhook: {event_type}")
            
            if event_type == 'payment.paid':
                self.handle_payment_success(event_data)
            elif event_type == 'payment.refunded':
                self.handle_payment_refunded(event_data)
            elif event_type == 'payment.refund.updated':
                self.handle_refund_updated(event_data)
            else:
                logger.info(f"Unhandled webhook event: {event_type}")
            
            return JsonResponse({"status": "success"})
            
        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
            return JsonResponse({"error": "Internal server error"}, status=500)
    
    def handle_payment_success(self, event_data):
        """Handle successful payment"""
        try:
            payment_intent_id = event_data.get('id')
            if not payment_intent_id:
                logger.error("No payment intent ID in webhook data")
                return
            
            # Find the order
            order = Order.objects.filter(paymongo_payment_intent_id=payment_intent_id).first()
            if not order:
                logger.error(f"Order not found for payment intent: {payment_intent_id}")
                return
            
            # Update order status
            order.payment_status = 'Paid'
            order.paymongo_status = 'succeeded'
            order.payment_reference = payment_intent_id
            order.save()
            
            # Create Sale record if not exists
            if not hasattr(order, "sale"):
                Sale.objects.create(
                    order=order,
                    total_paid=order.total_price,
                    payment_method=order.payment_method,
                    payment_status='Paid',
                    payment_reference=payment_intent_id,
                    handled_by=None,  # System processed
                    notes="Payment processed via PayMongo webhook"
                )
            
            logger.info(f"Payment succeeded for order {order.id}")
            
        except Exception as e:
            logger.error(f"Error handling payment success: {e}")
    
    def handle_payment_refunded(self, event_data):
        """Handle refunded payment"""
        try:
            payment_id = event_data.get('id')
            if not payment_id:
                logger.error("No payment ID in webhook data")
                return
            
            # Find the order by payment reference or payment intent ID
            order = Order.objects.filter(
                models.Q(payment_reference=payment_id) | 
                models.Q(paymongo_payment_intent_id=payment_id)
            ).first()
            
            if not order:
                logger.error(f"Order not found for payment: {payment_id}")
                return
            
            # Update order status
            order.payment_status = 'Refunded'
            order.paymongo_status = 'refunded'
            order.save()
            
            # Update Sale record if exists
            if hasattr(order, "sale"):
                order.sale.payment_status = 'Refunded'
                order.sale.notes = f"Payment refunded via PayMongo webhook. Original payment: {payment_id}"
                order.sale.save()
            
            logger.info(f"Payment refunded for order {order.id}")
            
        except Exception as e:
            logger.error(f"Error handling payment refund: {e}")
    
    def handle_refund_updated(self, event_data):
        """Handle refund status update"""
        try:
            refund_id = event_data.get('id')
            refund_status = event_data.get('attributes', {}).get('status')
            
            if not refund_id:
                logger.error("No refund ID in webhook data")
                return
            
            logger.info(f"Refund {refund_id} status updated to: {refund_status}")
            
            # You can add specific logic here based on refund status
            # For now, just log the update
            
        except Exception as e:
            logger.error(f"Error handling refund update: {e}")
