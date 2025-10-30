import React, { useState } from 'react';
import { fetchWithAuth } from './auth';

/**
 * PayMongo API utilities for GCash payments
 */

/**
 * Create a GCash payment intent
 * @param {string} orderId - The order ID
 * @param {number} amount - Payment amount in pesos
 * @param {string} description - Payment description
 * @returns {Promise<Object>} Payment intent data
 */
export const createGCashPaymentIntent = async (orderId, amount, description) => {
  try {
    const response = await fetchWithAuth(`/api/inventory/orders/${orderId}/create-gcash-payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        amount: amount,
        description: description,
      }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create GCash payment');
      }

    return await response.json();
  } catch (error) {
    console.error('Error creating GCash payment:', error);
    throw error;
  }
};

/**
 * Verify payment status
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} Payment verification data
 */
export const verifyPayment = async (orderId) => {
  try {
    const response = await fetchWithAuth(`/api/inventory/orders/${orderId}/verify-payment/`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
      },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to verify payment');
      }

    return await response.json();
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * GCash Payment Button Component
 * Handles the GCash payment flow
 */
export const GCashPaymentButton = ({ 
  orderId, 
  clientKey, 
  nextActionUrl, 
  onPaymentSuccess, 
  onPaymentFailure 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayWithGCash = async () => {
    console.log('GCashPaymentButton props:', { orderId, clientKey, nextActionUrl });
    
    if (!clientKey) {
      console.error('No client key available');
      onPaymentFailure?.('No client key available');
      return;
    }

    setIsProcessing(true);
    
    try {
      if (nextActionUrl) {
        // Redirect to PayMongo GCash payment page
        console.log('Redirecting to PayMongo URL:', nextActionUrl);
        window.location.href = nextActionUrl;
      } else {
        // For PayMongo GCash, we need to use their web-based checkout
        console.log('Using client key for GCash payment:', clientKey);
        
        // Extract payment intent ID from client key
        const paymentIntentId = clientKey.split('_client_')[0];
        console.log('Payment intent ID:', paymentIntentId);
        console.log('Order ID:', orderId);
        
        // For new GCash checkout flow (no order ID), create checkout session directly
        if (!orderId || orderId === 'pending') {
          console.log('Creating GCash checkout session for new order');
          
          // Get checkout data from sessionStorage
          const checkoutData = sessionStorage.getItem('gcash_checkout_data');
          if (!checkoutData) {
            throw new Error('No checkout data found');
          }
          
          const data = JSON.parse(checkoutData);
          
          // Create checkout session directly
          const checkoutResponse = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/create-gcash-checkout/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...data,
              clientKey: clientKey,
              paymentIntentId: paymentIntentId
            })
          });
          
          if (checkoutResponse.ok) {
            const checkoutData = await checkoutResponse.json();
            console.log('Checkout session created:', checkoutData);
            
            if (checkoutData.redirect_url) {
              console.log('Redirecting to PayMongo Checkout URL:', checkoutData.redirect_url);
              onPaymentSuccess?.({ clientKey, redirectUrl: checkoutData.redirect_url });
              window.location.href = checkoutData.redirect_url;
            } else {
              throw new Error('No redirect URL provided from PayMongo checkout session');
            }
          } else {
            const errorData = await checkoutResponse.json();
            console.error('Checkout session creation failed:', errorData);
            throw new Error(errorData.detail || 'Failed to create checkout session');
          }
        } else {
          // Existing order flow
          console.log('Making request to:', `${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/create-gcash-payment-method/`);
          
          // Create a payment method for GCash
          const paymentMethodResponse = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/create-gcash-payment-method/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              clientKey: clientKey,
              paymentIntentId: paymentIntentId
            })
          });
        
          console.log('Payment method response status:', paymentMethodResponse.status);
          console.log('Payment method response ok:', paymentMethodResponse.ok);
          
          if (paymentMethodResponse.ok) {
            const paymentMethodData = await paymentMethodResponse.json();
            console.log('Payment method created:', paymentMethodData);
            
            // Check if we have a redirect URL
            if (paymentMethodData.redirect_url) {
              console.log('Redirecting to GCash URL:', paymentMethodData.redirect_url);
              console.log('Alternative URL:', paymentMethodData.alternative_url);
              onPaymentSuccess?.({ clientKey, redirectUrl: paymentMethodData.redirect_url });
              
              // Try the main URL first, if it fails, try the alternative
              try {
                window.location.href = paymentMethodData.redirect_url;
              } catch (error) {
                console.log('Main URL failed, trying alternative:', paymentMethodData.alternative_url);
                window.location.href = paymentMethodData.alternative_url;
              }
            } else {
              throw new Error('No redirect URL provided from PayMongo');
            }
      } else {
            const errorData = await paymentMethodResponse.json();
            console.error('Payment method creation failed:', errorData);
            throw new Error(errorData.detail || 'Failed to create payment method');
          }
        }
      }
    } catch (error) {
      console.error('Error initiating GCash payment:', error);
      onPaymentFailure?.(error.message);
      setIsProcessing(false);
    }
  };

  return (
      <button
      onClick={handlePayWithGCash} 
      disabled={isProcessing}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          Processing GCash Payment...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <img 
              src="/gcash-logo.png" 
              alt="GCash" 
              className="h-6 w-6 mr-2"
            />
            Pay with GCash
          </div>
        )}
      </button>
  );
};

/**
 * Payment Status Component
 * Displays payment status with appropriate styling
 */
export const PaymentStatus = ({ status, className = "" }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return {
          text: 'Paid',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'pending':
        return {
          text: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'failed':
        return {
          text: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'refunded':
        return {
          text: 'Refunded',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      default:
        return {
          text: 'Unpaid',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}>
      {config.text}
    </span>
  );
};

/**
 * Payment Method Display Component
 * Shows payment method with icon
 */
export const PaymentMethodDisplay = ({ method, className = "" }) => {
  const getMethodConfig = (method) => {
    switch (method?.toLowerCase()) {
      case 'gcash':
        return {
          text: 'GCash',
          icon: '/gcash-logo.png',
          className: 'text-blue-600'
        };
      case 'cod':
        return {
          text: 'Cash on Delivery',
          icon: '/cash-on-delivery-icon.png',
          className: 'text-green-600'
        };
      default:
        return {
          text: method || 'Unknown',
          icon: null,
          className: 'text-gray-600'
        };
    }
  };

  const config = getMethodConfig(method);

  return (
    <div className={`flex items-center ${config.className} ${className}`}>
      {config.icon && (
        <img 
          src={config.icon} 
          alt={config.text} 
          className="h-4 w-4 mr-2"
        />
      )}
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
};

/**
 * Format currency for display
 * @param {number} amount - Amount in pesos
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Parse payment status from PayMongo response
 * @param {Object} paymentData - PayMongo payment data
 * @returns {string} Payment status
 */
export const parsePaymentStatus = (paymentData) => {
  if (!paymentData) return 'unknown';
  
  const status = paymentData.status || paymentData.payment_status;
  
  switch (status?.toLowerCase()) {
    case 'succeeded':
    case 'paid':
      return 'paid';
    case 'pending':
    case 'processing':
      return 'pending';
    case 'failed':
    case 'declined':
      return 'failed';
    case 'cancelled':
    case 'canceled':
      return 'failed';
    case 'refunded':
      return 'refunded';
    default:
      return 'unknown';
  }
};

/**
 * Check if payment is successful
 * @param {Object} paymentData - PayMongo payment data
 * @returns {boolean} True if payment is successful
 */
export const isPaymentSuccessful = (paymentData) => {
  return parsePaymentStatus(paymentData) === 'paid';
};

/**
 * Get payment error message
 * @param {Object} error - Error object
 * @returns {string} User-friendly error message
 */
export const getPaymentErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  
  if (error?.message) {
    // Handle specific PayMongo error messages
    if (error.message.includes('insufficient_funds')) {
      return 'Insufficient funds in your GCash account';
    }
    if (error.message.includes('expired')) {
      return 'Payment session has expired. Please try again';
    }
    if (error.message.includes('cancelled')) {
      return 'Payment was cancelled';
    }
    return error.message;
  }
  
  return 'Payment failed. Please try again';
};

/**
 * Validate payment amount
 * @param {number} amount - Payment amount
 * @returns {boolean} True if amount is valid
 */
export const validatePaymentAmount = (amount) => {
  return typeof amount === 'number' && amount > 0 && amount <= 100000; // Max 100k PHP
};

/**
 * Generate payment reference
 * @param {string} orderId - Order ID
 * @returns {string} Payment reference
 */
export const generatePaymentReference = (orderId) => {
  const timestamp = Date.now();
  return `PAY-${orderId}-${timestamp}`;
};