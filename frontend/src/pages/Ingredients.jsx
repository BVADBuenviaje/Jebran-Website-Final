"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchWithAuth } from "../utils/auth";
const unitOptions = ["kg", "g", "L", "mL", "pcs", "pack", "bottle", "bag"]
const categoryOptions = ["Vegetables", "Meat", "Dairy", "Grains", "Oils", "Herbs", "Spices", "Others"]

const Ingredients = () => {
  const [loadingRole, setLoadingRole] = useState(true);
  const [role, setRole] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [expiryFilter, setExpiryFilter] = useState("all") // "all", "expired", "expiring", "custom", "range"
  const [customExpiryDate, setCustomExpiryDate] = useState("")
  const [expiryDateRange, setExpiryDateRange] = useState({ start: "", end: "" })
  const [statusFilter, setStatusFilter] = useState("all") // "all", "active", "inactive"
  const navigate = useNavigate()
  const [updating, setUpdating] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    unit_of_measurement: "",
    default_unit_price: "",
    restock_level: "",
    category: "",
    expiry_date: "",
    current_stock: "",
    is_active: true,
  })

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

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/")
    }
  }, [role, navigate])

  useEffect(() => {
    if (role === "admin" || role === "reseller") {
      const fetchIngredients = async () => {
        try {
          setLoading(true)
          const token = localStorage.getItem("access")
          if (!token) {
            return
          }
          const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          setIngredients(data)
        } catch (err) {
          console.error("Error fetching ingredients:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchIngredients()
    }
  }, [role])

  // Toggle ingredient status between Active/Inactive
  const toggleIngredientStatus = async (ingredientId, currentStatus) => {
    try {
      setUpdating(ingredientId)
      const nextStatus = !currentStatus
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/${ingredientId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const updated = await response.json()
      setIngredients(prev => prev.map(i => (i.id === ingredientId ? { ...i, is_active: updated.is_active } : i)))
    } catch (err) {
      console.error("Error updating ingredient:", err)
      alert("Failed to update ingredient status. Please try again.")
    } finally {
      setUpdating(null)
    }
  }

  // Delete ingredient
  const deleteIngredient = async (ingredientId) => {
    const confirmed = window.confirm("Are you sure you want to delete this ingredient?")
    if (!confirmed) return
    try {
      setDeletingId(ingredientId)
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/${ingredientId}/`, {
        method: "DELETE",
      })
      if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`)
      setIngredients(prev => prev.filter(i => i.id !== ingredientId))
    } catch (err) {
      console.error("Error deleting ingredient:", err)
      alert("Failed to delete ingredient. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  // Open create modal
  const openCreateModal = () => {
    setEditingIngredient(null)
    setFormData({
      name: "",
      unit_of_measurement: "",
      default_unit_price: "",
      restock_level: "",
      category: "",
      expiry_date: "",
      current_stock: "",
      is_active: true,
    })
    setShowModal(true)
  }

  // Open edit modal
  const openEditModal = (ingredient) => {
    setEditingIngredient(ingredient)
    setFormData({
      name: ingredient.name || "",
      unit_of_measurement: ingredient.unit_of_measurement || "",
      default_unit_price: ingredient.default_unit_price ?? "",
      restock_level: ingredient.restock_level ?? "",
      category: ingredient.category || "",
      expiry_date: ingredient.expiry_date || "",
      current_stock: ingredient.current_stock ?? "",
      is_active: ingredient.is_active ?? true,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  // Submit create/edit
  const submitForm = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const payload = {
        name: formData.name.trim(),
        unit_of_measurement: formData.unit_of_measurement.trim(),
        default_unit_price: formData.default_unit_price === "" ? null : Number(formData.default_unit_price),
        restock_level: formData.restock_level === "" ? null : Number(formData.restock_level),
        category: formData.category.trim(),
        expiry_date: formData.expiry_date || null,
        current_stock: formData.current_stock === "" ? null : Number(formData.current_stock),
        is_active: formData.is_active,
      }
      const isEdit = !!editingIngredient
      const url = isEdit
        ? `${import.meta.env.VITE_INVENTORY_URL}/ingredients/${editingIngredient.id}/`
        : `${import.meta.env.VITE_INVENTORY_URL}/ingredients/`
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const saved = await res.json()
      if (isEdit) {
        setIngredients(prev => prev.map(i => (i.id === saved.id ? saved : i)))
      } else {
        setIngredients(prev => [saved, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      console.error("Save ingredient failed:", err)
      alert("Failed to save ingredient. Please check fields and try again.")
    } finally {
      setSaving(false)
    }
  }

  const sampleIngredients = [
    // {
    //   id: 1,
    //   name: "Tomatoes",
    //   unit_of_measurement: "kg",
    //   default_unit_price: 2.50,
    //   restock_level: 10,
    //   category: "Vegetables",
    //   expiry_date: "2024-01-15",
    //   current_stock: 15,
    //   is_active: true,
    // },
    // {
    //   id: 2,
    //   name: "Chicken Breast",
    //   unit_of_measurement: "kg",
    //   default_unit_price: 8.99,
    //   restock_level: 5,
    //   category: "Meat",
    //   expiry_date: "2024-01-12",
    //   current_stock: 3,
    //   is_active: true,
    // },
    // {
    //   id: 3,
    //   name: "Olive Oil",
    //   unit_of_measurement: "L",
    //   default_unit_price: 12.99,
    //   restock_level: 2,
    //   category: "Oils",
    //   expiry_date: "2024-06-15",
    //   current_stock: 1,
    //   is_active: true,
    // },
    // {
    //   id: 4,
    //   name: "Flour",
    //   unit_of_measurement: "kg",
    //   default_unit_price: 1.99,
    //   restock_level: 20,
    //   category: "Grains",
    //   expiry_date: "2024-08-20",
    //   current_stock: 25,
    //   is_active: true,
    // },
    // {
    //   id: 5,
    //   name: "Cheese",
    //   unit_of_measurement: "kg",
    //   default_unit_price: 6.50,
    //   restock_level: 8,
    //   category: "Dairy",
    //   expiry_date: "2024-01-18",
    //   current_stock: 12,
    //   is_active: true,
    // },
    // {
    //   id: 6,
    //   name: "Basil",
    //   unit_of_measurement: "kg",
    //   default_unit_price: 15.99,
    //   restock_level: 2,
    //   category: "Herbs",
    //   expiry_date: "2024-01-10",
    //   current_stock: 1,
    //   is_active: true,
    // },
  ]

  const displayIngredients = ingredients.length > 0 ? ingredients : sampleIngredients

  const filteredIngredients = displayIngredients.filter((ingredient) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === "All" || ingredient.category === activeCategory
    
    // Expiry date filtering
    let matchesExpiry = true
    if (expiryFilter === "expired") {
      if (!ingredient.expiry_date) matchesExpiry = false
      else matchesExpiry = new Date(ingredient.expiry_date) < new Date()
    } else if (expiryFilter === "expiring") {
      if (!ingredient.expiry_date) matchesExpiry = false
      else {
        const expiryDate = new Date(ingredient.expiry_date)
        const today = new Date()
        const diffTime = expiryDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        matchesExpiry = diffDays <= 7 && diffDays >= 0
      }
    } else if (expiryFilter === "custom" && customExpiryDate) {
      if (!ingredient.expiry_date) matchesExpiry = false
      else {
        const expiryDate = new Date(ingredient.expiry_date)
        const filterDate = new Date(customExpiryDate)
        matchesExpiry = expiryDate <= filterDate
      }
    } else if (expiryFilter === "range") {
      if (!ingredient.expiry_date) matchesExpiry = false
      else if (expiryDateRange.start && expiryDateRange.end) {
        const expiryDate = new Date(ingredient.expiry_date)
        const startDate = new Date(expiryDateRange.start)
        const endDate = new Date(expiryDateRange.end)
        // Set time to start/end of day for proper range comparison
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        matchesExpiry = expiryDate >= startDate && expiryDate <= endDate
      }
    }
    
    // Status filtering
    let matchesStatus = true
    if (statusFilter === "active") {
      matchesStatus = ingredient.is_active === true
    } else if (statusFilter === "inactive") {
      matchesStatus = ingredient.is_active === false
    }
    
    return matchesSearch && matchesCategory && matchesExpiry && matchesStatus
  })

  const categories = ["All", ...Array.from(new Set(displayIngredients.map(i => i.category).filter(Boolean)))]

  const totalIngredients = displayIngredients.length
  const lowStockAlerts = displayIngredients.filter(i => i.current_stock && i.restock_level && i.current_stock <= i.restock_level).length
  const expiryAlerts = displayIngredients.filter(i => {
    if (!i.expiry_date) return false
    const expiryDate = new Date(i.expiry_date)
    const today = new Date()
    const diffTime = expiryDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0
  }).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading ingredients...</p>
          </div>
        </div>
      </div>
    )
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20">
            {/* Back button intentionally omitted */}
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingredient Management</h1>
            <p className="text-gray-600">Track ingredients, stock levels, and expiry dates</p>
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Expiry Alerts</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{expiryAlerts}</p>
                  <p className="text-sm text-gray-500">Items expiring within 3 days</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ingredient Inventory</h2>
            <p className="text-gray-600">Manage your ingredient stock and monitor expiry dates</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === category
                        ? "bg-[#f08b51] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "all"
                        ? "bg-[#f08b51] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "active"
                        ? "bg-[#f08b51] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusFilter("inactive")}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "inactive"
                        ? "bg-[#f08b51] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
               {/* Expiry Date Filter */}
            <div className="flex flex-wrap items-center gap-4 border-l border-gray-300 pl-4">
              <div className="flex items-center gap-2">
  
                <label className="text-sm font-medium text-gray-700">Expiration:</label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setExpiryFilter("all")
                    setCustomExpiryDate("")
                    setExpiryDateRange({ start: "", end: "" })
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    expiryFilter === "all"
                      ? "bg-[#f08b51] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setExpiryFilter("expired")
                    setCustomExpiryDate("")
                    setExpiryDateRange({ start: "", end: "" })
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    expiryFilter === "expired"
                      ? "bg-[#f08b51] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Expired
                </button>
                {/* <button
                  onClick={() => {
                    setExpiryFilter("expiring")
                    setCustomExpiryDate("")
                    setExpiryDateRange({ start: "", end: "" })
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    expiryFilter === "expiring"
                      ? "bg-[#f08b51] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Expiring Soon (≤7 days)
                </button> */}
                <button
                  onClick={() => {
                    setExpiryFilter("range")
                    setCustomExpiryDate("")
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    expiryFilter === "range"
                      ? "bg-[#f08b51] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Date Range
                </button>
              </div>
              {expiryFilter === "range" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={expiryDateRange.start}
                    onChange={(e) => setExpiryDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f08b51] focus:border-transparent"
                    placeholder="Start date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={expiryDateRange.end}
                    onChange={(e) => setExpiryDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f08b51] focus:border-transparent"
                    placeholder="End date"
                  />
                </div>
              )}
            </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 space-y-4">
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
                    placeholder="Search ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f08b51] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
           
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UoM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restock Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ingredient.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.unit_of_measurement || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ingredient.current_stock && ingredient.restock_level && ingredient.current_stock <= ingredient.restock_level
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {ingredient.current_stock !== null && ingredient.current_stock !== undefined 
                          ? `${ingredient.current_stock} ${ingredient.unit_of_measurement || ''}`.trim()
                          : "—"
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.default_unit_price ? `$${ingredient.default_unit_price}` : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.restock_level ? `${ingredient.restock_level}${ingredient.unit_of_measurement ? ` ${ingredient.unit_of_measurement}` : ""}` : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                     <button
                       onClick={() => toggleIngredientStatus(ingredient.id, ingredient.is_active)}
                       disabled={updating === ingredient.id}
                       className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                         ingredient.is_active ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-red-100 text-red-800 hover:bg-red-200"
                       } ${updating === ingredient.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                     >
                       {updating === ingredient.id ? "Updating..." : ingredient.is_active ? "Active" : "Inactive"}
                     </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-6H3v6a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm text-gray-900">{ingredient.expiry_date ? new Date(ingredient.expiry_date).toLocaleDateString() : "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(ingredient)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteIngredient(ingredient.id)}
                          disabled={deletingId === ingredient.id || updating === ingredient.id}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            deletingId === ingredient.id ? "bg-red-200 text-white cursor-not-allowed" : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {deletingId === ingredient.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <select
                  name="unit_of_measurement"
                  value={formData.unit_of_measurement}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select Unit of Measure</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input name="current_stock" value={formData.current_stock} onChange={handleChange} type="number" min="0" className="w-full border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input name="expiry_date" value={formData.expiry_date} onChange={handleChange} type="date" className="w-full border rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-[#f08b51] focus:ring-[#f08b51] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Active</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-md border hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-[#f08b51] text-white hover:bg-[#d9734a]">
                  {saving ? "Saving..." : editingIngredient ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Ingredients
