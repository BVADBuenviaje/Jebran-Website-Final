import React, { useState, useEffect } from "react";

const ORANGE = "#f89c4e";

const UpdateIngredientsModal = ({
  open,
  supplier,
  allIngredients,
  onClose,
  onSave,
}) => {
  // Prepare initial state: which ingredients are active for this supplier
  const [selected, setSelected] = useState([]);
  const [prices, setPrices] = useState({});

  useEffect(() => {
    if (supplier && supplier.ingredients_supplied) {
      const activeIds = supplier.ingredients_supplied
        .filter((item) => item.is_active !== false)
        .map((item) => item.ingredient.id);
      setSelected(activeIds);
      // Set prices for supplied ingredients
      const priceMap = {};
      supplier.ingredients_supplied.forEach((item) => {
        priceMap[item.ingredient.id] = item.price || "";
      });
      setPrices(priceMap);
    }
  }, [supplier]);

  // Toggle ingredient active/inactive
  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle price change
  const handlePriceChange = (id, value) => {
    setPrices((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Save handler
  const handleSave = () => {
    // Prepare payload: for each ingredient, set is_active and price
    const updates = allIngredients.map((ingredient) => ({
      ingredient: ingredient.id,
      is_active: selected.includes(ingredient.id),
      price: prices[ingredient.id] || "0.00",
    }));
    onSave(updates);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4 text-[#472922ff]">Update Products</h2>
        <div className="mb-4">
          <div className="font-semibold text-[#472922ff] mb-2">Select products to supply:</div>
          <div className="max-h-[300px] overflow-y-auto">
            {allIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex items-center py-2 border-b border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(ingredient.id)}
                  onChange={() => handleToggle(ingredient.id)}
                  className="mr-3 accent-[#f89c4e]"
                  id={`ingredient-${ingredient.id}`}
                />
                <label
                  htmlFor={`ingredient-${ingredient.id}`}
                  className="flex-1 text-[#472922ff] font-semibold"
                >
                  {ingredient.name}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={prices[ingredient.id] || ""}
                  onChange={(e) => handlePriceChange(ingredient.id, e.target.value)}
                  className="ml-4 px-2 py-1 border rounded w-24"
                  disabled={!selected.includes(ingredient.id)}
                />
              </div>
            ))}
          </div>
        </div>
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

export default UpdateIngredientsModal;