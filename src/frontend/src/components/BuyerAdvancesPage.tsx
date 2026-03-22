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
  HandCoins,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { BuyerAdvancePayment } from "../backend.d";

const today = () => new Date().toISOString().split("T")[0];

// Encode/decode helpers for [ADV] prefix
function encodeAdvReason(buyerName: string, note: string): string {
  return `[ADV]buyerName:${buyerName}|note:${note}`;
}

function decodeAdvReason(reason: string): { buyerName: string; note: string } {
  if (!reason.startsWith("[ADV]")) return { buyerName: "", note: reason };
  const body = reason.slice(5);
  const parts: Record<string, string> = {};
  for (const part of body.split("|")) {
    const idx = part.indexOf(":");
    if (idx !== -1) {
      parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
  }
  return { buyerName: parts.buyerName ?? "", note: parts.note ?? "" };
}

interface AdvForm {
  date: string;
  buyerName: string;
  amount: string;
  note: string;
}

const emptyForm = (): AdvForm => ({
  date: today(),
  buyerName: "",
  amount: "",
  note: "",
});

export function BuyerAdvancesPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: allRecords = [], isLoading } = useGetBuyerAdvancePayments();
  const addMutation = useAddBuyerAdvancePayment();
  const updateMutation = useUpdateBuyerAdvancePayment();
  const deleteMutation = useDeleteBuyerAdvancePayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerAdvancePayment | null>(null);
  const [form, setForm] = useState<AdvForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);

  // Only show records explicitly added as [ADV] (strict filter — completely separate from Buyer Payments)
  const advances = allRecords.filter((r) => r.reason.startsWith("[ADV]"));

  const monthGroups = groupByMonth(advances, (p) => p.date);
  const curMonthKey = currentMonthKey();

  const grandTotal = advances.reduce((s, p) => s + p.amount, 0);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: BuyerAdvancePayment) {
    setEditing(p);
    const { buyerName, note } = decodeAdvReason(p.reason);
    setForm({ date: p.date, amount: String(p.amount), buyerName, note });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const amount = Number.parseFloat(form.amount);
    if (!form.date || Number.isNaN(amount) || amount <= 0) {
      toast.error("Please fill in date and a valid amount.");
      return;
    }
    const reason = encodeAdvReason(form.buyerName, form.note);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          date: form.date,
          amount,
          reason,
        });
        toast.success("Advance updated.");
      } else {
        await addMutation.mutateAsync({ date: form.date, amount, reason });
        toast.success("Advance recorded.");
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
      toast.success("Advance deleted.");
    } catch {
      toast.error("Delete failed. Please try again.");
    }
  }

  if (isLoading) {
    return (
      <div data-ocid="advances.loading_state" className="space-y-3 mt-4">
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
        <h2 className="text-base font-semibold">Buyer Advances Records</h2>
      </div>

      {/* Page header */}
      <div className="print:hidden flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shadow">
            <HandCoins className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Buyer Advances</h2>
            <p className="text-xs text-gray-500">
              Track advances given to buyers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="advances.print.button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 h-8 border-gray-300 text-gray-600"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          {isAdmin && (
            <Button
              data-ocid="advances.add.primary_button"
              size="sm"
              onClick={openAdd}
              className="gap-1.5 h-8 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Advance
            </Button>
          )}
        </div>
      </div>

      {/* Summary card */}
      {advances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="print:block grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <HandCoins className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">
                Total Advances Given
              </p>
              <p className="text-xl font-bold text-orange-800">
                ₹
                {grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-500 flex items-center justify-center flex-shrink-0">
              <HandCoins className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Total Entries</p>
              <p className="text-xl font-bold text-gray-800">
                {advances.length}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Monthly groups */}
      {monthGroups.length === 0 ? (
        <div
          data-ocid="advances.empty_state"
          className="text-center py-16 text-gray-400"
        >
          <HandCoins className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No advances recorded yet</p>
          <p className="text-sm mt-1">
            {isAdmin
              ? 'Click "Add Advance" to record your first advance.'
              : "No advance records found."}
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
                  data-ocid={`advances.month.toggle.${groupIdx + 1}`}
                  className="px-4 py-3 hover:no-underline hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <FolderOpen className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="font-semibold text-gray-800">
                      {group.label}
                    </span>
                    <span className="ml-auto mr-2 text-sm font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      ₹
                      {monthTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table data-ocid={`advances.month.table.${groupIdx + 1}`}>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-semibold text-gray-600">
                            #
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600">
                            Date
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600">
                            Buyer Name
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
                        {sorted.map((adv, idx) => {
                          const { buyerName, note } = decodeAdvReason(
                            adv.reason,
                          );
                          return (
                            <TableRow
                              key={String(adv.id)}
                              data-ocid={`advances.item.${idx + 1}`}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="text-xs text-gray-500">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-sm text-gray-800 whitespace-nowrap">
                                {new Date(adv.date).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-800">
                                {buyerName || "—"}
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-orange-700">
                                ₹
                                {adv.amount.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {note || "—"}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right print:hidden">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      data-ocid={`advances.edit_button.${idx + 1}`}
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(adv)}
                                      className="h-7 w-7 text-gray-400 hover:text-blue-600"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      data-ocid={`advances.delete_button.${idx + 1}`}
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteTarget(adv.id)}
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
                  <div className="px-4 py-3 border-t border-gray-100 bg-orange-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-orange-800">
                      Monthly Total — {group.label}
                    </span>
                    <span className="text-base font-bold text-orange-700">
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
        <DialogContent data-ocid="advances.dialog" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Advance" : "Add Advance"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="adv-date">Date</Label>
              <Input
                data-ocid="advances.date.input"
                id="adv-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adv-buyer">Buyer Name (optional)</Label>
              <Input
                data-ocid="advances.buyer_name.input"
                id="adv-buyer"
                placeholder="e.g. Ramesh Kumar"
                value={form.buyerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, buyerName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adv-amount">Amount (₹)</Label>
              <Input
                data-ocid="advances.amount.input"
                id="adv-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2000"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adv-note">Note (optional)</Label>
              <Input
                data-ocid="advances.note.input"
                id="adv-note"
                placeholder="e.g. advance for next cycle"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="advances.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="advances.save_button"
              onClick={handleSubmit}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {addMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editing ? "Save Changes" : "Add Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="advances.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
            <AlertDialogDescription>
              This advance record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="advances.delete.cancel_button"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="advances.delete.confirm_button"
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
