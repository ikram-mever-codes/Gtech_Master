import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

export type ResetPolicy = "never" | "monthly" | "yearly";

export interface NumberSequence {
  id: string;
  sequenceKey: string;
  name: string;
  prefix: string;
  formatPattern: string;
  nextRunningNo: number;
  minDigits: number;
  resetPolicy: ResetPolicy;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNumberSequencePayload {
  sequenceKey: string;
  name: string;
  prefix: string;
  formatPattern?: string;
  minDigits?: number;
  resetPolicy?: ResetPolicy;
  startingNumber?: number;
  isActive?: boolean;
}

export interface UpdateNumberSequencePayload {
  name?: string;
  prefix?: string;
  formatPattern?: string;
  minDigits?: number;
  resetPolicy?: ResetPolicy;
  isActive?: boolean;
}

export const getAllNumberSequences = async () => {
  try {
    const response: any = await api.get("/number-sequences");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch number sequences");
    throw error;
  }
};

export const getNumberSequenceByKey = async (sequenceKey: string) => {
  try {
    const response: any = await api.get(`/number-sequences/${sequenceKey}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch number sequence");
    throw error;
  }
};

export const createNumberSequence = async (
  payload: CreateNumberSequencePayload,
) => {
  try {
    toast.loading("Creating number sequence...", loadingStyles);
    const response: any = await api.post("/number-sequences", payload);
    toast.dismiss();
    toast.success("Number sequence created successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create number sequence");
    throw error;
  }
};

export const updateNumberSequence = async (
  sequenceKey: string,
  payload: UpdateNumberSequencePayload,
) => {
  try {
    toast.loading("Updating number sequence...", loadingStyles);
    const response: any = await api.put(
      `/number-sequences/${sequenceKey}`,
      payload,
    );
    toast.dismiss();
    toast.success("Number sequence updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update number sequence");
    throw error;
  }
};

export const deactivateNumberSequence = async (sequenceKey: string) => {
  try {
    toast.loading("Deactivating number sequence...", loadingStyles);
    await api.delete(`/number-sequences/${sequenceKey}`);
    toast.dismiss();
    toast.success("Number sequence deactivated successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Failed to deactivate number sequence");
    throw error;
  }
};
