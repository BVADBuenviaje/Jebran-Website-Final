import React, { useState } from "react";

const ORANGE = "#f89c4e";

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Reseller", value: "reseller" },
  { label: "Customer", value: "customer" },
];

const UserRow = ({ user, onRoleChange, onBlock }) => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  const currentUsername = localStorage.getItem("username");

  const handleRoleSelect = (e) => {
    setSelectedRole(e.target.value);
    setShowRoleModal(true);
  };

  const confirmRoleChange = () => {
    setShowRoleModal(false);
    if (selectedRole !== user.role) {
      onRoleChange(user, selectedRole);
    }
  };

  const handleBlock = () => setShowBlockModal(true);
  const handleUnblock = () => setShowUnblockModal(true);

  const confirmBlock = () => {
    setShowBlockModal(false);
    onBlock({ ...user, is_blocked: true });
  };

  const confirmUnblock = () => {
    setShowUnblockModal(false);
    onBlock({ ...user, is_blocked: false });
  };

  const fadedStyle = user.is_blocked ? { opacity: 0.5 } : {};

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
      <div
        className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_8rem] items-center rounded-lg bg-white mb-3"
        style={{
          boxShadow: "0 0 3px 0 rgba(0, 0, 0, 0.45)",
          minHeight: "56px",
          ...fadedStyle,
        }}
      >
        <span className="px-4 py-3 font-bold text-[#472922ff] text-base truncate border-r border-gray-200">
          {user.username}
        </span>
        <span className="px-4 py-3 text-[#472922ff] text-base truncate border-r border-gray-200">
          {user.shop_name || "-"}
        </span>
        <span className="px-4 py-3 text-[#472922ff] text-base truncate border-r border-gray-200">
          {user.email}
        </span>
        <span className="px-4 py-3 text-[#472922ff] text-base border-r border-gray-200">
          <select
            value={selectedRole}
            onChange={handleRoleSelect}
            className="rounded-full px-3 py-1 focus:outline-none shadow-sm"
            style={{
              minWidth: "100px",
              background: "#fffbe8",
              color: ORANGE,
              border: "none",
              opacity:
                user.is_blocked || user.username === currentUsername ? 0.5 : 1,
              cursor:
                user.is_blocked || user.username === currentUsername
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={user.is_blocked || user.username === currentUsername}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </span>
        <span className="px-4 py-3 text-[#472922ff] text-base truncate border-r border-gray-200">
          {user.last_active ? new Date(user.last_active).toLocaleString() : "-"}
        </span>
        <span className="px-4 py-3 flex items-center justify-end gap-2">
          {user.is_blocked && (
            <span className="px-2 py-1 rounded bg-[#bb6653] text-white text-xs font-semibold">
              Blocked
            </span>
          )}
          {user.role !== "admin" && !user.is_blocked && (
            <button
              onClick={handleBlock}
              className="rounded-full px-4 py-1 flex items-center justify-center shadow transition-colors"
              style={{
                background: "#fffbe8",
                color: ORANGE,
                minWidth: "60px",
                height: "32px",
                border: "none",
                fontWeight: "bold",
              }}
              title="Block User"
              onMouseEnter={(e) => handleButtonHover(e, "#f08b51")}
              onMouseLeave={(e) => handleButtonLeave(e, "#fffbe8", ORANGE)}
            >
              Block
            </button>
          )}
          {user.role !== "admin" && user.is_blocked && (
            <button
              onClick={handleUnblock}
              className="rounded-full px-4 py-1 flex items-center justify-center shadow transition-colors"
              style={{
                background: "#fffbe8",
                color: "#4caf50",
                minWidth: "80px",
                height: "32px",
                border: "none",
                fontWeight: "bold",
              }}
              title="Unblock User"
              onMouseEnter={(e) => handleButtonHover(e, "#388e3c")}
              onMouseLeave={(e) => handleButtonLeave(e, "#fffbe8", "#4caf50")}
            >
              Unblock
            </button>
          )}
        </span>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <p
              className="text-lg font-semibold mb-4 text-center"
              style={{ color: ORANGE }}
            >
              Are you sure you want to change {user.username} into{" "}
              {selectedRole}?
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
                onMouseLeave={(e) =>
                  handleButtonLeave(e, "#b95700", "#fffbe8")
                }
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole(user.role);
                }}
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
                onClick={confirmRoleChange}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <p
              className="text-lg font-semibold mb-4 text-center"
              style={{ color: ORANGE }}
            >
              Are you sure you want to block {user.username}?
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
                onMouseLeave={(e) =>
                  handleButtonLeave(e, "#b95700", "#fffbe8")
                }
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
                onClick={confirmBlock}
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
            <p
              className="text-lg font-semibold mb-4 text-center"
              style={{ color: ORANGE }}
            >
              Are you sure you want to unblock {user.username}?
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
                onMouseLeave={(e) =>
                  handleButtonLeave(e, "#b95700", "#fffbe8")
                }
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
                onMouseLeave={(e) =>
                  handleButtonLeave(e, "#4caf50", "#fffbe8")
                }
                onClick={confirmUnblock}
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

export default UserRow;