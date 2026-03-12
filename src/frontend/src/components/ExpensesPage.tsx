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
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddExpense,
  useDeleteExpense,
  useGetExpenses,
  useMarkExpensePaid,
  useUpdateExpense,
} from "@/hooks/useQueries";
import { currentMonthKey, groupByMonth } from "@/utils/groupByMonth";
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FolderOpen,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Expense } from "../backend.d";

const CATEGORIES = [
  "Feed",
  "Medicine",
  "Equipment",
  "Labor",
  "Utilities",
  "Other",
];
const today = () => new Date().toISOString().split("T")[0];

interface FormData {
  date: string;
  description: string;
  amount: string;
  category: string;
  status: string;
  billPhoto: string | null;
}

const emptyForm = (): FormData => ({
  date: today(),
  description: "",
  amount: "",
  category: "Feed",
  status: "pending",
  billPhoto: null,
});

export function ExpensesPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: expenses = [], isLoading } = useGetExpenses();
  const addMutation = useAddExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const markPaidMutation = useMarkExpensePaid();

  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [billPhotos, setBillPhotos] = useState<Record<string, string>>({});
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPending = expenses
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;

  const filtered = [...expenses]
    .filter((e) => filter === "all" || e.status === filter)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const monthGroups = groupByMonth(filtered, (e) => e.date);
  const curMonthKey = currentMonthKey();

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      status: expense.status,
      billPhoto: billPhotos[expense.id.toString()] ?? null,
    });
    setDialogOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => ({ ...f, billPhoto: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const data = {
      date: form.date,
      description: form.description.trim(),
      amount: Number.parseFloat(form.amount),
      category: form.category,
      status: form.status,
    };
    if (
      !data.date ||
      !data.description ||
      Number.isNaN(data.amount) ||
      data.amount <= 0
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
        if (form.billPhoto) {
          setBillPhotos((prev) => ({
            ...prev,
            [editing.id.toString()]: form.billPhoto!,
          }));
        }
        toast.success("Expense updated");
      } else {
        const result = await addMutation.mutateAsync(data);
        if (form.billPhoto && result !== undefined && result !== null) {
          const newId =
            typeof result === "bigint" ? result.toString() : String(result);
          setBillPhotos((prev) => ({ ...prev, [newId]: form.billPhoto! }));
        }
        toast.success("Expense added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Operation failed. Please try again.");
    }
  };

  const handleMarkPaid = async (id: bigint) => {
    markPaidMutation.reset();
    try {
      await markPaidMutation.mutateAsync(id);
      toast.success("Expense marked as paid");
    } catch {
      toast.error("Failed to update expense");
    }
  };

  const handleDelete = async () => {
    const id = deleteId;
    if (id === null) return;
    setDeleteId(null);
    deleteMutation.reset();
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  const summaryCards = [
    {
      label: "Pending Amount",
      value: `₹${totalPending.toLocaleString("en-IN")}`,
      sub: `${pendingCount} expense${pendingCount !== 1 ? "s" : ""}`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Total Paid",
      value: `₹${totalPaid.toLocaleString("en-IN")}`,
      sub: `${expenses.filter((e) => e.status === "paid").length} paid`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    {
      label: "Total Expenses",
      value: expenses.length.toString(),
      sub: `₹${(totalPending + totalPaid).toLocaleString("en-IN")} total`,
      icon: Receipt,
      color: "text-primary",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Grand Total",
      value: `₹${(totalPending + totalPaid).toLocaleString("en-IN")}`,
      sub: "All expenses combined",
      icon: IndianRupee,
      color: "text-primary",
      bg: "bg-green-50",
      border: "border-green-200",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Fun Photo Strip */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1 no-print">
        {[
          {
            src: "/assets/generated/farm-expenses.dim_800x600.jpg",
            alt: "Farm expenses",
          },
          {
            src: "/assets/generated/farm-landscape.dim_800x600.jpg",
            alt: "Farm landscape",
          },
        ].map((photo) => (
          <div
            key={photo.src}
            className="flex-shrink-0 w-40 h-28 rounded-xl overflow-hidden shadow-md border border-gray-200"
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 no-print">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-lg p-4 shadow-card border ${card.border} ${card.bg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-display font-bold ${card.color}`}>
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-lg border border-border shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as "all" | "pending" | "paid")}
          >
            <TabsList>
              <TabsTrigger value="all" data-ocid="expense.filter.tab">
                All ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-ocid="expense.filter.tab">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="paid" data-ocid="expense.filter.tab">
                Paid ({expenses.filter((e) => e.status === "paid").length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              data-ocid="expense.print_button"
              className="gap-1.5 no-print"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={openAdd}
                data-ocid="expense.add_button"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Expense
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
        ) : filtered.length === 0 ? (
          <div
            data-ocid="expense.empty_state"
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <IndianRupee className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No expenses found</p>
            <p className="text-sm mt-1">
              {filter === "all"
                ? isAdmin
                  ? "Add your first expense to track"
                  : "No expenses have been added yet"
                : `No ${filter} expenses`}
            </p>
            {filter === "all" && isAdmin && (
              <Button onClick={openAdd} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-4 w-4" />
                Add Expense
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
              const groupTotal = group.items.reduce((s, e) => s + e.amount, 0);
              const groupPending = group.items.filter(
                (e) => e.status === "pending",
              ).length;
              return (
                <AccordionItem
                  key={group.monthKey}
                  value={group.monthKey}
                  data-ocid={`expense.month_group.${groupIdx + 1}`}
                  className="border-0"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-green-50/60 hover:no-underline rounded-none [&[data-state=open]]:bg-green-50/60">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderOpen className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="font-semibold text-foreground">
                        {group.label}
                      </span>
                      <span className="ml-auto mr-3 flex-shrink-0 text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 font-medium">
                        ₹
                        {groupTotal.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        total · {groupPending} pending
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="overflow-x-auto">
                      <Table data-ocid="expense.table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">
                              Amount (₹)
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Bill Photo</TableHead>
                            {isAdmin && (
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((expense, idx) => (
                            <TableRow
                              key={expense.id.toString()}
                              data-ocid={`expense.item.${idx + 1}`}
                              className="hover:bg-muted/40"
                            >
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Date(
                                  `${expense.date}T00:00:00`,
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate">
                                {expense.description}
                              </TableCell>
                              <TableCell>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                                  {expense.category}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                ₹{expense.amount.toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    expense.status === "paid"
                                      ? "badge-paid border font-medium text-xs"
                                      : "badge-pending border font-medium text-xs"
                                  }
                                  variant="outline"
                                >
                                  {expense.status === "paid" ? (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  {expense.status === "paid"
                                    ? "Paid"
                                    : "Pending"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {billPhotos[expense.id.toString()] ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingPhoto(
                                        billPhotos[expense.id.toString()],
                                      )
                                    }
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                    data-ocid={`expense.bill_photo.${idx + 1}`}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {expense.status === "pending" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleMarkPaid(expense.id)
                                        }
                                        data-ocid={`expense.paid_button.${idx + 1}`}
                                        className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs gap-1"
                                        disabled={markPaidMutation.isPending}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Mark Paid
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(expense)}
                                      data-ocid={`expense.edit_button.${idx + 1}`}
                                      className="h-8 w-8"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteId(expense.id)}
                                      data-ocid={`expense.delete_button.${idx + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="expense.form.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expense-amount">Amount (₹)</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g. Cattle feed purchase"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expense-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="expense-category" className="mt-1">
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
              <div>
                <Label htmlFor="expense-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger id="expense-status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Bill Photo Upload */}
            <div>
              <Label>Bill / Receipt Photo (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {form.billPhoto ? (
                <div className="mt-2 relative inline-block">
                  <img
                    src={form.billPhoto}
                    alt="Bill"
                    className="h-28 w-auto rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, billPhoto: null }))}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2 w-full border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  data-ocid="expense.form.upload_button"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo / Upload Bill
                </Button>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="expense.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="expense.form.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Photo Viewer */}
      {viewingPhoto && (
        <dialog
          open
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 w-full h-full max-w-none m-0 border-0"
          onClick={() => setViewingPhoto(null)}
          onKeyDown={(e) => e.key === "Escape" && setViewingPhoto(null)}
          data-ocid="expense.bill_photo.modal"
        >
          <div className="relative max-w-lg w-full">
            <button
              type="button"
              onClick={() => setViewingPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              data-ocid="expense.bill_photo.close_button"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={viewingPhoto}
              alt="Bill"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
        </dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the expense record.
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
