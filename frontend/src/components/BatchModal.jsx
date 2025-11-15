import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../utils/auth";

const BatchModal = ({ open, ingredient, onClose, onBatchesChange }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState({});
  const [newBatch, setNewBatch] = useState({ quantity: "", expiry: "", loading: false, error: "" });

  const getIngredientIdFromBatch = (b) => {
    if (b == null) return null;
    if (typeof b.ingredient === "number") return b.ingredient;
    if (b.ingredient && typeof b.ingredient === "object" && (b.ingredient.id || b.ingredient.pk)) return b.ingredient.id ?? b.ingredient.pk;
    if (typeof b.ingredient_id === "number") return b.ingredient_id;
    if (typeof b.ingredientId === "number") return b.ingredientId;
    return null;
  };

  const computeAndNotify = (arr) => {
    if (!Array.isArray(arr)) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const total = arr.reduce((sum, b) => {
      // Only count batches that are not expired
      if (b.expiry_date) {
        const exp = new Date(b.expiry_date);
        exp.setHours(0, 0, 0, 0);
        if (exp < today) return sum; // skip expired
      }
      const q = b.current_quantity ?? b.quantity_received ?? b.quantity ?? 0;
      const n = Number(q) || 0;
      return sum + n;
    }, 0);
    if (typeof onBatchesChange === "function" && ingredient && ingredient.id != null) {
      onBatchesChange(ingredient.id, total);
    }
  };

  useEffect(() => {
    if (!open || !ingredient) return;
    let mounted = true;
    setLoading(true);

    const load = async () => {
      try {
        let res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/batches/?ingredient=${ingredient.id}`);
        if (!res.ok) {
          res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/ingredients/${ingredient.id}/batches/`);
        }
        const data = res.ok ? await res.json() : [];
        const rawArr = Array.isArray(data) ? data : data.results || [];
        const filtered = rawArr.filter((b) => {
          const bid = getIngredientIdFromBatch(b);
          if (bid == null) return true;
          return Number(bid) === Number(ingredient.id);
        });

        filtered.sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date) - new Date(b.expiry_date);
        });

        if (!mounted) return;
        setBatches(filtered);
        computeAndNotify(filtered);

        const init = {};
        filtered.forEach(bt => {
          init[bt.id] = {
            quantity: bt.current_quantity ?? bt.quantity_received ?? "",
            expiry: bt.expiry_date ?? "",
            loading: false,
            error: ""
          };
        });
        setEdits(init);
      } catch (err) {
        console.error("Failed to load batches", err);
        if (!mounted) return;
        setBatches([]);
        setEdits({});
        computeAndNotify([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [open, ingredient]);

  const handleChange = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [field]: value, error: "" } }));
  };

  const saveBatch = async (batch) => {
    const id = batch.id;
    const e = edits[id];
    if (!e) return;
    const qtyRaw = String(e.quantity ?? "");
    const qty = qtyRaw === "" ? null : Number(qtyRaw);
    const expiry = e.expiry || null;

    const unchanged = ((qty === null || qty === (batch.current_quantity ?? batch.quantity_received ?? null)) && (expiry === (batch.expiry_date ?? null)));
    if (unchanged) return;

    setEdits(prev => ({ ...prev, [id]: { ...(prev[id]||{}), loading: true, error: "" } }));
    try {
      const body = {};
      if (qty !== null) body.current_quantity = qty;
      if (expiry !== null) body.expiry_date = expiry;

      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/batches/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let errorMsg = "Save failed";
        try {
          const data = await res.json();
          if (data.current_quantity) {
            // Show the quantity ordered in the error message
            errorMsg = `Current quantity cannot exceed quantity ordered (${batch.quantity_received})`;
          } else if (typeof data.detail === "string") {
            errorMsg = data.detail;
          }
        } catch {
          // fallback to default errorMsg
        }
        setEdits(prev => ({ ...prev, [id]: { ...(prev[id]||{}), loading: false, error: errorMsg } }));
        return;
      }
      const updated = await res.json();

      const updatedIngredientId = getIngredientIdFromBatch(updated);
      if (updatedIngredientId != null && Number(updatedIngredientId) !== Number(ingredient.id)) {
        console.warn("Received update for batch that does not belong to current ingredient. Ignoring in modal list.");
      }

      setBatches(prev => {
        const replaced = prev.map(b => (b.id === id ? { ...b, ...updated } : b));
        replaced.sort((a,b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date) - new Date(b.expiry_date);
        });
        computeAndNotify(replaced);
        return replaced;
      });

      setEdits(prev => ({ ...prev, [id]: { quantity: updated.current_quantity ?? updated.quantity_received ?? "", expiry: updated.expiry_date ?? "", loading: false, error: "" } }));
    } catch (err) {
      console.error("Save batch failed", err);
      setEdits(prev => ({ ...prev, [id]: { ...(prev[id]||{}), loading: false, error: "Save failed" } }));
    }
  };

  // New batch form handlers
  const handleNewBatchChange = (field, value) => {
    setNewBatch(prev => ({ ...prev, [field]: value, error: "" }));
  };

  const saveNewBatch = async () => {
    if (!ingredient || !ingredient.id) return;
    const qty = Number(newBatch.quantity);
    if (!qty || qty <= 0) {
      setNewBatch(prev => ({ ...prev, error: "Enter a valid quantity" }));
      return;
    }
    setNewBatch(prev => ({ ...prev, loading: true, error: "" }));
    try {
      const body = {
        ingredient: ingredient.id,
        quantity_received: qty,
        current_quantity: qty,
        expiry_date: newBatch.expiry || null,
        received_date: new Date().toISOString().slice(0, 10),
        supplier_batch_code: "Manual Entry",
      };
      const res = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/batches/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const created = await res.json();
      setBatches(prev => {
        const updated = [created, ...prev];
        updated.sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date) - new Date(b.expiry_date);
        });
        computeAndNotify(updated);
        return updated;
      });
      setNewBatch({ quantity: "", expiry: "", loading: false, error: "" });
    } catch (err) {
      setNewBatch(prev => ({ ...prev, loading: false, error: "Failed to add batch" }));
      alert("Failed to add batch. See inline error.");
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { colorClass: "bg-gray-300", label: "No expiry" };
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const exp = new Date(expiryDate);
    const diffMs = exp.setHours(0,0,0,0) - startToday.setHours(0,0,0,0);
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return { colorClass: "bg-red-500", label: `Expired (${Math.abs(days)}d ago)` };
    if (days <= 7) return { colorClass: "bg-yellow-400", label: `Expires in ${days}d` };
    return { colorClass: "bg-green-400", label: `Expires in ${days}d` };
  };

  if (!open || !ingredient) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{ingredient.name} — Batches</h3>
            <p className="text-sm text-gray-600">Sorted by closest expiry</p>
          </div>
          <div>
            <button onClick={onClose} className="px-3 py-1 rounded border text-sm">Close</button>
          </div>
        </div>

        {/* New Batch Form */}
        <div className="p-4 border-b mb-2">
          <h4 className="text-md font-semibold mb-2">Add New Batch</h4>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newBatch.quantity}
                onChange={e => handleNewBatchChange("quantity", e.target.value)}
                disabled={newBatch.loading}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="e.g. 20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Expiry</label>
              <input
                type="date"
                value={newBatch.expiry}
                onChange={e => handleNewBatchChange("expiry", e.target.value)}
                disabled={newBatch.loading}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {newBatch.error && <div className="text-xs text-red-600 mr-auto">{newBatch.error}</div>}
            <button
              onClick={saveNewBatch}
              disabled={newBatch.loading}
              className={`px-3 py-1 rounded text-sm text-white ${newBatch.loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#f08b51] hover:bg-[#d9734a]"}`}
            >
              {newBatch.loading ? "Saving…" : "Add Batch"}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-sm text-gray-500">Loading batches…</div>
          ) : batches.length === 0 ? (
            <div className="text-sm text-gray-500">No batches found for this ingredient.</div>
          ) : (
            batches.map(batch => {
              const e = edits[batch.id] || { quantity: batch.current_quantity ?? batch.quantity_received ?? "", expiry: batch.expiry_date ?? "", loading: false, error: "" };
              const expiryInfo = getExpiryStatus(batch.expiry_date);
              return (
                <div key={batch.id} className="border rounded p-3 bg-white flex items-start gap-3">
                  <div title={expiryInfo.label} className={`w-3 h-3 rounded-full mt-1 ${expiryInfo.colorClass}`} />

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{batch.supplier_batch_code || batch.batch_number || `Batch #${batch.id}`}</div>
                        <div className="text-xs text-gray-500">Received: {batch.received_date ? new Date(batch.received_date).toLocaleDateString() : (batch.created_at ? new Date(batch.created_at).toLocaleDateString() : "—")}</div>
                      </div>
                      <div className="text-xs text-gray-500">{batch.is_active === false ? "Inactive" : ""}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                        <input type="number" step="0.01" min="0" value={e.quantity ?? ""} onChange={(ev) => handleChange(batch.id, "quantity", ev.target.value)} disabled={e.loading} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Expiry</label>
                        <input type="date" value={e.expiry ?? ""} onChange={(ev) => handleChange(batch.id, "expiry", ev.target.value)} disabled={e.loading} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-3">
                      {e.error && <div className="text-xs text-red-600 mr-auto">{e.error}</div>}
                      <button onClick={() => saveBatch(batch)} disabled={e.loading} className={`px-3 py-1 rounded text-sm text-white ${e.loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#f08b51] hover:bg-[#d9734a]"}`}>
                        {e.loading ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchModal;