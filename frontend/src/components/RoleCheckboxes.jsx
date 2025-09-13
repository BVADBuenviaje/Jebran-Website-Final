import React from "react";
const ORANGE = "#f89c4e";

const RoleCheckboxes = ({ selectedRoles, onChange }) => {
  const roles = [
    { label: "Admins", value: "admin" },
    { label: "Resellers", value: "reseller" },
    { label: "Customers", value: "customer" },
    { label: "Blocked", value: "blocked" },
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
            className={`w-32 px-3 py-1 rounded-full border-2 transition-colors duration-200 font-semibold cursor-pointer text-sm`}
            style={{
              borderColor: ORANGE,
              background: active ? ORANGE : "#fff",
              color: active ? "#fff" : ORANGE,
              fontWeight: active ? "bold" : "normal",
            }}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
};

export default RoleCheckboxes;