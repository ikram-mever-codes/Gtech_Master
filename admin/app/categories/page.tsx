"use client";

import React, { useEffect, useState } from "react";
import { getCategories } from "@/api/categories";
import { Layers, RefreshCw } from "lucide-react";
import MasterPageLayout from "@/components/General/MasterPageLayout";

export default function CategoryPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
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
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filterBar = (
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-gray-500 font-poppins">
        Standard Categorization (Read-Only)
      </span>
      <button
        onClick={fetchCategories}
        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all flex items-center gap-1.5 text-xs font-semibold"
        title="Refresh"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500 font-poppins">
            Loading categories...
          </span>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center">
          <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">No categories found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Category ID</th>
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Description / DE Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {categories.map((cat: any) => (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4.5 font-mono text-gray-500">
                    {cat.id}
                  </td>
                  <td className="px-6 py-4.5 font-semibold text-gray-900">
                    {cat.name}
                  </td>
                  <td className="px-6 py-4.5 text-gray-600">
                    {cat.de_cat || "Standard Type"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <MasterPageLayout
      title="Category Settings"
      icon={Layers}
      filterBar={filterBar}
      tableContent={tableContent}
    />
  );
}
