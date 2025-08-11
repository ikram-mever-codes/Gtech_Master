import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";

// Types
interface InvoiceResponse {
  data: any;
  message: string;
}

interface InvoiceItem {
  quantity: number;
  articleNumber?: string;
  description: string;
  unitPrice: number;
  netPrice: number;
  taxRate: number;
  taxAmount: number;
  grossPrice: number;
}

interface CreateInvoicePayload {
  customerId: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentMethod: string;
  shippingMethod: string;
  notes?: string;
  items: InvoiceItem[];
}

interface UpdateInvoicePayload extends Partial<CreateInvoicePayload> {
  id: string;
}

// Invoice Functions
export const createNewInvoice = async (invoiceData: CreateInvoicePayload) => {
  try {
    toast.loading("Creating invoice...", loadingStyles);
    const response = await api.post<InvoiceResponse>("/invoices", invoiceData);
    toast.dismiss();
    toast.success("Invoice created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Invoice creation failed");
    throw error;
  }
};

export const updateInvoice = async (invoiceData: UpdateInvoicePayload) => {
  try {
    toast.loading("Updating invoice...", loadingStyles);
    const response = await api.put<InvoiceResponse>(
      `/invoices/${invoiceData.id}`,
      invoiceData
    );
    toast.dismiss();
    toast.success("Invoice updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Invoice update failed");
    throw error;
  }
};

export const deleteInvoice = async (invoiceId: string) => {
  try {
    toast.loading("Deleting invoice...", loadingStyles);
    await api.delete(`/invoices/${invoiceId}`);
    toast.dismiss();
    toast.success("Invoice deleted successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Invoice deletion failed");
    throw error;
  }
};

export const getAllInvoices = async () => {
  try {
    const response = await api.get<InvoiceResponse>("/invoices");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch invoices");
    throw error;
  }
};

export const getInvoiceById = async (invoiceId: string) => {
  try {
    const response = await api.get<InvoiceResponse>(`/invoices/${invoiceId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch invoice");
    throw error;
  }
};

export const getInvoicesByCustomer = async (customerId: string) => {
  try {
    const response = await api.get<InvoiceResponse>(
      `/invoices/customer/${customerId}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch customer invoices");
    throw error;
  }
};

// PDF Generation
export const generateInvoicePdf = async (invoiceId: string) => {
  try {
    toast.loading("Generating PDF...", loadingStyles);
    const response = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });

    toast.dismiss();
    toast.success("PDF generated successfully", successStyles);

    // Create blob URL for download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `invoice_${invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    handleApiError(error, "PDF generation failed");
    throw error;
  }
};

// Email Functions
export const sendInvoiceEmail = async (invoiceId: string, email?: string) => {
  try {
    toast.loading("Sending invoice...", loadingStyles);
    const response = await api.post<InvoiceResponse>(
      `/invoices/${invoiceId}/send`,
      { email }
    );
    toast.dismiss();
    toast.success("Invoice sent successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to send invoice");
    throw error;
  }
};

// Status Management
export const markInvoiceAsPaid = async (invoiceId: string) => {
  try {
    toast.loading("Updating invoice status...", loadingStyles);
    const response = await api.patch<InvoiceResponse>(
      `/invoices/${invoiceId}/paid`
    );
    toast.dismiss();
    toast.success("Invoice marked as paid", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update invoice status");
    throw error;
  }
};

export const cancelInvoice = async (invoiceId: string) => {
  try {
    toast.loading("Cancelling invoice...", loadingStyles);
    const response = await api.patch<InvoiceResponse>(
      `/invoices/${invoiceId}/cancel`
    );
    toast.dismiss();
    toast.success("Invoice cancelled", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to cancel invoice");
    throw error;
  }
};
