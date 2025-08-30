import React from "react";

const RoleCheckboxes = ({ selectedRoles, onChange }) => {
  const roles = [
    { label: "Admins", value: "admin" },
    { label: "Resellers", value: "reseller" },
    { label: "Customers", value: "customer" },
    { label: "Blocked", value: "blocked" }, // <-- Add this line
  ];

  const handleCheckboxChange = (role) => {
    onChange(role);
  };

  return (
    <div className="flex gap-6 mt-2">
      {roles.map((role) => {
        const active = selectedRoles.includes(role.value);
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => handleCheckboxChange(role.value)}
            className={`w-32 px-3 py-1 rounded-full border-2 border-white transition-colors duration-200 font-semibold cursor-pointer text-sm
              ${active
                ? role.value === "blocked"
                  ? "bg-red-200 text-red-900"
                  : "bg-gray-200 text-yellow-900"
                : "bg-transparent text-gray-200"
              }`}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
};

export default RoleCheckboxes;