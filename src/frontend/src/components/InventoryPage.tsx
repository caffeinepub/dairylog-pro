import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  AlertTriangle,
  Download,
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { backendInterface as BackendInterface } from "../backend";
import { useActor } from "../hooks/useActor";

interface InventoryItem {
  id: bigint;
  name: string;
  category: string;
  unit: string;
  lowStockThreshold: number;
  notes: string;
}
interface PurchaseRecord {
  id: bigint;
  itemId: bigint;
  date: string;
  quantity: number;
  price: number;
  supplierName: string;
  notes: string;
}
interface UsageRecord {
  id: bigint;
  itemId: bigint;
  date: string;
  quantity: number;
  purpose: string;
  notes: string;
}
type ExtendedActor = BackendInterface;

const CATEGORIES = [
  "Jaggery",
  "Feed",
  "Medicine",
  "Supplement",
  "Mineral",
  "Other",
] as const;
const UNITS = [
  "kg",
  "grams",
  "litres",
  "packets",
  "bags",
  "pieces",
  "quintal",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Jaggery: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Feed: "bg-green-100 text-green-800 border-green-200",
  Medicine: "bg-red-100 text-red-800 border-red-200",
  Supplement: "bg-blue-100 text-blue-800 border-blue-200",
  Mineral: "bg-purple-100 text-purple-800 border-purple-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

interface StockInfo {
  totalPurchased: number;
  totalUsed: number;
  stockLeft: number;
  isLowStock: boolean;
  lastPurchaseDate: string;
  totalValue: number;
}

function computeStock(
  item: InventoryItem,
  purchases: PurchaseRecord[],
  usages: UsageRecord[],
): StockInfo {
  const itemPurchases = purchases.filter(
    (p) => Number(p.itemId) === Number(item.id),
  );
  const itemUsages = usages.filter((u) => Number(u.itemId) === Number(item.id));
  const totalPurchased = itemPurchases.reduce((s, p) => s + p.quantity, 0);
  const totalUsed = itemUsages.reduce((s, u) => s + u.quantity, 0);
  const stockLeft = totalPurchased - totalUsed;
  const isLowStock =
    item.lowStockThreshold > 0 && stockLeft < item.lowStockThreshold;
  const dates = itemPurchases
    .map((p) => p.date)
    .sort()
    .reverse();
  const lastPurchaseDate = dates[0] ?? "";
  const totalValue = itemPurchases.reduce((s, p) => s + p.price, 0);
  return {
    totalPurchased,
    totalUsed,
    stockLeft,
    isLowStock,
    lastPurchaseDate,
    totalValue,
  };
}

// ─── Forms ─────────────────────────────────────────────────────────────────

interface ItemFormData {
  name: string;
  category: string;
  unit: string;
  lowStockThreshold: string;
  notes: string;
}

interface PurchaseFormData {
  itemId: string;
  date: string;
  quantity: string;
  price: string;
  supplierName: string;
  notes: string;
}

interface UsageFormData {
  itemId: string;
  date: string;
  quantity: string;
  purpose: string;
  notes: string;
}

const emptyItemForm = (): ItemFormData => ({
  name: "",
  category: "Feed",
  unit: "kg",
  lowStockThreshold: "0",
  notes: "",
});
const emptyPurchaseForm = (itemId = ""): PurchaseFormData => ({
  itemId,
  date: new Date().toISOString().slice(0, 10),
  quantity: "",
  price: "",
  supplierName: "",
  notes: "",
});
const emptyUsageForm = (itemId = ""): UsageFormData => ({
  itemId,
  date: new Date().toISOString().slice(0, 10),
  quantity: "",
  purpose: "",
  notes: "",
});

// ─── Component ─────────────────────────────────────────────────────────────

export function InventoryPage({ isAdmin }: { isAdmin: boolean }) {
  const { actor: _actor } = useActor();
  const actor = _actor as ExtendedActor | null;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [usages, setUsages] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search / filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    editing: InventoryItem | null;
  }>({
    open: false,
    editing: null,
  });
  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    editing: PurchaseRecord | null;
    preselectedItemId: string;
  }>({ open: false, editing: null, preselectedItemId: "" });
  const [usageModal, setUsageModal] = useState<{
    open: boolean;
    editing: UsageRecord | null;
    preselectedItemId: string;
  }>({ open: false, editing: null, preselectedItemId: "" });
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Form state
  const [itemForm, setItemForm] = useState<ItemFormData>(emptyItemForm());
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormData>(
    emptyPurchaseForm(),
  );
  const [usageForm, setUsageForm] = useState<UsageFormData>(emptyUsageForm());
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [i, p, u] = await Promise.all([
        actor.getInventoryItems(),
        actor.getPurchaseRecords(),
        actor.getUsageRecords(),
      ]);
      setItems(i);
      setPurchases(p);
      setUsages(u);
    } catch {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Derived data ───────────────────────────────────────────────────────

  const stockMap = useMemo(() => {
    const m = new Map<number, StockInfo>();
    for (const item of items) {
      m.set(Number(item.id), computeStock(item, purchases, usages));
    }
    return m;
  }, [items, purchases, usages]);

  const summaryCards = useMemo(() => {
    const totalItems = items.length;
    const totalValue = [...stockMap.values()].reduce(
      (s, v) => s + v.totalValue,
      0,
    );
    const lowStockCount = [...stockMap.values()].filter(
      (v) => v.isLowStock,
    ).length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentItemIds = new Set(
      usages
        .filter((u) => new Date(u.date) >= sevenDaysAgo)
        .map((u) => Number(u.itemId)),
    );
    return {
      totalItems,
      totalValue,
      lowStockCount,
      recentlyUsed: recentItemIds.size,
    };
  }, [items, stockMap, usages]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter)
        return false;
      if (lowStockOnly && !stockMap.get(Number(item.id))?.isLowStock)
        return false;
      return true;
    });
  }, [items, search, categoryFilter, lowStockOnly, stockMap]);

  // ── CSV Export ────────────────────────────────────────────────────────

  function exportCSV() {
    const rows = [
      [
        "Item Name",
        "Category",
        "Unit",
        "Total Purchased",
        "Total Used",
        "Stock Left",
        "Total Value",
      ],
      ...items.map((item) => {
        const s = stockMap.get(Number(item.id))!;
        return [
          item.name,
          item.category,
          item.unit,
          s.totalPurchased,
          s.totalUsed,
          s.stockLeft,
          s.totalValue,
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported inventory as CSV");
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────

  function openAddItem() {
    setItemForm(emptyItemForm());
    setItemModal({ open: true, editing: null });
  }

  function openEditItem(item: InventoryItem) {
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      lowStockThreshold: String(item.lowStockThreshold),
      notes: item.notes,
    });
    setItemModal({ open: true, editing: item });
  }

  async function saveItem() {
    if (!actor || !itemForm.name.trim()) return;
    setSaving(true);
    try {
      if (itemModal.editing) {
        await actor.updateInventoryItem(
          itemModal.editing.id,
          itemForm.name.trim(),
          itemForm.category,
          itemForm.unit,
          Number(itemForm.lowStockThreshold) || 0,
          itemForm.notes,
        );
        toast.success("Item updated");
      } else {
        await actor.addInventoryItem(
          itemForm.name.trim(),
          itemForm.category,
          itemForm.unit,
          Number(itemForm.lowStockThreshold) || 0,
          itemForm.notes,
        );
        toast.success("Item added");
      }
      setItemModal({ open: false, editing: null });
      await loadAll();
    } catch {
      toast.error("Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: InventoryItem) {
    if (!actor) return;
    if (!confirm(`Delete "${item.name}" and all its records?`)) return;
    try {
      await actor.deleteInventoryItem(item.id);
      toast.success("Item deleted");
      if (detailItem && Number(detailItem.id) === Number(item.id))
        setDetailItem(null);
      await loadAll();
    } catch {
      toast.error("Failed to delete item");
    }
  }

  // ── Purchase CRUD ─────────────────────────────────────────────────────

  function openAddPurchase(itemId = "") {
    setPurchaseForm(emptyPurchaseForm(itemId));
    setPurchaseModal({ open: true, editing: null, preselectedItemId: itemId });
  }

  function openEditPurchase(rec: PurchaseRecord) {
    setPurchaseForm({
      itemId: String(Number(rec.itemId)),
      date: rec.date,
      quantity: String(rec.quantity),
      price: String(rec.price),
      supplierName: rec.supplierName,
      notes: rec.notes,
    });
    setPurchaseModal({
      open: true,
      editing: rec,
      preselectedItemId: String(Number(rec.itemId)),
    });
  }

  async function savePurchase() {
    if (!actor || !purchaseForm.itemId || !purchaseForm.quantity) return;
    setSaving(true);
    try {
      if (purchaseModal.editing) {
        await actor.updatePurchaseRecord(
          purchaseModal.editing.id,
          BigInt(purchaseForm.itemId),
          purchaseForm.date,
          Number(purchaseForm.quantity),
          Number(purchaseForm.price) || 0,
          purchaseForm.supplierName,
          purchaseForm.notes,
        );
        toast.success("Purchase record updated");
      } else {
        await actor.addPurchaseRecord(
          BigInt(purchaseForm.itemId),
          purchaseForm.date,
          Number(purchaseForm.quantity),
          Number(purchaseForm.price) || 0,
          purchaseForm.supplierName,
          purchaseForm.notes,
        );
        toast.success("Purchase record added");
      }
      setPurchaseModal({ open: false, editing: null, preselectedItemId: "" });
      await loadAll();
    } catch {
      toast.error("Failed to save purchase record");
    } finally {
      setSaving(false);
    }
  }

  async function deletePurchase(rec: PurchaseRecord) {
    if (!actor) return;
    if (!confirm("Delete this purchase record?")) return;
    try {
      await actor.deletePurchaseRecord(rec.id);
      toast.success("Purchase record deleted");
      await loadAll();
    } catch {
      toast.error("Failed to delete");
    }
  }

  // ── Usage CRUD ────────────────────────────────────────────────────────

  function openAddUsage(itemId = "") {
    setUsageForm(emptyUsageForm(itemId));
    setUsageModal({ open: true, editing: null, preselectedItemId: itemId });
  }

  function openEditUsage(rec: UsageRecord) {
    setUsageForm({
      itemId: String(Number(rec.itemId)),
      date: rec.date,
      quantity: String(rec.quantity),
      purpose: rec.purpose,
      notes: rec.notes,
    });
    setUsageModal({
      open: true,
      editing: rec,
      preselectedItemId: String(Number(rec.itemId)),
    });
  }

  async function saveUsage() {
    if (!actor || !usageForm.itemId || !usageForm.quantity) return;
    setSaving(true);
    try {
      if (usageModal.editing) {
        await actor.updateUsageRecord(
          usageModal.editing.id,
          BigInt(usageForm.itemId),
          usageForm.date,
          Number(usageForm.quantity),
          usageForm.purpose,
          usageForm.notes,
        );
        toast.success("Usage record updated");
      } else {
        await actor.addUsageRecord(
          BigInt(usageForm.itemId),
          usageForm.date,
          Number(usageForm.quantity),
          usageForm.purpose,
          usageForm.notes,
        );
        toast.success("Usage record added");
      }
      setUsageModal({ open: false, editing: null, preselectedItemId: "" });
      await loadAll();
    } catch {
      toast.error("Failed to save usage record");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUsage(rec: UsageRecord) {
    if (!actor) return;
    if (!confirm("Delete this usage record?")) return;
    try {
      await actor.deleteUsageRecord(rec.id);
      toast.success("Usage record deleted");
      await loadAll();
    } catch {
      toast.error("Failed to delete");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track stock items for your dairy farm
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            data-ocid="inventory.export.button"
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-gray-600 border-gray-300"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {isAdmin && (
            <Button
              data-ocid="inventory.add_item.button"
              size="sm"
              onClick={openAddItem}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={`skel-card-${i}`} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Package className="h-5 w-5 text-green-600" />}
            label="Total Items"
            value={summaryCards.totalItems}
            bg="bg-green-50"
          />
          <SummaryCard
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
            label="Total Stock Value"
            value={formatCurrency(summaryCards.totalValue)}
            bg="bg-blue-50"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            label="Low Stock Items"
            value={summaryCards.lowStockCount}
            bg="bg-red-50"
            alert={summaryCards.lowStockCount > 0}
          />
          <SummaryCard
            icon={<Activity className="h-5 w-5 text-orange-500" />}
            label="Recently Used"
            value={`${summaryCards.recentlyUsed} items`}
            bg="bg-orange-50"
          />
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {!loading && summaryCards.lowStockCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 text-sm">
              ⚠️ {summaryCards.lowStockCount} item
              {summaryCards.lowStockCount > 1 ? "s are" : " is"} running low on
              stock!
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {items
                .filter((item) => stockMap.get(Number(item.id))?.isLowStock)
                .map((item) => item.name)
                .join(", ")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100 text-xs"
            onClick={() => setLowStockOnly(true)}
          >
            View Low Stock
          </Button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            data-ocid="inventory.search_input"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger
            data-ocid="inventory.category.select"
            className="h-9 w-36"
          >
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          data-ocid="inventory.low_stock.toggle"
          onClick={() => setLowStockOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm font-medium transition-colors ${
            lowStockOnly
              ? "bg-red-50 border-red-300 text-red-700"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock
        </button>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={`skel-row-${i}`} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          data-ocid="inventory.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Package className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No inventory items found</p>
          <p className="text-sm text-gray-400 mt-1">
            {items.length === 0
              ? "Add your first item to get started"
              : "Try adjusting your filters"}
          </p>
          {items.length === 0 && isAdmin && (
            <Button
              size="sm"
              onClick={openAddItem}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-ocid="inventory.table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">
                    Unit
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Purchased
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Used
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Stock Left
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 no-print">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item, idx) => {
                  const s = stockMap.get(Number(item.id))!;
                  return (
                    <tr
                      key={Number(item.id)}
                      data-ocid={`inventory.item.${idx + 1}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 sm:hidden">
                          {item.category} · {item.unit}
                        </div>
                        {s.isLowStock && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            CATEGORY_COLORS[item.category] ??
                            CATEGORY_COLORS.Other
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {s.totalPurchased} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {s.totalUsed} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={
                            s.isLowStock ? "text-red-600" : "text-green-700"
                          }
                        >
                          {s.stockLeft} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 no-print">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            data-ocid={`inventory.view.button.${idx + 1}`}
                            title="View Details"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                data-ocid={`inventory.add_purchase.button.${idx + 1}`}
                                title="Add Purchase"
                                onClick={() =>
                                  openAddPurchase(String(Number(item.id)))
                                }
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-500 hover:text-blue-700"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                data-ocid={`inventory.add_usage.button.${idx + 1}`}
                                title="Add Usage"
                                onClick={() =>
                                  openAddUsage(String(Number(item.id)))
                                }
                                className="p-1.5 rounded-md hover:bg-orange-50 text-orange-500 hover:text-orange-700"
                              >
                                <TrendingDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                data-ocid={`inventory.edit_button.${idx + 1}`}
                                title="Edit Item"
                                onClick={() => openEditItem(item)}
                                className="p-1.5 rounded-md hover:bg-green-50 text-green-600 hover:text-green-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                data-ocid={`inventory.delete_button.${idx + 1}`}
                                title="Delete Item"
                                onClick={() => deleteItem(item)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Item Modal ─────────────────────────────────── */}
      <Dialog
        open={itemModal.open}
        onOpenChange={(o) => !o && setItemModal({ open: false, editing: null })}
      >
        <DialogContent data-ocid="inventory.item.dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {itemModal.editing ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input
                data-ocid="inventory.item_name.input"
                placeholder="e.g. Jaggery, Maize Feed"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(v) =>
                    setItemForm((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger data-ocid="inventory.item_category.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, unit: v }))}
                >
                  <SelectTrigger data-ocid="inventory.item_unit.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Low Stock Threshold</Label>
              <Input
                data-ocid="inventory.low_stock_threshold.input"
                type="number"
                placeholder="0 = no alert"
                value={itemForm.lowStockThreshold}
                onChange={(e) =>
                  setItemForm((f) => ({
                    ...f,
                    lowStockThreshold: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-gray-400">
                Alert shows when stock falls below this amount
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                data-ocid="inventory.item_notes.textarea"
                placeholder="Any notes..."
                value={itemForm.notes}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemModal({ open: false, editing: null })}
              data-ocid="inventory.item_cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveItem}
              disabled={saving || !itemForm.name.trim()}
              data-ocid="inventory.item_save.button"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? "Saving..." : itemModal.editing ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Purchase Modal ─────────────────────────────── */}
      <Dialog
        open={purchaseModal.open}
        onOpenChange={(o) =>
          !o &&
          setPurchaseModal({
            open: false,
            editing: null,
            preselectedItemId: "",
          })
        }
      >
        <DialogContent
          data-ocid="inventory.purchase.dialog"
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {purchaseModal.editing
                ? "Edit Purchase Record"
                : "Add Purchase Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Item *</Label>
              <Select
                value={purchaseForm.itemId}
                onValueChange={(v) =>
                  setPurchaseForm((f) => ({ ...f, itemId: v }))
                }
              >
                <SelectTrigger data-ocid="inventory.purchase_item.select">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem
                      key={Number(item.id)}
                      value={String(Number(item.id))}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Purchase Date *</Label>
                <Input
                  data-ocid="inventory.purchase_date.input"
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  data-ocid="inventory.purchase_quantity.input"
                  type="number"
                  placeholder="0"
                  value={purchaseForm.quantity}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Purchase Price (₹)</Label>
                <Input
                  data-ocid="inventory.purchase_price.input"
                  type="number"
                  placeholder="0"
                  value={purchaseForm.price}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Supplier (optional)</Label>
                <Input
                  data-ocid="inventory.purchase_supplier.input"
                  placeholder="Supplier name"
                  value={purchaseForm.supplierName}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({
                      ...f,
                      supplierName: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                data-ocid="inventory.purchase_notes.textarea"
                placeholder="Any notes..."
                value={purchaseForm.notes}
                onChange={(e) =>
                  setPurchaseForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPurchaseModal({
                  open: false,
                  editing: null,
                  preselectedItemId: "",
                })
              }
              data-ocid="inventory.purchase_cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={savePurchase}
              disabled={
                saving || !purchaseForm.itemId || !purchaseForm.quantity
              }
              data-ocid="inventory.purchase_save.button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving
                ? "Saving..."
                : purchaseModal.editing
                  ? "Update"
                  : "Add Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Usage Modal ────────────────────────────────── */}
      <Dialog
        open={usageModal.open}
        onOpenChange={(o) =>
          !o &&
          setUsageModal({ open: false, editing: null, preselectedItemId: "" })
        }
      >
        <DialogContent data-ocid="inventory.usage.dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {usageModal.editing ? "Edit Usage Record" : "Add Usage Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Item *</Label>
              <Select
                value={usageForm.itemId}
                onValueChange={(v) =>
                  setUsageForm((f) => ({ ...f, itemId: v }))
                }
              >
                <SelectTrigger data-ocid="inventory.usage_item.select">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem
                      key={Number(item.id)}
                      value={String(Number(item.id))}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Usage Date *</Label>
                <Input
                  data-ocid="inventory.usage_date.input"
                  type="date"
                  value={usageForm.date}
                  onChange={(e) =>
                    setUsageForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity Used *</Label>
                <Input
                  data-ocid="inventory.usage_quantity.input"
                  type="number"
                  placeholder="0"
                  value={usageForm.quantity}
                  onChange={(e) =>
                    setUsageForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Given To / Purpose *</Label>
              <Input
                data-ocid="inventory.usage_purpose.input"
                placeholder="e.g. cattle, calves, sick cow, mixed in feed"
                value={usageForm.purpose}
                onChange={(e) =>
                  setUsageForm((f) => ({ ...f, purpose: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                data-ocid="inventory.usage_notes.textarea"
                placeholder="Any notes..."
                value={usageForm.notes}
                onChange={(e) =>
                  setUsageForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setUsageModal({
                  open: false,
                  editing: null,
                  preselectedItemId: "",
                })
              }
              data-ocid="inventory.usage_cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveUsage}
              disabled={saving || !usageForm.itemId || !usageForm.quantity}
              data-ocid="inventory.usage_save.button"
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving
                ? "Saving..."
                : usageModal.editing
                  ? "Update"
                  : "Add Usage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Item Detail Dialog ────────────────────────────────────── */}
      {detailItem && (
        <ItemDetailDialog
          item={detailItem}
          purchases={purchases.filter(
            (p) => Number(p.itemId) === Number(detailItem.id),
          )}
          usages={usages.filter(
            (u) => Number(u.itemId) === Number(detailItem.id),
          )}
          stock={stockMap.get(Number(detailItem.id))!}
          isAdmin={isAdmin}
          onClose={() => setDetailItem(null)}
          onEditPurchase={openEditPurchase}
          onDeletePurchase={deletePurchase}
          onEditUsage={openEditUsage}
          onDeleteUsage={deleteUsage}
          onAddPurchase={() => openAddPurchase(String(Number(detailItem.id)))}
          onAddUsage={() => openAddUsage(String(Number(detailItem.id)))}
        />
      )}
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  bg,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`${bg} rounded-xl p-4 border ${
        alert ? "border-red-200" : "border-transparent"
      } shadow-sm`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div
        className={`text-xl font-bold ${alert ? "text-red-600" : "text-gray-800"}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Item Detail Dialog ────────────────────────────────────────────────────────

function ItemDetailDialog({
  item,
  purchases,
  usages,
  stock,
  isAdmin,
  onClose,
  onEditPurchase,
  onDeletePurchase,
  onEditUsage,
  onDeleteUsage,
  onAddPurchase,
  onAddUsage,
}: {
  item: InventoryItem;
  purchases: PurchaseRecord[];
  usages: UsageRecord[];
  stock: StockInfo;
  isAdmin: boolean;
  onClose: () => void;
  onEditPurchase: (r: PurchaseRecord) => void;
  onDeletePurchase: (r: PurchaseRecord) => void;
  onEditUsage: (r: UsageRecord) => void;
  onDeleteUsage: (r: UsageRecord) => void;
  onAddPurchase: () => void;
  onAddUsage: () => void;
}) {
  const timeline = useMemo(() => {
    const events: Array<{
      date: string;
      type: "purchase" | "usage";
      quantity: number;
      detail: string;
    }> = [
      ...purchases.map((p) => ({
        date: p.date,
        type: "purchase" as const,
        quantity: p.quantity,
        detail: p.supplierName ? `from ${p.supplierName}` : "",
      })),
      ...usages.map((u) => ({
        date: u.date,
        type: "usage" as const,
        quantity: u.quantity,
        detail: u.purpose,
      })),
    ];
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, usages]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="inventory.detail.dialog"
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other
              }`}
            >
              {item.category}
            </span>
            {item.name}
          </DialogTitle>
        </DialogHeader>

        {/* Stock Summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">
              {stock.stockLeft} {item.unit}
            </div>
            <div className="text-xs text-gray-500">Stock Left</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">
              {stock.totalPurchased} {item.unit}
            </div>
            <div className="text-xs text-gray-500">Total Purchased</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-700">
              {formatCurrency(stock.totalValue)}
            </div>
            <div className="text-xs text-gray-500">Total Spent</div>
          </div>
        </div>

        {stock.isLowStock && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Low stock warning — below threshold of {item.lowStockThreshold}{" "}
            {item.unit}
          </div>
        )}

        <Tabs
          defaultValue="purchases"
          className="flex-1 overflow-hidden flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-3 w-full shrink-0">
            <TabsTrigger
              value="purchases"
              data-ocid="inventory.detail.purchases.tab"
            >
              Purchases ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="usages" data-ocid="inventory.detail.usages.tab">
              Usages ({usages.length})
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              data-ocid="inventory.detail.timeline.tab"
            >
              Timeline
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 mt-2">
            <TabsContent value="purchases" className="mt-0">
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={onAddPurchase}
                  data-ocid="inventory.detail.add_purchase.button"
                  className="mb-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Purchase
                </Button>
              )}
              {purchases.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  No purchase records yet
                </p>
              ) : (
                <div className="space-y-2">
                  {purchases
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((p) => (
                      <div
                        key={Number(p.id)}
                        className="flex items-start justify-between bg-blue-50 border border-blue-100 rounded-lg p-3"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {p.quantity} {item.unit} — {formatCurrency(p.price)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatDate(p.date)}
                            {p.supplierName ? ` · ${p.supplierName}` : ""}
                          </div>
                          {p.notes && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {p.notes}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => onEditPurchase(p)}
                              className="p-1 rounded hover:bg-blue-100 text-blue-500"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePurchase(p)}
                              className="p-1 rounded hover:bg-red-50 text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="usages" className="mt-0">
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={onAddUsage}
                  data-ocid="inventory.detail.add_usage.button"
                  className="mb-3 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Usage
                </Button>
              )}
              {usages.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  No usage records yet
                </p>
              ) : (
                <div className="space-y-2">
                  {usages
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((u) => (
                      <div
                        key={Number(u.id)}
                        className="flex items-start justify-between bg-orange-50 border border-orange-100 rounded-lg p-3"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {u.quantity} {item.unit}
                            {u.purpose ? ` → ${u.purpose}` : ""}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatDate(u.date)}
                          </div>
                          {u.notes && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {u.notes}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => onEditUsage(u)}
                              className="p-1 rounded hover:bg-orange-100 text-orange-500"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteUsage(u)}
                              className="p-1 rounded hover:bg-red-50 text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              {timeline.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  No activity yet
                </p>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-3">
                    {timeline.map((event, idx) => (
                      <div
                        key={`${event.date}-${event.type}-${String(idx)}`}
                        className="relative flex items-start gap-3"
                      >
                        <div
                          className={`absolute -left-4 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center ${
                            event.type === "purchase"
                              ? "bg-blue-400"
                              : "bg-orange-400"
                          }`}
                        >
                          {event.type === "purchase" ? (
                            <ShoppingCart className="h-2 w-2 text-white" />
                          ) : (
                            <TrendingDown className="h-2 w-2 text-white" />
                          )}
                        </div>
                        <div className="bg-white border border-gray-100 rounded-lg p-2.5 flex-1 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800 text-sm">
                              {event.type === "purchase" ? "Purchased" : "Used"}{" "}
                              {event.quantity} {item.unit}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(event.date)}
                            </span>
                          </div>
                          {event.detail && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {event.type === "purchase" ? "from" : "for"}{" "}
                              {event.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="inventory.detail.close.button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
