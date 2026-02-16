export interface ResponseInterface {
  data: any;
  message: string;
  success: boolean;
}

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  SUPPORT = "SUPPORT",
  SALES = "SALES",
  PURCHASING = "PURCHASING",
}

export enum UserStatus {
  VERIFIED = "VERIFIED",
  UNVERIFIED = "UNVERIFIED",
  BLOCKED = "BLOCKED",
  PENDING = "PENDING",
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  address?: string;
  gender?: "MALE" | "FEMALE";
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
}

export interface ResourceConfig {
  name: string;
  actions: string[];
}

export enum DELIVERY_STATUS {
  PENDING = "pending",
  PARTIAL = "partial",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export const INTERVAL_OPTIONS = [
  { value: "monthly", label: "Monatlich" },
  { value: "quarterly", label: "Quartalsweise" },
  { value: "biannually", label: "Halbjährlich" },
  { value: "yearly", label: "Jährlich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "daily", label: "Täglich" },
];

export enum CustomerVerificationStatus {
  PENDING = "pending",
  APPROVED = "verified",
  REJECTED = "rejected",
}

export enum OrderStatus {
  COMPLETED = "completed",
  PROCESSING = "processing",
  PENDING = "pending",
  CANCELLED = "cancelled",
  SHIPPED = "shipped",
}

