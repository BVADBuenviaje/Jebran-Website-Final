import React, { useState } from "react";

const ORANGE = "#f89c4e";

const SupplierRow = ({ supplier, onEdit, onBlock, onSelect }) => {
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);

  const fadedStyle = supplier.is_active === false ? { opacity: 0.5 } : {};

  // Helper for hover effect
  const handleButtonHover = (e, bgColor) => {
    e.target.style.background = bgColor;
    e.target.style.color = "#fff";
  };
  const handleButtonLeave = (e, bgColor, textColor) => {
    e.target.style.background = bgColor;
    e.target.style.color = textColor;
  };

  return (
    <>
      <div className="px-3 first:pt-3">
        <div
          className="grid grid-cols-[1fr_1fr_2fr] items-center rounded-lg bg-white mb-1 overflow-visible border border-black/10 shadow-sm"
          style={{
            boxShadow: "0 0 3px rgba(0, 0, 0, 0.45)",
            minHeight: "56px",
            cursor: "pointer",
            ...fadedStyle,
          }}
          onClick={(e) => {
            if (e.target.tagName !== "BUTTON" && onSelect) {
              onSelect(supplier);
            }
          }}
        >
          <span className="px-4 py-3 font-bold text-[#472922ff] text-base truncate border-r border-gray-200">
            {supplier.name}
          </span>
          <span className="px-4 py-3 text-[#472922ff] text-base truncate border-r border-gray-200">
            {supplier.contact_number}
          </span>
          <span className="px-4 py-3 flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(supplier);
              }}
              className="rounded-full px-4 py-1 flex items-center justify-center shadow transition-colors"
              style={{
                background: "#fffbe8",
                color: ORANGE,
                minWidth: "60px",
                height: "32px",
                border: "none",
                fontWeight: "bold",
              }}
              title="Edit Supplier"
              onMouseEnter={(e) => handleButtonHover(e, "#f08b51")}
              onMouseLeave={(e) => handleButtonLeave(e, "#fffbe8", ORANGE)}
              disabled={supplier.is_active === false}
            >
              Edit
            </button>

            {supplier.is_active ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBlockModal(true);
                }}
                className="rounded-full px-4 py-1 flex items-center justify-center shadow transition-colors"
                style={{
                  background: "#fffbe8",
                  color: "#b95700",
                  minWidth: "60px",
                  height: "32px",
                  border: "none",
                  fontWeight: "bold",
                }}
                title="Block Supplier"
                onMouseEnter={(e) => handleButtonHover(e, "#b95700")}
                onMouseLeave={(e) => handleButtonLeave(e, "#fffbe8", "#b95700")}
              >
                Block
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnblockModal(true);
                }}
                className="rounded-full px-4 py-1 flex items-center justify-center shadow transition-colors"
                style={{
                  background: "#fffbe8",
                  color: "#4caf50",
                  minWidth: "80px",
                  height: "32px",
                  border: "none",
                  fontWeight: "bold",
                }}
                title="Unblock Supplier"
                onMouseEnter={(e) => handleButtonHover(e, "#388e3c")}
                onMouseLeave={(e) => handleButtonLeave(e, "#fffbe8", "#4caf50")}
              >
                Unblock
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <p className="text-lg font-semibold mb-4 text-center" style={{ color: ORANGE }}>
              Are you sure you want to block {supplier.name}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                style={{
                  background: "#b95700",
                  color: "#fffbe8",
                  border: "none",
                  borderRadius: "2rem",
                }}
                onMouseEnter={(e) => handleButtonHover(e, "#a04a00")}
                onMouseLeave={(e) => handleButtonLeave(e, "#b95700", "#fffbe8")}
                onClick={() => setShowBlockModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                style={{
                  background: ORANGE,
                  color: "#fffbe8",
                  border: "none",
                  borderRadius: "2rem",
                }}
                onMouseEnter={(e) => handleButtonHover(e, "#f08b51")}
                onMouseLeave={(e) => handleButtonLeave(e, ORANGE, "#fffbe8")}
                onClick={() => {
                  setShowBlockModal(false);
                  onBlock({ ...supplier, is_active: false });
                }}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <p className="text-lg font-semibold mb-4 text-center" style={{ color: ORANGE }}>
              Are you sure you want to unblock {supplier.name}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                style={{
                  background: "#b95700",
                  color: "#fffbe8",
                  border: "none",
                  borderRadius: "2rem",
                }}
                onMouseEnter={(e) => handleButtonHover(e, "#a04a00")}
                onMouseLeave={(e) => handleButtonLeave(e, "#b95700", "#fffbe8")}
                onClick={() => setShowUnblockModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                style={{
                  background: "#4caf50",
                  color: "#fffbe8",
                  border: "none",
                  borderRadius: "2rem",
                }}
                onMouseEnter={(e) => handleButtonHover(e, "#388e3c")}
                onMouseLeave={(e) => handleButtonLeave(e, "#4caf50", "#fffbe8")}
                onClick={() => {
                  setShowUnblockModal(false);
                  onBlock({ ...supplier, is_active: true });
                }}
              >
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupplierRow;