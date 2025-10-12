"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchWithAuth } from "../utils/auth"


const Products = () => {
  const [role, setRole] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory] = useState("All")
  const navigate = useNavigate()
  const [updating, setUpdating] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [loadingRole, setLoadingRole] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    status: "Active",
    ingredients: [],
  })
  const [allIngredients, setAllIngredients] = useState([])

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
      const fetchProducts = async () => {
        try {
          setLoading(true)
          const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/products/`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          setProducts(data)
          setError("")
        } catch (err) {
          console.error("Error fetching products:", err)
          setError("Failed to load products. Please try again.")
        } finally {
          setLoading(false)
        }
      }
      fetchProducts()
    }
  }, [role])

  useEffect(() => {
    const token = localStorage.getItem("access")
    if (!token) return
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllIngredients(Array.isArray(data) ? data : []))
      .catch(() => setAllIngredients([]))
  }, [])

  const checkIngredientSufficiency = (ingredientName, requiredQuantity, requiredUom) => {
    const ingredient = allIngredients.find(ing => ing.name === ingredientName)
    if (!ingredient) return { sufficient: false, available: 0, uom: "", uomMismatch: false }
    const available = Number(ingredient.current_stock) || 0
    const required = Number(requiredQuantity) || 0
    const uomMismatch = requiredUom && ingredient.unit_of_measurement &&
      requiredUom.toLowerCase() !== ingredient.unit_of_measurement.toLowerCase()
    return {
      sufficient: available >= required,
      available,
      uom: ingredient.unit_of_measurement,
      uomMismatch
    }
  }

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      setUpdating(productId)
      const nextStatus = currentStatus === "Active" ? "Out of Stock" : "Active"
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/products/${productId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const updated = await response.json()
      setProducts(prev => prev.map(p => (p.id === productId ? { ...p, status: updated.status } : p)))
    } catch (err) {
      console.error("Error updating product:", err)
      alert("Failed to update product status. Please try again.")
    } finally {
      setUpdating(null)
    }
  }

  const deleteProduct = async (productId) => {
    const confirmed = window.confirm("Are you sure you want to delete this product?")
    if (!confirmed) return
    try {
      setDeletingId(productId)
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/products/${productId}/`, {
        method: "DELETE",
      })
      if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`)
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (err) {
      console.error("Error deleting product:", err)
      alert("Failed to delete product. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormData({
      name: "",
      category: "",
      price: "",
      stock: "",
      status: "Active",
      ingredients: [],
    })
    setShowModal(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || "",
      category: product.category || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      status: product.status || "Active",
      ingredients: Array.isArray(product.ingredients)
        ? product.ingredients.map((it) => ({
            name: typeof it === 'string' ? it : (it.name || ""),
            quantity: typeof it === 'object' && it.quantity != null ? String(it.quantity) : "",
            uom: typeof it === 'object' ? (it.uom || "") : "",
          }))
        : [],
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleIngredientFieldChange = (index, field, value) => {
    const list = [...formData.ingredients]
    list[index] = { ...(list[index] || { name: "", quantity: "", uom: "" }), [field]: value }
    setFormData(prev => ({ ...prev, ingredients: list }))
  }

  const addIngredientField = () => {
    setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, { name: "", quantity: "", uom: "" }] }))
  }

  const removeIngredientField = (index) => {
    setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }))
  }

  const submitForm = async (e) => {
    e.preventDefault()
    const ingredientErrors = []
    formData.ingredients.forEach((ing, idx) => {
      if (ing.name && ing.quantity) {
        const sufficiency = checkIngredientSufficiency(ing.name, ing.quantity, ing.uom)
        if (!sufficiency.sufficient) {
          ingredientErrors.push(`Insufficient stock for ${ing.name}: need ${ing.quantity} ${ing.uom || 'units'}, have ${sufficiency.available} ${sufficiency.uom}`)
        }
        if (sufficiency.uomMismatch) {
          ingredientErrors.push(`Unit mismatch for ${ing.name}: using ${ing.uom}, but ingredient uses ${sufficiency.uom}`)
        }
      }
    })
    if (ingredientErrors.length > 0) {
      alert(`Cannot save product due to ingredient issues:\n\n${ingredientErrors.join('\n')}`)
      return
    }
    try {
      setSaving(true)
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: formData.price === "" ? null : Number(formData.price),
        stock: formData.stock === "" ? null : Number(formData.stock),
        status: formData.status,
        ingredient_items: formData.ingredients
          .map(i => ({
            name: (i.name || "").trim(),
            quantity: i.quantity === "" ? null : Number(i.quantity),
            uom: (i.uom || "").trim(),
          }))
          .filter(i => i.name),
      }
      const isEdit = !!editingProduct
      const url = isEdit
        ? `${import.meta.env.VITE_INVENTORY_URL}/products/${editingProduct.id}/`
        : `${import.meta.env.VITE_INVENTORY_URL}/products/`
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const saved = await res.json()
      if (isEdit) {
        setProducts(prev => prev.map(p => (p.id === saved.id ? saved : p)))
      } else {
        setProducts(prev => [saved, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      console.error("Save product failed:", err)
      alert("Failed to save product. Please check fields and try again.")
    } finally {
      setSaving(false)
    }
  }

  const displayProducts = products.length > 0 ? products : []
  const filteredProducts = displayProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === "All" || product.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const totalProducts = displayProducts.length
  const lowStockAlerts = displayProducts.filter(p => (typeof p.stock === "number" ? p.stock < 10 : false) || p.status === "Low Stock").length
  const activeProducts = displayProducts.filter(p => p.status === "Active").length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading products...</p>
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
      <div className="max-w-7xl mx-auto px-6 py-8 ">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20">
            {/* Back button intentionally omitted */}
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
            <p className="text-gray-600">Track products, stock levels, and ingredients</p>
          </div>
          <button onClick={openCreateModal} className="bg-[#f08b51] hover:bg-[#d9734a] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Products</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{totalProducts}</p>
                  <p className="text-sm text-gray-500">Across {new Set(displayProducts.map(p => p.category).filter(Boolean)).size} categories</p>
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

            {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            </div> */}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Products</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{activeProducts}</p>
                  <p className="text-sm text-gray-500">Currently available</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Inventory</h2>
            <p className="text-gray-600">Manage your product stock and monitor availability</p>
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
                    placeholder="Search products..."
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
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredients
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.category || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.price !== null && product.price !== undefined && `${Number(product.price)}` !== 'NaN' ? `₱${Number(product.price).toFixed(2)}` : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{typeof product.stock === "number" ? product.stock : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                     <button
                       onClick={() => toggleProductStatus(product.id, product.status)}
                       disabled={updating === product.id}
                       className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                         product.status === "Active" ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-red-100 text-red-800 hover:bg-red-200"
                       } ${updating === product.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                     >
                       {updating === product.id ? "Updating..." : product.status}
                     </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Array.isArray(product.ingredients) ? product.ingredients.length : 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          disabled={deletingId === product.id || updating === product.id}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            deletingId === product.id ? "bg-red-200 text-white cursor-not-allowed" : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {deletingId === product.id ? "Deleting..." : "Delete"}
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
              <h3 className="text-lg font-semibold text-gray-900">{editingProduct ? "Edit Product" : "Add Product"}</h3>
            </div>
            <form onSubmit={submitForm} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input name="name" value={formData.name} onChange={handleChange} required className="w-full border rounded-md px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Noodles" className="w-full border rounded-md px-3 py-2" />
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
                  <input name="price" value={formData.price} onChange={handleChange} type="number" step="0.01" min="0" className="w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border rounded-md px-3 py-2">
                    <option value="Active">Active</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Low Stock">Low Stock</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input name="stock" value={formData.stock} onChange={handleChange} type="number" min="0" className="w-full border rounded-md px-3 py-2" />
                </div> */}

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
                <div className="space-y-2">
                  {formData.ingredients.map((ing, idx) => {
                    const sufficiency = checkIngredientSufficiency(ing.name, ing.quantity, ing.uom)
                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <select
                          value={ing.name}
                          onChange={(e) => handleIngredientFieldChange(idx, 'name', e.target.value)}
                          className="w-full border rounded-md px-3 py-2"
                        >
                          <option value="">Select ingredient</option>
                          {allIngredients.map((ingredient) => (
                            <option key={ingredient.name} value={ingredient.name}>{ingredient.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={ing.quantity}
                          onChange={(e) => handleIngredientFieldChange(idx, 'quantity', e.target.value)}
                          className="w-full border rounded-md px-3 py-2"
                          placeholder="Quantity"
                        />
                        {/* <input
                          value={ing.uom}
                          onChange={(e) => handleIngredientFieldChange(idx, 'uom', e.target.value)}
                          className="w-full border rounded-md px-3 py-2"
                          placeholder="UoM (e.g. g, ml, pcs)"
                        /> */}
                        {ing.name && ing.quantity && (
                          <div className="md:col-span-3 flex flex-wrap gap-1 mt-1">
                            {!sufficiency.sufficient && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Insufficient (have {sufficiency.available} {sufficiency.uom})
                              </span>
                            )}
                            {sufficiency.uomMismatch && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                UoM mismatch (expected {sufficiency.uom})
                              </span>
                            )}
                            {sufficiency.sufficient && !sufficiency.uomMismatch && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Sufficient stock
                              </span>
                            )}
                          </div>
                        )}
                        <div className="md:col-span-3 flex justify-end">
                          <button type="button" onClick={() => removeIngredientField(idx)} className="px-3 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-xs">Remove</button>
                        </div>
                      </div>
                    )
                  })}
                  <button type="button" onClick={() => addIngredientField()} className="w-full px-3 py-2 rounded-md border hover:bg-gray-50 text-xs">Add Ingredient</button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-md border hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-[#f08b51] text-white hover:bg-[#d9734a]">
                  {saving ? "Saving..." : editingProduct ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products