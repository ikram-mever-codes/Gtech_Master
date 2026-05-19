import { api, handleApiError } from "../utils/api";

export type AuditItem = {
  label: string;
  count: number;
  type: string;
};

export type ControlDataResponse = {
  orders: AuditItem[];
  items: AuditItem[];
  suppliers: AuditItem[];
  pictures: AuditItem[];
};

export type CurrencyRateItem = {
  label: string;
  rate: string | number;
  symbol: string;
};

export type DashboardReportsResponse = {
  success: boolean;
  data: {
    currencyRates: {
      date: string;
      rates: {
        EUR: number;
        USD: number;
        RMB: number;
      };
    };
    controlData: ControlDataResponse;
  };
};

export const getDashboardReports = async (): Promise<DashboardReportsResponse> => {
  try {
    const response = await api.get("/dashboard/reports-control");
    return response as any;
  } catch (error) {
    handleApiError(error, "Failed to load dashboard reports");
    throw error;
  }
};
