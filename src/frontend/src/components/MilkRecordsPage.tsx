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
  useAddMilkRecord,
  useDeleteMilkRecord,
  useGetMilkRecords,
  useUpdateMilkRecord,
} from "@/hooks/useQueries";
import {
  Droplets,
  IndianRupee,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { MilkRecord } from "../backend.d";

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

export function MilkRecordsPage() {
  const { data: records = [], isLoading } = useGetMilkRecords();
  const addMutation = useAddMilkRecord();
  const updateMutation = useUpdateMilkRecord();
  const deleteMutation = useDeleteMilkRecord();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MilkRecord | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Record deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

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
  ];

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
          <Button
            size="sm"
            onClick={openAdd}
            data-ocid="milk.add_button"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </Button>
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
              Add your first daily record to get started
            </p>
            <Button onClick={openAdd} className="mt-4 gap-1.5" size="sm">
              <Plus className="h-4 w-4" />
              Add First Record
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="milk.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Morning (L)</TableHead>
                  <TableHead className="text-right">Morning Fat %</TableHead>
                  <TableHead className="text-right">Morning Amt (₹)</TableHead>
                  <TableHead className="text-right">Evening (L)</TableHead>
                  <TableHead className="text-right">Evening Fat %</TableHead>
                  <TableHead className="text-right">Evening Amt (₹)</TableHead>
                  <TableHead className="text-right">Total (L)</TableHead>
                  <TableHead className="text-right">Total Amt (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((record, idx) => (
                  <TableRow
                    key={record.id.toString()}
                    data-ocid={`milk.item.${idx + 1}`}
                    className="hover:bg-muted/40"
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(`${record.date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
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
                        {(record.morningAmount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                        {(record.eveningAmount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {(
                        record.morningQuantity + record.eveningQuantity
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        morningQuantity: e.target.value,
                      }))
                    }
                    placeholder="0.0"
                    className="mt-1"
                    data-ocid="milk.form.morning_qty.input"
                  />
                </div>
                <div>
                  <Label htmlFor="morning-fat" className="text-xs">
                    Fat %
                  </Label>
                  <Input
                    id="morning-fat"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.morningFat}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, morningFat: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        eveningQuantity: e.target.value,
                      }))
                    }
                    placeholder="0.0"
                    className="mt-1"
                    data-ocid="milk.form.evening_qty.input"
                  />
                </div>
                <div>
                  <Label htmlFor="evening-fat" className="text-xs">
                    Fat %
                  </Label>
                  <Input
                    id="evening-fat"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.eveningFat}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, eveningFat: e.target.value }))
                    }
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
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
