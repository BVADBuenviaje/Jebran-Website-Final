import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { fetchWithAuth } from '../utils/auth';
const BACKEND_ORIGIN = new URL(import.meta.env.VITE_INVENTORY_URL).origin;

const CartContext = createContext();

/**
 * Cart Context Hook
 * 
 * This context provides global cart state management for the entire application.
 * It handles:
 * - Storing cart items in memory and localStorage
 * - Adding/removing/updating cart items
 * - Calculating cart totals and item counts
 * - Persisting cart data between browser sessions
 * 
 * Usage: const { cartItems, addToCart, removeFromCart, getCartTotal } = useCart();
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  // Helper function to get example items
  // const getExampleItems = () => [
  //   {
  //     id: 1,
  //     name: "Miki",
  //     category: "Egg Noodles",
  //     price: 12.99,
  //     quantity: 2,
  //     image: "/canton-style-stir-fried-noodles.jpg",
  //     ingredients: ["Fresh Egg Noodles", "Rich Broth", "Premium Toppings"]
  //   },
  //   {
  //     id: 2,
  //     name: "Lomi",
  //     category: "Thick Noodles",
  //     price: 14.99,
  //     quantity: 1,
  //     image: "/traditional-ramen-noodles-with-egg.jpg",
  //     ingredients: ["Thick Noodles", "Savory Soup", "Vegetables", "Meat"]
  //   },
  //   {
  //     id: 3,
  //     name: "Canton",
  //     category: "Stir-fried Noodles",
  //     price: 13.99,
  //     quantity: 3,
  //     image: "/spicy-seafood-noodles-with-shrimp.jpg",
  //     ingredients: ["Stir-fried Noodles", "Mixed Vegetables", "Choice of Protein"]
  //   }
  // ];

  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const [token, setToken] = useState(localStorage.getItem('access'));

  useEffect(() => {
    if (!token) { setCartItems([]); return; }
    let active = true;
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!active || !data) return;
        const items = Array.isArray(data.items) ? data.items.map(ci => {
          const raw = ci.product?.image;
          const image = raw ? (raw.startsWith('http') ? raw : `${BACKEND_ORIGIN}${raw}`) : undefined;
          return {
            id: ci.product?.id,
            name: ci.product?.name,
            price: ci.product?.price,
            image,
            quantity: ci.quantity,
          };
        }).filter(it => it.id != null) : [];
        setCartItems(items);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [token]); // <-- use token state as dependency

  const addToCart = useCallback(async (product) => {
    const token = localStorage.getItem('access');
    if (!token) return; // require login
    await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/add/`, {
      method: 'POST',
      body: JSON.stringify({ product_id: product.id, quantity: 1 })
    });
    // Reload from backend - update state directly to avoid unnecessary re-renders
    const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items.map(ci => {
        const raw = ci.product?.image;
        const image = raw ? (raw.startsWith('http') ? raw : `${BACKEND_ORIGIN}${raw}`) : undefined;
        return {
          id: ci.product?.id,
          name: ci.product?.name,
          price: ci.product?.price,
          image,
          quantity: ci.quantity,
        };
      }).filter(it => it.id != null) : [];
      setCartItems(items);
    }
  }, []);

  const removeFromCart = useCallback(async (productId) => {
    const token = localStorage.getItem('access');
    if (!token) return;
    await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/remove/`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId })
    });
    const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items.map(ci => {
        const raw = ci.product?.image;
        const image = raw ? (raw.startsWith('http') ? raw : `${BACKEND_ORIGIN}${raw}`) : undefined;
        return {
          id: ci.product?.id,
          name: ci.product?.name,
          price: ci.product?.price,
          image,
          quantity: ci.quantity,
        };
      }).filter(it => it.id != null) : [];
      setCartItems(items);
    }
  }, []);

  const updateQuantity = useCallback(async (productId, quantity) => {
    const token = localStorage.getItem('access');
    if (!token) return;
    await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/update/`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity })
    });
    const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items.map(ci => {
        const raw = ci.product?.image;
        const image = raw ? (raw.startsWith('http') ? raw : `${BACKEND_ORIGIN}${raw}`) : undefined;
        return {
          id: ci.product?.id,
          name: ci.product?.name,
          price: ci.product?.price,
          image,
          quantity: ci.quantity,
        };
      }).filter(it => it.id != null) : [];
      setCartItems(items);
    }
  }, []);

  const clearCartAfterPayment = useCallback(async () => {
    const token = localStorage.getItem('access');
    if (!token) { 
      setCartItems([]); 
      setSelectedItems(new Set());
      return; 
    }
    try {
      await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/clear/`, { method: 'POST' });
      setCartItems([]);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error clearing cart after payment:', error);
      // Still clear locally even if API call fails
      setCartItems([]);
      setSelectedItems(new Set());
    }
  }, []);

  const clearCart = useCallback(async () => {
    const token = localStorage.getItem('access');
    if (!token) { setCartItems([]); return; }
    await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/cart/clear/`, { method: 'POST' });
    setCartItems([]);
  }, []);

  const toggleItemSelection = useCallback((productId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const selectAllItems = useCallback(() => {
    const allIds = cartItems.map(item => item.id);
    setSelectedItems(new Set(allIds));
  }, [cartItems]);

  const deselectAllItems = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isItemSelected = useCallback((productId) => {
    return selectedItems.has(productId);
  }, [selectedItems]);

  const getSelectedItems = useCallback(() => {
    return cartItems.filter(item => selectedItems.has(item.id));
  }, [cartItems, selectedItems]);

  const getSelectedTotal = useCallback(() => {
    return getSelectedItems().reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [getSelectedItems]);

  const getSelectedItemCount = useCallback(() => {
    return getSelectedItems().reduce((total, item) => total + item.quantity, 0);
  }, [getSelectedItems]);

  const checkout = useCallback(async (paymentMethod, address) => {
    const token = localStorage.getItem('access');
    if (!token) throw new Error('Authentication required');
    
    const selectedItemsList = getSelectedItems();
    if (selectedItemsList.length === 0) {
      throw new Error('Please select items to checkout');
    }
    
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/checkout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          address: address,
          selected_items: selectedItemsList.map(item => ({
            product_id: item.id,
            quantity: item.quantity
          }))
        })
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON (e.g., HTML error page), get text
          const errorText = await response.text();
          console.error("CHECKOUT ERROR (Non-JSON):", errorText);
          throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200)}...`);
        }
        console.error("CHECKOUT ERROR BODY:", errorData); 
        throw new Error(JSON.stringify(errorData)); 
      }

      
      const orderData = await response.json();
      // Don't clear cart here - wait for payment confirmation
      return orderData;
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    }
  }, [getSelectedItems]);

  const clearExampleItems = undefined;
  const loadSampleItems = undefined;

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);

  const getCartItemCount = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const isInCart = useCallback((productId) => {
    return cartItems.some(item => item.id === productId);
  }, [cartItems]);

  const getCartItem = useCallback((productId) => {
    return cartItems.find(item => item.id === productId);
  }, [cartItems]);

  // Memoize the context value to prevent unnecessary re-renders
  // Only recreate when cartItems or selectedItems actually change
  const value = useMemo(() => ({
    cartItems,
    selectedItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearCartAfterPayment,
    checkout,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    isItemSelected,
    getSelectedItems,
    getSelectedTotal,
    getSelectedItemCount,
    setToken,
    clearExampleItems,
    loadSampleItems,
    getCartTotal,
    getCartItemCount,
    isInCart,
    getCartItem
  }), [cartItems, selectedItems, addToCart, removeFromCart, updateQuantity, clearCart, clearCartAfterPayment, checkout, toggleItemSelection, selectAllItems, deselectAllItems, isItemSelected, getSelectedItems, getSelectedTotal, getSelectedItemCount, setToken, clearExampleItems, loadSampleItems, getCartTotal, getCartItemCount, isInCart, getCartItem]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
