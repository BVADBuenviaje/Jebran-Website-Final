import React from "react";
const ORANGE = "#f89c4e";

const StatBox = ({ label, value }) => (
  <div className="flex flex-col items-center w-1/3">
    <h2 className="mb-2 text-lg font-semibold" style={{ color: ORANGE }}>{label}</h2>
    <div
      className="border-2 rounded-lg px-22 py-10 flex items-center justify-center text-4xl font-bold select-none shadow-2xl"
      style={{
        borderColor: "#fff",
        background: ORANGE,
        color: "#fff",
        boxShadow: "0 4px 24px rgba(248, 156, 78, 0.15)",
      }}
    >
      {value}
    </div>
  </div>
);

export default StatBox;