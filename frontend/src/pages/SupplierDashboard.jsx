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

  const toArray = (data) => (Array.isArray(data) ? data : (data && data.results) ? data.results : []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/`);
        const raw = res.ok ? await res.json() : [];
        const arr = toArray(raw).map(i => ({
          ...i,
          current_stock: i.current_stock ?? i.total_stock ?? null,
          unit_of_measurement: i.unit_of_measurement ?? i.uom ?? "",
        }));
        if (!mounted) return;
        setAllIngredients(arr);
      } catch (err) {
        console.error("Failed to load ingredients", err);
        if (!mounted) return;
        setAllIngredients([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/`);
      const raw = res.ok ? await res.json() : [];
      const arr = toArray(raw).map(s => ({
        ...s,
        ingredients_supplied: Array.isArray(s.ingredients_supplied) ? s.ingredients_supplied : (s.ingredients || []),
      }));
      setSuppliers(arr);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
      setSuppliers([]);
    }
  };

  const handleSelectSupplier = async (supplier) => {
    if (!supplier || !supplier.id) return;
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/${supplier.id}/`);
      let latestSupplier;
      if (res.ok) {
        latestSupplier = await res.json();
      } else {
        latestSupplier = {
          id: supplier.id,
          name: supplier.name ?? supplier.company_name ?? "Unknown Supplier",
          contact_number: supplier.contact_number ?? supplier.phone ?? null,
          email: supplier.email ?? null,
          address: supplier.address ?? null,
          is_active: supplier.is_active ?? true,
        };
      }
      const relRes = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/?supplier=${supplier.id}`);
      let links = [];
      if (relRes.ok) {
        const relData = await relRes.json();
        links = toArray(relData);
      }
      const normalizedLinks = links.map(link => {
        let ingredientObj = link.ingredient ?? link.ingredient_id ?? null;
        if ((typeof ingredientObj === "number" || typeof ingredientObj === "string") && allIngredients.length) {
          const found = allIngredients.find(i => String(i.id) === String(ingredientObj));
          if (found) ingredientObj = found;
          else ingredientObj = { id: ingredientObj, name: `Ingredient #${ingredientObj}`, unit_of_measurement: "", current_stock: null };
        }
        if (!ingredientObj || (typeof ingredientObj === "object" && !("name" in ingredientObj))) {
          ingredientObj = {
            id: ingredientObj?.id ?? null,
            name: ingredientObj?.name ?? "Unknown",
            unit_of_measurement: ingredientObj?.unit_of_measurement ?? ingredientObj?.uom ?? "",
            current_stock: ingredientObj?.current_stock ?? ingredientObj?.total_stock ?? null
          };
        } else {
          ingredientObj = {
            ...ingredientObj,
            unit_of_measurement: ingredientObj.unit_of_measurement ?? ingredientObj.uom ?? "",
            current_stock: ingredientObj.current_stock ?? ingredientObj.total_stock ?? null
          };
        }
        return { ...link, ingredient: ingredientObj };
      });
      const seen = new Set();
      const dedupedLinks = [];
      for (const link of normalizedLinks) {
        const relId = link.id ?? null;
        const ingId = (typeof link.ingredient === "object" ? (link.ingredient.id ?? link.ingredient.pk) : link.ingredient) ?? link.ingredient_id;
        const supplierId = link.supplier ?? link.supplier_id ?? supplier.id;
        const uniqueKey = relId ? `rel-${relId}` : `s${supplierId}-i${ingId}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);
        dedupedLinks.push(link);
      }
      setSelectedSupplier({ ...latestSupplier, ingredients_supplied: dedupedLinks });
    } catch (err) {
      console.error("Failed to load supplier details or ingredient links", err);
      setSelectedSupplier({
        id: supplier.id,
        name: supplier.name ?? supplier.company_name ?? "Unknown Supplier",
        contact_number: supplier.contact_number ?? null,
        email: supplier.email ?? null,
        address: supplier.address ?? null,
        is_active: supplier.is_active ?? true,
        ingredients_supplied: []
      });
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
    (async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`);
        if (!isMounted) return;
        const data = res.ok ? await res.json() : null;
        if (data && data.role) setRole(data.role);
        else setRole(null);
      } catch (err) {
        if (!isMounted) return;
        setRole(null);
      } finally {
        if (isMounted) setLoadingRole(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  let filteredSuppliers = suppliers.filter(s => {
    const statusKey = s.is_active ? "active" : "blocked";
    const matchesStatus = selectedStatuses.includes(statusKey);
    const q = search.trim().toLowerCase();
    const matchesSearch = q === "" ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  if (orderBy === "alphabetical") {
    filteredSuppliers = [...filteredSuppliers].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else {
    filteredSuppliers = [...filteredSuppliers].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  }

  useEffect(() => {
    if (filteredSuppliers.length > 0) {
      if (!selectedSupplier || !filteredSuppliers.some(s => selectedSupplier && s.id === selectedSupplier.id)) {
        handleSelectSupplier(filteredSuppliers[0]);
      }
    } else {
      setSelectedSupplier(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSuppliers]);

  const handleEdit = async (form) => {
    if (!selectedSupplier) return;
    try {
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
      const updatedSupplier = await res.json();
      setSuppliers(prev => prev.map(s => s.id === selectedSupplier.id ? { ...s, ...updatedSupplier } : s));
      setSelectedSupplier(prev => prev ? { ...prev, ...updatedSupplier } : prev);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update supplier.");
      setShowEditModal(false);
    }
  };

  const handleBlock = async (supplier) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/suppliers/${supplier.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: supplier.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update supplier status.");
      const updatedSupplier = await res.json();
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, ...updatedSupplier } : s));
      setSelectedSupplier(prev => prev && prev.id === supplier.id ? { ...prev, ...updatedSupplier } : prev);
    } catch (err) {
      console.error(err);
      alert("Failed to update supplier status.");
    }
  };

  const handleStatusChange = (status) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const handleAddSupplier = async (form) => {
    try {
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
        const err = await supplierRes.json().catch(() => ({}));
        alert(`Failed to add supplier: ${JSON.stringify(err)}`);
        return;
      }
      const newSupplier = await supplierRes.json();
      for (const ing of form.ingredients || []) {
        if (!ing.id) continue;
        await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier: newSupplier.id,
            ingredient: ing.id,
            price: ing.price ?? "0.00",
            is_active: true,
          }),
        });
      }
      await fetchSuppliers();
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add supplier.");
    }
  };

  const handleUpdateIngredients = async (updates) => {
    if (!selectedSupplier) return;
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/?supplier=${selectedSupplier.id}`);
      const raw = res.ok ? await res.json() : [];
      const existingLinks = toArray(raw);

      const existingByIngredient = new Map();
      existingLinks.forEach(link => {
        const ingId = (typeof link.ingredient === "object" ? (link.ingredient.id ?? link.ingredient.pk) : link.ingredient) ?? link.ingredient_id;
        if (ingId != null) existingByIngredient.set(String(ingId), link);
      });

      const updatesMap = new Map((updates || []).map(u => [String(u.ingredient), u]));

      for (const link of existingLinks) {
        const ingId = (typeof link.ingredient === "object" ? (link.ingredient.id ?? link.ingredient.pk) : link.ingredient) ?? link.ingredient_id;
        const key = String(ingId);
        const upd = updatesMap.get(key);
        const shouldBeActive = !!(upd && upd.is_active);
        if (!shouldBeActive && link.is_active) {
          await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/${link.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: false }),
          });
        }
      }

      for (const item of updates || []) {
        const key = String(item.ingredient);
        const existing = existingByIngredient.get(key);
        const payload = { price: item.price ?? "0.00", is_active: !!item.is_active };
        if (existing) {
          await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/${existing.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else if (item.is_active) {
          await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredient-suppliers/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplier: selectedSupplier.id,
              ingredient: item.ingredient,
              price: payload.price,
              is_active: true,
            }),
          });
        }
      }

      await handleSelectSupplier(selectedSupplier);
      await fetchSuppliers();
    } catch (err) {
      console.error("Failed to update ingredient-suppliers:", err);
      alert("Failed to update supplier ingredients.");
    }
  };

  const handleOpenEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

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

  if (role !== "admin" && role !== "superadmin") return <Navigate to="/login" />;

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const blockedSuppliers = suppliers.filter(s => !s.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20"></div>

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
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                <StatusCheckboxes selectedStatuses={selectedStatuses} onChange={handleStatusChange} />
              </div>
            </div>
          </div>

          <div className="flex">
            <div className="min-w-[700px] max-w-[700px]">
              <SupplierList
                suppliers={filteredSuppliers}
                onEdit={handleOpenEditModal}
                onBlock={handleBlock}
                onSelect={handleSelectSupplier}
              />
            </div>
            {selectedSupplier && (
              <div className="w-[400px] border-l border-gray-200 p-6">
                <SupplierProfile
                  supplier={selectedSupplier}
                  onEdit={handleOpenEditModal}
                  onAddProduct={() => setShowUpdateIngredientsModal(true)}
                  onBlock={handleBlock}
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
        allIngredients={allIngredients.filter(i => i.is_active)}
      />
      <EditSupplierModal open={showEditModal} supplier={selectedSupplier} onClose={() => setShowEditModal(false)} onSave={handleEdit} />
      <UpdateIngredientsModal
        open={showUpdateIngredientsModal}
        supplier={selectedSupplier}
        allIngredients={allIngredients.filter(i => i.is_active)}
        onClose={() => setShowUpdateIngredientsModal(false)}
        onSave={handleUpdateIngredients}
      />
    </div>
  );
};

export default SupplierDashboard;