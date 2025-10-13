

import { useState } from "react"
import { Link } from "react-router-dom"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Badge } from "@/components/ui/badge"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Package, Plus, Search, MoreHorizontal, TrendingUp, AlertTriangle, Eye, Edit, Trash2 } from "lucide-react"

// Inline UI components
const Card = ({ className = "", children }) => (
  <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>
)
const CardHeader = ({ className = "", children }) => (
  <div className={`p-4 border-b border-gray-100 ${className}`}>{children}</div>
)
const CardContent = ({ className = "", children }) => (
  <div className={`p-4 ${className}`}>{children}</div>
)
const CardTitle = ({ className = "", children }) => (
  <h3 className={`font-semibold ${className}`}>{children}</h3>
)
const CardDescription = ({ className = "", children }) => (
  <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
)

const Button = ({ className = "", children, variant, size, ...props }) => {
  const base = "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none"
  const variants = {
    outline: "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
    default: "bg-[#f08b51] text-white hover:opacity-90",
  }
  const sizes = { sm: "px-2 py-1 text-sm", md: "px-3 py-2", lg: "px-4 py-2" }
  return (
    <button className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`} {...props}>
      {children}
    </button>
  )
}

const Input = ({ className = "", ...props }) => (
  <input className={`border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-[#f08b51] outline-none ${className}`} {...props} />
)

const Badge = ({ className = "", variant, children }) => {
  const styles = variant === "destructive" ? "bg-red-100 text-red-700 border-red-200" :
                 variant === "secondary" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                 variant === "outline" ? "bg-white text-gray-700 border-gray-300" :
                 "bg-green-100 text-green-800 border-green-200"
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs border ${styles} ${className}`}>{children}</span>
  )
}

const Table = ({ children }) => <table className="w-full text-sm">{children}</table>
const TableHeader = ({ children }) => <thead className="bg-gray-50">{children}</thead>
const TableBody = ({ children }) => <tbody>{children}</tbody>
const TableRow = ({ children }) => <tr className="even:bg-gray-50">{children}</tr>
const TableHead = ({ children, className = "" }) => <th className={`text-left p-3 border-b ${className}`}>{children}</th>
const TableCell = ({ children, className = "" }) => <td className={`p-3 border-b align-top ${className}`}>{children}</td>

const Modal = ({ open, onClose, title, description, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-4">
        <div className="mb-3">
          <h4 className="font-semibold text-lg">{title}</h4>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        {children}
        <div className="mt-4 text-right">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

const products = [
  {
    id: 1,
    name: "Lomi",
    category: "Noodle Soup",
    price: 85.0,
    stock: 25,
    status: "Active",
    ingredients: [
      "Fresh Egg Noodles",
      "Pork Belly",
      "Pork Liver",
      "Kikiam",
      "Cabbage",
      "Carrots",
      "Onions",
      "Garlic",
      "Cornstarch",
      "Soy Sauce",
      "Salt",
      "Pepper",
    ],
  },
  {
    id: 2,
    name: "Canton",
    category: "Stir-fried Noodles",
    price: 75.0,
    stock: 18,
    status: "Active",
    ingredients: [
      "Canton Noodles",
      "Pork",
      "Shrimp",
      "Cabbage",
      "Carrots",
      "Snow Peas",
      "Bell Peppers",
      "Onions",
      "Garlic",
      "Soy Sauce",
      "Oyster Sauce",
      "Sesame Oil",
    ],
  },
  {
    id: 3,
    name: "Miki",
    category: "Fresh Noodles",
    price: 65.0,
    stock: 0,
    status: "Out of Stock",
    ingredients: [
      "Fresh Miki Noodles",
      "Ground Pork",
      "Shrimp",
      "Quail Eggs",
      "Bean Sprouts",
      "Green Onions",
      "Garlic",
      "Onions",
      "Fish Sauce",
      "Soy Sauce",
      "Black Pepper",
    ],
  },
  {
    id: 4,
    name: "Pancit Bihon",
    category: "Rice Noodles",
    price: 70.0,
    stock: 32,
    status: "Active",
    ingredients: [
      "Rice Noodles (Bihon)",
      "Chicken",
      "Chinese Sausage",
      "Cabbage",
      "Carrots",
      "Green Beans",
      "Onions",
      "Garlic",
      "Soy Sauce",
      "Chicken Broth",
      "Calamansi",
    ],
  },
  {
    id: 5,
    name: "Sotanghon Guisado",
    category: "Bean Thread Noodles",
    price: 80.0,
    stock: 8,
    status: "Low Stock",
    ingredients: [
      "Sotanghon Noodles",
      "Chicken",
      "Shrimp",
      "Wood Ear Mushrooms",
      "Carrots",
      "Cabbage",
      "Onions",
      "Garlic",
      "Chicken Broth",
      "Fish Sauce",
      "Black Pepper",
    ],
  },
  {
    id: 6,
    name: "Palabok",
    category: "Rice Noodles",
    price: 90.0,
    stock: 15,
    status: "Active",
    ingredients: [
      "Rice Noodles",
      "Shrimp",
      "Ground Pork",
      "Hard-boiled Eggs",
      "Chicharon",
      "Green Onions",
      "Garlic",
      "Annatto Powder",
      "Shrimp Broth",
      "Fish Sauce",
      "Cornstarch",
    ],
  },
]

export default function ProductsPageBackUp() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productList, setProductList] = useState(products)
  
  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    status: 'Active',
    ingredients: []
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const filteredProducts = productList.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeProducts = productList.filter((product) => product.status === "Active").length
  const totalProducts = productList.length
  const lowStockProducts = productList.filter((product) => product.stock < 10).length

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      status: product.status,
      ingredients: [...product.ingredients]
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.category.trim() || !editForm.price || !editForm.stock) {
      alert('Please fill in all required fields')
      return
    }
    try {
      setSaving(true)
      const updatedProduct = {
        ...editingProduct,
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock),
        status: editForm.status,
        ingredients: editForm.ingredients.filter(ing => ing.trim() !== '')
      }
      // Simulate async save to mirror Ingredients flow
      await new Promise(resolve => setTimeout(resolve, 300))
      setProductList(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p))
      setIsEditModalOpen(false)
      setEditingProduct(null)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (saving) return
    setIsEditModalOpen(false)
    setEditingProduct(null)
    setEditForm({
      name: '',
      category: '',
      price: '',
      stock: '',
      status: 'Active',
      ingredients: []
    })
  }

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...editForm.ingredients]
    newIngredients[index] = value
    setEditForm(prev => ({ ...prev, ingredients: newIngredients }))
  }

  const addIngredient = () => {
    setEditForm(prev => ({ ...prev, ingredients: [...prev.ingredients, ''] }))
  }

  const removeIngredient = (index) => {
    const newIngredients = editForm.ingredients.filter((_, i) => i !== index)
    setEditForm(prev => ({ ...prev, ingredients: newIngredients }))
  }

  const handleDeleteProduct = async (productId) => {
    const confirmed = window.confirm("Are you sure you want to delete this product?")
    if (!confirmed) return
    try {
      setDeletingId(productId)
      // Simulate async delete to mirror Ingredients flow
      await new Promise(resolve => setTimeout(resolve, 300))
      setProductList(prev => prev.filter(p => p.id !== productId))
    } finally {
      setDeletingId(null)
    }
  }

  // Edit Modal Component
  const EditModal = () => {
    if (!isEditModalOpen) return null
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={handleCancelEdit} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div className="mb-4">
            <h4 className="font-semibold text-xl">Edit Product</h4>
            <p className="text-sm text-gray-500">Update product information</p>
          </div>
          
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <Input
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Enter category"
              />
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                <Input
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-[#f08b51] outline-none"
              >
                <option value="Active">Active</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Low Stock">Low Stock</option>
              </select>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
              <div className="space-y-2">
                {editForm.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={ingredient}
                      onChange={(e) => handleIngredientChange(index, e.target.value)}
                      placeholder={`Ingredient ${index + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
                  <div className="mb-8">
            <div className="flex items-center justify-between mb-6 mt-20"></div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
              <p className="text-gray-600">Manage noodle products, ingredients, and inventory</p>
            </div>
            <Button className="mb-8">
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{totalProducts}</p>
                <p className="text-sm text-gray-500">Tracked items</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Products</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{activeProducts}</p>
                <p className="text-sm text-gray-500">Currently offered</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Low Stock Alerts</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{lowStockProducts}</p>
                <p className="text-sm text-gray-500">Products need restocking</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Catalog</h2>
            <p className="text-gray-600">Manage noodle products and view ingredient compositions</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₱)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₱{product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setProductList(prev => prev.map(p => p.id === product.id ? ({ ...p, status: p.status === "Active" ? "Out of Stock" : "Active" }) : p))
                        }}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${product.status === "Active" ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                      >
                        {product.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedProduct(product); setIsModalOpen(true) }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View ({product.ingredients.length})
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deletingId === product.id}
                          className={`text-red-600 hover:text-red-800 hover:bg-red-50 ${deletingId === product.id ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? `${selectedProduct.name} - Ingredients` : "Ingredients"}
        description="Complete list of ingredients used in this product"
      >
        <div className="grid gap-2 py-2">
          {selectedProduct && selectedProduct.ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
              <Badge variant="outline">{index + 1}</Badge>
              <span className="font-medium">{ingredient}</span>
            </div>
          ))}
        </div>
      </Modal>
      <EditModal />
    </div>
  )
}
