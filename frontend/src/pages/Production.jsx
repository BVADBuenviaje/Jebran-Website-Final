import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Settings2,
  CheckSquare,
  Square,
  CalendarX,
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
  orders_with_disabled_products: [],
  orders_with_disabled_ingredients: [],
  has_only_expired_stock: false,
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
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [config, setConfig] = useState({
    default_start_time: "22:00",
    default_end_time: "21:59",
    timezone: "Asia/Manila",
    allow_custom_windows: true,
  });
  const [configDraft, setConfigDraft] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
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
      // Clear selections when batch changes
      setSelectedOrders(new Set());
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


  const handleToggleOrderSelection = (orderId) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAllOrders = () => {
    const canMove = batchOrders.some((assignment) => {
      const batch = [...pendingBatches, ...producedBatches, ...cancelledBatches].find(
        b => b.id === selectedBatchId
      );
      return batch?.status === "pending";
    });
    
    if (!canMove) {
      return;
    }

    // Don't select all if it would leave batch empty
    const allOrderIds = batchOrders
      .map((assignment) => assignment.order_detail?.id || assignment.order)
      .filter(Boolean);
    
    if (allOrderIds.length <= 1) {
      return;
    }

    // Select all but one (to prevent leaving batch empty)
    const ordersToSelect = allOrderIds.slice(0, -1);
    setSelectedOrders(new Set(ordersToSelect));
  };

  const handleDeselectAllOrders = () => {
    setSelectedOrders(new Set());
  };

  const handleMoveSelectedOrdersToNext = async () => {
    if (!selectedBatchId || selectedOrders.size === 0) return;
    
    const orderIds = Array.from(selectedOrders);
    const orderCount = orderIds.length;
    
    // Check if moving these orders would leave the batch empty
    const remainingOrders = batchOrders.length - orderCount;
    if (remainingOrders < 1) {
      alert("Cannot move all orders. At least one order must remain in the batch.");
      return;
    }

    const confirmed = window.confirm(
      `Move ${orderCount} order${orderCount === 1 ? '' : 's'} to the next production batch?`
    );
    if (!confirmed) return;

    let lastResult = null;
    let successCount = 0;
    let failedOrders = [];

    try {
      // Move orders sequentially
      for (const orderId of orderIds) {
        try {
          const res = await fetchWithAuth(`${INVENTORY_API}/production-batches/${selectedBatchId}/move-order-next/`, {
            method: "POST",
            body: JSON.stringify({ order_id: orderId }),
          });
          
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            failedOrders.push({ orderId, error: data.detail || "Failed to move order" });
            continue;
          }
          
          lastResult = await res.json();
          successCount++;
        } catch (err) {
          failedOrders.push({ orderId, error: "Network error" });
        }
      }

      // Refresh batch lists so navigation tabs stay accurate
      await fetchBatchList();

      // Update requirements and orders for the current batch
      if (lastResult?.original_requirements && lastResult.original_batch_id === selectedBatchId) {
        setRequirements({ ...EMPTY_REQUIREMENTS, ...lastResult.original_requirements });
      } else {
        await loadBatchDetail(selectedBatchId);
      }

      // Remove moved orders from current batchOrders list
      setBatchOrders((prev) => 
        prev.filter((assignment) => {
          const orderId = assignment.order_detail?.id || assignment.order;
          return !orderIds.includes(orderId);
        })
      );

      // Clear selections
      setSelectedOrders(new Set());

      // Show results
      if (failedOrders.length > 0) {
        const failedList = failedOrders.map(f => `Order #${f.orderId}: ${f.error}`).join('\n');
        alert(`${successCount} order${successCount === 1 ? '' : 's'} moved successfully.\n\nFailed:\n${failedList}`);
      } else {
        // Offer navigation to new batch if all succeeded
        if (lastResult?.target_batch_id) {
          const goNow = window.confirm(
            `${successCount} order${successCount === 1 ? '' : 's'} moved to batch ${lastResult.target_batch_id}. Go to that batch now?`
          );
          if (goNow) {
            await fetchBatchList();
            setSelectedBatchId(lastResult.target_batch_id);
            setExpandedBatchId(lastResult.target_batch_id);
            setActiveTab("pending");
            if (Array.isArray(lastResult.orders)) {
              setBatchOrders(lastResult.orders);
            } else {
              setBatchOrders([]);
            }
            if (lastResult.requirements) {
              setRequirements({ ...EMPTY_REQUIREMENTS, ...lastResult.requirements });
            } else {
              await loadBatchDetail(lastResult.target_batch_id);
            }
          }
        } else {
          alert(`${successCount} order${successCount === 1 ? '' : 's'} moved successfully.`);
        }
      }
    } catch (err) {
      alert(`Error moving orders: ${err.message || "Unknown error"}`);
    }
  };

  const handleMoveSelectedOrdersToPrevious = async () => {
    if (!selectedBatchId || selectedOrders.size === 0) return;
    
    const orderIds = Array.from(selectedOrders);
    const orderCount = orderIds.length;

    const confirmed = window.confirm(
      `Move ${orderCount} order${orderCount === 1 ? '' : 's'} back to the previous production batch?`
    );
    if (!confirmed) return;

    let lastResult = null;
    let successCount = 0;
    let failedOrders = [];

    try {
      // Move orders sequentially
      for (const orderId of orderIds) {
        try {
          const res = await fetchWithAuth(`${INVENTORY_API}/production-batches/${selectedBatchId}/move-order-previous/`, {
            method: "POST",
            body: JSON.stringify({ order_id: orderId }),
          });
          
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            failedOrders.push({ orderId, error: data.detail || "Failed to move order" });
            continue;
          }
          
          lastResult = await res.json();
          successCount++;
        } catch (err) {
          failedOrders.push({ orderId, error: "Network error" });
        }
      }

      // Refresh batch lists so navigation tabs stay accurate
      await fetchBatchList();

      // Update requirements and orders for the current batch
      if (lastResult?.original_requirements && lastResult.original_batch_id === selectedBatchId) {
        setRequirements({ ...EMPTY_REQUIREMENTS, ...lastResult.original_requirements });
      } else {
        await loadBatchDetail(selectedBatchId);
      }

      // Remove moved orders from current batchOrders list
      setBatchOrders((prev) => 
        prev.filter((assignment) => {
          const orderId = assignment.order_detail?.id || assignment.order;
          return !orderIds.includes(orderId);
        })
      );

      // Clear selections
      setSelectedOrders(new Set());

      // Show results
      if (failedOrders.length > 0) {
        const failedList = failedOrders.map(f => `Order #${f.orderId}: ${f.error}`).join('\n');
        alert(`${successCount} order${successCount === 1 ? '' : 's'} moved successfully.\n\nFailed:\n${failedList}`);
      } else {
        // Offer navigation to previous batch if all succeeded
        if (lastResult?.target_batch_id) {
          const goNow = window.confirm(
            `${successCount} order${successCount === 1 ? '' : 's'} moved back to batch ${lastResult.target_batch_id}. Go to that batch now?`
          );
          if (goNow) {
            await fetchBatchList();
            setSelectedBatchId(lastResult.target_batch_id);
            setExpandedBatchId(lastResult.target_batch_id);
            setActiveTab("pending");
            if (Array.isArray(lastResult.orders)) {
              setBatchOrders(lastResult.orders);
            } else {
              setBatchOrders([]);
            }
            if (lastResult.requirements) {
              setRequirements({ ...EMPTY_REQUIREMENTS, ...lastResult.requirements });
            } else {
              await loadBatchDetail(lastResult.target_batch_id);
            }
          }
        } else {
          alert(`${successCount} order${successCount === 1 ? '' : 's'} moved back successfully.`);
        }
      }
    } catch (err) {
      alert(`Error moving orders: ${err.message || "Unknown error"}`);
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
          // Only allow override for disabled ingredients, not disabled products
          const disabledIngredients = Array.isArray(data.disabled)
            ? data.disabled.filter(item => item.reason !== "product_disabled")
            : [];
          const disabledProducts = Array.isArray(data.disabled)
            ? data.disabled.filter(item => item.reason === "product_disabled")
            : [];
          
          // If there are disabled products, show error and don't allow override
          if (disabledProducts.length > 0) {
            const productNames = disabledProducts.map(item => item.product).filter(Boolean).join(", ");
            alert(`Cannot produce batch with disabled products: ${productNames}. Please remove these products from orders or reactivate them.`);
            setRequirements({ ...EMPTY_REQUIREMENTS, ...data });
            return;
          }
          
          // Only disabled ingredients - allow override
          const disabledNames = Array.from(new Set(disabledIngredients.map((item) => item.ingredient))).filter(Boolean).join(", ");
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
                  {batch.has_disabled_items && (
                    <span
                      title={
                        (batch.has_disabled_products && batch.has_disabled_ingredients)
                          ? `${batch.disabled_product_count || 0} disabled product${(batch.disabled_product_count || 0) === 1 ? '' : 's'}, ${batch.disabled_ingredient_count || 0} disabled ingredient${(batch.disabled_ingredient_count || 0) === 1 ? '' : 's'}`
                          : batch.has_disabled_products
                            ? `${batch.disabled_product_count || 0} disabled product${(batch.disabled_product_count || 0) === 1 ? '' : 's'}`
                            : `${batch.disabled_ingredient_count || 0} disabled ingredient${(batch.disabled_ingredient_count || 0) === 1 ? '' : 's'}`
                      }
                      className="inline-flex items-center rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-sm"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {batch.has_only_expired_stock && (
                    <span
                      title="Only expired stock available for some ingredients. Restock required."
                      className="inline-flex items-center rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow-sm"
                    >
                      <CalendarX className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-wide text-gray-500">{batch.status}</span>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <div>Window: {formatDateTime(batch.window_start)} → {formatDateTime(batch.window_end)}</div>
                <div>Orders: {batch.orders_count ?? 0}</div>
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
                          disabled={
                            produceLoading || 
                            !requirements.can_produce || 
                            batchOrders.length === 0 || 
                            (requirements.disabled && requirements.disabled.some(item => item.reason === "product_disabled")) ||
                            requirements.has_only_expired_stock
                          }
                          title={
                            batchOrders.length === 0 
                              ? "Cannot produce a batch with no orders" 
                              : requirements.has_only_expired_stock
                                ? "Cannot produce - only expired stock available"
                              : (requirements.disabled && requirements.disabled.some(item => item.reason === "product_disabled"))
                                ? "Cannot produce - disabled products detected"
                                : !requirements.can_produce 
                                  ? "Cannot produce - check ingredient requirements" 
                                  : "Produce this batch"
                          }
                          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                            requirements.can_produce && 
                            batchOrders.length > 0 && 
                            (!requirements.disabled || !requirements.disabled.some(item => item.reason === "product_disabled")) &&
                            !requirements.has_only_expired_stock
                              ? "bg-[#f08b51] hover:bg-[#d8713a]" 
                              : "bg-gray-300 cursor-not-allowed"
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
                      {requirements.disabled && requirements.disabled.length > 0 && (() => {
                        const disabledProducts = requirements.disabled.filter(item => item.reason === "product_disabled");
                        const disabledIngredients = requirements.disabled.filter(item => item.reason !== "product_disabled");
                        const uniqueProducts = [...new Set(disabledProducts.map(item => item.product))];
                        
                        // Group disabled ingredients by ingredient name and collect their products
                        const ingredientProductMap = new Map();
                        disabledIngredients.forEach(item => {
                          const ingredientName = item.ingredient;
                          const productName = item.product;
                          if (ingredientName) {
                            if (!ingredientProductMap.has(ingredientName)) {
                              ingredientProductMap.set(ingredientName, new Set());
                            }
                            if (productName) {
                              ingredientProductMap.get(ingredientName).add(productName);
                            }
                          }
                        });
                        
                        const hasProducts = uniqueProducts.length > 0;
                        const hasIngredients = ingredientProductMap.size > 0;
                        
                        return (
                          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                            <AlertTriangle className="mr-2 inline h-4 w-4" />
                            {hasProducts && hasIngredients
                              ? `Disabled products and ingredients detected:`
                              : hasProducts
                                ? `Disabled products detected:`
                                : `Disabled ingredients detected:`}
                            {hasProducts && (
                              <div className="mt-2">
                                <p className="font-semibold text-amber-900">Products:</p>
                                <ul className="mt-1 space-y-1 text-amber-800">
                                  {uniqueProducts.map((productName, idx) => (
                                    <li key={`product-${idx}`}>
                                      • {productName}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {hasIngredients && (
                              <div className={`mt-2 ${hasProducts ? '' : ''}`}>
                                <p className="font-semibold text-amber-900">Ingredients:</p>
                                <ul className="mt-1 space-y-1 text-amber-800">
                                  {Array.from(ingredientProductMap.entries()).map(([ingredientName, products], idx) => {
                                    const productList = Array.from(products).sort().join(", ");
                                    return (
                                      <li key={`ingredient-${idx}`}>
                                        • {ingredientName}{productList ? ` (${productList})` : ''}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                            <p className="mt-2 text-xs font-medium text-amber-900">
                              Production is disabled until these items are resolved.
                            </p>
                          </div>
                        );
                      })()}
                      {requirements.has_only_expired_stock && (
                        <div className="mt-4 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          <strong>Warning:</strong> Only expired stock is available for some ingredients. Please restock with fresh ingredients before producing.
                        </div>
                      )}
                      {shortages.length > 0 && !requirements.has_only_expired_stock && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          Resolve shortages before producing.
                        </div>
                      )}
                      {shortages.length > 0 && requirements.has_only_expired_stock && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          Insufficient stock: Only expired ingredients available. Restock required.
                        </div>
                      )}
                    </div>

                    {/* Orders Section */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                          <ClipboardList className="h-5 w-5 text-[#f08b51]" />
                          Orders in this batch
                        </div>
                        {batch.status === "pending" && batchOrders.length > 1 && (
                          <div className="flex items-center gap-2">
                            {selectedOrders.size > 0 && (
                              <>
                                <button
                                  onClick={handleDeselectAllOrders}
                                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                                >
                                  Deselect All
                                </button>
                                <span className="text-xs text-gray-400">|</span>
                              </>
                            )}
                            <button
                              onClick={handleSelectAllOrders}
                              className="text-xs text-gray-600 hover:text-gray-900 underline"
                            >
                              Select All
                            </button>
                            {selectedOrders.size > 0 && (
                              <>
                                <button
                                  onClick={handleMoveSelectedOrdersToPrevious}
                                  title={`Move ${selectedOrders.size} selected order${selectedOrders.size === 1 ? '' : 's'} back to previous batch`}
                                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold border border-gray-400 text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Move {selectedOrders.size} to Previous Batch
                                </button>
                                <button
                                  onClick={handleMoveSelectedOrdersToNext}
                                  disabled={batchOrders.length - selectedOrders.size < 1}
                                  title={
                                    batchOrders.length - selectedOrders.size < 1
                                      ? "Cannot move all orders. At least one must remain."
                                      : `Move ${selectedOrders.size} selected order${selectedOrders.size === 1 ? '' : 's'} to next batch`
                                  }
                                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold border ${
                                    batchOrders.length - selectedOrders.size < 1
                                      ? "cursor-not-allowed border-gray-300 text-gray-400 bg-gray-100"
                                      : "border-[#f08b51] bg-[#f08b51] text-white hover:bg-[#f08b51]/90"
                                  }`}
                                >
                                  Move {selectedOrders.size} to Next Batch
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {batchOrders.length === 0 ? (
                        <p className="text-sm text-gray-500">No orders assigned yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {batchOrders.map((assignment) => {
                            const orderDetail = assignment.order_detail || {};
                            const items = orderDetail.items || [];
                            const canMove = batch.status === "pending";
                            const orderId = orderDetail.id || assignment.order;
                            const isSelected = selectedOrders.has(orderId);
                            const canSelect = canMove && batchOrders.length > 1;
                            // Check if selecting this order would leave the batch empty
                            const wouldLeaveEmpty = canSelect && !isSelected && (batchOrders.length - selectedOrders.size) === 1;
                            const hasDisabledProduct = requirements.orders_with_disabled_products?.includes(orderId);
                            const hasDisabledIngredient = requirements.orders_with_disabled_ingredients?.includes(orderId);
                            const hasDisabledItem = hasDisabledProduct || hasDisabledIngredient;

                            return (
                              <div key={assignment.id} className={`rounded-lg border p-4 transition-colors ${
                                isSelected 
                                  ? "border-[#f08b51] bg-amber-50" 
                                  : "border-gray-200 bg-gray-50"
                              }`}>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                  <div className="flex items-center gap-3">
                                    {canSelect && (
                                      <button
                                        onClick={() => {
                                          if (wouldLeaveEmpty && !isSelected) {
                                            alert("Cannot select all orders. At least one order must remain in the batch.");
                                            return;
                                          }
                                          handleToggleOrderSelection(orderId);
                                        }}
                                        className="flex-shrink-0"
                                        title={
                                          wouldLeaveEmpty && !isSelected
                                            ? "Cannot select all orders. At least one must remain."
                                            : isSelected
                                              ? "Deselect this order"
                                              : "Select this order to move"
                                        }
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="h-5 w-5 text-[#f08b51]" />
                                        ) : (
                                          <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                      </button>
                                    )}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        Order #{orderId}
                                        {hasDisabledItem && (
                                          <span
                                            title={
                                              hasDisabledProduct && hasDisabledIngredient
                                                ? "This order contains disabled products and ingredients"
                                                : hasDisabledProduct
                                                  ? "This order contains a disabled product"
                                                  : "This order contains disabled ingredients"
                                            }
                                            className="inline-flex items-center rounded-md bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white shadow-sm"
                                          >
                                            <AlertTriangle className="h-3 w-3" />
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-xs text-gray-500">
                                        Sequence: {assignment.sequence ?? 0} • Assigned by: {assignment.assigned_by_username || "System"}
                                      </p>
                                    </div>
                                  </div>
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
