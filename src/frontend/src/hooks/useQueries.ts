import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdvancePayment,
  Animal,
  BuyerAdvancePayment,
  Expense,
  MilkRecord,
  StaffMember,
} from "../backend.d";
import { useActor } from "./useActor";

// ─── Admin Role ──────────────────────────────────────────────────────────────

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });
}

// ─── Milk Records ───────────────────────────────────────────────────────────

export function useGetMilkRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<MilkRecord[]>({
    queryKey: ["milkRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMilkRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddMilkRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      date: string;
      morningQuantity: number;
      morningFat: number;
      morningAmount: number;
      eveningQuantity: number;
      eveningFat: number;
      eveningAmount: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addMilkRecord(
        data.date,
        data.morningQuantity,
        data.morningFat,
        data.morningAmount,
        data.eveningQuantity,
        data.eveningFat,
        data.eveningAmount,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["milkRecords"] }),
  });
}

export function useUpdateMilkRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      date: string;
      morningQuantity: number;
      morningFat: number;
      morningAmount: number;
      eveningQuantity: number;
      eveningFat: number;
      eveningAmount: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateMilkRecord(
        data.id,
        data.date,
        data.morningQuantity,
        data.morningFat,
        data.morningAmount,
        data.eveningQuantity,
        data.eveningFat,
        data.eveningAmount,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["milkRecords"] }),
  });
}

export function useDeleteMilkRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteMilkRecord(id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["milkRecords"] }),
  });
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export function useGetExpenses() {
  const { actor, isFetching } = useActor();
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExpenses();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      date: string;
      description: string;
      amount: number;
      category: string;
      status: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addExpense(
        data.date,
        data.description,
        data.amount,
        data.category,
        data.status,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useUpdateExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      date: string;
      description: string;
      amount: number;
      category: string;
      status: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateExpense(
        data.id,
        data.date,
        data.description,
        data.amount,
        data.category,
        data.status,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteExpense(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useMarkExpensePaid() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.markExpensePaid(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export function useGetStaffMembers() {
  const { actor, isFetching } = useActor();
  return useQuery<StaffMember[]>({
    queryKey: ["staffMembers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getStaffMembers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddStaffMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      role: string;
      monthlySalary: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addStaffMember(data.name, data.role, data.monthlySalary);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["staffMembers"] }),
  });
}

export function useUpdateStaffMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      name: string;
      role: string;
      monthlySalary: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateStaffMember(
        data.id,
        data.name,
        data.role,
        data.monthlySalary,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["staffMembers"] }),
  });
}

export function useDeleteStaffMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteStaffMember(id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["staffMembers"] }),
  });
}

// ─── Advance Payments ────────────────────────────────────────────────────────

export function useGetAdvancePayments() {
  const { actor, isFetching } = useActor();
  return useQuery<AdvancePayment[]>({
    queryKey: ["advancePayments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAdvancePayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddAdvancePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      staffId: bigint;
      date: string;
      amount: number;
      note: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addAdvancePayment(
        data.staffId,
        data.date,
        data.amount,
        data.note,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advancePayments"] });
      queryClient.invalidateQueries({ queryKey: ["staffMembers"] });
    },
  });
}

export function useDeleteAdvancePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteAdvancePayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advancePayments"] });
      queryClient.invalidateQueries({ queryKey: ["staffMembers"] });
    },
  });
}

// ─── Buyer Advance Payments ──────────────────────────────────────────────────

export function useGetBuyerAdvancePayments() {
  const { actor, isFetching } = useActor();
  return useQuery<BuyerAdvancePayment[]>({
    queryKey: ["buyerAdvancePayments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBuyerAdvancePayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddBuyerAdvancePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      date: string;
      amount: number;
      reason: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addBuyerAdvancePayment(data.date, data.amount, data.reason);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyerAdvancePayments"] }),
  });
}

export function useUpdateBuyerAdvancePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      date: string;
      amount: number;
      reason: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateBuyerAdvancePayment(
        data.id,
        data.date,
        data.amount,
        data.reason,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyerAdvancePayments"] }),
  });
}

export function useDeleteBuyerAdvancePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteBuyerAdvancePayment(id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["buyerAdvancePayments"] }),
  });
}

// ─── Animals ─────────────────────────────────────────────────────────────────

export function useGetAnimals() {
  const { actor, isFetching } = useActor();
  return useQuery<Animal[]>({
    queryKey: ["animals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAnimals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddAnimal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      serialNumber: string;
      animalType: string;
      name: string;
      semenDate: string;
      notes: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addAnimal(
        data.serialNumber,
        data.animalType,
        data.name,
        data.semenDate,
        data.notes,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["animals"] }),
  });
}

export function useUpdateAnimal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      serialNumber: string;
      animalType: string;
      name: string;
      semenDate: string;
      notes: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateAnimal(
        data.id,
        data.serialNumber,
        data.animalType,
        data.name,
        data.semenDate,
        data.notes,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["animals"] }),
  });
}

export function useDeleteAnimal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteAnimal(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["animals"] }),
  });
}
