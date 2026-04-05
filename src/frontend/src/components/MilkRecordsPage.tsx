import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAddBuyerAdvancePayment,
  useAddMilkRecord,
  useDeleteBuyerAdvancePayment,
  useDeleteMilkRecord,
  useGetBuyerAdvancePayments,
  useGetMilkRecords,
  useUpdateBuyerAdvancePayment,
  useUpdateMilkRecord,
} from "@/hooks/useQueries";
import { currentMonthKey, groupByMonth } from "@/utils/groupByMonth";
import {
  Droplets,
  FolderOpen,
  HandCoins,
  IndianRupee,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Printer,
  Sun,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { BuyerAdvancePayment, MilkRecord } from "../backend.d";

const MILK_RATE = 56; // ₹56 per litre

const today = () => new Date().toISOString().split("T")[0];

interface FormData {
  date: string;
  morningQuantity: string;
  morningFat: string;
  morningAmount: string;
  eveningQuantity: string;
  eveningFat: string;
  eveningAmount: string;
}

const emptyForm = (): FormData => ({
  date: today(),
  morningQuantity: "",
  morningFat: "",
  morningAmount: "",
  eveningQuantity: "",
  eveningFat: "",
  eveningAmount: "",
});

interface BuyerAdvanceForm {
  date: string;
  amount: string;
  reason: string;
}

const emptyBuyerAdvanceForm = (): BuyerAdvanceForm => ({
  date: today(),
  amount: "",
  reason: "",
});

// Simple grouped bar chart for morning/evening milk
function MilkBarChart({ records }: { records: MilkRecord[] }) {
  // Take the last 14 days with data
  const sorted = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  if (sorted.length === 0) return null;

  const maxQty = Math.max(
    ...sorted.flatMap((r) => [
      Number(r.morningQuantity) || 0,
      Number(r.eveningQuantity) || 0,
    ]),
    1,
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6 no-print">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        Morning &amp; Evening Milk (Litres)
      </h3>
      <div
        className="flex items-end gap-2 overflow-x-auto pb-2"
        style={{ minHeight: 120 }}
      >
        {sorted.map((r) => {
          const morning = Number(r.morningQuantity) || 0;
          const evening = Number(r.eveningQuantity) || 0;
          const mHeight = Math.round((morning / maxQty) * 90);
          const eHeight = Math.round((evening / maxQty) * 90);
          const label = r.date.slice(5); // MM-DD
          return (
            <div
              key={r.date}
              className="flex flex-col items-center gap-1 flex-shrink-0"
              style={{ minWidth: 36 }}
            >
              <div className="flex items-end gap-0.5" style={{ height: 90 }}>
                <div
                  title={`Morning: ${morning}L`}
                  style={{
                    height: mHeight,
                    width: 12,
                    background: "#16a34a",
                    borderRadius: "3px 3px 0 0",
                  }}
                />
                <div
                  title={`Evening: ${evening}L`}
                  style={{
                    height: eHeight,
                    width: 12,
                    background: "#facc15",
                    borderRadius: "3px 3px 0 0",
                  }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 10,
              background: "#16a34a",
              borderRadius: 2,
            }}
          />
          Morning
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 10,
              background: "#facc15",
              borderRadius: 2,
            }}
          />
          Evening
        </span>
      </div>
    </div>
  );
}

export function MilkRecordsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: records = [], isLoading } = useGetMilkRecords();
  const addMutation = useAddMilkRecord();
  const updateMutation = useUpdateMilkRecord();
  const deleteMutation = useDeleteMilkRecord();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MilkRecord | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  // Buyer Advance Payments state
  const { data: buyerAdvances = [], isLoading: buyerAdvancesLoading } =
    useGetBuyerAdvancePayments();
  const addBuyerAdvanceMutation = useAddBuyerAdvancePayment();
  const updateBuyerAdvanceMutation = useUpdateBuyerAdvancePayment();
  const deleteBuyerAdvanceMutation = useDeleteBuyerAdvancePayment();

  const [buyerAdvanceDialogOpen, setBuyerAdvanceDialogOpen] = useState(false);
  const [editingBuyerAdvance, setEditingBuyerAdvance] =
    useState<BuyerAdvancePayment | null>(null);
  const [buyerAdvanceForm, setBuyerAdvanceForm] = useState<BuyerAdvanceForm>(
    emptyBuyerAdvanceForm(),
  );
  const [deleteBuyerAdvanceId, setDeleteBuyerAdvanceId] = useState<
    bigint | null
  >(null);

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const monthGroups = groupByMonth(records, (r) => r.date);
  const advanceMonthGroups = groupByMonth(buyerAdvances, (a) => a.date);
  const curMonthKey = currentMonthKey();

  const totalMorning = records.reduce((s, r) => s + r.morningQuantity, 0);
  const totalEvening = records.reduce((s, r) => s + r.eveningQuantity, 0);
  const totalDaily = totalMorning + totalEvening;
  const avgFat =
    records.length > 0
      ? records.reduce((s, r) => s + (r.morningFat + r.eveningFat) / 2, 0) /
        records.length
      : 0;
  const totalAmount = records.reduce(
    (s, r) => s + (r.morningAmount || 0) + (r.eveningAmount || 0),
    0,
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (record: MilkRecord) => {
    setEditing(record);
    setForm({
      date: record.date,
      morningQuantity: record.morningQuantity.toString(),
      morningFat: record.morningFat.toString(),
      morningAmount: (record.morningAmount || 0).toString(),
      eveningQuantity: record.eveningQuantity.toString(),
      eveningFat: record.eveningFat.toString(),
      eveningAmount: (record.eveningAmount || 0).toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const data = {
      date: form.date,
      morningQuantity: Number.parseFloat(form.morningQuantity),
      morningFat: Number.parseFloat(form.morningFat),
      morningAmount: Number.parseFloat(form.morningAmount),
      eveningQuantity: Number.parseFloat(form.eveningQuantity),
      eveningFat: Number.parseFloat(form.eveningFat),
      eveningAmount: Number.parseFloat(form.eveningAmount),
    };
    if (
      !data.date ||
      Number.isNaN(data.morningQuantity) ||
      Number.isNaN(data.morningFat) ||
      Number.isNaN(data.morningAmount) ||
      Number.isNaN(data.eveningQuantity) ||
      Number.isNaN(data.eveningFat) ||
      Number.isNaN(data.eveningAmount)
    ) {
      toast.error("Please fill all fields with valid values");
      return;
    }
    if (editing) {
      updateMutation.reset();
    } else {
      addMutation.reset();
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data });
        toast.success("Record updated successfully");
      } else {
        await addMutation.mutateAsync(data);
        toast.success("Record added successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Operation failed. Please try again.");
    }
  };

  const handleDelete = async () => {
    const id = deleteId;
    if (id === null) return;
    setDeleteId(null);
    deleteMutation.reset();
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  // Buyer Advance handlers
  const openAddBuyerAdvance = () => {
    setEditingBuyerAdvance(null);
    setBuyerAdvanceForm(emptyBuyerAdvanceForm());
    setBuyerAdvanceDialogOpen(true);
  };

  const openEditBuyerAdvance = (advance: BuyerAdvancePayment) => {
    setEditingBuyerAdvance(advance);
    setBuyerAdvanceForm({
      date: advance.date,
      amount: advance.amount.toString(),
      reason: advance.reason,
    });
    setBuyerAdvanceDialogOpen(true);
  };

  const handleBuyerAdvanceSubmit = async () => {
    const amount = Number.parseFloat(buyerAdvanceForm.amount);
    if (
      !buyerAdvanceForm.date ||
      Number.isNaN(amount) ||
      !buyerAdvanceForm.reason.trim()
    ) {
      toast.error("Please fill all fields with valid values");
      return;
    }
    if (editingBuyerAdvance) {
      updateBuyerAdvanceMutation.reset();
    } else {
      addBuyerAdvanceMutation.reset();
    }
    try {
      if (editingBuyerAdvance) {
        await updateBuyerAdvanceMutation.mutateAsync({
          id: editingBuyerAdvance.id,
          date: buyerAdvanceForm.date,
          amount,
          reason: buyerAdvanceForm.reason.trim(),
        });
        toast.success("Advance payment updated");
      } else {
        await addBuyerAdvanceMutation.mutateAsync({
          date: buyerAdvanceForm.date,
          amount,
          reason: buyerAdvanceForm.reason.trim(),
        });
        toast.success("Advance payment recorded");
      }
      setBuyerAdvanceDialogOpen(false);
    } catch {
      toast.error("Operation failed. Please try again.");
    }
  };

  const handleDeleteBuyerAdvance = async () => {
    const id = deleteBuyerAdvanceId;
    if (id === null) return;
    setDeleteBuyerAdvanceId(null);
    deleteBuyerAdvanceMutation.reset();
    try {
      await deleteBuyerAdvanceMutation.mutateAsync(id);
      toast.success("Advance payment deleted");
    } catch {
      toast.error("Failed to delete advance payment");
    }
  };

  const isBuyerAdvancePending =
    addBuyerAdvanceMutation.isPending || updateBuyerAdvanceMutation.isPending;

  const totalBuyerAdvances = buyerAdvances.reduce((s, a) => s + a.amount, 0);

  const sortedBuyerAdvances = [...buyerAdvances].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const summaryCards = [
    {
      label: "Total Morning",
      value: `${totalMorning.toFixed(1)} L`,
      icon: Sun,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Total Evening",
      value: `${totalEvening.toFixed(1)} L`,
      icon: Moon,
      color: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      label: "Total Daily",
      value: `${totalDaily.toFixed(1)} L`,
      icon: Droplets,
      color: "text-primary",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Avg Fat %",
      value: `${avgFat.toFixed(2)}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Total Amount",
      value: `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      label: "Buyer Advances",
      value: `₹${totalBuyerAdvances.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: HandCoins,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Daily Milk Bar Chart */}
      <MilkBarChart records={records} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 no-print">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-lg p-4 shadow-card border border-border ${card.bg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p
              className={`text-xl font-display font-bold ${card.color} truncate`}
            >
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-lg border border-border shadow-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">
            Daily Milk Records
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              data-ocid="milk.print_button"
              className="gap-1.5 no-print"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={openAdd}
                data-ocid="milk.add_button"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            data-ocid="milk.empty_state"
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <Droplets className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No milk records yet</p>
            <p className="text-sm mt-1">
              {isAdmin
                ? "Add your first daily record to get started"
                : "No records have been added yet"}
            </p>
            {isAdmin && (
              <Button onClick={openAdd} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-4 w-4" />
                Add First Record
              </Button>
            )}
          </div>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={[curMonthKey]}
            className="divide-y divide-border"
          >
            {monthGroups.map((group, groupIdx) => {
              const groupSorted = [...group.items].sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime(),
              );
              const totalL = group.items.reduce(
                (s, r) => s + r.morningQuantity + r.eveningQuantity,
                0,
              );
              const totalAmt = group.items.reduce(
                (s, r) => s + (r.morningAmount || 0) + (r.eveningAmount || 0),
                0,
              );
              return (
                <AccordionItem
                  key={group.monthKey}
                  value={group.monthKey}
                  data-ocid={`milk.month_group.${groupIdx + 1}`}
                  className="border-0"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-green-50/60 hover:no-underline rounded-none [&[data-state=open]]:bg-green-50/60">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderOpen className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="font-semibold text-foreground">
                        {group.label}
                      </span>
                      <span className="ml-auto mr-3 flex-shrink-0 text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 font-medium">
                        {group.items.length} day
                        {group.items.length !== 1 ? "s" : ""} ·{" "}
                        {totalL.toFixed(1)} L · ₹
                        {totalAmt.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="overflow-x-auto">
                      <Table data-ocid="milk.table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">
                              Morning (L)
                            </TableHead>
                            <TableHead className="text-right">
                              Morning Fat %
                            </TableHead>
                            <TableHead className="text-right">
                              Morning Amt (₹)
                            </TableHead>
                            <TableHead className="text-right">
                              Evening (L)
                            </TableHead>
                            <TableHead className="text-right">
                              Evening Fat %
                            </TableHead>
                            <TableHead className="text-right">
                              Evening Amt (₹)
                            </TableHead>
                            <TableHead className="text-right">
                              Total (L)
                            </TableHead>
                            <TableHead className="text-right">
                              Total Amt (₹)
                            </TableHead>
                            {isAdmin && (
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupSorted.map((record, idx) => (
                            <TableRow
                              key={record.id.toString()}
                              data-ocid={`milk.item.${idx + 1}`}
                              className="hover:bg-muted/40"
                            >
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Date(
                                  `${record.date}T00:00:00`,
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-amber-700 font-medium">
                                  {record.morningQuantity.toFixed(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {record.morningFat.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-amber-700 font-medium">
                                  ₹
                                  {(record.morningAmount || 0).toLocaleString(
                                    "en-IN",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-indigo-700 font-medium">
                                  {record.eveningQuantity.toFixed(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {record.eveningFat.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-indigo-700 font-medium">
                                  ₹
                                  {(record.eveningAmount || 0).toLocaleString(
                                    "en-IN",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-primary">
                                {(
                                  record.morningQuantity +
                                  record.eveningQuantity
                                ).toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-rose-600">
                                ₹
                                {(
                                  (record.morningAmount || 0) +
                                  (record.eveningAmount || 0)
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(record)}
                                      data-ocid={`milk.edit_button.${idx + 1}`}
                                      className="h-8 w-8"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteId(record.id)}
                                      data-ocid={`milk.delete_button.${idx + 1}`}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* ── Buyer Advance Payments Section ──────────────────────────────── */}
      <div className="bg-card rounded-lg border border-violet-200 dark:border-violet-800 shadow-card mt-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 rounded-t-lg">
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-violet-600" />
            <h2 className="font-display font-semibold text-foreground">
              Buyer Advance Payments
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              data-ocid="buyer_advance.print_button"
              className="gap-1.5 no-print"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={openAddBuyerAdvance}
                data-ocid="buyer_advance.add_button"
                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Add Advance
              </Button>
            )}
          </div>
        </div>

        {buyerAdvancesLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sortedBuyerAdvances.length === 0 ? (
          <div
            data-ocid="buyer_advance.empty_state"
            className="flex flex-col items-center justify-center py-14 text-muted-foreground"
          >
            <HandCoins className="h-12 w-12 mb-3 text-violet-300" />
            <p className="font-medium">No buyer advances recorded yet</p>
            <p className="text-sm mt-1">
              {isAdmin
                ? "Record advance payments received from buyers"
                : "No advances have been recorded yet"}
            </p>
            {isAdmin && (
              <Button
                onClick={openAddBuyerAdvance}
                className="mt-4 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add First Advance
              </Button>
            )}
          </div>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={[curMonthKey]}
            className="divide-y divide-violet-100"
          >
            {advanceMonthGroups.map((group, groupIdx) => {
              const groupSorted = [...group.items].sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime(),
              );
              const groupTotal = group.items.reduce((s, a) => s + a.amount, 0);
              return (
                <AccordionItem
                  key={group.monthKey}
                  value={group.monthKey}
                  data-ocid={`buyer_advance.month_group.${groupIdx + 1}`}
                  className="border-0"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-violet-50/60 hover:no-underline rounded-none [&[data-state=open]]:bg-violet-50/60">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderOpen className="h-4 w-4 text-violet-600 flex-shrink-0" />
                      <span className="font-semibold text-foreground">
                        {group.label}
                      </span>
                      <span className="ml-auto mr-3 flex-shrink-0 text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2.5 py-0.5 font-medium">
                        {group.items.length} advance
                        {group.items.length !== 1 ? "s" : ""} · ₹
                        {groupTotal.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="overflow-x-auto">
                      <Table data-ocid="buyer_advance.table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">
                              Amount (₹)
                            </TableHead>
                            <TableHead>Reason</TableHead>
                            {isAdmin && (
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupSorted.map((advance, idx) => (
                            <TableRow
                              key={advance.id.toString()}
                              data-ocid={`buyer_advance.item.${idx + 1}`}
                              className="hover:bg-violet-50/40 dark:hover:bg-violet-950/20"
                            >
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Date(
                                  `${advance.date}T00:00:00`,
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-violet-700 font-semibold">
                                  ₹
                                  {advance.amount.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {advance.reason}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        openEditBuyerAdvance(advance)
                                      }
                                      data-ocid={`buyer_advance.edit_button.${idx + 1}`}
                                      className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setDeleteBuyerAdvanceId(advance.id)
                                      }
                                      data-ocid={`buyer_advance.delete_button.${idx + 1}`}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Buyer Advance Add/Edit Dialog */}
      <Dialog
        open={buyerAdvanceDialogOpen}
        onOpenChange={setBuyerAdvanceDialogOpen}
      >
        <DialogContent
          data-ocid="buyer_advance.form.dialog"
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-violet-600" />
              {editingBuyerAdvance
                ? "Edit Advance Payment"
                : "Add Buyer Advance Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-4">
              <div>
                <Label htmlFor="buyer-advance-date">Date</Label>
                <Input
                  id="buyer-advance-date"
                  type="date"
                  value={buyerAdvanceForm.date}
                  onChange={(e) =>
                    setBuyerAdvanceForm((f) => ({
                      ...f,
                      date: e.target.value,
                    }))
                  }
                  className="mt-1"
                  data-ocid="buyer_advance.form.date.input"
                />
              </div>
              <div>
                <Label
                  htmlFor="buyer-advance-amount"
                  className="flex items-center gap-1"
                >
                  <IndianRupee className="h-3 w-3" /> Amount (₹)
                </Label>
                <Input
                  id="buyer-advance-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyerAdvanceForm.amount}
                  onChange={(e) =>
                    setBuyerAdvanceForm((f) => ({
                      ...f,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className="mt-1"
                  data-ocid="buyer_advance.form.amount.input"
                />
              </div>
              <div>
                <Label htmlFor="buyer-advance-reason">Reason</Label>
                <Input
                  id="buyer-advance-reason"
                  type="text"
                  value={buyerAdvanceForm.reason}
                  onChange={(e) =>
                    setBuyerAdvanceForm((f) => ({
                      ...f,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="e.g. Festival advance, Partial payment"
                  className="mt-1"
                  data-ocid="buyer_advance.form.reason.input"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBuyerAdvanceDialogOpen(false)}
              data-ocid="buyer_advance.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuyerAdvanceSubmit}
              disabled={isBuyerAdvancePending}
              data-ocid="buyer_advance.form.submit_button"
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isBuyerAdvancePending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingBuyerAdvance ? "Save Changes" : "Record Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buyer Advance Delete Confirmation */}
      <AlertDialog
        open={!!deleteBuyerAdvanceId}
        onOpenChange={(open) => {
          if (!open) setDeleteBuyerAdvanceId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The advance payment record will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleDeleteBuyerAdvance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="milk.form.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit Milk Record" : "Add Milk Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="milk-date">Date</Label>
              <Input
                id="milk-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            {/* Morning Section */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-sm">
                <Sun className="h-4 w-4" />
                Morning
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="morning-qty" className="text-xs">
                    Qty (L)
                  </Label>
                  <Input
                    id="morning-qty"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.morningQuantity}
                    onChange={(e) => {
                      const qty = e.target.value;
                      setForm((f) => {
                        const q = Number.parseFloat(qty);
                        const autoAmt = !Number.isNaN(q)
                          ? (q * MILK_RATE).toFixed(2)
                          : f.morningAmount;
                        return {
                          ...f,
                          morningQuantity: qty,
                          morningAmount: autoAmt,
                        };
                      });
                    }}
                    placeholder="0.0"
                    className="mt-1"
                    data-ocid="milk.form.morning_qty.input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="morning-fat"
                    className="text-xs flex items-center gap-1"
                  >
                    Fat %
                    <span className="text-amber-600 font-semibold bg-amber-100 px-1 rounded text-[10px]">
                      ₹56/L
                    </span>
                  </Label>
                  <Input
                    id="morning-fat"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.morningFat}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        morningFat: e.target.value,
                      }));
                    }}
                    placeholder="0.00"
                    className="mt-1"
                    data-ocid="milk.form.morning_fat.input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="morning-amount"
                    className="flex items-center gap-1 text-xs"
                  >
                    <IndianRupee className="h-3 w-3" /> Amount
                    <span className="text-muted-foreground font-normal">
                      (auto)
                    </span>
                  </Label>
                  <Input
                    id="morning-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.morningAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, morningAmount: e.target.value }))
                    }
                    placeholder="0.00"
                    className="mt-1"
                    data-ocid="milk.form.morning_amount.input"
                  />
                </div>
              </div>
            </div>

            {/* Evening Section */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-indigo-700 font-medium text-sm">
                <Moon className="h-4 w-4" />
                Evening
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="evening-qty" className="text-xs">
                    Qty (L)
                  </Label>
                  <Input
                    id="evening-qty"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.eveningQuantity}
                    onChange={(e) => {
                      const qty = e.target.value;
                      setForm((f) => {
                        const q = Number.parseFloat(qty);
                        const autoAmt = !Number.isNaN(q)
                          ? (q * MILK_RATE).toFixed(2)
                          : f.eveningAmount;
                        return {
                          ...f,
                          eveningQuantity: qty,
                          eveningAmount: autoAmt,
                        };
                      });
                    }}
                    placeholder="0.0"
                    className="mt-1"
                    data-ocid="milk.form.evening_qty.input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="evening-fat"
                    className="text-xs flex items-center gap-1"
                  >
                    Fat %
                    <span className="text-indigo-600 font-semibold bg-indigo-100 px-1 rounded text-[10px]">
                      ₹56/L
                    </span>
                  </Label>
                  <Input
                    id="evening-fat"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.eveningFat}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        eveningFat: e.target.value,
                      }));
                    }}
                    placeholder="0.00"
                    className="mt-1"
                    data-ocid="milk.form.evening_fat.input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="evening-amount"
                    className="flex items-center gap-1 text-xs"
                  >
                    <IndianRupee className="h-3 w-3" /> Amount
                    <span className="text-muted-foreground font-normal">
                      (auto)
                    </span>
                  </Label>
                  <Input
                    id="evening-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.eveningAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, eveningAmount: e.target.value }))
                    }
                    placeholder="0.00"
                    className="mt-1"
                    data-ocid="milk.form.evening_amount.input"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="milk.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="milk.form.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milk Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
