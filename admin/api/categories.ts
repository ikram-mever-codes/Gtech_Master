// categoryApi.ts
import { api, handleApiError } from "../utils/api";

// -------------------- API functions --------------------

// Get all Categories
export const getCategories = async () => {
  try {
    const res = await api.get("/categories");
    //console.log(res);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

