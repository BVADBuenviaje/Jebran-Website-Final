import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import "./Cart.css";

const Cart = () => {
  const [promoCode, setPromoCode] = useState("");
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [address, setAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { 
    cartItems, 
    selectedItems,
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    checkout,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    isItemSelected,
    getSelectedItems,
    getSelectedTotal
  } = useCart();
  const sortedCartItems = [...cartItems].sort((a, b) => a.id - b.id);

  const handleUpdateQuantity = (id, change) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      updateQuantity(id, item.quantity + change);
    }
  };

  const handleRemoveItem = (id) => {
    removeFromCart(id);
  };

  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const selectedItemsList = getSelectedItems();
  const subtotal = getSelectedTotal();
  const tax = subtotal * 0.12; // 12% VAT
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (selectedItemsList.length === 0) {
      alert("Please select items to checkout");
      return;
    }
    setShowCheckoutForm(true);
  };

  const handleProcessCheckout = async () => {
    if (!address.trim()) {
      alert("Please enter a delivery address");
      return;
    }

    if (selectedItemsList.length === 0) {
      alert("Please select items to checkout");
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = await checkout(paymentMethod, address);
      // Navigate to the new order page
      navigate(`/orders/${orderData.id}`);
    } catch (error) {
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelCheckout = () => {
    setShowCheckoutForm(false);
    setAddress("");
    setPaymentMethod("COD");
  };

  return (
    <div className="cart-page">
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header">
          {/* <Link to="/products" className="continue-shopping-btn">
            <svg className="arrow-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Continue Shopping
          </Link> */}
          <div className="cart-title-section">
            <h1 className="cart-title">Shopping Cart</h1>
            <p className="cart-subtitle">Review your order and proceed to checkout</p>
            <div className="cart-header-buttons">
              {/* {cartItems.length > 0 && cartItems.some(item => [1, 2, 3].includes(item.id)) && (
                <button 
                  className="clear-example-btn"
                  onClick={clearExampleItems}
                  title="Remove example items and start fresh"
                >
                  Clear Items
                </button>
              )} */}
              <button 
                className="view-orders-btn"
                onClick={() => navigate('/orders')}
                title="View your order history"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  <path d="M12 3v6"/>
                  <path d="M12 15v6"/>
                </svg>
                View Orders
              </button>
              {cartItems.length > 0 && (
                <button 
                  className="reset-cart-btn"
                  onClick={clearCart}
                  title="Clear all items from cart"
                >
                  Clear Cart
                </button>
              )}
            </div>
            
            {/* Selection Controls */}
            {cartItems.length > 0 && (
              <div className="cart-selection-controls">
                <div className="selection-info">
                  <span className="selection-text">
                    {selectedItemsList.length} of {cartItems.length} items selected
                  </span>
                  <span className="selection-total">
                    Total: ₱{total.toFixed(2)}
                  </span>
                </div>
                <div className="selection-buttons">
                  <button 
                    className="select-all-btn"
                    onClick={selectAllItems}
                    disabled={selectedItems.size === cartItems.length}
                  >
                    Select All
                  </button>
                  <button 
                    className="deselect-all-btn"
                    onClick={deselectAllItems}
                    disabled={selectedItems.size === 0}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="cart-grid">
          {/* Cart Items */}
          <div className="cart-items-section">
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="m1 1 4 4 13 0 4 14H6l-2-4H1"/>
                  </svg>
                </div>
                <h3 className="empty-cart-title">Your cart is empty</h3>
                <p className="empty-cart-subtitle">Add some delicious noodles to get started!</p>
                <div className="empty-cart-buttons">
                  <Link to="/" className="browse-products-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    Browse Products
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="cart-items-card">
                  <div className="cart-items-header">
                    <h2 className="cart-items-title">Cart Items ({cartItems.length})</h2>
                    <p className="cart-items-description">Manage quantities and view product details</p>
                  </div>
                  <div className="cart-items-content">
                    {sortedCartItems.map((item) => (
                      <div key={item.id} className={`cart-item ${isItemSelected(item.id) ? 'selected' : ''}`}>
                        <div className="cart-item-checkbox">
                          <input
                            type="checkbox"
                            id={`item-${item.id}`}
                            checked={isItemSelected(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="item-checkbox"
                          />
                          <label htmlFor={`item-${item.id}`} className="checkbox-label"></label>
                        </div>
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="cart-item-image"
                        />
                        <div className="cart-item-details">
                          <div className="cart-item-header">
                            <div className="cart-item-info">
                              <h3 className="cart-item-name">{item.name}</h3>
                              <p className="cart-item-category">{item.category}</p>
                            </div>
                            <button 
                              className="remove-item-btn" 
                              onClick={() => handleRemoveItem(item.id)}
                              title="Remove item"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                            </button>
                          </div>

                          <div className="cart-item-actions">
                            <div className="quantity-controls">
                              <div className="quantity-selector">
                                <button
                                  className="quantity-btn"
                                  onClick={() => handleUpdateQuantity(item.id, -1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                </button>
                                <span className="quantity-value">{item.quantity}</span>
                                <button
                                  className="quantity-btn"
                                  onClick={() => handleUpdateQuantity(item.id, 1)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                </button>
                              </div>


                            </div>

                            <div className="cart-item-pricing">
                              <p className="cart-item-total">
                                ₱{(toNumber(item.price) * toNumber(item.quantity)).toFixed(2)}
                              </p>
                              <p className="cart-item-unit">₱{toNumber(item.price).toFixed(2)} each</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promo Code */}
                <div className="promo-code-card">
                  <div className="promo-code-header">
                    <h3 className="promo-code-title">Promo Code</h3>
                    <p className="promo-code-description">Have a discount code? Apply it here</p>
                  </div>
                  <div className="promo-code-content">
                    <div className="promo-code-input-group">
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="promo-code-input"
                      />
                      <button className="apply-promo-btn">Apply</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Order Summary */}
          <div className="order-summary-section">
            <div className="order-summary-card">
              <div className="order-summary-header">
                <h3 className="order-summary-title">Order Summary</h3>
              </div>
              <div className="order-summary-content">
                <div className="order-summary-details">
                  <div className="order-summary-row">
                    <span className="order-summary-label">Subtotal</span>
                    <span className="order-summary-value">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="order-summary-row">
                    <span className="order-summary-label">Tax (12% VAT)</span>
                    <span className="order-summary-value">₱{tax.toFixed(2)}</span>
                  </div>
                  <div className="order-summary-divider"></div>
                  <div className="order-summary-total-row">
                    <span className="order-summary-total-label">Total</span>
                    <span className="order-summary-total-value">₱{total.toFixed(2)}</span>
                  </div>
                </div>

                {!showCheckoutForm ? (
                  <button 
                    className="checkout-btn" 
                    onClick={handleCheckout}
                    disabled={selectedItemsList.length === 0}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="m1 1 4 4 13 0 4 14H6l-2-4H1"/>
                    </svg>
                    {selectedItemsList.length > 0 
                      ? `Checkout ${selectedItemsList.length} Item${selectedItemsList.length > 1 ? 's' : ''}`
                      : 'Select Items to Checkout'
                    }
                  </button>
                ) : (
                  <div className="checkout-form">
                    <h4 className="checkout-form-title">Complete Your Order</h4>
                    
                    <div className="checkout-form-group">
                      <label className="checkout-form-label">Payment Method</label>
                      <div className="payment-method-options">
                        <label className="payment-option">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="COD"
                            checked={paymentMethod === "COD"}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <span className="payment-option-text">
                            <strong>Cash on Delivery (COD)</strong>
                            <small>Pay when your order arrives</small>
                          </span>
                        </label>
                        <label className="payment-option">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="Online"
                            checked={paymentMethod === "Online"}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <span className="payment-option-text">
                            <strong>Online Payment</strong>
                            <small>Pay now with card or digital wallet</small>
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="checkout-form-group">
                      <label className="checkout-form-label">Delivery Address</label>
                      <textarea
                        className="checkout-form-textarea"
                        placeholder="Enter your complete delivery address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows="3"
                        required
                      />
                    </div>

                    <div className="checkout-form-actions">
                      <button 
                        className="checkout-cancel-btn"
                        onClick={handleCancelCheckout}
                        disabled={isProcessing}
                      >
                        Cancel
                      </button>
                      <button 
                        className="checkout-confirm-btn"
                        onClick={handleProcessCheckout}
                        disabled={isProcessing || !address.trim()}
                      >
                        {isProcessing ? (
                          <>
                            <div className="spinner"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 12l2 2 4-4"/>
                              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                            </svg>
                            Place Order
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="order-summary-features">
                  <div className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span>Free delivery on orders over ₱500</span>
                  </div>
                  <div className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span>Secure payment processing</span>
                  </div>
                  <div className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span>Fresh ingredients guaranteed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
