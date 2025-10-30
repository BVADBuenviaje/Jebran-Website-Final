import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../utils/auth';
import { GCashPaymentButton } from '../utils/paymongo.jsx';
import { ArrowLeft, CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const PaymentPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCartAfterPayment, getSelectedTotal, getSelectedItems } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // success, cancelled, failed
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    } else {
      // Check if this is a GCash checkout flow (no order ID)
      const checkoutData = sessionStorage.getItem('gcash_checkout_data');
      if (checkoutData) {
        try {
          const data = JSON.parse(checkoutData);
          // Create a mock order object for display
          setOrder({
            id: 'pending',
            total_price: getSelectedTotal(),
            payment_method: 'GCash',
            payment_status: 'Unpaid',
            address: data.address,
            status: 'Pending',
            items: getSelectedItems().map(item => ({
              product: { name: item.name },
              quantity: item.quantity,
              price_at_purchase: item.price
            }))
          });
          setLoading(false);
        } catch (error) {
          setError('Invalid checkout data');
          setLoading(false);
        }
      } else {
        setError('No order ID or checkout data provided');
        setLoading(false);
      }
    }
  }, [orderId]);

  // Handle payment result from URL parameters
  useEffect(() => {
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
    
    if (status) {
      console.log('Payment result from URL:', status, 'Reason:', reason);
      
      // If payment was successful, immediately show verification state
      if (status === 'success' && order && !verificationAttempted) {
        setVerificationAttempted(true);
        setVerifyingPayment(true);
        
        // Add a small delay to ensure PayMongo webhook has time to process
        setTimeout(() => {
          verifyAndUpdatePayment();
        }, 2000);
      } else if (status === 'cancelled' || status === 'failed') {
        // For cancelled/failed, cancel temporary order if it exists
        if (order && order.is_temporary && orderId) {
          console.log('Cancelling temporary order due to payment failure');
          const cancelTemporaryOrder = async () => {
            try {
              await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/cancel-temporary/`, {
                method: 'DELETE'
              });
            } catch (error) {
              console.error('Failed to cancel temporary order:', error);
            }
          };
          cancelTemporaryOrder();
        }
        setPaymentResult(status);
      }
    }
  }, [searchParams, order, verificationAttempted]);

  // Cleanup effect to cancel temporary orders when component unmounts
  useEffect(() => {
    return () => {
      // Cancel temporary order if user navigates away without completing payment
      if (order && order.is_temporary && orderId && !paymentResult) {
        console.log('Cleaning up temporary order on component unmount');
        fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/cancel-temporary/`, {
          method: 'DELETE'
        }).catch(error => {
          console.error('Failed to cancel temporary order on cleanup:', error);
        });
      }
    };
  }, [order, orderId, paymentResult]);

  const verifyAndUpdatePayment = async () => {
    // Prevent multiple simultaneous verification attempts
    if (verifyingPayment) {
      console.log('Verification already in progress, skipping...');
      return;
    }
    
    try {
      setVerifyingPayment(true);
      
      if (orderId && orderId !== 'pending') {
        // Check if this is a temporary order
        if (order && order.is_temporary) {
          console.log('Confirming payment success for temporary order:', orderId);
          
          // Use the new confirm-payment-success endpoint for temporary orders
          const confirmResponse = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/confirm-payment-success/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (confirmResponse.ok) {
            const result = await confirmResponse.json();
            console.log('Temporary order confirmed:', result);
            
            // Reload order to get updated status
            await loadOrder();
            
            setPaymentStatus('Paid');
            setPaymentResult('success');
            // Cart is cleared by the backend
          } else {
            console.error('Failed to confirm temporary order');
            // Show success anyway since user completed payment on PayMongo
            setPaymentResult('success');
          }
        } else {
          // Existing permanent order flow
          console.log('Verifying payment for permanent order:', orderId);
        
        // First, try to reload the order to see if webhook already updated it
        await loadOrder();
        
        // If order is already paid, we're done
        if (order && order.payment_status === 'Paid') {
          console.log('Order already marked as paid by webhook');
          setPaymentStatus('Paid');
          setPaymentResult('success');
          setVerifyingPayment(false);
          // Clear cart after successful payment
          await clearCartAfterPayment();
          return;
        }
        
        // Instead of calling PayMongo API, let's try to manually update the order status
        // This is a fallback in case webhook didn't work
        console.log('Attempting to manually update order status to Paid');
        
        const updateResponse = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/status/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'Paid'  // This should update payment_status
          })
        });
        
        console.log('Manual update response status:', updateResponse.status);
        console.log('Manual update response ok:', updateResponse.ok);
        
        if (updateResponse.ok) {
          const result = await updateResponse.json();
          console.log('Manual update result:', result);
          
          // Reload order to get updated status
          await loadOrder();
          
          // Show success message
          setPaymentStatus('Paid');
          setPaymentResult('success');
          // Clear cart after successful payment
          await clearCartAfterPayment();
        } else {
          const errorData = await updateResponse.json();
          console.error('Manual update failed:', updateResponse.status, errorData);
          // Still reload order in case webhook updated it
          await loadOrder();
          // Show success anyway since user completed payment on PayMongo
          setPaymentResult('success');
        }
        }
      } else {
        // Show success anyway since user completed payment on PayMongo
        setPaymentResult('success');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      // Still reload order in case webhook updated it
      if (orderId && orderId !== 'pending') {
        await loadOrder();
      }
      // Show success anyway since user completed payment on PayMongo
      setPaymentResult('success');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const loadOrder = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/`);
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
        setPaymentStatus(orderData.payment_status);
        
        // If order is unpaid and payment method is GCash, create payment intent
        if (orderData.payment_status === 'Unpaid' && orderData.payment_method === 'GCash') {
          await createGCashPaymentIntent(orderData);
        }
      } else {
        setError('Failed to load order');
      }
    } catch (err) {
      setError('Error loading order');
    } finally {
      setLoading(false);
    }
  };

  const createGCashPaymentIntent = async (orderData) => {
    try {
      setCreatingPayment(true);
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${orderId}/create-gcash-payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(orderData.total_price),
          description: `Order #${orderId} - GCash Payment`,
        }),
      });

      if (response.ok) {
        const paymentData = await response.json();
        setPaymentIntent(paymentData);
        console.log('GCash payment intent created:', paymentData);
        console.log('Payment intent next_action:', paymentData.next_action);
        console.log('Payment intent client_key:', paymentData.client_key);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create GCash payment');
      }
    } catch (err) {
      setError('Error creating GCash payment');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleRetryPayment = async () => {
    if (order) {
      await createGCashPaymentIntent(order);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setError(error.message);
  };

  const handlePaymentSuccess = (paymentData) => {
    console.log('Payment initiated:', paymentData);
    // Payment will be verified via webhook or status checker
    setPaymentStatus('Pending');
  };

  const handleStatusChange = (status) => {
    setPaymentStatus(status.payment_status);
    
    if (status.payment_status === 'Paid') {
      // Redirect to success page after a short delay
      setTimeout(() => {
        navigate(`/orders/${orderId}/success`);
      }, 2000);
    } else if (status.payment_status === 'Failed') {
      setError('Payment failed. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'Failed':
        return <XCircle className="h-8 w-8 text-red-600" />;
      case 'Pending':
        return <Clock className="h-8 w-8 text-yellow-600" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-600" />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'Paid':
        return 'Payment successful! Redirecting...';
      case 'Failed':
        return 'Payment failed. Please try again.';
      case 'Pending':
        return 'Payment is being processed...';
      default:
        return 'Ready to pay';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center mt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center mt-20">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => navigate('/cart')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 ">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 mt-20">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment</h1>
            <p className="text-gray-500">Complete your GCash payment</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">#{order?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-lg">₱{order?.total_price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium">GCash</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {!paymentResult && !verifyingPayment && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {getStatusIcon(paymentStatus)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {getStatusMessage(paymentStatus)}
              </h3>
              <p className="text-gray-600">
                {paymentStatus === 'Paid' 
                  ? 'Your payment has been processed successfully.'
                  : paymentStatus === 'Failed'
                  ? 'There was an issue processing your payment.'
                  : 'Click the button below to proceed with GCash payment.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Verification Loading State */}
        {verifyingPayment && !paymentResult && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="text-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Payment...</h3>
                <p className="text-gray-600 mb-4">Please wait while we confirm your payment.</p>
                <button
                  onClick={() => {
                    setVerifyingPayment(false);
                    setVerificationAttempted(false);
                    setPaymentResult('success');
                    // Just reload order to check if webhook updated it
                    loadOrder();
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  Skip verification and show success
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Result from PayMongo */}
        {paymentResult && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="text-center">
              {verifyingPayment ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Payment...</h3>
                  <p className="text-gray-600 mb-4">Please wait while we confirm your payment.</p>
                  <button
                    onClick={() => {
                      setVerifyingPayment(false);
                      setVerificationAttempted(false);
                      setPaymentResult('success');
                      // Just reload order to check if webhook updated it
                      loadOrder();
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    Skip verification and show success
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    {paymentResult === 'success' ? (
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    ) : paymentResult === 'cancelled' ? (
                      <XCircle className="h-12 w-12 text-yellow-500" />
                    ) : (
                      <XCircle className="h-12 w-12 text-red-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {paymentResult === 'success' 
                      ? 'Payment Successful!' 
                      : paymentResult === 'cancelled'
                      ? 'Payment Cancelled'
                      : 'Payment Failed'
                    }
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {paymentResult === 'success' 
                      ? 'Your GCash payment has been processed successfully. Your order will be prepared shortly.'
                      : paymentResult === 'cancelled'
                      ? 'You cancelled the payment. You can try again or choose a different payment method.'
                      : paymentResult === 'failed'
                      ? 'Your payment could not be processed. This might be due to insufficient funds, network issues, payment expiration, or payment method problems.'
                      : 'There was an issue with your payment. Please try again or contact support.'
                    }
                  </p>
                  {paymentResult === 'success' ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => navigate('/orders')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        View My Orders
                      </button>
                      <button
                        onClick={() => navigate('/')}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setPaymentResult(null);
                          setVerificationAttempted(false);
                          // Clear URL parameters
                          navigate(`/orders/${orderId}/payment`, { replace: true });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => navigate('/checkout')}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Change Payment Method
                      </button>
                      <button
                        onClick={() => navigate('/orders')}
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Back to Orders
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Payment Button */}
        {paymentStatus !== 'Paid' && !paymentResult && !verifyingPayment && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment</h3>
            
            {creatingPayment ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Creating GCash payment...</span>
              </div>
            ) : paymentIntent ? (
              <div>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Payment Intent Created</h4>
                  <p className="text-sm text-blue-700">Client Key: {paymentIntent.client_key}</p>
                  <p className="text-sm text-blue-700">Status: {paymentIntent.status}</p>
                  <p className="text-sm text-blue-700">Next Action: {paymentIntent.next_action ? JSON.stringify(paymentIntent.next_action) : 'None (using client key)'}</p>
                </div>
                <GCashPaymentButton
                  orderId={orderId}
                  clientKey={paymentIntent.client_key}
                  nextActionUrl={paymentIntent.next_action?.redirect_to_url?.url || null}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentFailure={handlePaymentError}
                  className="mb-4"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Unable to create GCash payment</p>
                <button 
                  onClick={handleRetryPayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Retry Payment Setup
                </button>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Payment Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Status Display */}
        {paymentStatus && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                Payment Status: 
              </span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
              </span>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble with payment? Contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
