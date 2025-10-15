import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import "./Cart.css";

const Cart = () => {
  const [promoCode, setPromoCode] = useState("");
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
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

  const subtotal = cartItems.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0);
  const tax = subtotal * 0.12; // 12% VAT
  const total = subtotal + tax;

  const handleCheckout = () => {
    // Navigate to checkout page or handle checkout logic
    navigate("/checkout");
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
                      <div key={item.id} className="cart-item">
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

                <button 
                  className="checkout-btn" 
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="m1 1 4 4 13 0 4 14H6l-2-4H1"/>
                  </svg>
                  Proceed to Checkout
                </button>

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
