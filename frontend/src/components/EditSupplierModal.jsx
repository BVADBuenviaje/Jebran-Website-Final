import React, { useState, useEffect } from "react";

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const EditSupplierModal = ({ open, supplier, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: "",
    contact_number: "",
    email: "",
    address: "",
    is_active: true,
    ingredients: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        contact_number: supplier.contact_number || "",
        email: supplier.email || "",
        address: supplier.address || "",
        is_active: supplier.is_active,
        ingredients: supplier.ingredients_supplied
          ? supplier.ingredients_supplied.map(item => ({
              id: item.ingredient.id,
              name: item.ingredient.name,
              price: item.price,
            }))
          : [],
      });
    }
  }, [supplier]);

  if (!open) return null;

  const handleSave = () => {
    if (!validateEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-[#472922ff]">Edit Supplier</h2>
        <div className="mb-2">
          <label className="block font-semibold mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="mb-2">
          <label className="block font-semibold mb-1">Contact Number</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.contact_number}
            onChange={e => setForm({ ...form, contact_number: e.target.value })}
          />
        </div>
        <div className="mb-2">
          <label className="block font-semibold mb-1">Email</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          {error && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              {error}
            </div>
          )}
        </div>
        <div className="mb-2">
          <label className="block font-semibold mb-1">Address</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
        </div>
        {/* No ingredient editing UI for now */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-[#f89c4e] text-white font-semibold"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSupplierModal;