"use client";
import React, { useState, useEffect } from "react";
import {
  Search,
  FileText,
  RefreshCw,
  Edit,
  X,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";
import { getAllInvoices } from "@/api/invoice";
import { toast } from "react-hot-toast";

interface PackingListData {
  id: string;
  invoiceNumber: string;
  cargoNo?: string;
  customer?: { companyName: string };
  invoiceDate: string;
  status: string;
  items?: any[];
  customItemCount?: number;
}

interface PackingItem {
  id: string | number;
  description: string;
  qty: number;
  client: string;
  package: string;
  pType: string;
  weight: number;
  length: number;
  width: number;
  height: number;
}

const P_TYPE_OPTIONS = ["Tray", "Box", "Pallet", "Carton", "Bag", "Other"];

const PackingListTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [packingLists, setPackingLists] = useState<PackingListData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<PackingItem[]>([]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await getAllInvoices();
      if (response && response.data) setPackingLists(response.data);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filteredData = packingLists.filter((item) => {
    const s = searchTerm.toLowerCase();
    return (
      item.invoiceNumber?.toLowerCase().includes(s) ||
      item.customer?.companyName?.toLowerCase().includes(s) ||
      item.cargoNo?.toLowerCase().includes(s)
    );
  });

  const handleEditClick = (invoice: PackingListData) => {
    if (editingId === invoice.id) {
      setEditingId(null);
      setEditItems([]);
      return;
    }
    const items: PackingItem[] = (invoice.items || []).map((it: any, idx: number) => ({
      id: it.id || idx,
      description: it.description || it.item?.item_name || "Unknown",
      qty: Number(it.quantity || it.qty || 0),
      client: invoice.customer?.companyName || "",
      package: `P${idx + 1}`,
      pType: "Tray",
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
    }));
    setEditItems(items);
    setEditingId(invoice.id);
  };

  const updateItem = (idx: number, field: keyof PackingItem, value: any) =>
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const cyclePType = (idx: number, dir: "up" | "down") => {
    const cur = P_TYPE_OPTIONS.indexOf(editItems[idx].pType);
    const next = dir === "up"
      ? (cur - 1 + P_TYPE_OPTIONS.length) % P_TYPE_OPTIONS.length
      : (cur + 1) % P_TYPE_OPTIONS.length;
    updateItem(idx, "pType", P_TYPE_OPTIONS[next]);
  };

  const handleSave = () => {
    toast.success("Packing list saved! (Backend coming soon)");
    setEditingId(null);
    setEditItems([]);
  };

  const editingInvoice = packingLists.find((p) => p.id === editingId);

  return (
    <div className="flex flex-col gap-6 font-['Poppins']">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
          <input
            type="text"
            placeholder="Search by cargo, invoice..."
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
              {["No.", "Cargo No.", "Invoice No.", "Date Created", "Count Items", "Actions"].map((h) => (
                <th key={h} className="py-3 px-4 text-left text-[12px] font-bold text-[#495057]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#10B981] mb-2" />
                  <p className="text-sm text-[#6C757D]">Loading...</p>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#6C757D] text-sm">No records found</td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <React.Fragment key={item.id}>
                  <tr className={`border-b border-[#E9ECEF] transition-colors ${editingId === item.id
                    ? "bg-[#F0FDF9] border-b-0"
                    : "hover:bg-[#F8F9FA]"
                    }`}>
                    <td className="py-3 px-4 text-[13px] font-medium text-[#4F46E5]">{index + 1}</td>
                    <td className="py-3 px-4 text-[13px] text-[#212529]">{item.cargoNo || "-"}</td>
                    <td className="py-3 px-4 text-[13px] text-[#212529]">{item.invoiceNumber}</td>
                    <td className="py-3 px-4 text-[13px] text-[#212529]">
                      {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-[13px] text-[#212529] text-center">
                      {item.customItemCount || item.items?.length || 0}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEditClick(item)}
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-[4px] text-[12px] font-bold transition-all shadow-sm ${editingId === item.id
                            ? "bg-[#059669] text-white"
                            : "bg-[#10B981] text-white hover:bg-[#059669]"
                            }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          {editingId === item.id ? "Close" : "Edit"}
                        </button>
                        <button
                          onClick={() => toast.success("PDF feature coming soon!")}
                          className="p-1.5 border border-[#DEE2E6] rounded-[4px] hover:bg-red-50 group/pdf transition-all bg-white"
                          title="Print PDF"
                        >
                          <div className="relative">
                            <FileText className="w-5 h-5 text-gray-400 group-hover/pdf:text-red-500 transition-colors" />
                            <div className="absolute -bottom-1 -right-1 bg-red-500 text-[6px] text-white px-0.5 rounded font-bold">PDF</div>
                          </div>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === item.id && (
                    <tr>
                      <td colSpan={6} className="p-0 border-b-2 border-[#10B981]">
                        <div className="bg-white">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#343A40]">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                              <span className="text-[12px] font-bold text-white">
                                Packing List
                              </span>
                              <span className="text-[11px] text-[#ADB5BD]">
                                — {item.invoiceNumber}
                                {item.cargoNo ? ` · ${item.cargoNo}` : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSave}
                                className="flex items-center gap-1.5 px-3 py-1 bg-[#10B981] text-white rounded-[4px] text-[11px] font-bold hover:bg-[#059669] transition-all"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditItems([]); }}
                                className="p-1 rounded hover:bg-white/10 transition-all"
                              >
                                <X className="w-3.5 h-3.5 text-[#ADB5BD]" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 860 }}>
                              <thead>
                                <tr className="bg-[#495057]">
                                  {[
                                    { label: "Goods Description", w: "w-[220px]" },
                                    { label: "Qty", w: "w-[60px]" },
                                    { label: "Client", w: "w-[110px]" },
                                    { label: "Package", w: "w-[85px]" },
                                    { label: "P. Type", w: "w-[85px]" },
                                    { label: "Weight (kg)", w: "w-[85px]" },
                                    { label: "Length (cm)", w: "w-[85px]" },
                                    { label: "Width (cm)", w: "w-[85px]" },
                                    { label: "Height (cm)", w: "w-[85px]" },
                                  ].map((col) => (
                                    <th
                                      key={col.label}
                                      className={`${col.w} py-2 px-2 text-[10px] font-bold text-white text-center border-r border-[#6C757D] last:border-r-0`}
                                    >
                                      {col.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {editItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="py-6 text-center text-[#ADB5BD] text-sm">
                                      No items found for this invoice
                                    </td>
                                  </tr>
                                ) : (
                                  editItems.map((pItem, idx) => (
                                    <tr
                                      key={pItem.id}
                                      className={`border-b border-[#E9ECEF] ${idx % 2 === 0 ? "bg-[#EAF5E5]" : "bg-white"} hover:bg-[#D4EDDA] transition-colors`}
                                    >
                                      <td className="px-2 py-1.5 border-r border-[#DEE2E6]">
                                        <input
                                          value={pItem.description}
                                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                                          className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-[#10B981] rounded px-1 py-0.5 text-[#212529] font-medium text-[11px]"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-[#DEE2E6]">
                                        <input
                                          type="number"
                                          value={pItem.qty}
                                          onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                                          className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-[#10B981] rounded px-1 py-0.5 text-center text-[#212529] font-medium text-[11px]"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-[#DEE2E6]">
                                        <div className="flex items-center gap-0.5">
                                          <input
                                            value={pItem.client}
                                            onChange={(e) => updateItem(idx, "client", e.target.value)}
                                            className="flex-1 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-[#10B981] rounded px-1 py-0.5 text-[#E8A000] font-semibold text-[11px]"
                                          />
                                          <div className="flex flex-col">
                                            <ChevronUp className="w-2.5 h-2.5 text-[#ADB5BD] cursor-pointer hover:text-[#10B981]" />
                                            <ChevronDown className="w-2.5 h-2.5 text-[#ADB5BD] cursor-pointer hover:text-[#10B981]" />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-[#DEE2E6]">
                                        <div className="flex items-center gap-0.5">
                                          <input
                                            value={pItem.package}
                                            onChange={(e) => updateItem(idx, "package", e.target.value)}
                                            className="flex-1 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-[#10B981] rounded px-1 py-0.5 text-center text-[#212529] font-medium text-[11px]"
                                          />
                                          <div className="flex flex-col">
                                            <ChevronUp className="w-2.5 h-2.5 text-[#ADB5BD] cursor-pointer hover:text-[#10B981]" />
                                            <ChevronDown className="w-2.5 h-2.5 text-[#ADB5BD] cursor-pointer hover:text-[#10B981]" />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-[#DEE2E6]">
                                        <div className="flex items-center justify-between gap-0.5">
                                          <span className="flex-1 text-center text-[#212529] font-medium text-[11px]">{pItem.pType}</span>
                                          <div className="flex flex-col">
                                            <ChevronUp onClick={() => cyclePType(idx, "up")} className="w-2.5 h-2.5 text-[#ADB5BD] cursor-pointer hover:text-[#10B981]" />
                                            <ChevronDown onClick={() => cyclePType(idx, "down")} className="w-2.5 h-2.5 text-[#ADB5BD] cursor-pointer hover:text-[#10B981]" />
                                          </div>
                                        </div>
                                      </td>
                                      {(["weight", "length", "width", "height"] as const).map((field, fi) => (
                                        <td key={field} className={`px-2 py-1.5 ${fi < 3 ? "border-r border-[#DEE2E6]" : ""}`}>
                                          <input
                                            type="number"
                                            value={pItem[field]}
                                            onChange={(e) => updateItem(idx, field, Number(e.target.value))}
                                            className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-[#10B981] rounded px-1 py-0.5 text-center text-[#212529] font-medium text-[11px]"
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center gap-6 px-4 py-2 bg-[#343A40] border-t border-[#4A5568]">
                            <span className="text-[10px] font-bold text-[#ADB5BD]">
                              Items: <span className="text-[#10B981]">{editItems.length}</span>
                            </span>
                            <span className="text-[10px] font-bold text-[#ADB5BD]">
                              Total Qty: <span className="text-[#10B981]">{editItems.reduce((s, it) => s + it.qty, 0)}</span>
                            </span>
                            <span className="text-[10px] font-bold text-[#ADB5BD]">
                              Total Weight: <span className="text-[#10B981]">{editItems.reduce((s, it) => s + it.weight, 0)} kg</span>
                            </span>
                            <div className="ml-auto flex gap-2">
                              <button
                                onClick={() => { setEditingId(null); setEditItems([]); }}
                                className="px-3 py-1 border border-[#4A5568] text-[#ADB5BD] rounded-[4px] text-[11px] hover:bg-white/10 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSave}
                                className="flex items-center gap-1.5 px-4 py-1 bg-[#10B981] text-white rounded-[4px] text-[11px] font-bold hover:bg-[#059669] transition-all"
                              >
                                <Save className="w-3 h-3" />
                                Save Packing List
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PackingListTab;
