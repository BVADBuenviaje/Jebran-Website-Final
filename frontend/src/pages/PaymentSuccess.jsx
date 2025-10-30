import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithAuth } from "../utils/auth";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Poll for order creation (works with or without session_id)
    const pollForOrder = async () => {
      let attempts = 0;
      const maxAttempts = 15; // Increased attempts since webhook might take longer
      
      const poll = async () => {
        try {
          attempts++;
          
          // Try to find recent orders
          console.log(`Polling attempt ${attempts}/${maxAttempts} for recent orders...`);
          const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/?recent=true`);
          
          if (response.ok) {
            const orders = await response.json();
            console.log(`Found ${orders.length} recent orders:`, orders);
            
            // Look for a recent GCash order that was just paid
            const recentOrder = orders.find(order => 
              order.payment_method === 'GCash' && 
              order.payment_status === 'Paid' &&
              order.payment_reference // This should contain the PayMongo session ID
            );
            
            console.log(`Looking for GCash paid order, found:`, recentOrder);
            
            if (recentOrder) {
              console.log(`Found matching order:`, recentOrder);
              setOrder(recentOrder);
              setStatus("success");
              // Redirect to order details after a short delay
              setTimeout(() => {
                navigate(`/orders/${recentOrder.id}`);
              }, 2000);
              return;
            } else {
              console.log(`No matching GCash paid order found yet...`);
            }
          } else {
            console.error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
          }
          
          // If no order found and we haven't exceeded max attempts, continue polling
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            setStatus("timeout");
          }
        } catch (error) {
          console.error("Error polling for order:", error);
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            setError("Failed to verify payment. Please contact support.");
          }
        }
      };
      
      poll();
    };

    pollForOrder();
  }, [navigate]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View Orders
          </button>
        </div>
      );
    }

    switch (status) {
      case "processing":
        return (
          <div className="text-center">
            <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-blue-600 mb-2">Processing Payment</h2>
            <p className="text-gray-600 mb-4">
              We're verifying your payment. This may take a few moments...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your order has been confirmed and will be processed shortly.
            </p>
            {order && (
              <p className="text-sm text-gray-500 mb-4">
                Order #{order.id} - Redirecting to order details...
              </p>
            )}
          </div>
        );

      case "timeout":
        return (
          <div className="text-center">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-yellow-600 mb-2">Processing...</h2>
            <p className="text-gray-600 mb-4">
              Payment verification is taking longer than expected. 
              We'll update you by email once your order is confirmed.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/orders')}
                className="block w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Check Orders
              </button>
              <button
                onClick={() => navigate('/')}
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentSuccess;
