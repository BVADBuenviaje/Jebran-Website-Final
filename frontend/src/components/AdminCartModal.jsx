import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../utils/auth";

const AdminCartModal = ({ onClose }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [ingredientSuppliers, setIngredientSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [checkoutError, setCheckoutError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch active suppliers on mount
  useEffect(() => {
    setLoadingSuppliers(true);
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/?is_active=true`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]))
      .finally(() => setLoadingSuppliers(false));
  }, []);

  // Fetch ingredient-suppliers for selected supplier
  useEffect(() => {
    if (!selectedSupplier) {
      setIngredientSuppliers([]);
      setQuantities({});
      return;
    }
    setLoadingIngredients(true);
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/?supplier=${selectedSupplier}&is_active=true`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setIngredientSuppliers(Array.isArray(data) ? data : []);
        // Reset quantities for new supplier
        const newQuantities = {};
        data.forEach(item => {
          // Use ingredient_detail for display, but keep id for quantity mapping
          newQuantities[item.ingredient] = "";
        });
        setQuantities(newQuantities);
      })
      .catch(() => setIngredientSuppliers([]))
      .finally(() => setLoadingIngredients(false));
  }, [selectedSupplier]);

  // Handle quantity input (only integers)
  const handleQuantityChange = (ingredientId, value) => {
    if (value === "" || (/^\d+$/.test(value) && Number(value) > 0)) {
      setQuantities(prev => ({ ...prev, [ingredientId]: value }));
    }
  };

  // Compute charge for each item
  const computeCharge = (ingredientId, price) => {
    const qty = Number(quantities[ingredientId]);
    return qty > 0 ? (qty * Number(price)).toFixed(2) : "0.00";
  };

  // Compute total charge
  const totalCharge = ingredientSuppliers.reduce((sum, item) => {
    const qty = Number(quantities[item.ingredient]);
    return sum + (qty > 0 ? qty * Number(item.price) : 0);
  }, 0);

  // Handle checkout
  const handleCheckout = () => {
    const selected = Object.entries(quantities).filter(([_, qty]) => qty && Number(qty) > 0);
    if (selected.length === 0) {
      setCheckoutError("Please enter a quantity for at least one ingredient.");
      return;
    }
    setCheckoutError("");
    setShowConfirm(true);
  };

  // Submit order to backend
  const submitOrder = async () => {
    setSubmitting(true);
    setShowConfirm(false);
    const items = ingredientSuppliers
      .filter(item => Number(quantities[item.ingredient]) > 0)
      .map(item => ({
        ingredient: item.ingredient,
        quantity: Number(quantities[item.ingredient])
      }));

    const order = {
      supplier: selectedSupplier,
      items,
      status: "Pending"
    };

    try {
      await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      alert("Order placed successfully!");
      onClose();
    } catch (error) {
      alert("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Active Ingredients</h2>
        <div className="mb-4">
          <label className="block font-semibold mb-2">Filter by Supplier:</label>
          {loadingSuppliers ? (
            <div className="text-gray-500">Loading suppliers...</div>
          ) : (
            <select
              className="border rounded px-3 py-2 w-full"
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
            >
              <option value="">Select a supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {loadingIngredients ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08b51]" />
          </div>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              handleCheckout();
            }}
          >
            <ul className="space-y-2 mb-4">
              {selectedSupplier === "" ? (
                <li className="text-gray-500">Please select a supplier.</li>
              ) : ingredientSuppliers.length === 0 ? (
                <li className="text-gray-500">No ingredients found for this supplier.</li>
              ) : (
                ingredientSuppliers.map(item => (
                  <li key={item.ingredient} className="border-b py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 w-full">
                      <span className="font-semibold">{item.ingredient_detail?.name}</span>
                      <span className="ml-2 text-gray-600">{item.ingredient_detail?.unit_of_measurement}</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        pattern="\d*"
                        className="border rounded px-2 py-1 mt-2 sm:mt-0 sm:ml-4 w-20"
                        placeholder="Qty"
                        value={quantities[item.ingredient] || ""}
                        onChange={e => handleQuantityChange(item.ingredient, e.target.value)}
                        disabled={submitting}
                      />
                      <input
                        type="text"
                        readOnly
                        className="border rounded px-2 py-1 mt-2 sm:mt-0 sm:ml-4 w-24 bg-gray-100"
                        value={computeCharge(item.ingredient, item.price)}
                        title="Charge"
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1 sm:mt-0">₱{item.price} per unit</span>
                  </li>
                ))
              )}
            </ul>
            <div className="mb-4">
              <label className="block font-semibold mb-1">Total Charge:</label>
              <input
                type="text"
                readOnly
                className="border rounded px-3 py-2 w-full bg-gray-100 font-bold"
                value={`₱${totalCharge.toFixed(2)}`}
              />
            </div>
            {checkoutError && (
              <div className="text-red-600 mb-2">{checkoutError}</div>
            )}
            <button
              type="submit"
              className="bg-[#f08b51] text-white px-4 py-2 rounded hover:bg-[#e07a3b] w-full font-semibold"
              disabled={selectedSupplier === "" || ingredientSuppliers.length === 0 || submitting}
            >
              Checkout
            </button>
          </form>
        )}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
              <h3 className="text-lg font-bold mb-4">Confirm Order</h3>
              <p className="mb-4">Are you sure you want to place this resupply order?</p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-[#f08b51] text-white hover:bg-[#e07a3b]"
                  onClick={submitOrder}
                  disabled={submitting}
                >
                  Yes, Place Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCartModal;