import { api, handleApiError } from "../utils/api";

export const getTags = async (category?: string) => {
  try {
    const params = category ? { category } : {};
    const res = await api.get("/tags", { params });
    return res;
  } catch (error) {
    handleApiError(error);
  }
};
export const createTag = async (tagData: { name: string; category: string; color: string }) => {
  try {
    const res = await api.post("/tags", tagData);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateTag = async (id: string, tagData: { name?: string; category?: string; color?: string }) => {
  try {
    const res = await api.put(`/tags/${id}`, tagData);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteTag = async (id: string) => {
  try {
    const res = await api.delete(`/tags/${id}`);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const syncEntityTags = async (entityId: string | number, entityType: string, tagIds: string[]) => {
  try {
    const res = await api.post("/tags/sync", { entityId, entityType, tagIds });
    return res;
  } catch (error) {
    handleApiError(error);
  }
};
