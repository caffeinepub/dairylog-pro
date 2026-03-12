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

interface PaymentForm {
  date: string;
  amount: string;
  reason: string;
}

const emptyForm = (): PaymentForm => ({
  date: today(),
  amount: "",
  reason: "",
});

export function BuyerPaymentsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: payments = [], isLoading } = useGetBuyerAdvancePayments();
  const addMutation = useAddBuyerAdvancePayment();
  const updateMutation = useUpdateBuyerAdvancePayment();
  const deleteMutation = useDeleteBuyerAdvancePayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerAdvancePayment | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);

  const monthGroups = groupByMonth(payments, (p) => p.date);
  const curMonthKey = currentMonthKey();

  const grandTotal = payments.reduce((s, p) => s + p.amount, 0);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: BuyerAdvancePayment) {
    setEditing(p);
    setForm({ date: p.date, amount: String(p.amount), reason: p.reason });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const amount = Number.parseFloat(form.amount);
    if (!form.date || Number.isNaN(amount) || amount <= 0) {
      toast.error("Please fill in date and a valid amount.");
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          date: form.date,
          amount,
          reason: form.reason,
        });
        toast.success("Payment updated.");
      } else {
        await addMutation.mutateAsync({
          date: form.date,
          amount,
          reason: form.reason,
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

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <div data-ocid="payments.loading_state" className="space-y-3 mt-4">
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
            data-ocid="payments.print.button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 h-8 border-gray-300 text-gray-600"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          {isAdmin && (
            <Button
              data-ocid="payments.add.primary_button"
              size="sm"
              onClick={openAdd}
              className="gap-1.5 h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Payment
            </Button>
          )}
        </div>
      </div>

      {/* Grand total summary */}
      {payments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="print:block grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">
                Total Received (All Time)
              </p>
              <p className="text-xl font-bold text-green-800">
                ₹
                {grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <IndianRupee className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">
                Total Payments Recorded
              </p>
              <p className="text-xl font-bold text-blue-800">
                {payments.length}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Monthly groups */}
      {monthGroups.length === 0 ? (
        <div
          data-ocid="payments.empty_state"
          className="text-center py-16 text-gray-400"
        >
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
            const monthTotal = group.items.reduce((s, p) => s + p.amount, 0);
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
                      {monthTotal.toLocaleString("en-IN", {
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
                          <TableHead className="text-xs font-semibold text-gray-600">
                            Amount (₹)
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
                        {sorted.map((payment, idx) => (
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
                            <TableCell className="text-sm font-semibold text-green-700">
                              ₹
                              {payment.amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {payment.reason || "—"}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right print:hidden">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    data-ocid={`payments.edit_button.${idx + 1}`}
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(payment)}
                                    className="h-7 w-7 text-gray-400 hover:text-blue-600"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    data-ocid={`payments.delete_button.${idx + 1}`}
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteTarget(payment.id)}
                                    className="h-7 w-7 text-gray-400 hover:text-red-600"
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

                  {/* Monthly total card */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-green-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-800">
                      Monthly Total — {group.label}
                    </span>
                    <span className="text-base font-bold text-green-700">
                      ₹
                      {monthTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
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
              <Label htmlFor="pay-amount">Amount Received (₹)</Label>
              <Input
                data-ocid="payments.amount.input"
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5000"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-note">Note / Reason (optional)</Label>
              <Input
                data-ocid="payments.reason.input"
                id="pay-note"
                placeholder="e.g. 10-day payment"
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
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
              {addMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
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
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
