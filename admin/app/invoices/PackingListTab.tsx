"use client";
import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  FileText,
  Download,
  Eye,
  RefreshCw,
  Printer,
  Edit,
  FileDown,
  Save,
} from "lucide-react";
import { getAllInvoices } from "@/api/invoice";
import { toast } from "react-hot-toast";

interface PackingListData {
  id: string;
  invoiceNumber: string;
  cargoNo?: string;
  customer?: {
    companyName: string;
  };
  invoiceDate: string;
  status: string;
  items?: any[];
  customItemCount?: number;
}

const PackingListTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [packingLists, setPackingLists] = useState<PackingListData[]>([]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await getAllInvoices();
      if (response && response.data) {
        setPackingLists(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices for packing list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredData = packingLists.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.invoiceNumber?.toLowerCase().includes(searchLower) ||
      item.customer?.companyName?.toLowerCase().includes(searchLower) ||
      item.cargoNo?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col gap-6 font-['Poppins']">
      <div className="bg-white border border-[#E9ECEF] rounded-[4px] shadow-sm overflow-hidden">
        <div className="grid grid-cols-9 gap-0 border-b border-[#E9ECEF] bg-[#F8F9FA]">
          {[
            "Description",
            "Qty",
            "Client",
            "Package",
            "P. Type",
            "Weight (kg)",
            "Length (cm)",
            "Width (cm)",
            "Height (cm)",
          ].map((header) => (
            <div
              key={header}
              className="py-3 px-2 text-center text-[12px] font-bold text-[#212529] border-r border-[#E9ECEF] last:border-r-0"
            >
              {header}
            </div>
          ))}
        </div>
        <div className="p-4 flex justify-center bg-white">
          <button
            onClick={() => toast.success("Feature coming soon!")}
            className="flex items-center gap-2 px-6 py-2 bg-[#10B981] text-white rounded-[6px] text-[13px] font-bold shadow-sm hover:bg-[#059669] transition-all"
          >
            <div className="bg-white/20 p-0.5 rounded-full">
              <Plus className="w-3.5 h-3.5" />
            </div>
            Save Paking List
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#DEE2E6] rounded-[4px] focus:outline-none focus:border-[#10B981] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={fetchInvoices}
          className="p-2 border border-[#DEE2E6] rounded-[4px] hover:bg-gray-50 text-[#495057] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white border border-[#E9ECEF] rounded-[4px] shadow-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F1F3F5] border-b border-[#DEE2E6]">
              <th className="py-3 px-4 text-left text-[12px] font-bold text-[#495057] w-[60px]">
                No.
              </th>
              <th className="py-3 px-4 text-left text-[12px] font-bold text-[#495057]">
                Cargo No.
              </th>
              <th className="py-3 px-4 text-left text-[12px] font-bold text-[#495057]">
                Invoice No.
              </th>
              <th className="py-3 px-4 text-left text-[12px] font-bold text-[#495057]">
                Date Created
              </th>
              <th className="py-3 px-4 text-left text-[12px] font-bold text-[#495057] text-center">
                Count Items
              </th>
              <th className="py-3 px-4 text-center text-[12px] font-bold text-[#495057] w-[250px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9ECEF]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#10B981] mb-2" />
                  <p className="text-sm text-[#6C757D]">Loading...</p>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#6C757D] text-sm">
                  No records found
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#F8F9FA] transition-colors group"
                >
                  <td className="py-3 px-4 text-[13px] font-medium text-[#4F46E5]">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#212529]">
                    {item.cargoNo || "-"}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#212529]">
                    {item.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#212529]">
                    {item.invoiceDate}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#212529] text-center">
                    {item.customItemCount || item.items?.length || 0}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toast.success("Edit feature coming soon!")}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#10B981] text-white rounded-[4px] text-[12px] font-bold hover:bg-[#059669] transition-all shadow-sm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => toast.success("PDF feature coming soon!")}
                        className="p-1.5 border border-[#DEE2E6] rounded-[4px] hover:bg-red-50 group/pdf transition-all bg-white"
                        title="Print PDF"
                      >
                        <div className="relative">
                          <FileText className="w-5 h-5 text-gray-400 group-hover/pdf:text-red-500 transition-colors" />
                          <div className="absolute -bottom-1 -right-1 bg-red-500 text-[6px] text-white px-0.5 rounded font-bold">
                            PDF
                          </div>
                        </div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PackingListTab;
