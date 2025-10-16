import React, { useState, useEffect } from "react";
import { useCart } from "../contexts/CartContext";
import { fetchWithAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Wallet, MapPin } from "lucide-react";

const Checkout = () => {
  const { cartItems, clearCart, getSelectedItems, getSelectedTotal, checkout } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // helper: safely convert values to numbers
  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  // selected items come from cart context (selected for checkout) or fallback to cartItems
  const selectedItems = (getSelectedItems && getSelectedItems()) || cartItems;
  const subtotal = (getSelectedTotal && getSelectedTotal()) || selectedItems.reduce((s, i) => s + toNumber(i.price) * toNumber(i.quantity), 0);
  const tax = subtotal * 0.12;
  const shipping = subtotal > 0 ? 50 : 0;
  const total = subtotal + tax + shipping;

  useEffect(() => {
    const token = localStorage.getItem("access");
    const userId = localStorage.getItem("user.id");
    if (token && userId) {
      fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${userId}/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // if no selected items, send user back to cart
    if (!selectedItems || selectedItems.length === 0) {
      navigate("/cart");
    }
  }, []); // run once on mount

  const handleProcessCheckout = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      alert("No items selected for checkout.");
      return;
    }

    const shippingAddress = user && user.shop_address ? user.shop_address : address.trim();
    if (!shippingAddress) {
      alert("Please enter a delivery address or add a business address to your account.");
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = await checkout(paymentMethod, shippingAddress);
      // Navigate to the new order page
      navigate(`/orders/${orderData.id}`);
    } catch (error) {
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-card shadow-lg rounded-xl p-8 mt-15">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#B8705F] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary">Checkout</h2>
                <p className="text-xs text-muted-foreground">
                  Complete your purchase
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/cart")}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <ShoppingBag className="w-5 h-5 text-[#B8705F]" />
              <h3 className="text-lg font-semibold text-foreground">
                Order Summary
              </h3>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-muted-foreground text-center">
                Your cart is empty.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-muted rounded-lg"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={item.image || "/placeholder.png"}
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.description || ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-base font-semibold text-primary">
                      ₱{(toNumber(item.price) * toNumber(item.quantity)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing Breakdown */}
            {selectedItems.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">₱{shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (12% VAT)</span>
                  <span className="text-foreground">₱{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-[#B8705F]">₱{total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Shipping and Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <MapPin className="w-5 h-5 text-[#B8705F]" />
                <h3 className="text-base font-semibold text-foreground">
                  Shipping Information
                </h3>
              </div>
              <div className="p-6 bg-muted rounded-lg text-left">
                <p className="text-sm text-muted-foreground">
                  {user && user.shop_address
                    ? user.shop_address
                    : "No business address found. Please update your account."}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Wallet className="w-5 h-5 text-[#B8705F]" />
                <h3 className="text-base font-semibold text-foreground">
                  Payment Method
                </h3>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="w-4 h-4 accent-[#B8705F]"
                  />
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded flex items-center justify-center flex-shrink-0">
                    <img
                      src="/cash-on-delivery-icon.png"
                      alt="Cash on Delivery"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Cash on Delivery
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pay when you receive your order
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="GCash"
                    checked={paymentMethod === "GCash"}
                    onChange={() => setPaymentMethod("GCash")}
                    className="w-4 h-4 accent-[#B8705F]"
                  />
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center flex-shrink-0">
                    <img
                      src="/gcash-logo.png"
                      alt="GCash"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">GCash</p>
                    <p className="text-xs text-muted-foreground">
                      Pay securely with GCash
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <div className="pt-6 border-t border-border mt-8">
            <button
              onClick={handleProcessCheckout}
              className="w-full bg-[#B8705F] hover:bg-[#A05F4F] text-white h-12 text-base rounded-lg transition-colors font-semibold"
              disabled={selectedItems.length === 0 || isProcessing}
            >
              {isProcessing ? "Processing..." : "Place Order"}
            </button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              By placing your order, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
