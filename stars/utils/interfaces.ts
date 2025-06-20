export interface ResponseInterface {
  data: any;
  message: string;
  success: boolean;
}

export interface ListItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  notes: string;
  status: "pending" | "approved" | "rejected";
  supplier: string;
  imageUrl?: string;
  deliveryInfo: {
    deliveryDate: string;
    deliveryAddressLine1: string;
    deliveryAddressLine2: string;
    deliveryPostalCode: string;
    deliveryCity: string;
    deliveryCountry: string;
    deliveryNotes: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ListData {
  id: string;
  name: string;
  description: string;
  status: string;
  deliveryDate: string;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  supplier: string;
  imageUrl?: string;
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
