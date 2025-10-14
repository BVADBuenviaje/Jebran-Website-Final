import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import SupplierList from "../components/SupplierList";
import StatusCheckboxes from "../components/StatusCheckboxes";
import SupplierProfile from "../components/SupplierProfile";
import StatBox from "../components/CountBox";
import AddSupplierModal from "../components/AddSupplierModal";
import EditSupplierModal from "../components/EditSupplierModal";
import UpdateIngredientsModal from "../components/UpdateIngredientsModal";
import { fetchWithAuth } from "../utils/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faCheckCircle, faUsers } from "@fortawesome/free-solid-svg-icons";

const SupplierDashboard = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [orderBy, setOrderBy] = useState("alphabetical");
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState(["active", "blocked"]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [allIngredients, setAllIngredients] = useState([]);
  const [showUpdateIngredientsModal, setShowUpdateIngredientsModal] = useState(false);

  useEffect(() => {
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/`)
      .then(res => res.json())
      .then(data => setAllIngredients(data))
      .catch(() => setAllIngredients([]));
  }, []);

  // Helper to fetch suppliers from backend
  const fetchSuppliers = async () => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/`);
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("access");
    if (!token) {
      if (isMounted) {
        setRole(null);
        setLoadingRole(false);
      }
      return;
    }
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
      .then(res => {
        if (!isMounted) return;
        if (res.ok) return res.json();
        // If not ok, don't set role to null yet (wait for refresh)
        return null;
      })
      .then(data => {
        if (!isMounted) return;
        if (data && data.role) setRole(data.role);
        else setRole(null); // Only set to null if refresh failed
        setLoadingRole(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setRole(null);
        setLoadingRole(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Fetch suppliers
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter and order logic
  let filteredSuppliers = suppliers
    .filter(s =>
      (selectedStatuses.includes(s.is_active ? "active" : "blocked")) &&
      (
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase())
      )
    );

  if (orderBy === "alphabetical") {
    filteredSuppliers = [...filteredSuppliers].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else {
    filteredSuppliers = [...filteredSuppliers].sort((a, b) =>
      new Date(a.created_at || 0) - new Date(b.created_at || 0)
    );
  }

  // Auto-select first supplier when suppliers list changes
  useEffect(() => {
    if (filteredSuppliers.length > 0 && !selectedSupplier) {
      handleSelectSupplier(filteredSuppliers[0]);
    } else if (filteredSuppliers.length === 0) {
      setSelectedSupplier(null);
    }
  }, [filteredSuppliers, selectedSupplier]);

  // Handlers
  const handleEdit = async (form) => {
    if (!selectedSupplier) return;
    try {
      // Update supplier info in backend
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/${selectedSupplier.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contact_number: form.contact_number,
          email: form.email,
          address: form.address,
          is_active: form.is_active,
        }),
      });

      if (!res.ok) throw new Error("Failed to update supplier.");

      // Get updated supplier data from response (if your API returns it)
      const updatedSupplier = await res.json();

      // Update suppliers list locally
      setSuppliers(prev =>
        prev.map(s =>
          s.id === selectedSupplier.id ? { ...s, ...updatedSupplier } : s
        )
      );

      // Update selectedSupplier locally
      setSelectedSupplier(prev =>
        prev ? { ...prev, ...updatedSupplier } : prev
      );

      setShowEditModal(false);
    } catch (err) {
      alert("Failed to update supplier.");
      setShowEditModal(false);
    }
  };

  // Block/unblock supplier handler
  const handleBlock = async (supplier) => {
    try {
      // Update supplier's is_active status in backend
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/${supplier.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: supplier.is_active,
        }),
      });

      if (!res.ok) throw new Error("Failed to update supplier status.");

      const updatedSupplier = await res.json();

      // Update suppliers list locally
      setSuppliers(prev =>
        prev.map(s =>
          s.id === supplier.id ? { ...s, ...updatedSupplier } : s
        )
      );

      // Update selectedSupplier if it's the one being blocked/unblocked
      setSelectedSupplier(prev =>
        prev && prev.id === supplier.id ? { ...prev, ...updatedSupplier } : prev
      );
    } catch (err) {
      alert("Failed to update supplier status.");
    }
  };

  const handleStatusChange = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Add supplier and ingredient relationships
  const handleAddSupplier = async (form) => {
    try {
      // 1. Create the supplier first
      const supplierRes = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contact_number: form.contact_number,
          email: form.email,
          address: form.address,
          is_active: form.is_active,
        }),
      });

      if (!supplierRes.ok) {
        const errorData = await supplierRes.json();
        alert(`Failed to add supplier: ${JSON.stringify(errorData)}`);
        return;
      }

      const newSupplier = await supplierRes.json();

      // 2. Create IngredientSupplier relationships for each selected ingredient
      for (const ing of form.ingredients) {
        if (!ing.id) continue;
        const postBody = {
          supplier: newSupplier.id,
          ingredient: ing.id,
          price: ing.price || "0.00",
          is_active: true,
        };
        console.log("POST body:", postBody);
        await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postBody),
        });
      }

      // 3. Refetch suppliers to get updated products for new supplier
      await fetchSuppliers();
      setShowAddModal(false);
    } catch (err) {
      alert("Failed to add supplier.");
    }
  };

  // Select supplier for profile
  const handleSelectSupplier = async (supplier) => {
    // Fetch the latest supplier details from backend
    const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/${supplier.id}/`);
    const latestSupplier = await res.json();
    setSelectedSupplier(latestSupplier);
  };

  // Open edit modal from SupplierProfile
  const handleOpenEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  // Handle update ingredients/products for supplier
  const handleUpdateIngredients = async (updates) => {
    if (!selectedSupplier) return;
    try {
      // Deactivate all ingredient-supplier links for this supplier
      await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/deactivate-by-supplier/${selectedSupplier.id}/`, {
        method: "POST"
      });

      // For each update, either reactivate or create the link
      for (const item of updates) {
        const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/?supplier=${selectedSupplier.id}&ingredient=${item.ingredient}`);
        const links = await res.json();
        if (links.length > 0) {
          await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/${links[0].id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              is_active: item.is_active,
              price: item.price,
            }),
          });
        } else if (item.is_active) {
          await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplier: selectedSupplier.id,
              ingredient: item.ingredient,
              price: item.price,
              is_active: true,
            }),
          });
        }
      }

      // Fetch the updated supplier details directly and update selectedSupplier
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/${selectedSupplier.id}/`);
      const updatedSupplier = await res.json();
      console.log("Fetched supplier after update:", updatedSupplier);
      console.log("Updated supplier ingredients_supplied:", updatedSupplier.ingredients_supplied);
      setSelectedSupplier(updatedSupplier);

      // Optionally, refetch suppliers list to keep the sidebar in sync
      fetchSuppliers();

    } catch (err) {
      alert("Failed to update products.");
    }
  };

  // Restrict access to admins only
  if (loadingRole) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (role !== "admin") return <Navigate to="/login" />;

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const blockedSuppliers = suppliers.filter(s => !s.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20">
            {/* Back button intentionally omitted */}
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Management</h1>
            <p className="text-gray-600">Manage supplier relationships and details</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-[#f08b51] hover:bg-[#d9734a] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Supplier
          </button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Suppliers</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{totalSuppliers}</p>
                  <p className="text-sm text-gray-500">All suppliers</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUsers} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Suppliers</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{activeSuppliers}</p>
                  <p className="text-sm text-gray-500">Currently active</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Blocked Suppliers</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{blockedSuppliers}</p>
                  <p className="text-sm text-gray-500">Currently blocked</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faBan} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Supplier Directory</h2>
            <p className="text-gray-600">Manage your supplier relationships and monitor status</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f08b51] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusCheckboxes
                  selectedStatuses={selectedStatuses}
                  onChange={handleStatusChange}
                />
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Supplier List Table with fixed width */}
            <div className="min-w-[700px] max-w-[700px]">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ingredients Supplied</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr 
                        key={supplier.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedSupplier && selectedSupplier.id === supplier.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleSelectSupplier(supplier)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-40">{supplier.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-56 overflow-hidden text-ellipsis" style={{maxWidth: "14rem"}}>{supplier.email || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-32">{supplier.contact_number || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap w-24">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            supplier.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {supplier.is_active ? "Active" : "Blocked"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-32">
                          {supplier.ingredients_supplied ? supplier.ingredients_supplied.length : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-32">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(supplier);
                              }}
                              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBlock({...supplier, is_active: !supplier.is_active});
                              }}
                              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                                supplier.is_active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {supplier.is_active ? "Block" : "Unblock"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Supplier Profile Panel with fixed width */}
            {selectedSupplier && (
              <div className="w-[400px] border-l border-gray-200 p-6">
                <SupplierProfile
                  supplier={selectedSupplier}
                  onEdit={handleOpenEditModal}
                  onAddProduct={() => setShowUpdateIngredientsModal(true)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AddSupplierModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSupplier}
      />
      <EditSupplierModal
        open={showEditModal}
        supplier={selectedSupplier}
        onClose={() => setShowEditModal(false)}
        onSave={handleEdit}
      />
      <UpdateIngredientsModal
        open={showUpdateIngredientsModal}
        supplier={selectedSupplier}
        allIngredients={allIngredients}
        onClose={() => setShowUpdateIngredientsModal(false)}
        onSave={handleUpdateIngredients}
      />
    </div>
  );
};

export default SupplierDashboard;