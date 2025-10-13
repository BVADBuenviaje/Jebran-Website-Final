import React from "react";
const ORANGE = "#f89c4e";

const statuses = [
  { label: "Active", value: "active" },
  { label: "Blocked", value: "blocked" },
];

const StatusCheckboxes = ({ selectedStatuses, onChange }) => {
  const handleCheckboxChange = (status) => {
    onChange(status);
  };

  return (
    <div className="flex gap-6 h-full items-center">
      {statuses.map((status) => {
        const active = selectedStatuses.includes(status.value);
        return (
          <button
            key={status.value}
            type="button"
            onClick={() => handleCheckboxChange(status.value)}
            className="w-32 px-3 h-full rounded-full border-2 transition-colors duration-200 font-semibold cursor-pointer text-sm flex items-center justify-center"
            style={{
              borderColor: ORANGE,
              background: active ? ORANGE : "#fff",
              color: active ? "#fff" : ORANGE,
              fontWeight: active ? "bold" : "normal",
            }}
          >
            {status.label}
          </button>
        );
      })}
    </div>
  );
};

export default StatusCheckboxes;