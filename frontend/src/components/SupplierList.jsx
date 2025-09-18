// filepath: c:\Jebran Website\frontend\src\components\SupplierList.jsx
import React from "react";
import SupplierRow from "./SupplierRow";

const SupplierList = ({ suppliers, onEdit, onBlock, onSelect }) => (
  <div className="flex flex-col w-full gap-4">
    {suppliers.length === 0 ? (
      <div className="text-[#472922ff] text-lg font-medium">
        No suppliers added...
      </div>
    ) : (
      suppliers.map(supplier => (
        <SupplierRow
          key={supplier.id}
          supplier={supplier}
          onEdit={onEdit}
          onBlock={onBlock}
          onSelect={onSelect} // <-- Pass down
        />
      ))
    )}
  </div>
);

export default SupplierList;