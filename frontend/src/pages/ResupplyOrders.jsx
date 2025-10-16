import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/auth";

const ResupplyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
        return null;
      })
      .then(data => {
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
    setLoading(true);
    fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  // Handle status change
  const handleStatusChange = async (orderId, newStatus) => {
    try {
        await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/${orderId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        });
        // Refetch orders to get updated data from backend
        fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setOrders(Array.isArray(data) ? data : []));
    } catch {
        alert("Failed to update order status.");
    }
 };

  if (loadingRole || loading) {
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

  const filteredOrders = orders
    .filter(order =>
      (statusFilter === "All" || order.status === statusFilter) &&
      (
        order.supplier_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item =>
          item.ingredient_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "Pending").length;
  const deliveredOrders = orders.filter(o => o.status === "Delivered").length;
  const canceledOrders = orders.filter(o => o.status === "Canceled").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 ">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20">
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resupply Orders</h1>
          <p className="text-gray-600 mb-4">View and manage all supplier resupply orders</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{totalOrders}</p>
                <p className="text-sm text-gray-500">All resupply orders</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{pendingOrders}</p>
                <p className="text-sm text-gray-500">Awaiting delivery</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Delivered Orders</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{deliveredOrders}</p>
                <p className="text-sm text-gray-500">Completed deliveries</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Canceled Orders</p>
                <p className="text-3xl font-bold text-[#f08b51] mb-1">{canceledOrders}</p>
                <p className="text-sm text-gray-500">Canceled orders</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Directory</h2>
            <p className="text-gray-600">Monitor all resupply orders and their status</p>
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
                    placeholder="Search by supplier or ingredient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f08b51] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["All", "Pending", "Delivered", "Canceled"].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-[#f08b51] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.supplier_detail?.name || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.order_date ? new Date(order.order_date).toLocaleString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === "Delivered"
                          ? "bg-green-100 text-green-800"
                          : order.status === "Canceled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {order.status}
                      </span>
                      <select
                        value={order.status}
                        onChange={e => {
                            if (window.confirm("Are you sure you want to change the status? Ingredient stock will be updated accordingly.")) {
                            handleStatusChange(order.id, e.target.value);
                            }
                        }}
                        className="ml-2 px-2 py-1 border rounded text-xs"
                        >
                        <option value="Pending">Pending</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Canceled">Canceled</option>
                    </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <ul className="list-disc pl-4">
                        {order.items.map((item, idx) => (
                          <li key={item.ingredient + "-" + idx}>
                            {item.ingredient_detail?.name} — {item.quantity} {item.ingredient_detail?.unit_of_measurement}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResupplyOrders;