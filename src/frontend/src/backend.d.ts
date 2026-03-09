import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface StaffMember {
    id: bigint;
    name: string;
    role: string;
    monthlySalary: number;
    totalAdvancePaid: number;
}
export interface MilkRecord {
    id: bigint;
    morningQuantity: number;
    morningAmount: number;
    eveningFat: number;
    eveningAmount: number;
    eveningQuantity: number;
    date: string;
    morningFat: number;
}
export interface BuyerAdvancePayment {
    id: bigint;
    date: string;
    amount: number;
    reason: string;
}
export interface Expense {
    id: bigint;
    status: string;
    date: string;
    description: string;
    category: string;
    amount: number;
}
export interface AdvancePayment {
    id: bigint;
    staffId: bigint;
    date: string;
    note: string;
    amount: number;
}
export interface UserProfile {
    name: string;
}
export interface Animal {
    id: bigint;
    name: string;
    serialNumber: string;
    notes: string;
    animalType: string;
    semenDate: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAdvancePayment(staffId: bigint, date: string, amount: number, note: string): Promise<bigint>;
    addAnimal(serialNumber: string, animalType: string, name: string, semenDate: string, notes: string): Promise<bigint>;
    addBuyerAdvancePayment(date: string, amount: number, reason: string): Promise<bigint>;
    addExpense(date: string, description: string, amount: number, category: string, status: string): Promise<bigint>;
    addMilkRecord(date: string, morningQuantity: number, morningFat: number, morningAmount: number, eveningQuantity: number, eveningFat: number, eveningAmount: number): Promise<bigint>;
    addStaffMember(name: string, role: string, monthlySalary: number): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteAdvancePayment(id: bigint): Promise<void>;
    deleteAnimal(id: bigint): Promise<void>;
    deleteBuyerAdvancePayment(id: bigint): Promise<void>;
    deleteExpense(id: bigint): Promise<void>;
    deleteMilkRecord(id: bigint): Promise<void>;
    deleteStaffMember(id: bigint): Promise<void>;
    getAdvancePayments(): Promise<Array<AdvancePayment>>;
    getAnimals(): Promise<Array<Animal>>;
    getBuyerAdvancePayments(): Promise<Array<BuyerAdvancePayment>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getExpenses(): Promise<Array<Expense>>;
    getMilkRecords(): Promise<Array<MilkRecord>>;
    getStaffMembers(): Promise<Array<StaffMember>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markExpensePaid(id: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAnimal(id: bigint, serialNumber: string, animalType: string, name: string, semenDate: string, notes: string): Promise<void>;
    updateBuyerAdvancePayment(id: bigint, date: string, amount: number, reason: string): Promise<void>;
    updateExpense(id: bigint, date: string, description: string, amount: number, category: string, status: string): Promise<void>;
    updateMilkRecord(id: bigint, date: string, morningQuantity: number, morningFat: number, morningAmount: number, eveningQuantity: number, eveningFat: number, eveningAmount: number): Promise<void>;
    updateStaffMember(id: bigint, name: string, role: string, monthlySalary: number): Promise<void>;
}
