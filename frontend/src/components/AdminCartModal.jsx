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

  // Load active suppliers (handles paginated or plain responses)
  useEffect(() => {
    setLoadingSuppliers(true);
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/?is_active=true`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
        const active = list.filter(s => s && (s.is_active === undefined || s.is_active === true));
        setSuppliers(active);
      })
      .catch(() => setSuppliers([]))
      .finally(() => setLoadingSuppliers(false));
  }, []);

  // Load ingredient-supplier rows for chosen supplier; only active links and active ingredients; dedupe by ingredient_id
  useEffect(() => {
    if (!selectedSupplier) {
      setIngredientSuppliers([]);
      setQuantities({});
      return;
    }
    setLoadingIngredients(true);

    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/?supplier=${selectedSupplier}&is_active=true`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        const raw = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);

        const filtered = raw.filter(item => {
          if (!item) return false;
          const linkActive = item.is_active ?? item.link_active ?? item.active ?? true;
          if (!linkActive) return false;

          const ingDetail = item.ingredient_detail ?? item.ingredientInfo ?? null;
          const ingActive = ingDetail ? (ingDetail.is_active === undefined ? true : !!ingDetail.is_active) : true;
          const hasIngredientId = !!(item.ingredient_id ?? item.ingredient ?? ingDetail?.id ?? ingDetail?.name);
          if (!hasIngredientId) return false;
          if (!ingActive) return false;

          const supplierIdFromRow = item.supplier_id ?? item.supplier ?? item.supplier_detail?.id;
          if (supplierIdFromRow && String(supplierIdFromRow) !== String(selectedSupplier)) return false;
          return true;
        });

        const map = new Map();
        filtered.forEach(item => {
          const ingId = item.ingredient_id ?? item.ingredient ?? item.ingredient_detail?.id ?? item.ingredient_detail?.name;
          if (!ingId) return;
          const key = String(ingId);
          const existing = map.get(key);
          if (!existing) {
            map.set(key, item);
          } else {
            const existingPrice = Number(existing.price ?? Infinity);
            const thisPrice = Number(item.price ?? Infinity);
            if (!isNaN(thisPrice) && thisPrice < existingPrice) {
              map.set(key, item);
            }
          }
        });

        const uniqueList = Array.from(map.values());
        uniqueList.sort((a, b) => {
          const an = (a.ingredient_detail?.name ?? a.ingredient_name ?? "").toLowerCase();
          const bn = (b.ingredient_detail?.name ?? b.ingredient_name ?? "").toLowerCase();
          return an.localeCompare(bn);
        });

        setIngredientSuppliers(uniqueList);

        const newQuantities = {};
        uniqueList.forEach(item => {
          const key = String(item.ingredient_id ?? item.ingredient ?? item.ingredient_detail?.id ?? item.ingredient_detail?.name);
          newQuantities[key] = "";
        });
        setQuantities(newQuantities);
      })
      .catch(() => {
        setIngredientSuppliers([]);
        setQuantities({});
      })
      .finally(() => setLoadingIngredients(false));
  }, [selectedSupplier]);

  const handleQuantityChange = (ingredientKey, value) => {
    if (value === "") {
      setQuantities(prev => ({ ...prev, [ingredientKey]: "" }));
      return;
    }
    // only digits, no letters, no negatives; strip non-digits
    const sanitized = String(value).replace(/[^\d]/g, "");
    // remove leading zeros except single zero
    const normalized = sanitized.replace(/^0+(\d)/, "$1");
    if (/^\d+$/.test(normalized) && Number(normalized) > 0) {
      setQuantities(prev => ({ ...prev, [ingredientKey]: normalized }));
    }
  };

  const computeCharge = (ingredientKey, price) => {
    const qty = Number(quantities[ingredientKey]);
    return qty > 0 ? (qty * Number(price ?? 0)).toFixed(2) : "0.00";
  };

  const totalCharge = ingredientSuppliers.reduce((sum, item) => {
    const key = String(item.ingredient_id ?? item.ingredient ?? item.ingredient_detail?.id ?? item.ingredient_detail?.name);
    const qty = Number(quantities[key]);
    return sum + (qty > 0 ? qty * Number(item.price ?? 0) : 0);
  }, 0);

  const handleCheckout = () => {
    const selected = Object.entries(quantities).filter(([_, qty]) => qty && Number(qty) > 0);
    if (selected.length === 0) {
      setCheckoutError("Please enter a quantity for at least one ingredient.");
      return;
    }
    setCheckoutError("");
    setShowConfirm(true);
  };

  // Two-step submit: create order first, then create order-items with required 'order' field
  const submitOrder = async () => {
    setSubmitting(true);
    setShowConfirm(false);

    const items = ingredientSuppliers
      .map(item => {
        const key = String(item.ingredient_id ?? item.ingredient ?? item.ingredient_detail?.id ?? item.ingredient_detail?.name);
        const qty = Number(quantities[key]);
        const ingredientId = item.ingredient_id ?? item.ingredient ?? item.ingredient_detail?.id;
        return qty > 0 && ingredientId ? { ingredient: Number(ingredientId), quantity: qty } : null;
      })
      .filter(Boolean);

    if (items.length === 0) {
      alert("No items selected. Enter quantities before placing an order.");
      setSubmitting(false);
      return;
    }

    const payload = {
      supplier: Number(selectedSupplier),
      items,
      status: "Pending",
    };

    try {
      const url = `${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/`;
      const res = await fetchWithAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        console.error("Create order failed:", res.status, body);
        const msg =
          (body && body.detail) ||
          (body && body.items && JSON.stringify(body.items)) ||
          (typeof body === "string" ? body : JSON.stringify(body)) ||
          res.statusText;
        alert(`Failed to place order: ${msg}`);
        setSubmitting(false);
        return;
      }

      alert("Order placed successfully!");
      onClose();
    } catch (err) {
      console.error("Network or unexpected error creating order:", err);
      alert(`Network error: ${err?.message ?? String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 className="text-xl font-bold mb-4">Create Resupply Order</h2>

        <div className="mb-4">
          <label className="block font-semibold mb-2">Supplier (active only)</label>
          {loadingSuppliers ? (
            <div className="text-gray-500">Loading suppliers...</div>
          ) : (
            <select className="border rounded px-3 py-2 w-full" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
              <option value="">Select a supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {loadingIngredients ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08b51]" />
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleCheckout(); }}>
            <ul className="space-y-2 mb-4 max-h-72 overflow-y-auto">
              {selectedSupplier === "" ? (
                <li className="text-gray-500">Please select a supplier.</li>
              ) : ingredientSuppliers.length === 0 ? (
                <li className="text-gray-500">No active ingredients found for this supplier.</li>
              ) : (
                ingredientSuppliers.map(item => {
                  const key = String(item.ingredient_id ?? item.ingredient ?? item.ingredient_detail?.id ?? item.ingredient_detail?.name);
                  const name = item.ingredient_detail?.name ?? item.ingredient_name ?? "Unknown";
                  const uom = item.ingredient_detail?.unit_of_measurement ?? item.unit_of_measurement ?? "";
                  return (
                    <li key={key} className="border-b py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 w-full">
                        <span className="font-semibold">{name}</span>
                        <span className="ml-2 text-gray-600">{uom}</span>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          className="border rounded px-2 py-1 mt-2 sm:mt-0 sm:ml-4 w-20"
                          placeholder="Qty"
                          value={quantities[key] ?? ""}
                          onChange={e => handleQuantityChange(key, e.target.value)}
                          disabled={submitting}
                        />

                        <input
                          type="text"
                          readOnly
                          className="border rounded px-2 py-1 mt-2 sm:mt-0 sm:ml-4 w-28 bg-gray-100"
                          value={computeCharge(key, item.price)}
                          title="Charge"
                        />
                      </div>

                      <span className="text-xs text-gray-500 mt-1 sm:mt-0">₱{Number(item.price ?? 0).toFixed(2)} / unit</span>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="mb-4">
              <label className="block font-semibold mb-1">Total Charge</label>
              <input type="text" readOnly className="border rounded px-3 py-2 w-full bg-gray-100 font-bold" value={`₱${totalCharge.toFixed(2)}`} />
            </div>

            {checkoutError && <div className="text-red-600 mb-2">{checkoutError}</div>}

            <button type="submit" className="bg-[#f08b51] text-white px-4 py-2 rounded hover:bg-[#e07a3b] w-full font-semibold" disabled={selectedSupplier === "" || ingredientSuppliers.length === 0 || submitting}>
              Checkout
            </button>
          </form>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
              <h3 className="text-lg font-bold mb-4">Confirm Order</h3>
              <p className="mb-4">Place this resupply order?</p>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</button>
                <button className="px-4 py-2 rounded bg-[#f08b51] text-white hover:bg-[#e07a3b]" onClick={submitOrder} disabled={submitting}>Yes, Place Order</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCartModal;