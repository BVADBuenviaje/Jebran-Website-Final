import React, { useState } from "react";

const Divider = () => (
  <div className="mx-2 h-8 w-px bg-yellow-900/30 self-center" />
);

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Reseller", value: "reseller" },
  { label: "Customer", value: "customer" },
];

const UserRow = ({ user, onRoleChange, onDelete }) => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

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

  const handleDelete = () => setShowDeleteModal(true);

  const confirmDelete = () => {
    setShowDeleteModal(false);
    onDelete(user);
  };

  return (
    <>
      <div className="flex items-center pl-5 pr-3 h-13 bg-gray-200 rounded-lg text-yellow-900 shadow">
        <span className="flex-1 font-semibold truncate overflow-hidden">{user.username}</span>
        <Divider />
        <span className="flex-1 truncate overflow-hidden">{user.shop_name}</span>
        <Divider />
        <span className="flex-1 truncate overflow-hidden">{user.email}</span>
        <Divider />
        <span className="flex-1 capitalize truncate overflow-hidden">
          <select
            value={selectedRole}
            onChange={handleRoleSelect}
            className="bg-gray-100 text-yellow-900 rounded-full px-6 py-2 border-none focus:outline-none shadow-sm"
            style={{ minWidth: "120px" }}
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
          {user.role !== "admin" && (
            <button
              onClick={handleDelete}
              className="rounded-full bg-yellow-900 p-1 flex items-center justify-center shadow hover:bg-yellow-800 transition-colors"
              title="Remove User"
              style={{ width: "28px", height: "28px" }}
            >
              {/* X Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                className="w-24 px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors"
                onClick={confirmRoleChange}
              >
                Yes
              </button>
              <button
                type="button"
                className="w-24 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole(user.role);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <p className="text-lg font-semibold mb-4 text-center">
              Are you sure you want to remove {user.username} from the system?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="w-24 px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors"
                onClick={confirmDelete}
              >
                Yes
              </button>
              <button
                type="button"
                className="w-24 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserRow;