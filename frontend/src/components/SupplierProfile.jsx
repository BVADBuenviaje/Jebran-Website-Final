import React from "react";

const ORANGE = "#f89c4e";

const SupplierProfile = ({ supplier, onEdit, onAddProduct }) => {
  if (!supplier) {
    return <div className="text-[#472922ff]">Select a supplier to view details.</div>;
  }

  // When edit is clicked, set selected supplier in parent and open modal
  const handleEditClick = () => {
    if (onEdit) onEdit(supplier);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-bold text-[#472922ff] mr-2">{supplier.name}</h2>
        <button
          className="p-2 rounded-full bg-[#fffbe8] hover:bg-[#f6d5bf] transition-colors"
          title="Edit Supplier"
          onClick={handleEditClick}
          style={{ display: "flex", alignItems: "center" }}
        >
          {/* Pen icon SVG */}
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path
              d="M15.232 5.232a3 3 0 1 1 4.243 4.243l-10.5 10.5a2 2 0 0 1-.878.515l-4 1a1 1 0 0 1-1.213-1.213l1-4a2 2 0 0 1 .515-.878l10.5-10.5z"
              stroke="#f08b51"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
      <div className="mb-4">
        <div className="font-semibold text-[#472922ff] mb-1">Contact Information</div>
        <div className="mb-1">Phone: <span className="font-normal">{supplier.contact_number || "N/A"}</span></div>
        <div className="mb-1">Email: <span className="font-normal">{supplier.email || "N/A"}</span></div>
        <div className="mb-1">Address: <span className="font-normal">{supplier.address || "N/A"}</span></div>
        <div className="mb-1">Status: <span className="font-normal">{supplier.is_active ? "Active" : "Blocked"}</span></div>
      </div>
      <div className="flex items-center mb-2">
        <span className="font-semibold text-[#472922ff] mr-2">Products</span>
        <button
          className="ml-2 px-3 py-1 rounded-full bg-[#f89c4e] text-white font-semibold text-sm"
          title="Add Product"
          onClick={onAddProduct}
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {supplier.ingredients_supplied && supplier.ingredients_supplied.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {supplier.ingredients_supplied
              .filter(item => item.is_active !== false) // <-- Only show active
              .map((item) => (
                <div
                  key={item.ingredient.id}
                  className="px-4 py-2 rounded-lg font-semibold text-sm shadow flex items-center border border-black/10"
                  style={{
                    background: "#fffbe8",
                    color: ORANGE,
                    minWidth: "120px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span className="mr-2">{item.ingredient.name}</span>
                  {item.price ? (
                    <span className="text-[#bb6653] font-normal">₱{item.price}</span>
                  ) : ""}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-[#472922ff]">No products listed.</div>
        )}
      </div>
    </div>
  );
};

export default SupplierProfile;