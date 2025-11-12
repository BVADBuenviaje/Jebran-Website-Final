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

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  // receiveInputs: { [orderItemId]: { amount: "", expiry: "", loading: false, error: "" } }
  const [receiveInputs, setReceiveInputs] = useState({});

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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/`);
      const data = res.ok ? await res.json() : [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
      console.error("Failed fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const computeOrderStatus = (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return order?.status ?? "Pending";
    if (order.status === "Canceled") return "Canceled";
    const totals = order.items.reduce((acc, it) => {
      const ordered = parseFloat(it.quantity_ordered ?? it.quantity ?? 0) || 0;
      const received = parseFloat(it.quantity_received ?? 0) || 0;
      acc.ordered += ordered;
      acc.received += received;
      return acc;
    }, { ordered: 0, received: 0 });
    if (totals.received <= 0) return "Pending";
    if (totals.received >= totals.ordered) return "Delivered";
    return "Partial";
  };

  const toggleExpand = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const inputs = { ...receiveInputs };
      (order.items || []).forEach(item => {
        const id = item.id;
        if (!inputs[id]) {
          inputs[id] = { amount: "", expiry: "", loading: false, error: "" };
        }
      });
      setReceiveInputs(inputs);
    }
  };

  // sanitize numeric input, enforce positive and clamp to max (pending)
  const handleInputChange = (orderItemId, field, value, max) => {
    // expiry field: accept raw date string, clear error
    if (field === "expiry") {
      setReceiveInputs(prev => ({
        ...prev,
        [orderItemId]: {
          ...(prev[orderItemId] || { amount: "", expiry: "", loading: false, error: "" }),
          expiry: value,
          error: "",
        }
      }));
      return;
    }

    // sanitize: allow digits and single dot for numeric fields
    let v = String(value ?? "");
    v = v.replace(/[^0-9.]/g, ""); // remove non-numeric except dot
    const parts = v.split(".");
    if (parts.length > 2) {
      v = parts[0] + "." + parts.slice(1).join("");
    }
    if (v.startsWith(".")) v = "0" + v;
    // remove leading zeros (but preserve "0" or "0.xx")
    if (/^0[0-9]+/.test(v)) v = v.replace(/^0+/, "") || "0";

    let error = "";
    let numeric = parseFloat(v);
    if (v === "" || isNaN(numeric)) {
      numeric = "";
      error = "";
    } else {
      if (numeric < 0) {
        numeric = 0;
        v = "0";
      }
      if (typeof max === "number" && !isNaN(numeric) && numeric > max) {
        // clamp to max and show error
        numeric = max;
        v = String(max);
        error = `Cannot exceed pending amount (${max})`;
      }
    }

    setReceiveInputs(prev => ({
      ...prev,
      [orderItemId]: {
        ...(prev[orderItemId] || { amount: "", expiry: "", loading: false, error: "" }),
        amount: v,
        error,
      }
    }));
  };

  // Validate selected items for an order prior to sending
  const validateSelectedItems = (order) => {
    const results = [];
    let anySelected = false;
    for (const item of (order.items || [])) {
      const id = item.id;
      const input = receiveInputs[id] || { amount: "", expiry: "" };
      const raw = input.amount ?? "";
      const expiry = input.expiry ?? "";
      const parsed = parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0;
      const ordered = parseFloat(item.quantity_ordered ?? item.quantity ?? 0) || 0;
      const receivedSoFar = parseFloat(item.quantity_received ?? 0) || 0;
      const pending = Math.max(ordered - receivedSoFar, 0);

      const row = { item, id, parsed, expiry, pending, error: "" };

      if (raw !== "" && parsed > 0) {
        anySelected = true;
        // validate expiry present
        if (!expiry) {
          row.error = "Expiry date is required.";
        } else if (parsed > pending) {
          row.error = `Cannot receive more than pending (${pending}).`;
        }
      }
      results.push(row);
    }
    return { results, anySelected };
  };

  // Single handler to receive for all selected items in an order
  const handleReceiveAll = async (order) => {
    const { results, anySelected } = validateSelectedItems(order);
    if (!anySelected) {
      alert("Enter a positive receive amount for at least one item.");
      return;
    }

    // set inline errors if any validation problems, and abort
    const hasValidationError = results.some(r => r.error);
    if (hasValidationError) {
      setReceiveInputs(prev => {
        const copy = { ...(prev || {}) };
        results.forEach(r => {
          if (r.error) {
            copy[r.id] = { ...(copy[r.id] || { amount: "", expiry: "", loading: false, error: "" }), error: r.error, loading: false };
          }
        });
        return copy;
      });
      alert("Fix highlighted errors before receiving.");
      return;
    }

    // prepare requests for selected items
    const toReceive = results.filter(r => r.parsed > 0);
    // set loading true for those inputs
    setReceiveInputs(prev => {
      const copy = { ...(prev || {}) };
      toReceive.forEach(r => {
        copy[r.id] = { ...(copy[r.id] || { amount: "", expiry: "", loading: false, error: "" }), loading: true, error: "" };
      });
      return copy;
    });

    // perform requests in parallel
    const promises = toReceive.map(r => {
      const url = `${import.meta.env.VITE_INVENTORY_URL}/order-items/${r.id}/receive/`;
      const body = { quantity_received: r.parsed, expiry_date: r.expiry };
      return fetchWithAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async res => {
        if (!res.ok) {
          const ct = res.headers.get("content-type") || "";
          const txt = ct.includes("application/json") ? await res.json() : await res.text();
          throw { status: res.status, body: txt };
        }
        return res;
      }).then(() => ({ ok: true, id: r.id }))
        .catch(err => ({ ok: false, id: r.id, error: err }));
    });

    const resultsSettled = await Promise.all(promises);

    // update per-item state based on results
    const failed = resultsSettled.filter(r => !r.ok);
    const succeeded = resultsSettled.filter(r => r.ok);

    setReceiveInputs(prev => {
      const copy = { ...(prev || {}) };
      succeeded.forEach(s => {
        // reset successful inputs
        copy[s.id] = { amount: "", expiry: "", loading: false, error: "" };
      });
      failed.forEach(f => {
        const msg = f.error && f.error.body ? (f.error.body.detail || JSON.stringify(f.error.body)) : `Failed (status ${f.error?.status || "?"})`;
        copy[f.id] = { ...(copy[f.id] || { amount: "", expiry: "", loading: false, error: "" }), loading: false, error: msg };
      });
      return copy;
    });

    if (failed.length > 0) {
      console.error("Receive failed for some items", failed);
      alert(`Failed to record receive for ${failed.length} item(s). See inline errors.`);
    } else {
      // refresh orders only when all succeeded
      await fetchOrders();
      setExpandedOrderId(order.id);
      alert("Received selected items successfully.");
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) return;
    try {
      await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/resupply-orders/${orderId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Canceled" }),
      });
      await fetchOrders();
    } catch (err) {
      console.error("Failed to cancel order", err);
      alert("Failed to cancel order. Please try again.");
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

  const filteredOrders = orders.filter(order => {
    const statusText = computeOrderStatus(order);
    const matchesStatus = statusFilter === "All" || statusText === statusFilter;
    const matchesSearch = order.supplier_detail?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.items || []).some(item => (item.ingredient_detail?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => computeOrderStatus(o) === "Pending").length;
  const partialOrders = orders.filter(o => computeOrderStatus(o) === "Partial").length;
  const deliveredOrders = orders.filter(o => computeOrderStatus(o) === "Delivered").length;
  const canceledOrders = orders.filter(o => computeOrderStatus(o) === "Canceled").length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-6 py-8 ">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resupply Orders</h1>
          <p className="text-gray-600 mb-4">View and manage all supplier resupply orders</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-[#f08b51] mb-1">{totalOrders}</p>
              <p className="text-sm text-gray-500">All resupply orders</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-[#f08b51] mb-1">{pendingOrders}</p>
              <p className="text-sm text-gray-500">No items received yet</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Partial</p>
              <p className="text-3xl font-bold text-[#f08b51] mb-1">{partialOrders}</p>
              <p className="text-sm text-gray-500">Some items received</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Delivered</p>
              <p className="text-3xl font-bold text-[#f08b51] mb-1">{deliveredOrders}</p>
              <p className="text-sm text-gray-500">Fully received</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Canceled</p>
              <p className="text-3xl font-bold text-[#f08b51] mb-1">{canceledOrders}</p>
              <p className="text-sm text-gray-500">Canceled orders</p>
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
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search by supplier or ingredient..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f08b51] focus:border-transparent" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["All", "Pending", "Partial", "Delivered", "Canceled"].map(status => (
                  <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? "bg-[#f08b51] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{status}</button>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr className={`hover:bg-gray-50 ${expandedOrderId === order.id ? "bg-gray-50" : ""}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.supplier_detail?.name || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.order_date ? new Date(order.order_date).toLocaleString() : "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const statusText = computeOrderStatus(order);
                          const cls = statusText === "Delivered" ? "bg-green-100 text-green-800" : statusText === "Canceled" ? "bg-red-100 text-red-800" : statusText === "Partial" ? "bg-yellow-100 text-yellow-800" : "bg-yellow-100 text-yellow-800";
                          return (<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{statusText}</span>);
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <ul className="list-disc pl-4">
                          {(order.items || []).slice(0,3).map((item, idx) => (
                            <li key={item.ingredient + "-" + idx}>{item.ingredient_detail?.name} — {(item.quantity_ordered ?? item.quantity)} {item.ingredient_detail?.unit_of_measurement}</li>
                          ))}
                          {(order.items || []).length > 3 && <li className="text-sm text-gray-500">and {order.items.length - 3} more…</li>}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => toggleExpand(order.id)} className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs mr-2">{expandedOrderId === order.id ? "Hide" : "Receive"}</button>
                          <button onClick={() => handleCancel(order.id)} disabled={computeOrderStatus(order) === "Canceled" || computeOrderStatus(order) === "Delivered"} className={`px-3 py-1 rounded text-sm text-white ${computeOrderStatus(order) === "Canceled" || computeOrderStatus(order) === "Delivered" ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}>Cancel</button>
                        </div>
                      </td>
                    </tr>

                    {expandedOrderId === order.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-6 py-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">Receiving for Order #{order.id}</h3>
                                <p className="text-sm text-gray-600">Supplier: {order.supplier_detail?.name || "—"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setExpandedOrderId(null)} className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Back</button>
                              </div>
                            </div>

                            <div className="bg-white border rounded-lg">
                              <div className="p-4 border-b text-sm font-medium text-gray-700">Items</div>
                              <div className="p-4 space-y-3">
                                {(order.items || []).map(item => {
                                  const id = item.id;
                                  const orderedQty = parseFloat(item.quantity_ordered ?? item.quantity ?? 0) || 0;
                                  const receivedSoFar = parseFloat(item.quantity_received ?? 0) || 0;
                                  const pending = Math.max(orderedQty - receivedSoFar, 0);
                                  const input = receiveInputs[id] || { amount: "", expiry: "", loading: false, error: "" };

                                  return (
                                    <div key={id} className="grid grid-cols-12 gap-3 items-center">
                                      <div className="col-span-4">
                                        <div className="text-sm font-medium">{item.ingredient_detail?.name}</div>
                                        <div className="text-xs text-gray-500">{item.ingredient_detail?.unit_of_measurement}</div>
                                      </div>

                                      <div className="col-span-2 text-sm">
                                        <div className="text-xs text-gray-500">Ordered</div>
                                        <div>{orderedQty}</div>
                                      </div>

                                      <div className="col-span-2 text-sm">
                                        <div className="text-xs text-gray-500">Received So Far</div>
                                        <div>{receivedSoFar}</div>
                                      </div>

                                      <div className="col-span-2">
                                        <label className="text-xs text-gray-500 block mb-1">Amount to Receive</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          max={pending}
                                          value={input.amount}
                                          onChange={(e) => handleInputChange(id, "amount", e.target.value, pending)}
                                          disabled={input.loading}
                                          className="w-full border rounded px-2 py-1 text-sm"
                                          placeholder={`Pending: ${pending}`}
                                        />
                                        {/* show numeric-related error messages */}
                                        {input.error && <div className="text-xs text-red-600 mt-1">{input.error}</div>}
                                      </div>

                                      <div className="col-span-2">
                                        <label className="text-xs text-gray-500 block mb-1">Expiry Date <span className="text-red-600">*</span></label>
                                        <input
                                          type="date"
                                          value={input.expiry}
                                          onChange={(e) => handleInputChange(id, "expiry", e.target.value)}
                                          disabled={input.loading}
                                          required
                                          aria-required="true"
                                          className="w-full border rounded px-2 py-1 text-sm"
                                        />
                                        {/* show expiry-specific error messages (shares input.error) */}
                                        {input.error && <div className="text-xs text-red-600 mt-1">{input.error}</div>}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* single Receive All button */}
                                <div className="flex justify-end mt-2">
                                  <button
                                    onClick={() => handleReceiveAll(order)}
                                    className="px-4 py-2 rounded text-sm text-white bg-[#f08b51] hover:bg-[#d9734a]"
                                  >
                                    Receive Selected
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No orders found.</td>
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