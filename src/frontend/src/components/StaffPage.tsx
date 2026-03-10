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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  useAddAdvancePayment,
  useAddStaffMember,
  useDeleteAdvancePayment,
  useDeleteStaffMember,
  useGetAdvancePayments,
  useGetStaffMembers,
  useUpdateStaffMember,
} from "@/hooks/useQueries";
import { groupByMonth } from "@/utils/groupByMonth";
import {
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  FolderOpen,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { AdvancePayment, StaffMember } from "../backend.d";

const today = () => new Date().toISOString().split("T")[0];

interface StaffFormData {
  name: string;
  role: string;
  monthlySalary: string;
}

interface AdvanceFormData {
  date: string;
  amount: string;
  note: string;
}

const emptyStaffForm = (): StaffFormData => ({
  name: "",
  role: "",
  monthlySalary: "",
});
const emptyAdvanceForm = (): AdvanceFormData => ({
  date: today(),
  amount: "",
  note: "",
});

export function StaffPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: staffList = [], isLoading: staffLoading } =
    useGetStaffMembers();
  const { data: allAdvances = [], isLoading: advancesLoading } =
    useGetAdvancePayments();

  const addStaff = useAddStaffMember();
  const updateStaff = useUpdateStaffMember();
  const deleteStaff = useDeleteStaffMember();
  const addAdvance = useAddAdvancePayment();
  const deleteAdvance = useDeleteAdvancePayment();

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormData>(emptyStaffForm());

  const [advanceSheetStaff, setAdvanceSheetStaff] =
    useState<StaffMember | null>(null);
  const [advanceForm, setAdvanceForm] = useState<AdvanceFormData>(
    emptyAdvanceForm(),
  );
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);

  const [deleteStaffId, setDeleteStaffId] = useState<bigint | null>(null);
  const [deleteAdvanceId, setDeleteAdvanceId] = useState<bigint | null>(null);

  const totalSalary = staffList.reduce((s, m) => s + m.monthlySalary, 0);
  const totalAdvances = staffList.reduce((s, m) => s + m.totalAdvancePaid, 0);

  const staffAdvances: AdvancePayment[] = advanceSheetStaff
    ? allAdvances
        .filter((a) => a.staffId.toString() === advanceSheetStaff.id.toString())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const advanceMonthGroups = groupByMonth(staffAdvances, (a) => a.date);

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffForm(emptyStaffForm());
    setStaffDialogOpen(true);
  };

  const openEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      role: member.role,
      monthlySalary: member.monthlySalary.toString(),
    });
    setStaffDialogOpen(true);
  };

  const handleStaffSubmit = async () => {
    const salary = Number.parseFloat(staffForm.monthlySalary);
    if (
      !staffForm.name.trim() ||
      !staffForm.role.trim() ||
      Number.isNaN(salary) ||
      salary < 0
    ) {
      toast.error("Please fill all fields with valid values");
      return;
    }
    if (editingStaff) {
      updateStaff.reset();
    } else {
      addStaff.reset();
    }
    try {
      if (editingStaff) {
        await updateStaff.mutateAsync({
          id: editingStaff.id,
          name: staffForm.name.trim(),
          role: staffForm.role.trim(),
          monthlySalary: salary,
        });
        toast.success("Staff member updated");
      } else {
        await addStaff.mutateAsync({
          name: staffForm.name.trim(),
          role: staffForm.role.trim(),
          monthlySalary: salary,
        });
        toast.success("Staff member added");
      }
      setStaffDialogOpen(false);
    } catch {
      toast.error("Operation failed. Please try again.");
    }
  };

  const handleDeleteStaff = async () => {
    const id = deleteStaffId;
    if (id === null) return;
    setDeleteStaffId(null);
    deleteStaff.reset();
    try {
      await deleteStaff.mutateAsync(id);
      toast.success("Staff member removed");
    } catch {
      toast.error("Failed to remove staff member");
    }
  };

  const handleAddAdvance = async () => {
    if (!advanceSheetStaff) return;
    const amount = Number.parseFloat(advanceForm.amount);
    if (!advanceForm.date || Number.isNaN(amount) || amount <= 0) {
      toast.error("Please fill date and a valid amount");
      return;
    }
    addAdvance.reset();
    try {
      await addAdvance.mutateAsync({
        staffId: advanceSheetStaff.id,
        date: advanceForm.date,
        amount,
        note: advanceForm.note.trim(),
      });
      toast.success("Advance payment recorded");
      setAdvanceForm(emptyAdvanceForm());
      setShowAdvanceForm(false);
    } catch {
      toast.error("Failed to add advance payment");
    }
  };

  const handleDeleteAdvance = async () => {
    const id = deleteAdvanceId;
    if (id === null) return;
    setDeleteAdvanceId(null);
    deleteAdvance.reset();
    try {
      await deleteAdvance.mutateAsync(id);
      toast.success("Advance payment deleted");
    } catch {
      toast.error("Failed to delete advance");
    }
  };

  const staffPending = addStaff.isPending || updateStaff.isPending;

  const summaryCards = [
    {
      label: "Total Staff",
      value: staffList.length.toString(),
      icon: Users,
      color: "text-primary",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Monthly Salary Burden",
      value: `₹${totalSalary.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Total Advances Given",
      value: `₹${totalAdvances.toLocaleString("en-IN")}`,
      icon: CreditCard,
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
    },
    {
      label: "Total Payable",
      value: `₹${(totalSalary + totalAdvances).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-200",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Fun Photo Strip */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1 no-print">
        {[
          {
            src: "/assets/generated/farm-staff.dim_800x600.jpg",
            alt: "Farm staff team",
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
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-lg border border-border shadow-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">
            Staff Members
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              data-ocid="staff.print_button"
              className="gap-1.5 no-print"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={openAddStaff}
                data-ocid="staff.add_button"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Staff
              </Button>
            )}
          </div>
        </div>

        {staffLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div
            data-ocid="staff.empty_state"
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No staff members yet</p>
            <p className="text-sm mt-1">
              {isAdmin
                ? "Add staff members to track salaries and advances"
                : "No staff members have been added yet"}
            </p>
            {isAdmin && (
              <Button onClick={openAddStaff} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-4 w-4" />
                Add First Staff Member
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="staff.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">
                    Monthly Salary (₹)
                  </TableHead>
                  <TableHead className="text-right">
                    Total Advance (₹)
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((member, idx) => (
                  <TableRow
                    key={member.id.toString()}
                    data-ocid={`staff.item.${idx + 1}`}
                    className="hover:bg-muted/40"
                  >
                    <TableCell className="font-semibold">
                      {member.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.role}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{member.monthlySalary.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          member.totalAdvancePaid > 0
                            ? "text-rose-600 font-semibold"
                            : "text-muted-foreground"
                        }
                      >
                        ₹{member.totalAdvancePaid.toLocaleString("en-IN")}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdvanceSheetStaff(member);
                              setShowAdvanceForm(false);
                              setAdvanceForm(emptyAdvanceForm());
                            }}
                            data-ocid={`staff.advances_button.${idx + 1}`}
                            className="h-8 px-2 text-primary hover:text-primary hover:bg-green-50 text-xs gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Advances
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditStaff(member)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteStaffId(member.id)}
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
        )}
      </div>

      {/* Staff Add/Edit Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent data-ocid="staff.form.dialog" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="staff-name">Full Name</Label>
              <Input
                id="staff-name"
                value={staffForm.name}
                onChange={(e) =>
                  setStaffForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Ramesh Kumar"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="staff-role">Role / Designation</Label>
              <Input
                id="staff-role"
                value={staffForm.role}
                onChange={(e) =>
                  setStaffForm((f) => ({ ...f, role: e.target.value }))
                }
                placeholder="e.g. Milkman, Supervisor"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="staff-salary">Monthly Salary (₹)</Label>
              <Input
                id="staff-salary"
                type="number"
                min="0"
                step="100"
                value={staffForm.monthlySalary}
                onChange={(e) =>
                  setStaffForm((f) => ({ ...f, monthlySalary: e.target.value }))
                }
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStaffSubmit}
              disabled={staffPending}
              data-ocid="staff.form.submit_button"
            >
              {staffPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingStaff ? "Save Changes" : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advances Sheet */}
      <Sheet
        open={!!advanceSheetStaff}
        onOpenChange={(open) => {
          if (!open) setAdvanceSheetStaff(null);
        }}
      >
        <SheetContent
          data-ocid="advance.sheet"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          {advanceSheetStaff && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="font-display">
                  Advances — {advanceSheetStaff.name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {advanceSheetStaff.role} ·{" "}
                  <span className="text-rose-600 font-medium">
                    Total: ₹
                    {advanceSheetStaff.totalAdvancePaid.toLocaleString("en-IN")}
                  </span>
                </p>
              </SheetHeader>

              {/* Add Advance Button */}
              {isAdmin &&
                (!showAdvanceForm ? (
                  <Button
                    onClick={() => setShowAdvanceForm(true)}
                    size="sm"
                    className="w-full gap-1.5 mb-4"
                    data-ocid="advance.add_button"
                  >
                    <Plus className="h-4 w-4" />
                    Add Advance Payment
                  </Button>
                ) : (
                  <div className="mb-4 bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                    <h4 className="font-medium text-sm text-foreground">
                      New Advance Payment
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="adv-date" className="text-xs">
                          Date
                        </Label>
                        <Input
                          id="adv-date"
                          type="date"
                          value={advanceForm.date}
                          onChange={(e) =>
                            setAdvanceForm((f) => ({
                              ...f,
                              date: e.target.value,
                            }))
                          }
                          className="mt-0.5 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adv-amount" className="text-xs">
                          Amount (₹)
                        </Label>
                        <Input
                          id="adv-amount"
                          type="number"
                          min="0"
                          step="100"
                          value={advanceForm.amount}
                          onChange={(e) =>
                            setAdvanceForm((f) => ({
                              ...f,
                              amount: e.target.value,
                            }))
                          }
                          placeholder="0"
                          className="mt-0.5 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="adv-note" className="text-xs">
                        Note (optional)
                      </Label>
                      <Input
                        id="adv-note"
                        value={advanceForm.note}
                        onChange={(e) =>
                          setAdvanceForm((f) => ({
                            ...f,
                            note: e.target.value,
                          }))
                        }
                        placeholder="e.g. Festival advance"
                        className="mt-0.5 h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddAdvance}
                        disabled={addAdvance.isPending}
                        data-ocid="advance.form.submit_button"
                        className="flex-1"
                      >
                        {addAdvance.isPending && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAdvanceForm(false);
                          setAdvanceForm(emptyAdvanceForm());
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}

              <Separator className="mb-4" />

              {/* Advances List */}
              {advancesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : staffAdvances.length === 0 ? (
                <div
                  data-ocid="advance.empty_state"
                  className="flex flex-col items-center justify-center py-10 text-muted-foreground"
                >
                  <CreditCard className="h-10 w-10 mb-2 opacity-25" />
                  <p className="text-sm font-medium">No advance payments</p>
                  <p className="text-xs mt-1">
                    Advance history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {advanceMonthGroups.map((group) => {
                    const groupTotal = group.items.reduce(
                      (s, a) => s + a.amount,
                      0,
                    );
                    // get index offset for deterministic ocid within the full staffAdvances list
                    return (
                      <div key={group.monthKey}>
                        {/* Month folder header */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <FolderOpen className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-foreground">
                            {group.label}
                          </span>
                          <span className="ml-auto text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                            ₹{groupTotal.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="space-y-2 pl-1">
                          {group.items.map((adv, idx) => {
                            const globalIdx = staffAdvances.findIndex(
                              (a) => a.id.toString() === adv.id.toString(),
                            );
                            return (
                              <motion.div
                                key={adv.id.toString()}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                data-ocid={`advance.item.${globalIdx + 1}`}
                                className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        `${adv.date}T00:00:00`,
                                      ).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-rose-600">
                                    ₹{adv.amount.toLocaleString("en-IN")}
                                  </p>
                                  {adv.note && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground truncate">
                                        {adv.note}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteAdvanceId(adv.id)}
                                    data-ocid={`advance.delete_button.${globalIdx + 1}`}
                                    className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Staff Confirmation */}
      <AlertDialog
        open={!!deleteStaffId}
        onOpenChange={(open) => {
          if (!open) setDeleteStaffId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the staff member and all their
              advance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleDeleteStaff}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Advance Confirmation */}
      <AlertDialog
        open={!!deleteAdvanceId}
        onOpenChange={(open) => {
          if (!open) setDeleteAdvanceId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This advance payment record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleDeleteAdvance}
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
