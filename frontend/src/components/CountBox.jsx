import React from "react";

const StatBox = ({ label, value }) => (
  <div className="flex flex-col items-center w-1/3">
    <h2 className="mb-2 text-lg font-semibold text-white">{label}</h2>
    <div className="border-2 border-gray-200 rounded-lg px-22 py-10 flex items-center justify-center text-4xl font-bold bg-gray-200 text-yellow-900 select-none shadow-2xl shadow-black/40">
      {value}
    </div>
  </div>
);

export default StatBox;