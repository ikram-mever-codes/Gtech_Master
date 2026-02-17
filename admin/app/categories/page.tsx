"use client";
import React, { useEffect, useState } from "react";
import { getCategories } from "@/api/categories";
import { EyeIcon, PencilIcon, TrashIcon } from "lucide-react";
import { UserRole } from "@/utils/interfaces";
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";

const CategoryPage = () => {
  const { user } = useSelector((state: RootState) => state.user);

  const [categories, setCategories] = useState([]);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      if (response?.data) {
        setCategories(
          Array.isArray(response.data)
            ? response.data
            : response.data.categories || [],
        );
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  function handleViewCategory(Category: any): void {
    throw new Error("Function not implemented.");
  }

  function handleEditCategory(Category: any): void {
    throw new Error("Function not implemented.");
  }

  function handleDeleteCategory(id: any): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div>
      Category page
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((cat: any) => (
              <React.Fragment key={cat.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {cat.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">{cat.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewCategory(categories)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditCategory(categories)}
                        className="text-gray-600 hover:text-gray-800 transition-colors p-1"
                        title="Edit Order"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>

                      {user?.role === UserRole.ADMIN && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                          title="Delete Order"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default CategoryPage;
