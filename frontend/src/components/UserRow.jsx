import React, { useState } from "react";
import { Link } from "react-router-dom";

const Divider = () => (
  <div className="mx-2 h-8 w-px bg-yellow-900/30 self-center" />
);

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

  // Get current logged-in username from localStorage
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

  return (
    <>
      <div className={`flex items-center pl-5 pr-3 h-13 rounded-lg text-yellow-900 shadow ${user.is_blocked ? "opacity-50 bg-gray-300" : "bg-gray-200"}`}>
        <Link
          to={`/admin/users/${user.id}`}
          className="flex-1 font-semibold truncate overflow-hidden text-blue-600 hover:underline"
        >
          {user.full_name || user.username}
        </Link>
        <Divider />
        <span className="flex-1 truncate overflow-hidden">{user.shop_name}</span>
        <Divider />
        <span className="flex-1 truncate overflow-hidden">{user.email}</span>
        <Divider />
        <span className="flex-1 capitalize truncate overflow-hidden">
          <select
            value={selectedRole}
            onChange={handleRoleSelect}
            className={`bg-gray-100 text-yellow-900 rounded-full px-6 py-2 border-none focus:outline-none shadow-sm ${
              (user.is_blocked || user.username === currentUsername) ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{ minWidth: "120px" }}
            disabled={user.is_blocked || user.username === currentUsername}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </span>
        <Divider />
        <span className="flex-1 truncate overflow-hidden">
          {user.last_active ? new Date(user.last_active).toLocaleString() : "-"}
        </span>
        <Divider />
        <span className="w-32 flex items-center justify-center gap-2">
          {user.role !== "admin" && !user.is_blocked && (
            <button
              onClick={handleBlock}
              className="rounded-full bg-yellow-900 px-4 py-1 flex items-center justify-center shadow hover:bg-yellow-800 transition-colors text-white"
              title="Block User"
              style={{ minWidth: "60px", height: "28px" }}
            >
              Block
            </button>
          )}
          {user.role !== "admin" && user.is_blocked && (
            <button
              onClick={handleUnblock}
              className="rounded-full bg-green-700 px-4 py-1 flex items-center justify-center shadow hover:bg-green-800 transition-colors text-white"
              title="Unblock User"
              style={{ minWidth: "80px", height: "28px" }}
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
            <p className="text-lg font-semibold mb-4 text-center">
              Are you sure you want to change {user.username} into {selectedRole}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole(user.role);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors"
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
            <p className="text-lg font-semibold mb-4 text-center">
              Are you sure you want to block {user.username}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                onClick={() => setShowBlockModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors"
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
            <p className="text-lg font-semibold mb-4 text-center">
              Are you sure you want to unblock {user.username}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                onClick={() => setShowUnblockModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 border-2 border-green-700 text-white bg-green-700 rounded focus:outline-none focus:ring-2 hover:bg-green-800 hover:border-green-800 transition-colors"
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