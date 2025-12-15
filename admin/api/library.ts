// api/libraryApi.ts
import { api, handleApiError } from "../utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

// Types
export interface LibraryFile {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileType:
    | "IMAGE"
    | "DOCUMENT"
    | "PDF"
    | "SPREADSHEET"
    | "PRESENTATION"
    | "ARCHIVE"
    | "OTHER";
  url: string;
  thumbnailUrl?: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  uploadedBy?: any;
  uploadedById?: string;
  customer?: any;
  customerId?: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface FileFilters {
  search?: string;
  type?: string;
  customerId?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "uploadedAt" | "fileSize" | "originalName";
  sortOrder?: "ASC" | "DESC";
}

export interface FileStats {
  stats: Array<{
    type: string;
    count: number;
    totalSize: number;
  }>;
  totalFiles: number;
  totalSize: number;
}

export interface UploadFilePayload {
  file: File;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  customerId?: string;
}

// API Functions
export const uploadFile = async (formData: FormData) => {
  try {
    toast.loading("Uploading file...", loadingStyles);
    const response = await api.post("/library/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.dismiss();
    toast.success("File uploaded successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to upload file");
    throw error;
  }
};

export const getFiles = async (filters: FileFilters = {}) => {
  try {
    const response = await api.get("/library", { params: filters });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch files");
    throw error;
  }
};

export const getFileStats = async () => {
  try {
    const response = await api.get("/library/stats");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch statistics");
    throw error;
  }
};

export const updateFile = async (
  fileId: string,
  data: Partial<LibraryFile>
) => {
  try {
    toast.loading("Updating file...", loadingStyles);
    const response = await api.patch(`/library/${fileId}`, data);
    toast.dismiss();
    toast.success("File updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update file");
    throw error;
  }
};

export const deleteFile = async (fileId: string) => {
  try {
    toast.loading("Deleting file...", loadingStyles);
    const response = await api.delete(`/library/${fileId}`);
    toast.dismiss();
    toast.success("File deleted successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete file");
    throw error;
  }
};

export const getFileById = async (fileId: string) => {
  try {
    const response = await api.get(`/library/${fileId}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch file");
    throw error;
  }
};
