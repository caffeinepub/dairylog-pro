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
import {
  useAddAnimal,
  useDeleteAnimal,
  useGetAnimals,
  useUpdateAnimal,
} from "@/hooks/useQueries";
import { Beef, Loader2, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Animal } from "../backend.d";

interface FormData {
  serialNumber: string;
  animalType: string;
  name: string;
  semenDate: string;
  notes: string;
}

const emptyForm = (): FormData => ({
  serialNumber: "",
  animalType: "cow",
  name: "",
  semenDate: "",
  notes: "",
});

export function AnimalsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: animals = [], isLoading } = useGetAnimals();
  const addMutation = useAddAnimal();
  const updateMutation = useUpdateAnimal();
  const deleteMutation = useDeleteAnimal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Animal | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [filterType, setFilterType] = useState<"all" | "cow" | "buffalo">(
    "all",
  );

  const totalCows = animals.filter((a) => a.animalType === "cow").length;
  const totalBuffalos = animals.filter(
    (a) => a.animalType === "buffalo",
  ).length;

  const filtered = [...animals]
    .filter((a) => filterType === "all" || a.animalType === filterType)
    .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (animal: Animal) => {
    setEditing(animal);
    setForm({
      serialNumber: animal.serialNumber,
      animalType: animal.animalType,
      name: animal.name,
      semenDate: animal.semenDate,
      notes: animal.notes,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.serialNumber.trim()) {
      toast.error("Serial Number is required");
      return;
    }
    if (!form.animalType) {
      toast.error("Animal type is required");
      return;
    }

    if (editing) {
      updateMutation.reset();
    } else {
      addMutation.reset();
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          serialNumber: form.serialNumber.trim(),
          animalType: form.animalType,
          name: form.name.trim(),
          semenDate: form.semenDate,
          notes: form.notes.trim(),
        });
        toast.success("Animal record updated");
      } else {
        await addMutation.mutateAsync({
          serialNumber: form.serialNumber.trim(),
          animalType: form.animalType,
          name: form.name.trim(),
          semenDate: form.semenDate,
          notes: form.notes.trim(),
        });
        toast.success("Animal record added");
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
      toast.success("Animal record deleted");
    } catch {
      toast.error("Failed to delete animal record");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  const summaryCards = [
    {
      label: "Total Cows",
      value: totalCows.toString(),
      icon: "🐄",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Total Buffalos",
      value: totalBuffalos.toString(),
      icon: "🐃",
      color: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
    },
    {
      label: "Total Animals",
      value: animals.length.toString(),
      icon: "🌿",
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-lg p-4 shadow-sm border ${card.border} ${card.bg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1">
            {(["all", "cow", "buffalo"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                data-ocid="animals.filter.tab"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterType === type
                    ? "bg-green-600 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {type === "all"
                  ? `All (${animals.length})`
                  : type === "cow"
                    ? `Cows (${totalCows})`
                    : `Buffalos (${totalBuffalos})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              data-ocid="animals.print_button"
              className="gap-1.5 no-print"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={openAdd}
                data-ocid="animals.add_button"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Animal
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3" data-ocid="animals.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="animals.empty_state"
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <Beef className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No animals recorded yet</p>
            <p className="text-sm mt-1">
              {filterType === "all"
                ? isAdmin
                  ? "Add your first animal to start tracking"
                  : "No animals have been added yet"
                : `No ${filterType === "cow" ? "cows" : "buffalos"} recorded`}
            </p>
            {filterType === "all" && isAdmin && (
              <Button onClick={openAdd} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-4 w-4" />
                Add Animal
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="animals.table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Serial No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Semen Date</TableHead>
                  <TableHead>Notes</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((animal, idx) => (
                  <TableRow
                    key={animal.id.toString()}
                    data-ocid={`animals.item.${idx + 1}`}
                    className="hover:bg-muted/40"
                  >
                    <TableCell className="font-semibold text-green-700">
                      #{animal.serialNumber}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                          animal.animalType === "cow"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {animal.animalType === "cow" ? "🐄" : "🐃"}
                        {animal.animalType === "cow" ? "Cow" : "Buffalo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {animal.name || (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {animal.semenDate ? (
                        new Date(
                          `${animal.semenDate}T00:00:00`,
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                      {animal.notes || <span className="text-xs">—</span>}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(animal)}
                            data-ocid={`animals.edit_button.${idx + 1}`}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(animal.id)}
                            data-ocid={`animals.delete_button.${idx + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="animals.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Animal Record" : "Add Animal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="animal-serial">
                  Serial Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="animal-serial"
                  value={form.serialNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, serialNumber: e.target.value }))
                  }
                  placeholder="e.g. 001"
                  className="mt-1"
                  data-ocid="animals.serial_number.input"
                />
              </div>
              <div>
                <Label htmlFor="animal-type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.animalType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, animalType: v }))
                  }
                >
                  <SelectTrigger
                    id="animal-type"
                    className="mt-1"
                    data-ocid="animals.type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cow">🐄 Cow</SelectItem>
                    <SelectItem value="buffalo">🐃 Buffalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="animal-name">Name (optional)</Label>
              <Input
                id="animal-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Lakshmi"
                className="mt-1"
                data-ocid="animals.name.input"
              />
            </div>

            <div>
              <Label htmlFor="animal-semen-date">Semen Date (optional)</Label>
              <Input
                id="animal-semen-date"
                type="date"
                value={form.semenDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, semenDate: e.target.value }))
                }
                className="mt-1"
                data-ocid="animals.semen_date.input"
              />
            </div>

            <div>
              <Label htmlFor="animal-notes">Notes (optional)</Label>
              <Input
                id="animal-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any additional notes..."
                className="mt-1"
                data-ocid="animals.notes.input"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="animals.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="animals.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Animal"}
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
        <AlertDialogContent data-ocid="animals.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Animal Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the animal record. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="animals.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleDelete}
              data-ocid="animals.delete.confirm_button"
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
