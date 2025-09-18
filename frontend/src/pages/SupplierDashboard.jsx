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
    // Check if token exists before fetching role
    const token = localStorage.getItem("access"); // replace with your token key
    if (!token) {
      setRole(null);
      setLoadingRole(false);
      return;
    }
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setRole(data?.role || null);
        setLoadingRole(false);
      })
      .catch(() => {
        setRole(null);
        setLoadingRole(false);
      });
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
      // 1. Create the supplier
      const supplierRes = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          contact_number: form.contact_number,
          email: form.email,
          address: form.address,
          is_active: form.is_active,
        }),
      });

      if (!supplierRes.ok) {
        alert("Failed to add supplier.");
        return;
      }

      const newSupplier = await supplierRes.json();

      // 2. Create IngredientSupplier relationships for each selected ingredient
      for (const ing of form.ingredients) {
        await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier: newSupplier.id,
            ingredient: ing.id,
            price: ing.price || "0.00",
          }),
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
      console.log("Fetched supplier after update:", updatedSupplier); // <-- Add this log
      console.log("Updated supplier ingredients_supplied:", updatedSupplier.ingredients_supplied); // <-- Add this log
      setSelectedSupplier(updatedSupplier);

      // Optionally, refetch suppliers list to keep the sidebar in sync
      fetchSuppliers();

    } catch (err) {
      alert("Failed to update products.");
    }
  };
  // Restrict access to admins only
  if (loadingRole) return <div className="text-center py-10">Loading...</div>;
  if (role !== "admin") return <Navigate to="/login" />;

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white">
      <div className="h-full w-[85vw] bg-white rounded-xl shadow-lg flex flex-col px-[2.5%] pb-8">
        <div
          id="supplier-spacer"
          className="w-full"
          style={{ height: "11%" }}
        >
          {/* Supplier Header Spacer */}
        </div>
        <div
          id="supplier-header"
          className="w-full flex flex-row justify-between items-center font-[Helvetica] h-[10%]"
        >
          <div
            id="supplier-header-left"
            className="flex flex-col w-1/2 h-full"
          >
            <h1 className="m-0 text-[2.3rem] font-bold text-[#472922ff] tracking-[0.05rem] font-[inherit]">
              Supplier Management
            </h1>
            <p className="m-0 mt-1 text-[1.1rem] text-[#472922ff] font-[inherit] font-normal tracking-[0.05rem]">
              Manage supplier relationships and details.
            </p>
          </div>
          <div
            id="supplier-header-right"
            className="flex flex-col w-1/2 h-full justify-center items-end"
          >
            <button
              className="flex items-center px-6 py-2 rounded-lg font-normal text-white transition-colors"
              style={{
                background: "#f08b51",
                color: "#fff",
                borderRadius: "0.2rem",
                fontSize: "1.1rem",
                boxShadow: "0 2px 8px rgba(248,156,78,0.15)",
                cursor: "pointer",
              }}
              onClick={() => setShowAddModal(true)}
              onMouseEnter={e => { e.currentTarget.style.background = "#bb6653"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f08b51"; }}
            >
              <div className="flex items-center justify-center pr-4">
                {/* Plus icon (SVG) */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="11" fill="#fff" opacity="0.18"/>
                  <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-[inherit] font-normal text-white tracking-[0.05rem] text-[1.1rem]">
                Add Supplier
              </span>
            </button>
          </div>
        </div>
        <div
          id="supplier-stats"
          className="w-full flex flex-row items-center gap-x-6"
          style={{
            height: "13%",
            marginTop: "1%",
            padding: 0,
            boxSizing: "border-box",
          }}
        >
          <StatBox
            label="Blocked Suppliers"
            value={suppliers.filter(s => !s.is_active).length}
            icon={<FontAwesomeIcon icon={faBan} size="2x" className="text-[#bb6653]" />}
          />
          <StatBox
            label="Active Suppliers"
            value={suppliers.filter(s => s.is_active).length}
            icon={<FontAwesomeIcon icon={faCheckCircle} size="2x" className="text-[#f89c4e]" />}
          />
          <StatBox
            label="Total Suppliers"
            value={suppliers.length}
            icon={<FontAwesomeIcon icon={faUsers} size="2x" className="text-[#472922ff]" />}
          />
        </div>
        <div
          id="supplier-content"
          className="w-full flex-1 flex flex-row gap-6"
          style={{
            boxSizing: "border-box",
            marginTop: "1.5%",
          }}
        >
          <div
            id="supplier-content-left"
            className="flex-1 h-full bg-white rounded-lg shadow-lg p-5 flex flex-col"
            style={{
              boxShadow: "0 0 3px 0 rgba(0, 0, 0, 0.45)",
              minHeight: "120px",
              border: "none",
              boxSizing: "border-box",
            }}
          >
            <div
              id="supplier-search-toolbar"
              className="w-full flex flex-row items-center justify-between mb-6"
            >
              {/* Search Bar (Left) */}
              <div className="flex items-center w-1/2">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-4 pr-10 py-1.5 rounded-full border-2 w-full text-[#472922ff] font-semibold"
                    style={{
                      borderColor: "#f89c4e",
                      background: "#fffbe8",
                      fontFamily: "inherit",
                      height: "2.25rem",
                    }}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#f89c4e]">
                    {/* Magnifying glass icon (SVG) */}
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                </div>
              </div>
              {/* StatusCheckboxes (Right) */}
              <div className="flex items-center justify-end w-1/2" style={{ height: "2.25rem" }}>
                <StatusCheckboxes
                  selectedStatuses={selectedStatuses}
                  onChange={handleStatusChange}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <SupplierList
                  suppliers={filteredSuppliers}
                  onEdit={handleOpenEditModal}
                  onBlock={handleBlock}
                  onSelect={handleSelectSupplier} // <-- use the async version
                />
              </div>
            </div>
          </div>
          <div
            id="supplier-content-right"
            className="flex-1 h-full bg-white rounded-lg shadow-lg p-5 flex flex-col"
            style={{
              boxShadow: "0 0 3px 0 rgba(0, 0, 0, 0.45)",
              minHeight: "120px",
              border: "none",
              boxSizing: "border-box",
            }}
          >
            <SupplierProfile
              supplier={selectedSupplier}
              onEdit={handleOpenEditModal}
              onAddProduct={() => setShowUpdateIngredientsModal(true)}
            />
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
    </div>
  );
};

export default SupplierDashboard;