import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../utils/auth";

const CartModal = ({ role, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = "";
    if (role === "reseller") {
      url = `${import.meta.env.VITE_INVENTORY_URL}/products/?status=Active`;
    } else if (role === "admin") {
      url = `${import.meta.env.VITE_INVENTORY_URL}/ingredients/?is_active=true`;
    } else {
      setItems([]);
      setLoading(false);
      return;
    }
    fetchWithAuth(url)
      .then(res => res.ok ? res.json() : [])
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [role]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">
          {role === "reseller" ? "Active Products" : "Active Ingredients"}
        </h2>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08b51]" />
          </div>
        ) : (
          <ul className="space-y-2">
            {items.length === 0 ? (
              <li className="text-gray-500">No items found.</li>
            ) : (
              items.map(item => (
                <li key={item.id} className="border-b py-2 flex justify-between items-center">
                  <span className="font-semibold">{item.name}</span>
                  {role === "reseller" && (
                    <span className="ml-2 text-gray-600">₱{item.price}</span>
                  )}
                  {role === "admin" && (
                    <span className="ml-2 text-gray-600">{item.unit_of_measurement}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CartModal;