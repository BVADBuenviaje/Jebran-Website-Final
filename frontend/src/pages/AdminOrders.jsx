import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, MoreHorizontal, Package, Clock, User, MapPin } from "lucide-react";
import { fetchWithAuth } from "../utils/auth";

// Fallback example data (used only if API fails)
const FALLBACK_ORDERS = [];

function getStatusBadgeClasses(status) {
  switch (status) {
    case "Delivered":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Shipped":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Processing":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Pending":
      return "bg-zinc-50 text-zinc-700 border-zinc-200";
    case "Cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-zinc-50 text-zinc-700 border-zinc-200";
  }
}

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState(FALLBACK_ORDERS);
  const [, setLoading] = useState(true);
  // removed inline status editor

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/`);
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          // Transform API orders into UI-friendly shape
          const uiOrders = (Array.isArray(data) ? data : []).map((o) => ({
            id: o.id,
            customer: { name: o.user || "Reseller", email: "" },
            date: o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : "",
            status: o.status || "Pending",
            payment_status: o.payment_status || "Unpaid",
            payment_method: o.payment_method || "COD",
            payment_reference: o.payment_reference || "",
            items: (o.items || []).map((it) => ({
              name: it.product?.name || "",
              quantity: it.quantity,
              price: Number(it.price_at_purchase) || 0,
            })),
            total: Number(o.total_price) || 0,
            address: o.address || "",
          }));
          setOrders(uiOrders);
        } else {
          setOrders(FALLBACK_ORDERS);
        }
      } catch {
        if (active) setOrders(FALLBACK_ORDERS);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        order.id.toLowerCase().includes(search) ||
        order.customer.name.toLowerCase().includes(search) ||
        order.customer.email.toLowerCase().includes(search);
      const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, orders]);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending" || o.status === "Processing").length;

  const updateStatusWithConfirm = async (order, nextStatus) => {
    const ok = window.confirm(`Change status of ${order.id} from ${order.status} to ${nextStatus}?`);
    if (!ok) return;
    try {
      // Prefer dedicated status endpoint (POST), fallback to PATCH for older backends
      let res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${order.id}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.status === 404 || res.status === 405) {
        res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/${order.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || `Failed to update status (code ${res.status})`);
        return;
      }
      // refresh list
      const refreshed = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/orders/`);
      if (refreshed.ok) {
        const data = await refreshed.json();
        const uiOrders = (Array.isArray(data) ? data : []).map((o) => ({
          id: o.id,
          customer: { name: o.user || "Reseller", email: "" },
          date: o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : "",
          status: o.status || "Pending",
          payment_status: o.payment_status || "Unpaid",
          payment_method: o.payment_method || "COD",
          payment_reference: o.payment_reference || "",
          items: (o.items || []).map((it) => ({
            name: it.product?.name || "",
            quantity: it.quantity,
            price: Number(it.price_at_purchase) || 0,
          })),
          total: Number(o.total_price) || 0,
          address: o.address || "",
        }));
        setOrders(uiOrders);
        // If modal open, update it too
        if (selectedOrder) {
          const updated = uiOrders.find(u => u.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-20">
          <div className="flex items-center gap-4">
            {/* <Link to="/">
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>
            </Link> */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Management</h1>
              <p className="text-gray-500">View and manage all customer orders</p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm">Export Orders</button>
        </div>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="text-sm font-medium text-gray-600">Total Orders</div>
              <Package className="h-4 w-4 text-gray-400" />
            </div>
            <div className="px-5 pb-5">
              <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
              <p className="text-xs text-gray-500"><span className="text-emerald-600 font-medium">+8%</span> from last week</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="text-sm font-medium text-gray-600">Pending Orders</div>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="px-5 pb-5">
              <div className="text-2xl font-bold text-gray-900">{pendingOrders}</div>
              <p className="text-xs text-gray-500">Requires immediate attention</p>
            </div>
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">All Orders</h2>
            <p className="text-sm text-gray-500">Complete order history from all customers</p>
          </div>
          <div className="p-5">
            {/* Search & Filter */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search orders or customers..."
                  className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-44 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Table */}
            <div className="rounded-md border border-gray-200 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Order Status</th>
                    <th className="px-4 py-3 font-medium">Payment Status</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{order.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{order.customer.name}</span>
                          <span className="text-xs text-gray-500">{order.customer.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusBadgeClasses(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${
                          order.payment_status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' :
                          order.payment_status === 'Unpaid' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.items.length} item{order.items.length > 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₱{order.total}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            View
                          </button>
                          {/* <button className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 text-gray-700" title="More">
                            <MoreHorizontal className="h-4 w-4" />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Order Details - {selectedOrder.id}</h3>
                <p className="text-sm text-gray-500">Complete order information</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h4>
                  <p className="text-sm text-gray-900">{selectedOrder.customer.name}</p>
                  {selectedOrder.customer.email && (
                    <p className="text-sm text-gray-500">{selectedOrder.customer.email}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </h4>
                  <p className="text-sm text-gray-900">{selectedOrder.address}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                  <Package className="h-4 w-4" />
                  Order Items
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-700">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="font-medium">₱{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span className="text-gray-900">₱{selectedOrder.total}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:justify-between gap-3">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div>
                  <span>Order Status:</span>
                  <span className="font-medium ml-1">{selectedOrder.status}</span>
                </div>
                <div>
                  <span>Payment Status:</span>
                  <span className="font-medium ml-1">{selectedOrder.payment_status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Payment Status Buttons */}
                {selectedOrder.payment_status !== 'Paid' && (
                  <button onClick={() => updateStatusWithConfirm(selectedOrder, 'Paid')} className="px-3 py-2 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100">Mark Paid</button>
                )}
                {selectedOrder.payment_status !== 'Unpaid' && (
                  <button onClick={() => updateStatusWithConfirm(selectedOrder, 'Unpaid')} className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Mark Unpaid</button>
                )}
                
                {/* Order Status Buttons */}
                {selectedOrder.status !== 'Delivered' && (
                  <button onClick={() => updateStatusWithConfirm(selectedOrder, 'Delivered')} className="px-3 py-2 rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">Mark Delivered</button>
                )}
                {selectedOrder.status !== 'Cancelled' && (
                  <button onClick={() => updateStatusWithConfirm(selectedOrder, 'Cancelled')} className="px-3 py-2 rounded-md border border-red-300 text-white bg-red-600 hover:bg-red-700">Cancel Order</button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Editor Modal (removed as requested) */}
    </div>
  );
}



