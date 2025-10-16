import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { fetchWithAuth } from "../utils/auth";

const Orders = () => {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { id } = useParams() // For single order view

  useEffect(() => {
    const token = localStorage.getItem("access")
    if (!token) {
      setRole(null)
      setLoading(false)
      return
    }
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.role) setRole(data.role)
        else setRole(null)
      })
      .catch(() => setRole(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/")
    }
  }, [role, navigate])

  // Fetch orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      if (!role) return
      
      setOrdersLoading(true)
      setError(null)
      
      try {
        const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/`)
        if (response.ok) {
          const data = await response.json()
          setOrders(data)
        } else {
          setError("Failed to fetch orders")
        }
      } catch (err) {
        setError("Failed to fetch orders")
        console.error("Error fetching orders:", err)
      } finally {
        setOrdersLoading(false)
      }
    }

    fetchOrders()
  }, [role])

  // Fetch single order if ID is provided
  useEffect(() => {
    if (id && role) {
      const fetchOrder = async () => {
        setOrdersLoading(true)
        setError(null)
        
        try {
          const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${id}/`)
          if (response.ok) {
            const data = await response.json()
            setOrders([data]) // Show single order
          } else {
            setError("Order not found")
          }
        } catch (err) {
          setError("Failed to fetch order")
          console.error("Error fetching order:", err)
        } finally {
          setOrdersLoading(false)
        }
      }

      fetchOrder()
    }
  }, [id, role])

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "Paid":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Pending":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "/placeholder.svg"
    if (imagePath.startsWith('http')) return imagePath
    return `${import.meta.env.VITE_INVENTORY_URL}${imagePath}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your orders...</p>
      </div>
    )
  }

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading orders...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {id ? `Order #${id}` : "My Orders"}
          </h1>
          <p className="text-gray-600">
            {id ? "Order details and tracking information" : "View and track all your noodle orders"}
          </p>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Order Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">Order #{order.id}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(order.created_at)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Payment: {order.payment_method}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-[#f08b51]">₱{parseFloat(order.total_price).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Order Content */}
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Order Items */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="h-4 w-4 text-[#f08b51]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Order Items
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                          <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center overflow-hidden">
                            <img
                              src={getImageUrl(item.product?.image)}
                              alt={item.product?.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product?.name}</p>
                            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₱{parseFloat(item.price_at_purchase).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">per unit</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="h-4 w-4 text-[#f08b51]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Delivery Address
                    </h3>
                    <div className="p-4 rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-900 leading-relaxed">{order.address}</p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-gray-900 font-medium">₱{(parseFloat(order.total_price) / 1.12).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">VAT (12%)</span>
                          <span className="text-gray-900 font-medium">
                            ₱{(parseFloat(order.total_price) - parseFloat(order.total_price) / 1.12).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="font-bold text-[#f08b51]">₱{parseFloat(order.total_price).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                      Track Order
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>

        {orders.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
              <button 
              className="px-6 py-2 bg-[#f08b51] text-white rounded-md hover:bg-[#e07a41] transition-colors"
                onClick={() => navigate('/products')}
              >
                Browse Products
              </button>
            </div>
        )}
          </div>
    </div>
  )
}

export default Orders