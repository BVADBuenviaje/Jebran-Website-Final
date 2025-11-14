import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Factory,
  Loader2,
  Package,
  Settings2,
} from "lucide-react";
import { fetchWithAuth } from "../utils/auth";

const INVENTORY_API = (import.meta.env.VITE_INVENTORY_URL || "").replace(/\/+$/, "");

function formatDateTime(input) {
  if (!input) return "—";
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return input;
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (err) {
    return input;
  }
}

function parseQuantity(value) {
  if (value === null || value === undefined || value === "") return "0";
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return String(value);
  return asNumber.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

const EMPTY_REQUIREMENTS = {
  ingredients: [],
  shortages: [],
  disabled: [],
  warnings: [],
  requires_disabled_override: false,
  can_produce: false,
  generated_at: null,
};

export default function Production() {
  const [pendingBatches, setPendingBatches] = useState([]);
  const [producedBatches, setProducedBatches] = useState([]);
  const [cancelledBatches, setCancelledBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [requirements, setRequirements] = useState(EMPTY_REQUIREMENTS);
  const [batchOrders, setBatchOrders] = useState([]);
  const [config, setConfig] = useState({
    default_start_time: "22:00",
    default_end_time: "21:59",
    timezone: "Asia/Manila",
    allow_custom_windows: true,
  });
  const [configDraft, setConfigDraft] = useState(null);
  const [newBatchDraft, setNewBatchDraft] = useState({
    window_start: "",
    window_end: "",
    notes: "",
  });
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [produceLoading, setProduceLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState({
    start_date: "",
    end_date: "",
  });
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    produced: 1,
    cancelled: 1,
  });
  const ITEMS_PER_PAGE = 15;

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetchWithAuth(`${INVENTORY_API}/production/window-config/`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setConfigDraft(data);
      }
    } catch (err) {
      console.warn("Failed to load production config", err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchBatchList = useCallback(async (filterStart = null, filterEnd = null) => {
    setLoadingBatches(true);
    setError("");
    try {
      // Use passed parameters or current state
      const startDate = filterStart ?? dateFilter.start_date;
      const endDate = filterEnd ?? dateFilter.end_date;
      
      // Build query parameters with date filters
      // Only apply date filters if both start and end dates are provided
      const buildUrl = (status) => {
        const params = new URLSearchParams({ status });
        if (startDate && endDate) {
          params.append("start_date", startDate);
          params.append("end_date", endDate);
        }
        return `${INVENTORY_API}/production-batches/?${params.toString()}`;
      };

      const [pendingRes, completedRes, cancelledRes] = await Promise.all([
        fetchWithAuth(buildUrl("pending")),
        fetchWithAuth(buildUrl("completed")),
        fetchWithAuth(buildUrl("cancelled")),
      ]);

      let pending = [];
      let completed = [];
      let cancelled = [];
      if (pendingRes.ok) pending = await pendingRes.json();
      if (completedRes.ok) completed = await completedRes.json();
      if (cancelledRes.ok) cancelled = await cancelledRes.json();

      const pendingList = Array.isArray(pending) ? pending : [];
      const producedList = Array.isArray(completed) ? completed : [];
      const cancelledList = Array.isArray(cancelled) ? cancelled : [];

      setPendingBatches(pendingList);
      setProducedBatches(producedList);
      setCancelledBatches(cancelledList);

      const validIds = new Set([
        ...pendingList.map((b) => b.id),
        ...producedList.map((b) => b.id),
        ...cancelledList.map((b) => b.id),
      ]);

      let finalSelectedId = selectedBatchId;
      if (selectedBatchId && !validIds.has(selectedBatchId)) {
        if (pendingList.length > 0) {
          setActiveTab("pending");
          finalSelectedId = pendingList[0].id;
        } else if (producedList.length > 0) {
          setActiveTab("produced");
          finalSelectedId = producedList[0].id;
        } else if (cancelledList.length > 0) {
          setActiveTab("cancelled");
          finalSelectedId = cancelledList[0].id;
        } else {
          finalSelectedId = null;
        }
      } else if (!selectedBatchId) {
        if (pendingList.length > 0) {
          setActiveTab("pending");
          finalSelectedId = pendingList[0].id;
        } else if (producedList.length > 0) {
          setActiveTab("produced");
          finalSelectedId = producedList[0].id;
        } else if (cancelledList.length > 0) {
          setActiveTab("cancelled");
          finalSelectedId = cancelledList[0].id;
        }
      }
      setSelectedBatchId(finalSelectedId);
      // Reset pagination when filters change
      setCurrentPage({ pending: 1, produced: 1, cancelled: 1 });
      // Note: loadBatchDetail will be called by useEffect when selectedBatchId changes
    } catch (err) {
      console.error("Failed to load batches", err);
      setError("Failed to load batches. Please try again.");
    } finally {
      setLoadingBatches(false);
    }
  }, [selectedBatchId]);

  const loadBatchDetail = useCallback(
    async (batchId) => {
      if (!batchId) {
        setRequirements(EMPTY_REQUIREMENTS);
        setBatchOrders([]);
        return;
      }
      setLoadingDetail(true);
      setError("");
      try {
        const [requirementsRes, ordersRes] = await Promise.all([
          fetchWithAuth(`${INVENTORY_API}/production-batches/${batchId}/requirements/`),
          fetchWithAuth(`${INVENTORY_API}/production-batches/${batchId}/orders/`),
        ]);

        if (requirementsRes.ok) {
          const reqData = await requirementsRes.json();
          setRequirements({ ...EMPTY_REQUIREMENTS, ...reqData });
        } else {
          setRequirements({ ...EMPTY_REQUIREMENTS });
        }

        if (ordersRes.ok) {
          const assignments = await ordersRes.json();
          const safeAssignments = Array.isArray(assignments) ? assignments : [];
          setBatchOrders(safeAssignments);
        } else {
          setBatchOrders([]);
        }
      } catch (err) {
        console.error("Failed to load batch detail", err);
        setError("Failed to load batch details.");
        setBatchOrders([]);
        setRequirements({ ...EMPTY_REQUIREMENTS });
      } finally {
        setLoadingDetail(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    fetchBatchList(dateFilter.start_date, dateFilter.end_date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter.start_date, dateFilter.end_date]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchDetail(selectedBatchId);
    }
  }, [selectedBatchId, loadBatchDetail]);

  const handleSaveConfig = async () => {
    if (!configDraft) return;
    setSavingConfig(true);
    try {
      const res = await fetchWithAuth(`${INVENTORY_API}/production/window-config/`, {
        method: "PUT",
        body: JSON.stringify(configDraft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to save configuration.");
        return;
      }
      const saved = await res.json();
      setConfig(saved);
      setConfigDraft(saved);
      alert("Production window updated.");
    } catch (err) {
      alert("Unable to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!newBatchDraft.window_start || !newBatchDraft.window_end) {
      alert("Please provide both start and end times.");
      return;
    }
    setCreatingBatch(true);
    try {
      const res = await fetchWithAuth(`${INVENTORY_API}/production-batches/`, {
        method: "POST",
        body: JSON.stringify(newBatchDraft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to create batch.");
        return;
      }
      setNewBatchDraft({ window_start: "", window_end: "", notes: "" });
      await fetchBatchList();
    } catch (err) {
      alert("Unable to create batch.");
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleMoveOrderToNext = async (orderId) => {
    if (!orderId || !selectedBatchId) return;
    const confirmed = window.confirm("Move this order to the next production batch?");
    if (!confirmed) return;
    try {
      const res = await fetchWithAuth(`${INVENTORY_API}/production-batches/${selectedBatchId}/move-order-next/`, {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to move order.");
        return;
      }
      const result = await res.json();
      // Refresh batch lists so navigation tabs stay accurate
      await fetchBatchList();

      // If backend returned updated requirements for original batch, use them; otherwise reload
      if (result?.original_requirements && result.original_batch_id === selectedBatchId) {
        setRequirements({ ...EMPTY_REQUIREMENTS, ...result.original_requirements });
      } else {
        await loadBatchDetail(selectedBatchId);
      }

      // Remove the moved order from current batchOrders list
      setBatchOrders((prev) => prev.filter((assignment) => assignment.order !== orderId && assignment.order_detail?.id !== orderId));

      // Offer navigation to new batch without forcing switch
      if (result?.target_batch_id) {
        // Store target batch id in a transient notification
        const goNow = window.confirm(`Order moved to new batch ${result.target_batch_id}. Go to that batch now?`);
        if (goNow) {
          setSelectedBatchId(result.target_batch_id);
          setActiveTab("pending");
          // Use returned data for target if present
          if (Array.isArray(result.orders)) {
            setBatchOrders(result.orders);
          } else {
            setBatchOrders([]);
          }
          if (result.requirements) {
            setRequirements({ ...EMPTY_REQUIREMENTS, ...result.requirements });
          } else {
            await loadBatchDetail(result.target_batch_id);
          }
        }
      }
    } catch {
      alert("Unable to move order.");
    }
  };

  const handleProduce = async ({ forceDisabled = false } = {}) => {
    if (!selectedBatchId) return;
    setProduceLoading(true);
    try {
      const res = await fetchWithAuth(`${INVENTORY_API}/production-batches/${selectedBatchId}/produce/`, {
        method: "POST",
        body: JSON.stringify({ allow_disabled: forceDisabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.requires_disabled_override && !forceDisabled) {
          const disabledNames = Array.isArray(data.disabled)
            ? Array.from(new Set(data.disabled.map((item) => item.ingredient))).filter(Boolean).join(", ")
            : "";
          const promptMessage = disabledNames
            ? `The following ingredients are disabled: ${disabledNames}. Proceed with production using the remaining ingredients?`
            : "Some recipe ingredients are disabled. Proceed with production using the remaining ingredients?";
          const confirm = window.confirm(promptMessage);
          if (confirm) {
            await handleProduce({ forceDisabled: true });
          }
          setRequirements({ ...EMPTY_REQUIREMENTS, ...data });
          return;
        }
        alert(data.detail || "Failed to produce batch.");
        setRequirements(data.requirements ? { ...EMPTY_REQUIREMENTS, ...data.requirements } : { ...EMPTY_REQUIREMENTS });
        return;
      }
      alert("Batch produced successfully.");
      await fetchBatchList();
      const producedId = data?.batch?.id || selectedBatchId;
      setActiveTab("produced");
      setSelectedBatchId(producedId);
      if (data.requirements) {
        setRequirements({ ...EMPTY_REQUIREMENTS, ...data.requirements });
      }
    } catch (err) {
      alert("Unable to complete production.");
    } finally {
      setProduceLoading(false);
    }
  };

  const handleCancelProduction = async (batchId) => {
    const reason = window.prompt("Provide a cancellation note (optional):", "");
    try {
      const res = await fetchWithAuth(`${INVENTORY_API}/production-batches/${batchId}/cancel/`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to cancel production.");
        return;
      }
      alert("Production cancelled, stock restored.");
      const data = await res.json().catch(() => ({}));
      await fetchBatchList();
      const newBatchId = data?.new_batch_id || null;
      if (newBatchId) {
        setActiveTab("pending");
        setSelectedBatchId(newBatchId);
      } else {
        setActiveTab("cancelled");
        setSelectedBatchId(batchId);
        await loadBatchDetail(batchId);
      }
    } catch (err) {
      alert("Unable to cancel production.");
    }
  };

  const shortages = requirements.shortages || [];

  const renderBatchList = (batches, tabKey, emptyLabel) => {
    const currentPageNum = currentPage[tabKey] || 1;
    const totalPages = Math.ceil(batches.length / ITEMS_PER_PAGE);
    const startIndex = (currentPageNum - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedBatches = batches.slice(startIndex, endIndex);

    return (
      <div className="space-y-2">
        {batches.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
            No {emptyLabel} batches yet.
          </div>
        )}
        {paginatedBatches.map((batch) => {
        const isExpanded = expandedBatchId === batch.id;
        const disabledFlag = batch.has_disabled_ingredients;
        const isSelected = selectedBatchId === batch.id;
        
        return (
          <div
            key={batch.id}
            className={`rounded-lg border transition ${
              isSelected
                ? "border-[#f08b51] bg-[#f08b51]/10"
                : disabledFlag
                  ? "border-amber-400 bg-white ring-1 ring-amber-300"
                  : "border-gray-200 bg-white"
            }`}
          >
            {/* Batch Card Header - Clickable to toggle */}
            <button
              onClick={() => {
                if (isExpanded) {
                  setExpandedBatchId(null);
                  setSelectedBatchId(null);
                } else {
                  setExpandedBatchId(batch.id);
                  setSelectedBatchId(batch.id);
                  setActiveTab(tabKey);
                }
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50/50 transition"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <span>Batch #{batch.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  {batch.has_disabled_ingredients && (
                    <span
                      title={`${batch.disabled_ingredient_count} disabled ingredient${batch.disabled_ingredient_count === 1 ? '' : 's'} detected`}
                      className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-sm"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {batch.disabled_ingredient_count}
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-wide text-gray-500">{batch.status}</span>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <div>Window: {formatDateTime(batch.window_start)} → {formatDateTime(batch.window_end)}</div>
                <div>Orders: {batch.orders_count ?? 0}</div>
                {batch.has_disabled_ingredients && (
                  <div className="mt-1 text-xs font-medium text-amber-600">
                    {batch.disabled_ingredient_count} disabled ingredient{batch.disabled_ingredient_count === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-3 py-8 text-base text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin text-[#f08b51]" />
                    Loading details...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                      {batch.status === "pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProduce({});
                          }}
                          disabled={produceLoading || !requirements.can_produce || batchOrders.length === 0}
                          title={batchOrders.length === 0 ? "Cannot produce a batch with no orders" : !requirements.can_produce ? "Cannot produce - check ingredient requirements" : "Produce this batch"}
                          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                            requirements.can_produce && batchOrders.length > 0 ? "bg-[#f08b51] hover:bg-[#d8713a]" : "bg-gray-300 cursor-not-allowed"
                          }`}
                        >
                          {produceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                          Produce Batch
                        </button>
                      )}
                      {batch.status === "completed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelProduction(batch.id);
                          }}
                          className="inline-flex items-center gap-2 rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Cancel / Restore
                        </button>
                      )}
                    </div>

                    {/* Ingredient Requirements */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3 text-base font-semibold text-gray-900">
                        <Boxes className="h-5 w-5 text-[#f08b51]" />
                        Ingredient Requirements
                      </div>
                      {batch.status !== "pending" && requirements.generated_at && (
                        <p className="text-sm text-gray-500 mb-3">
                          Snapshot captured {formatDateTime(requirements.generated_at)}
                        </p>
                      )}
                      {requirements.ingredients && requirements.ingredients.length === 0 ? (
                        <p className="text-sm text-gray-500">No ingredient demand calculated yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                                <th className="px-3 py-2">Ingredient</th>
                                <th className="px-3 py-2">Required</th>
                                <th className="px-3 py-2">Available</th>
                                <th className="px-3 py-2">Shortage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(requirements.ingredients || []).map((item) => (
                                <tr key={item.ingredient_id} className="border-b border-gray-100">
                                  <td className="px-3 py-2 font-medium text-gray-900">{item.ingredient_name}</td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {parseQuantity(item.required_quantity)} {item.unit_of_measurement || ""}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {parseQuantity(item.available_quantity)} {item.unit_of_measurement || ""}
                                  </td>
                                  <td className="px-3 py-2">
                                    {Number(item.shortage_quantity) > 0 ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                        <AlertTriangle className="h-3 w-3" />
                                        {parseQuantity(item.shortage_quantity)}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-emerald-600 font-medium">In stock</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {requirements.disabled && requirements.disabled.length > 0 && (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          Disabled ingredients detected:
                          <ul className="mt-2 space-y-1 text-amber-800">
                            {requirements.disabled.map((item, idx) => (
                              <li key={`${item.ingredient_id}-${idx}`}>
                                • {item.ingredient} (product: {item.product})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {shortages.length > 0 && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          Resolve shortages before producing.
                        </div>
                      )}
                    </div>

                    {/* Orders Section */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3 text-base font-semibold text-gray-900">
                        <ClipboardList className="h-5 w-5 text-[#f08b51]" />
                        Orders in this batch
                      </div>
                      {batchOrders.length === 0 ? (
                        <p className="text-sm text-gray-500">No orders assigned yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {batchOrders.map((assignment) => {
                            const orderDetail = assignment.order_detail || {};
                            const items = orderDetail.items || [];
                            const canMove = batch.status === "pending";
                            const singleOrderInBatch = canMove && batchOrders.length === 1;

                            return (
                              <div key={assignment.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      Order #{orderDetail.id || assignment.order}
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                      Sequence: {assignment.sequence ?? 0} • Assigned by: {assignment.assigned_by_username || "System"}
                                    </p>
                                  </div>
                                  {canMove && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!singleOrderInBatch) handleMoveOrderToNext(assignment.order);
                                      }}
                                      disabled={singleOrderInBatch}
                                      title={singleOrderInBatch ? "Can't move the only order; create another batch first." : "Move this order to the next batch"}
                                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold border ${
                                        singleOrderInBatch
                                          ? "cursor-not-allowed border-gray-300 text-gray-400 bg-gray-100"
                                          : "border-[#f08b51] text-[#f08b51] hover:bg-[#f08b51]/10"
                                      }`}
                                    >
                                      Move to Next Batch
                                    </button>
                                  )}
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                                        <th className="px-2 py-1">Product</th>
                                        <th className="px-2 py-1">Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {items.map((item) => (
                                        <tr key={item.id} className="bg-white">
                                          <td className="px-2 py-1 font-medium text-gray-900">
                                            {item.product?.name || item.name}
                                          </td>
                                          <td className="px-2 py-1 text-gray-600">{item.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, batches.length)} of {batches.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => ({ ...prev, [tabKey]: Math.max(1, currentPageNum - 1) }))}
              disabled={currentPageNum === 1}
              className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage((prev) => ({ ...prev, [tabKey]: page }))}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  page === currentPageNum
                    ? "bg-[#f08b51] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((prev) => ({ ...prev, [tabKey]: Math.min(totalPages, currentPageNum + 1) }))}
              disabled={currentPageNum === totalPages}
              className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Planner</h1>
            <p className="text-sm text-gray-500">
              Group daily orders into batches, validate stock against FIFO inventory, and track production history.
            </p>
          </div>
        </div>

        <section className="mb-12 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#f08b51]" />
            <h2 className="text-lg font-semibold text-gray-900">Batch Intake Window</h2>
          </div>
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading configuration…
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4 md:items-end">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">Start time</label>
                <input
                  type="time"
                  value={configDraft?.default_start_time || ""}
                  onChange={(e) => setConfigDraft((prev) => ({ ...prev, default_start_time: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#f08b51] focus:outline-none focus:ring-2 focus:ring-[#f08b51]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">End time</label>
                <input
                  type="time"
                  value={configDraft?.default_end_time || ""}
                  onChange={(e) => setConfigDraft((prev) => ({ ...prev, default_end_time: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#f08b51] focus:outline-none focus:ring-2 focus:ring-[#f08b51]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">Timezone</label>
                <input
                  type="text"
                  value={configDraft?.timezone || ""}
                  onChange={(e) => setConfigDraft((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#f08b51] focus:outline-none focus:ring-2 focus:ring-[#f08b51]/40"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f08b51] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d8713a] disabled:cursor-not-allowed disabled:bg-[#f08b51]/60"
                >
                  {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save window
                </button>
              </div>
            </div>
          )}
          <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">Custom window start</label>
              <input
                type="datetime-local"
                value={newBatchDraft.window_start}
                onChange={(e) => setNewBatchDraft((prev) => ({ ...prev, window_start: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#f08b51] focus:outline-none focus:ring-2 focus:ring-[#f08b51]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">Custom window end</label>
              <input
                type="datetime-local"
                value={newBatchDraft.window_end}
                onChange={(e) => setNewBatchDraft((prev) => ({ ...prev, window_end: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#f08b51] focus:outline-none focus:ring-2 focus:ring-[#f08b51]/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateBatch}
                disabled={creatingBatch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#f08b51] bg-white px-4 py-2 text-sm font-semibold text-[#f08b51] hover:bg-[#f08b51]/10 disabled:cursor-not-allowed disabled:border-[#f08b51]/40 disabled:text-[#f08b51]/40"
              >
                {creatingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
                Create batch from custom window
              </button>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto">
          <div className="space-y-6 lg:space-y-8">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Batches</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-4 w-4" />
                  {pendingBatches.length} pending
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div className="mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                      From {dateFilter.start_date && !dateFilter.end_date && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={dateFilter.start_date}
                      onChange={(e) => setDateFilter((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#f08b51] focus:outline-none focus:ring-1 focus:ring-[#f08b51]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                      To {dateFilter.start_date && !dateFilter.end_date && <span className="text-amber-500">* Required</span>}
                    </label>
                    <input
                      type="date"
                      value={dateFilter.end_date}
                      onChange={(e) => setDateFilter((prev) => ({ ...prev, end_date: e.target.value }))}
                      min={dateFilter.start_date || undefined}
                      required={!!dateFilter.start_date}
                      className={`w-full rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                        dateFilter.start_date && !dateFilter.end_date
                          ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/40 animate-pulse"
                          : "border-gray-300 focus:border-[#f08b51] focus:ring-[#f08b51]/40"
                      }`}
                      placeholder={dateFilter.start_date && !dateFilter.end_date ? "Required" : ""}
                    />
                  </div>
                </div>
                {dateFilter.start_date && !dateFilter.end_date && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Please select an end date to complete the filter</span>
                  </div>
                )}
                {(dateFilter.start_date || dateFilter.end_date) && (
                  <button
                    onClick={() => setDateFilter({ start_date: "", end_date: "" })}
                    className="w-full text-[10px] text-gray-500 hover:text-[#f08b51] underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              
              <div className="mb-4 flex rounded-md bg-gray-100 p-1 text-sm">
                <button
                  className={`flex-1 rounded-md px-3 py-1 ${activeTab === "pending" ? "bg-white font-semibold text-gray-900 shadow" : "text-gray-500"}`}
                  onClick={() => {
                    setActiveTab("pending");
                    setCurrentPage((prev) => ({ ...prev, pending: 1 }));
                    if (pendingBatches.length > 0) setSelectedBatchId(pendingBatches[0].id);
                  }}
                >
                  Pending
                </button>
                <button
                  className={`flex-1 rounded-md px-3 py-1 ${activeTab === "produced" ? "bg-white font-semibold text-gray-900 shadow" : "text-gray-500"}`}
                  onClick={() => {
                    setActiveTab("produced");
                    setCurrentPage((prev) => ({ ...prev, produced: 1 }));
                    if (producedBatches.length > 0) setSelectedBatchId(producedBatches[0].id);
                  }}
                >
                  Produced
                </button>
                <button
                  className={`flex-1 rounded-md px-3 py-1 ${activeTab === "cancelled" ? "bg-white font-semibold text-gray-900 shadow" : "text-gray-500"}`}
                  onClick={() => {
                    setActiveTab("cancelled");
                    setCurrentPage((prev) => ({ ...prev, cancelled: 1 }));
                    if (cancelledBatches.length > 0) setSelectedBatchId(cancelledBatches[0].id);
                  }}
                >
                  Cancelled
                </button>
              </div>
              {loadingBatches ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading batches…
                </div>
              ) : (
                <>
                  {activeTab === "pending" && renderBatchList(pendingBatches, "pending", "pending")}
                  {activeTab === "produced" && renderBatchList(producedBatches, "produced", "produced")}
                  {activeTab === "cancelled" && renderBatchList(cancelledBatches, "cancelled", "cancelled")}
                </>
              )}
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertTriangle className="mr-2 inline h-4 w-4" /> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
