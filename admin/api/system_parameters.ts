import { api, handleApiError } from "../utils/api";
import { toast } from "react-hot-toast";

export interface SystemParameter {
  id: number;
  key: string;
  value?: any;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemColourItem {
  id: string;
  name: string;
  hex: string;
}

export type SystemColours = SystemColourItem[];

export const getAllSystemParameters = async () => {
  try {
    const response = await api.get("/system-parameters");
    return response;
  } catch (error: any) {
    const status = error?.response?.status || error?.status;
    if (status !== 404) {
      handleApiError(error, "Failed to fetch system parameters");
    }
    throw error;
  }
};

export const updateSystemColours = async (colours: any) => {
  try {
    const response = await api.put("/system-parameters/colours", { colours });
    toast.success("System colours updated successfully");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update system colours");
    throw error;
  }
};

export const checkColourInUse = async (hex: string) => {
  try {
    const response = await api.post("/system-parameters/check-colour-in-use", { hex });
    return response;
  } catch (error) {
    return { success: false, inUse: false, count: 0 };
  }
};

export const uploadDocumentTemplate = async (file: File, key: string = "customer_doc_template") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);

    const response = await api.post("/system-parameters/upload-template", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    toast.success("Document template uploaded successfully");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to upload document template");
    throw error;
  }
};

export const deleteDocumentTemplate = async (key: string) => {
  try {
    const response = await api.delete(`/system-parameters/template/${key}`);
    toast.success("Document template deleted successfully");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete document template");
    throw error;
  }
};
