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
  useDeleteBuyerAdvancePayment,
  useGetBuyerAdvancePayments,
  useUpdateBuyerAdvancePayment,
} from "@/hooks/useQueries";
import { currentMonthKey, groupByMonth } from "@/utils/groupByMonth";
import {
  CheckCircle2,
  FolderOpen,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { BuyerAdvancePayment } from "../backend.d";

const today = () => new Date().toISOString().split("T")[0];

// PMT5 format: totalBill + advanceDeducted + paymentReceived + note
function encodePmtReason(
  totalBill: number,
  advanceDeducted: number,
  paymentReceived: number,
  note: string,
): string {
  return `[PMT5]totalBill:${totalBill}|advanceDeducted:${advanceDeducted}|paymentReceived:${paymentReceived}|note:${note}`;
}

function decodePmtReason(
  reason: string,
  amount: number,
): {
  totalBill: number;
  advanceDeducted: number;
  paymentReceived: number;
  note: string;
} {
  if (reason.startsWith("[PMT5]")) {
    const body = reason.slice(6);
    const parts: Record<string, string> = {};
    for (const part of body.split("|")) {
      const idx = part.indexOf(":");
      if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
    return {
      totalBill: Number.parseFloat(parts.totalBill ?? "0") || 0,
      advanceDeducted: Number.parseFloat(parts.advanceDeducted ?? "0") || 0,
      paymentReceived: Number.parseFloat(parts.paymentReceived ?? "0") || 0,
      note: parts.note ?? "",
    };
  }
  if (
    reason.startsWith("[PMT4]") ||
    reason.startsWith("[PMT3]") ||
    reason.startsWith("[PMT2]")
  ) {
    const body = reason.slice(6);
    const parts: Record<string, string> = {};
    for (const part of body.split("|")) {
      const idx = part.indexOf(":");
      if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
    return {
      totalBill: Number.parseFloat(parts.totalBill ?? "0") || 0,
      advanceDeducted: 0,
      paymentReceived: Number.parseFloat(parts.paymentReceived ?? "0") || 0,
      note: parts.note ?? "",
    };
  }
  if (reason.startsWith("[PMT]")) {
    const body = reason.slice(5);
    const parts: Record<string, string> = {};
    for (const part of body.split("|")) {
      const idx = part.indexOf(":");
      if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
    const paidAmount =
      parts.paidAmount !== undefined
        ? Number.parseFloat(parts.paidAmount)
        : undefined;
    const paymentReceived =
      parts.status === "partial" && paidAmount !== undefined
        ? paidAmount
        : parts.status === "pending"
          ? 0
          : amount;
    return {
      totalBill: amount,
      advanceDeducted: 0,
      paymentReceived,
      note: parts.note ?? "",
    };
  }
  return {
    totalBill: amount,
    advanceDeducted: 0,
    paymentReceived: amount,
    note: reason,
  };
}

function isPaymentRecord(reason: string): boolean {
  return (
    reason.startsWith("[PMT]") ||
    reason.startsWith("[PMT2]") ||
    reason.startsWith("[PMT3]") ||
    reason.startsWith("[PMT4]") ||
    reason.startsWith("[PMT5]")
  );
}

interface PaymentForm {
  date: string;
  totalBill: string;
  advanceDeducted: string;
  paymentReceived: string;
  note: string;
}

const emptyForm = (): PaymentForm => ({
  date: today(),
  totalBill: "",
  advanceDeducted: "",
  paymentReceived: "",
  note: "",
});

export function BuyerPaymentsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: allRecords = [], isLoading } = useGetBuyerAdvancePayments();
  const addMutation = useAddBuyerAdvancePayment();
  const updateMutation = useUpdateBuyerAdvancePayment();
  const deleteMutation = useDeleteBuyerAdvancePayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerAdvancePayment | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);

  const payments = allRecords.filter((r) => isPaymentRecord(r.reason));
  const monthGroups = groupByMonth(payments, (p) => p.date);
  const curMonthKey = currentMonthKey();

  const totalBillAll = payments.reduce(
    (s, p) => s + decodePmtReason(p.reason, p.amount).totalBill,
    0,
  );
  const totalReceivedAll = payments.reduce(
    (s, p) => s + decodePmtReason(p.reason, p.amount).paymentReceived,
    0,
  );
  const totalAdvanceDeductedAll = payments.reduce(
    (s, p) => s + decodePmtReason(p.reason, p.amount).advanceDeducted,
    0,
  );

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: BuyerAdvancePayment) {
    setEditing(p);
    const { totalBill, advanceDeducted, paymentReceived, note } =
      decodePmtReason(p.reason, p.amount);
    setForm({
      date: p.date,
      totalBill: String(totalBill),
      advanceDeducted: advanceDeducted > 0 ? String(advanceDeducted) : "",
      paymentReceived: String(paymentReceived),
      note,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const totalBill = Number.parseFloat(form.totalBill);
    const advanceDeducted = Number.parseFloat(form.advanceDeducted || "0") || 0;
    const paymentReceived = Number.parseFloat(form.paymentReceived || "0");
    if (!form.date || Number.isNaN(totalBill) || totalBill <= 0) {
      toast.error("Please fill in date and a valid total bill amount.");
      return;
    }
    if (Number.isNaN(paymentReceived) || paymentReceived < 0) {
      toast.error("Please enter a valid payment received amount.");
      return;
    }
    const reason = encodePmtReason(
      totalBill,
      advanceDeducted,
      paymentReceived,
      form.note,
    );
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          date: form.date,
          amount: totalBill,
          reason,
        });
        toast.success("Payment updated.");
      } else {
        await addMutation.mutateAsync({
          date: form.date,
          amount: totalBill,
          reason,
        });
        toast.success("Payment recorded.");
      }
      setDialogOpen(false);
      addMutation.reset();
      updateMutation.reset();
    } catch {
      toast.error("Operation failed. Please try again.");
    }
  }

  async function handleDelete() {
    if (deleteTarget === null) return;
    const idToDelete = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(idToDelete);
      deleteMutation.reset();
      toast.success("Payment deleted.");
    } catch {
      toast.error("Delete failed. Please try again.");
    }
  }

  // Live preview
  const previewTotalBill = Number.parseFloat(form.totalBill) || 0;
  const previewAdvanceDeducted =
    Number.parseFloat(form.advanceDeducted || "0") || 0;
  const previewReceived = Number.parseFloat(form.paymentReceived) || 0;
  // Advance Left = Payment Received - Total Bill (positive means extra/advance taken)
  const previewAdvanceLeft =
    previewReceived + previewAdvanceDeducted - previewTotalBill;

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Shree Hari Dairy</h1>
        <p className="text-sm">158 Omaxe City 2, Indore, Madhya Pradesh</p>
        <p className="text-sm">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <hr className="my-2" />
        <h2 className="text-base font-semibold">Buyer Payment Records</h2>
      </div>

      {/* Page header */}
      <div className="print:hidden flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center shadow">
            <IndianRupee className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Buyer Payments</h2>
            <p className="text-xs text-gray-500">
              10-day payment records from your buyer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 h-8 border-gray-300 text-gray-600"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={openAdd}
              className="gap-1.5 h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Payment
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {payments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="print:block grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <IndianRupee className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Total Bill</p>
              <p className="text-base font-bold text-blue-800">
                ₹
                {totalBillAll.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <IndianRupee className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-red-700 font-medium">
                Advance Deducted
              </p>
              <p className="text-base font-bold text-red-800">
                {totalAdvanceDeductedAll > 0
                  ? `₹${totalAdvanceDeductedAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">
                Payment Received
              </p>
              <p className="text-base font-bold text-green-800">
                ₹
                {totalReceivedAll.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">
                Advance Left
              </p>
              <p className="text-base font-bold text-orange-800">
                {(() => {
                  const advLeft = payments.reduce((s, p) => {
                    const { totalBill, advanceDeducted, paymentReceived } =
                      decodePmtReason(p.reason, p.amount);
                    const adv = paymentReceived + advanceDeducted - totalBill;
                    return s + (adv > 0 ? adv : 0);
                  }, 0);
                  return advLeft > 0
                    ? `₹${advLeft.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—";
                })()}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Monthly groups */}
      {monthGroups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <IndianRupee className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payments recorded yet</p>
          <p className="text-sm mt-1">
            {isAdmin
              ? 'Click "Add Payment" to record your first payment.'
              : "No payment records found."}
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={[curMonthKey]}
          className="space-y-3"
        >
          {monthGroups.map((group, groupIdx) => {
            const groupTotalBill = group.items.reduce(
              (s, p) => s + decodePmtReason(p.reason, p.amount).totalBill,
              0,
            );
            const groupAdvanceDeducted = group.items.reduce(
              (s, p) => s + decodePmtReason(p.reason, p.amount).advanceDeducted,
              0,
            );
            const groupReceived = group.items.reduce(
              (s, p) => s + decodePmtReason(p.reason, p.amount).paymentReceived,
              0,
            );
            const groupAdvanceLeft = group.items.reduce((s, p) => {
              const { totalBill, advanceDeducted, paymentReceived } =
                decodePmtReason(p.reason, p.amount);
              const adv = paymentReceived + advanceDeducted - totalBill;
              return s + (adv > 0 ? adv : 0);
            }, 0);
            const sorted = [...group.items].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            );
            return (
              <AccordionItem
                key={group.monthKey}
                value={group.monthKey}
                className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white"
              >
                <AccordionTrigger
                  data-ocid={`payments.month.toggle.${groupIdx + 1}`}
                  className="px-4 py-3 hover:no-underline hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <FolderOpen className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-800">
                      {group.label}
                    </span>
                    <span className="ml-auto mr-2 text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      ₹
                      {groupTotalBill.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table data-ocid={`payments.month.table.${groupIdx + 1}`}>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-semibold text-gray-600">
                            #
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600">
                            Date
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-blue-700">
                            Total Bill (₹)
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-red-600">
                            Advance Deducted (₹)
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-green-700">
                            Payment Received (₹)
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-orange-600">
                            Advance Left (₹)
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600">
                            Note
                          </TableHead>
                          {isAdmin && (
                            <TableHead className="text-xs font-semibold text-gray-600 text-right print:hidden">
                              Actions
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((payment, idx) => {
                          const {
                            totalBill,
                            advanceDeducted,
                            paymentReceived,
                            note,
                          } = decodePmtReason(payment.reason, payment.amount);
                          const advanceLeft =
                            paymentReceived + advanceDeducted - totalBill;
                          return (
                            <TableRow
                              key={String(payment.id)}
                              data-ocid={`payments.item.${idx + 1}`}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="text-xs text-gray-500">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-sm text-gray-800 whitespace-nowrap">
                                {new Date(payment.date).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-blue-700">
                                ₹
                                {totalBill.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-red-600">
                                {advanceDeducted > 0 ? (
                                  `₹${advanceDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-green-700">
                                ₹
                                {paymentReceived.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`text-sm font-semibold ${
                                    advanceLeft > 0
                                      ? "text-orange-600"
                                      : advanceLeft < 0
                                        ? "text-red-500"
                                        : "text-gray-400"
                                  }`}
                                >
                                  {advanceLeft > 0
                                    ? `₹${advanceLeft.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                    : advanceLeft < 0
                                      ? `-₹${Math.abs(advanceLeft).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                      : "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {note || "—"}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right print:hidden">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(payment)}
                                      className="h-7 w-7 text-gray-400 hover:text-blue-600"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setDeleteTarget(payment.id)
                                      }
                                      className="h-7 w-7 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Monthly summary footer */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">
                          Total Bill
                        </p>
                        <p className="text-sm font-bold text-blue-700">
                          ₹
                          {groupTotalBill.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 font-medium">
                          Advance Deducted
                        </p>
                        <p className="text-sm font-bold text-red-700">
                          {groupAdvanceDeducted > 0
                            ? `₹${groupAdvanceDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium">
                          Payment Received
                        </p>
                        <p className="text-sm font-bold text-green-700">
                          ₹
                          {groupReceived.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-orange-600 font-medium">
                          Advance Left
                        </p>
                        <p className="text-sm font-bold text-orange-700">
                          {groupAdvanceLeft > 0
                            ? `₹${groupAdvanceLeft.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="payments.dialog" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Payment" : "Record Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Date</Label>
              <Input
                data-ocid="payments.date.input"
                id="pay-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-total-bill">Total Bill Amount (₹)</Label>
              <Input
                data-ocid="payments.totalbill.input"
                id="pay-total-bill"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 50000"
                value={form.totalBill}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalBill: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-advance-deducted">
                Advance Deducted (₹){" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                data-ocid="payments.advancededucted.input"
                id="pay-advance-deducted"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 35000"
                value={form.advanceDeducted}
                onChange={(e) =>
                  setForm((f) => ({ ...f, advanceDeducted: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-received">Payment Received (₹)</Label>
              <Input
                data-ocid="payments.paymentreceived.input"
                id="pay-received"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 53000"
                value={form.paymentReceived}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentReceived: e.target.value }))
                }
              />
            </div>

            {/* Live advance preview */}
            {previewTotalBill > 0 && previewReceived > 0 && (
              <div
                className={`rounded-lg px-4 py-2.5 text-sm font-medium border ${
                  previewAdvanceLeft > 0
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : previewAdvanceLeft < 0
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                {previewAdvanceLeft > 0
                  ? `Advance Left: ₹${previewAdvanceLeft.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : previewAdvanceLeft < 0
                    ? `Still Pending: ₹${Math.abs(previewAdvanceLeft).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "Fully settled — no advance left"}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pay-note">Note (optional)</Label>
              <Input
                data-ocid="payments.note.input"
                id="pay-note"
                placeholder="e.g. 10-day payment"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="payments.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="payments.save_button"
              onClick={handleSubmit}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {(addMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editing ? "Save Changes" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="payments.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This payment record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="payments.delete.cancel_button"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="payments.delete.confirm_button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
