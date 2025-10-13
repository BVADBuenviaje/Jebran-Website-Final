import React from "react";

const SupplierProfile = ({ supplier, onEdit, onAddProduct }) => {
  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Supplier Selected</h3>
        <p className="text-gray-500">Select a supplier from the list to view their details</p>
      </div>
    );
  }

  const handleEditClick = () => {
    if (onEdit) onEdit(supplier);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-[#f08b51] rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">
              {supplier.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{supplier.name}</h2>
            <p className="text-sm text-gray-500">Supplier Details</p>
          </div>
        </div>
        <button
          onClick={handleEditClick}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Edit Supplier"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Contact Information Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Contact Information
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm text-gray-600">Phone:</span>
            <span className="ml-2 text-sm font-medium text-gray-900">{supplier.contact_number || "Not provided"}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-600">Email:</span>
            <span className="ml-2 text-sm font-medium text-gray-900">{supplier.email || "Not provided"}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-gray-600">Address:</span>
            <span className="ml-2 text-sm font-medium text-gray-900">{supplier.address || "Not provided"}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              supplier.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {supplier.is_active ? "Active" : "Blocked"}
            </span>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Ingredients Supplied
          </h3>
          <button
            onClick={onAddProduct}
            className="px-3 py-1 bg-[#f08b51] hover:bg-[#d9734a] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
            title="Add Ingredient"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {supplier.ingredients_supplied && supplier.ingredients_supplied.length > 0 ? (
            <div className="space-y-3">
              {supplier.ingredients_supplied
                .filter(item => item.is_active !== false)
                .map((item) => (
                  <div
                    key={item.ingredient.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-[#f08b51] rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-semibold text-sm">
                            {item.ingredient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.ingredient.name}</h4>
                          <p className="text-sm text-gray-500">
                            {item.ingredient.unit_of_measurement || "No unit specified"}
                          </p>
                        </div>
                      </div>
                      {item.price && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#f08b51]">₱{item.price}</p>
                          <p className="text-xs text-gray-500">per unit</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Ingredients Supplied</h4>
              <p className="text-gray-500 mb-4">This supplier hasn't been assigned any ingredients yet.</p>
              <button
                onClick={onAddProduct}
                className="px-4 py-2 bg-[#f08b51] hover:bg-[#d9734a] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add First Ingredient
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierProfile;