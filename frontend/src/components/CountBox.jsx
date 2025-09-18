import React from "react";

const StatBox = ({ label, value, icon }) => (
  <div
    className="flex flex-col justify-between rounded-lg shadow-lg bg-white p-5 w-1/3"
    style={{
      boxShadow: "0 0 3px 0 rgba(0, 0, 0, 0.45)",
      minHeight: "120px",
    }}
  >
    <div className="flex items-center justify-between w-full mb-2">
      <h2 className="text-lg font-semibold text-left text-[#472922ff] m-0">{label}</h2>
      <div className="ml-2 flex items-center">{icon}</div>
    </div>
    <div className="text-4xl font-bold text-left text-[#472922ff] select-none">
      {value}
    </div>
  </div>
);

export default StatBox;