import React, { useState, useEffect } from "react";

const AddSupplierModal = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    contact_number: "",
    email: "",
    address: "",
    is_active: true,
    ingredients: [], // [{ id, price }]
  });
  const [ingredients, setIngredients] = useState([]);
  const [ingredientSearch, setIngredientSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetch(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/`)
        .then(res => res.json())
        .then(data => setIngredients(data))
        .catch(() => setIngredients([]));
    }
  }, [open]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Toggle ingredient selection
  const handleIngredientToggle = (ingredientId) => {
    setForm(prev => {
      const exists = prev.ingredients.find(i => i.id === ingredientId);
      if (exists) {
        return {
          ...prev,
          ingredients: prev.ingredients.filter(i => i.id !== ingredientId)
        };
      } else {
        return {
          ...prev,
          ingredients: [...prev.ingredients, { id: ingredientId, price: "" }]
        };
      }
    });
  };

  // Handle price input for each ingredient
  const handlePriceChange = (ingredientId, price) => {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(i =>
        i.id === ingredientId ? { ...i, price } : i
      )
    }));
  };

  if (!open) return null;

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-[#472922ff] mb-6">Add Supplier</h2>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="flex flex-row gap-8">
          {/* Supplier Info (Left) */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <label className="block font-semibold mb-1" htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1" htmlFor="contact_number">Contact Number</label>
              <input
                id="contact_number"
                name="contact_number"
                type="tel"
                value={form.contact_number}
                onChange={handleChange}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                    e.preventDefault();
                  }
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1" htmlFor="address">Address</label>
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
                className="accent-[#f89c4e]"
              />
              <label htmlFor="is_active" className="font-semibold">Active</label>
            </div>
          </div>
          {/* Divider */}
          <div className="w-px bg-gray-300 mx-2 self-stretch" />
          {/* Ingredients List (Right) */}
          <div className="flex-1 flex flex-col gap-2">
            <label className="block font-semibold mb-1" htmlFor="ingredientSearch">
              Ingredients Supplied by This Supplier
            </label>
            <input
              id="ingredientSearch"
              type="text"
              placeholder="Search ingredients..."
              value={ingredientSearch}
              onChange={e => setIngredientSearch(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <div
              className="border rounded px-2 py-1 bg-gray-50"
              style={{
                maxHeight: "16rem",
                overflowY: "scroll",
                overflowX: "hidden",
              }}
            >
              {filteredIngredients.length === 0 ? (
                <div className="text-gray-400 text-sm">No ingredients found.</div>
              ) : (
                filteredIngredients.map(ingredient => {
                  const selected = form.ingredients.find(i => i.id === ingredient.id);
                  return (
                    <div key={ingredient.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => handleIngredientToggle(ingredient.id)}
                        className="accent-[#f89c4e]"
                      />
                      <span className="flex-1">{ingredient.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        disabled={!selected}
                        value={selected ? selected.price : ""}
                        onChange={e => handlePriceChange(ingredient.id, e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-right"
                      />
                    </div>
                  );
                })
              )}
            </div>
            {form.ingredients.length > 0 && (
              <div className="mt-2 text-sm text-[#472922ff]">
                <span className="font-semibold">Selected:</span>{" "}
                {form.ingredients
                  .map(i => {
                    const ing = ingredients.find(ing => ing.id === i.id);
                    return ing ? ing.name : "";
                  })
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
          </div>
        </form>
        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-supplier-form"
            className="px-4 py-2 rounded bg-[#f89c4e] text-white font-semibold hover:bg-[#bb6653]"
            onClick={() => onSubmit(form)}
          >
            Add Supplier
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSupplierModal;