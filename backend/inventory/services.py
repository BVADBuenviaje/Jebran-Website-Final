import requests
import json
import base64
from django.conf import settings
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

class PayMongoService:
    def __init__(self):
        self.secret_key = settings.PAYMONGO_SECRET_KEY
        self.public_key = settings.PAYMONGO_PUBLIC_KEY
        self.base_url = settings.PAYMONGO_BASE_URL
        self.webhook_secret = settings.PAYMONGO_WEBHOOK_SECRET
        
        if not self.secret_key:
            raise ValidationError("PayMongo secret key not configured")
        
        if not self.public_key:
            raise ValidationError("PayMongo public key not configured")
        
        # Validate API key format
        if not self.secret_key.startswith('sk_'):
            raise ValidationError("Invalid PayMongo secret key format. Should start with 'sk_'")
        
        if not self.public_key.startswith('pk_'):
            raise ValidationError("Invalid PayMongo public key format. Should start with 'pk_'")
    
    def _get_headers(self, use_secret=True):
        """Get headers for PayMongo API requests"""
        key = self.secret_key if use_secret else self.public_key
        
        # PayMongo expects the API key to be base64 encoded with a colon
        auth_string = f"{key}:"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()
        
        headers = {
            'Authorization': f'Basic {encoded_auth}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        logger.info(f"Using {'secret' if use_secret else 'public'} key: {key[:10]}...")
        logger.info(f"Full key format check - starts with sk_: {key.startswith('sk_') if use_secret else 'N/A'}")
        logger.info(f"Full key format check - starts with pk_: {key.startswith('pk_') if not use_secret else 'N/A'}")
        return headers
    
    def test_api_connection(self):
        """Test API connection with a simple request"""
        try:
            # Test with a simple endpoint that should work
            url = f"{self.base_url}/payment_intents"
            response = requests.get(url, headers=self._get_headers())
            logger.info(f"API test response status: {response.status_code}")
            logger.info(f"API test response headers: {response.headers}")
            logger.info(f"API test response body: {response.text[:200]}...")
            
            # Accept both 200 (success) and 400 (bad request but API is reachable)
            return response.status_code in [200, 400]
        except Exception as e:
            logger.error(f"API test failed: {e}")
            return False
    
    def create_payment_intent(self, amount, currency='PHP', description='', metadata=None):
        """
        Create a payment intent for GCash payment
        
        Args:
            amount: Amount in cents (e.g., 1000 for ₱10.00)
            currency: Currency code (default: PHP)
            description: Description of the payment
            metadata: Additional metadata
            
        Returns:
            dict: Payment intent data
        """
        try:
            url = f"{self.base_url}/payment_intents"
            
            data = {
                'data': {
                    'attributes': {
                        'amount': amount,
                        'currency': currency,
                        'payment_method_allowed': ['gcash'],
                        'description': description,
                        'metadata': metadata or {}
                    }
                }
            }
            
            logger.info(f"Creating payment intent with amount: {amount} cents")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request data: {json.dumps(data, indent=2)}")
            logger.info(f"Request headers: {self._get_headers()}")
            
            response = requests.post(
                url,
                headers=self._get_headers(),
                data=json.dumps(data)
            )
            
            logger.info(f"Payment intent response status: {response.status_code}")
            logger.info(f"Payment intent response headers: {response.headers}")
            logger.info(f"Payment intent response body: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Payment intent created: {result['data']['id']}")
            return result['data']
            
        except requests.exceptions.RequestException as e:
            logger.error(f"PayMongo API error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response headers: {e.response.headers}")
                logger.error(f"Response content: {e.response.text}")
            raise ValidationError(f"Failed to create payment intent: {str(e)}")
    
    def attach_payment_method(self, payment_intent_id, payment_method_id, return_url=None):
        """
        Attach a payment method to a payment intent
        
        Args:
            payment_intent_id: ID of the payment intent
            payment_method_id: ID of the payment method
            return_url: URL to return to after payment
            
        Returns:
            dict: Updated payment intent data
        """
        try:
            url = f"{self.base_url}/payment_intents/{payment_intent_id}/attach"
            
            data = {
                'data': {
                    'attributes': {
                        'payment_method': payment_method_id
                    }
                }
            }
            
            if return_url:
                data['data']['attributes']['return_url'] = return_url
            
            logger.info(f"Attaching payment method {payment_method_id} to intent {payment_intent_id}")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request data: {json.dumps(data, indent=2)}")
            
            response = requests.post(
                url,
                headers=self._get_headers(),
                data=json.dumps(data)
            )
            
            logger.info(f"Attach response status: {response.status_code}")
            logger.info(f"Attach response body: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Payment method attached to intent: {payment_intent_id}")
            return result['data']
            
        except requests.exceptions.RequestException as e:
            logger.error(f"PayMongo attach error: {e}")
            raise ValidationError(f"Failed to attach payment method: {str(e)}")
    
    def create_payment_method(self, type='gcash', details=None):
        """
        Create a payment method
        
        Args:
            type: Payment method type (default: gcash)
            details: Payment method details
            
        Returns:
            dict: Payment method data
        """
        try:
            url = f"{self.base_url}/payment_methods"
            
            data = {
                'data': {
                    'attributes': {
                        'type': type,
                        'details': details or {}
                    }
                }
            }
            
            logger.info(f"Creating payment method of type: {type}")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request data: {json.dumps(data, indent=2)}")
            
            response = requests.post(
                url,
                headers=self._get_headers(),
                data=json.dumps(data)
            )
            
            logger.info(f"Payment method response status: {response.status_code}")
            logger.info(f"Payment method response body: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Payment method created: {result['data']['id']}")
            return result['data']
            
        except requests.exceptions.RequestException as e:
            logger.error(f"PayMongo payment method error: {e}")
            raise ValidationError(f"Failed to create payment method: {str(e)}")
    
    def get_payment_intent(self, payment_intent_id):
        """
        Retrieve a payment intent
        
        Args:
            payment_intent_id: ID of the payment intent
            
        Returns:
            dict: Payment intent data
        """
        try:
            url = f"{self.base_url}/payment_intents/{payment_intent_id}"
            
            response = requests.get(
                url,
                headers=self._get_headers()
            )
            
            response.raise_for_status()
            result = response.json()
            
            return result['data']
            
        except requests.exceptions.RequestException as e:
            logger.error(f"PayMongo get intent error: {e}")
            raise ValidationError(f"Failed to retrieve payment intent: {str(e)}")
    
    def create_checkout_session(self, amount, description, success_url, cancel_url, line_items=None):
        """
        Create a PayMongo Checkout Session
        
        Args:
            amount: Amount in cents (e.g., 50000 for ₱500.00)
            description: Description of the order
            success_url: URL to redirect to on success
            cancel_url: URL to redirect to on cancellation
            line_items: List of line items for the order
            
        Returns:
            dict: Checkout session data
        """
        try:
            url = f"{self.base_url}/checkout_sessions"
            
            # Convert amount to cents if it's in pesos
            if isinstance(amount, float) and amount < 1000:  # Likely in pesos
                amount_cents = int(amount * 100)
            else:
                amount_cents = int(amount)
            
            # Default line items if none provided
            if not line_items:
                line_items = [{
                    "currency": "PHP",
                    "amount": amount_cents,
                    "description": description,
                    "name": description,
                    "quantity": 1
                }]
            
            data = {
                'data': {
                    'attributes': {
                        'send_email_receipt': False,
                        'show_description': True,
                        'show_line_items': True,
                        'cancel_url': cancel_url,
                        'success_url': success_url,
                        'description': description,
                        'payment_method_types': ['gcash'],
                        'line_items': line_items
                    }
                }
            }
            
            logger.info(f"Creating PayMongo checkout session")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request data: {json.dumps(data, indent=2)}")
            
            response = requests.post(
                url,
                headers=self._get_headers(),
                data=json.dumps(data)
            )
            
            logger.info(f"Checkout session response status: {response.status_code}")
            logger.info(f"Checkout session response body: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Checkout session created: {result['data']['id']}")
            return result['data']
            
        except requests.exceptions.RequestException as e:
            logger.error(f"PayMongo API error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response headers: {e.response.headers}")
                logger.error(f"Response content: {e.response.text}")
            raise ValidationError(f"Failed to create checkout session: {str(e)}")
    
    def verify_webhook_signature(self, payload, signature):
        """
        Verify webhook signature for security
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature header
            
        Returns:
            bool: True if signature is valid
        """
        try:
            import hmac
            import hashlib
            
            expected_signature = hmac.new(
                self.webhook_secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Webhook signature verification error: {e}")
            return False
    
    def process_gcash_payment(self, amount, description, order_id):
        """
        Process a GCash payment
        
        Args:
            amount: Amount in PHP (e.g., 10.00 for ₱10.00)
            description: Payment description
            order_id: Order ID for reference
            
        Returns:
            dict: Payment intent data with client key
        """
        try:
            # Convert amount to cents
            amount_cents = int(float(amount) * 100)
            
            # Create payment intent
            payment_intent = self.create_payment_intent(
                amount=amount_cents,
                currency='PHP',
                description=description,
                metadata={
                    'order_id': str(order_id),
                    'source': 'jebran_website'
                }
            )
            
            return {
                'payment_intent_id': payment_intent['id'],
                'client_key': payment_intent['attributes']['client_key'],
                'next_action': payment_intent['attributes'].get('next_action', {}),
                'status': payment_intent['attributes']['status']
            }
            
        except Exception as e:
            logger.error(f"GCash payment processing error: {e}")
            raise ValidationError(f"Failed to process GCash payment: {str(e)}")
