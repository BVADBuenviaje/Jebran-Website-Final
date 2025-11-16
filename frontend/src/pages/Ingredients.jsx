import React, { useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/auth";
import BatchModal from "../components/BatchModal";

const unitOptions = ["kg", "g", "L", "mL", "pcs", "pack", "bottle", "bag"];
const categoryOptions = ["Vegetables", "Meat", "Dairy", "Grains", "Oils", "Herbs", "Spices", "Others"];

const Ingredients = () => {
  const [loadingRole, setLoadingRole] = useState(true);
  const [role, setRole] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "inactive"
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    unit_of_measurement: "",
    default_unit_price: "",
    restock_level: "",
    category: "",
    is_active: true,
  });

  // Batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchIngredient, setBatchIngredient] = useState(null);

  // stable handler to avoid re-creating function on every render
  const handleBatchesChange = useCallback((ingredientId, total) => {
    setIngredients(prev => prev.map(i => (i.id === ingredientId ? { ...i, current_stock: total } : i)));
  }, []);

  // helper: returns numeric stock or null when unknown
  const getStock = (item) => {
    const raw = item.current_stock ?? item.total_stock;
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  };

  // NEW: Helper to get unexpired stock for an ingredient
  const getUnexpiredStock = async (ingredientId) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/batches/?ingredient=${ingredientId}`);
      if (!res.ok) return null;
      const data = await res.json();
      // Ensure batches are only for this ingredient
      const batches = (Array.isArray(data) ? data : data.results || []).filter(b => {
        // Defensive: check batch.ingredient matches ingredientId
        if (typeof b.ingredient === "number") return b.ingredient === ingredientId;
        if (b.ingredient && typeof b.ingredient === "object" && b.ingredient.id) return b.ingredient.id === ingredientId;
        return false;
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return batches.reduce((sum, b) => {
        if (b.expiry_date) {
          const exp = new Date(b.expiry_date);
          exp.setHours(0, 0, 0, 0);
          if (exp < today) return sum; // skip expired
        }
        const q = b.current_quantity ?? b.quantity_received ?? b.quantity ?? 0;
        const n = Number(q) || 0;
        return sum + n;
      }, 0);
    } catch {
      return null;
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
      .then((res) => {
        if (!isMounted) return;
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && data.role) setRole(data.role);
        else setRole(null);
        setLoadingRole(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setRole(null);
        setLoadingRole(false);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/");
    }
  }, [role, navigate]);

  useEffect(() => {
    if (role === "admin" || role === "superadmin" || role === "reseller") {
      const fetchIngredients = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem("access");
          if (!token) return;
          const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          const normalized = (Array.isArray(data) ? data : (data.results || data.value || []))
            .map(i => ({
              ...i,
              current_stock: i.current_stock ?? i.total_stock ?? null,
            }));

          // Fetch unexpired stock for each ingredient
          const updated = await Promise.all(normalized.map(async (ing) => {
            const stock = await getUnexpiredStock(ing.id);
            return { ...ing, current_stock: stock };
          }));

          setIngredients(updated);
        } catch (err) {
          console.error("Error fetching ingredients:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchIngredients();
    }
  }, [role]);

  // Toggle ingredient status between Active/Inactive
  const toggleIngredientStatus = async (ingredientId, currentStatus) => {
    try {
      setUpdating(ingredientId);
      const nextStatus = !currentStatus;
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/${ingredientId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const updated = await response.json();
      const normalized = { ...updated, current_stock: updated.current_stock ?? updated.total_stock ?? null };
      setIngredients(prev => prev.map(i => (i.id === ingredientId ? { ...i, is_active: normalized.is_active, current_stock: normalized.current_stock } : i)));
    } catch (err) {
      console.error("Error updating ingredient:", err);
      alert("Failed to update ingredient status. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingIngredient(null);
    setFormData({
      name: "",
      unit_of_measurement: "",
      default_unit_price: "",
      restock_level: "",
      category: "",
      is_active: true,
    });
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name || "",
      unit_of_measurement: ingredient.unit_of_measurement || "",
      default_unit_price: ingredient.default_unit_price ?? "",
      restock_level: ingredient.restock_level ?? "",
      category: ingredient.category || "",
      is_active: ingredient.is_active ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit create/edit
  const submitForm = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        unit_of_measurement: formData.unit_of_measurement.trim(),
        default_unit_price: formData.default_unit_price === "" ? null : Number(formData.default_unit_price),
        restock_level: formData.restock_level === "" ? null : Number(formData.restock_level),
        category: formData.category.trim(),
        is_active: formData.is_active,
      };
      const isEdit = !!editingIngredient;
      const url = isEdit
        ? `${import.meta.env.VITE_INVENTORY_URL}/ingredients/${editingIngredient.id}/`
        : `${import.meta.env.VITE_INVENTORY_URL}/ingredients/`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const saved = await res.json();
      const normalized = { ...saved, current_stock: saved.current_stock ?? saved.total_stock ?? null };
      if (isEdit) {
        setIngredients(prev => prev.map(i => (i.id === saved.id ? normalized : i)));
      } else {
        setIngredients(prev => [normalized, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Save ingredient failed:", err);
      alert("Failed to save ingredient. Please check fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const sampleIngredients = [];
  const displayIngredients = ingredients.length > 0 ? ingredients : sampleIngredients;

  // --- FILTERING LOGIC ---
  const filteredIngredients = displayIngredients.filter((ingredient) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All" || ingredient.category === activeCategory;
    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = ingredient.is_active === true;
    else if (statusFilter === "inactive") matchesStatus = ingredient.is_active === false;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ["All", ...Array.from(new Set(displayIngredients.map(i => i.category).filter(Boolean)))];
  const totalIngredients = displayIngredients.length;

  // Low stock calculation: consider 0 as valid stock (don't treat 0 as falsy)
  const lowStockAlerts = displayIngredients.filter(i => {
    const stock = getStock(i);
    const restock = i.restock_level === "" || i.restock_level === null || i.restock_level === undefined ? null : Number(i.restock_level);
    if (stock === null || restock === null || Number.isNaN(restock)) return false;
    return stock <= restock;
  }).length;

  const expiryAlerts = 0; // per-batch expiry; shown in batches modal instead

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4" />
            <p className="text-gray-600 font-medium">Loading ingredients...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4" />
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (role !== "admin" && role !== "superadmin") return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20">{/* Back button intentionally omitted */}</div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingredient Management</h1>
            <p className="text-gray-600">Track ingredients, stock levels, and batches</p>
          </div>

          <button onClick={openCreateModal} className="bg-[#f08b51] hover:bg-[#d9734a] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Ingredient
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Ingredients</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{totalIngredients}</p>
                  <p className="text-sm text-gray-500">Across {new Set(displayIngredients.map(i => i.category).filter(Boolean)).size} categories</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Low Stock Alerts</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{lowStockAlerts}</p>
                  <p className="text-sm text-gray-500">Items need restocking</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Expiry Alerts</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{expiryAlerts}</p>
                  <p className="text-sm text-gray-500">Handled per-batch</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ingredient Inventory</h2>
            <p className="text-gray-600">Manage your ingredient stock and batches</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md flex gap-4 items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search ingredients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f08b51] focus:border-transparent" />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="border rounded px-2 py-1"
                  style={{ minWidth: 120 }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UoM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restock Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngredients.map((ingredient) => {
                  const stock = getStock(ingredient);
                  const restock = ingredient.restock_level === "" || ingredient.restock_level === null || ingredient.restock_level === undefined ? null : Number(ingredient.restock_level);
                  const low = stock !== null && restock !== null && !Number.isNaN(restock) && stock <= restock;
                  return (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ingredient.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.unit_of_measurement || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ low ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800" }`}>
                        {stock !== null ? `${stock}${ingredient.unit_of_measurement ? ` ${ingredient.unit_of_measurement}` : ""}` : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.default_unit_price ? `$${ingredient.default_unit_price}` : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{restock !== null && !Number.isNaN(restock) ? `${restock}${ingredient.unit_of_measurement ? ` ${ingredient.unit_of_measurement}` : ""}` : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ingredient.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {ingredient.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setBatchIngredient(ingredient); setShowBatchModal(true); }}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs"
                        >
                          Batches
                        </button>
                        <button onClick={() => openEditModal(ingredient)} className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs">
                          Edit
                        </button>
                        <button
                          onClick={() => toggleIngredientStatus(ingredient.id, ingredient.is_active)}
                          disabled={updating === ingredient.id}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            ingredient.is_active
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {updating === ingredient.id
                            ? "Updating..."
                            : ingredient.is_active
                              ? "Disable"
                              : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{editingIngredient ? "Edit Ingredient" : "Add Ingredient"}</h3>
            </div>
            <form onSubmit={submitForm} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input name="name" value={formData.name} onChange={handleChange} required className="w-full border rounded-md px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement</label>
                  <select name="unit_of_measurement" value={formData.unit_of_measurement} onChange={handleChange} required className="w-full border rounded-md px-3 py-2 bg-white">
                    <option value="">Select Unit of Measure</option>
                    {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit Price ($)</label>
                  <input name="default_unit_price" value={formData.default_unit_price} onChange={handleChange} type="number" step="0.01" min="0" className="w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restock Level</label>
                  <input name="restock_level" value={formData.restock_level} onChange={handleChange} type="number" min="0" className="w-full border rounded-md px-3 py-2" />
                </div>
                {/* Current Stock is managed via batches */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} required className="w-full border rounded-md px-3 py-2 bg-white">
                    <option value="">Select category</option>
                    {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>{/* Expiry is tracked per-batch now */}</div>
              </div>

              <div className="flex items-center">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 text-[#f08b51] focus:ring-[#f08b51] border-gray-300 rounded" />
                <label className="ml-2 block text-sm text-gray-900">Active</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-md border hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-[#f08b51] text-white hover:bg-[#d9734a]">{saving ? "Saving..." : editingIngredient ? "Save Changes" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch modal */}
      <BatchModal
        open={showBatchModal}
        ingredient={batchIngredient}
        onClose={() => { setShowBatchModal(false); setBatchIngredient(null); }}
        onBatchesChange={handleBatchesChange}
      />
    </div>
  );
};

export default Ingredients;