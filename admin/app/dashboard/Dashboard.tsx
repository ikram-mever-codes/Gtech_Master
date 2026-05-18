"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Package,
  Truck,
  Image as ImageIcon,
  DollarSign,
  ArrowLeft,
  Coins,
  TrendingUp,
  Globe
} from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";

const currencyRates = {
  EUR: { label: "Euro", rate: "1", symbol: "€" },
  USD: { label: "US Dollar", rate: "1.16", symbol: "$" },
  RMB: { label: "Chinese Yuan", rate: "7.92", symbol: "¥" }
};

const controlData = {
  orders: [
    { label: "Order items unassigned to cargo", count: 74 },
    { label: "Orders with purchase problem", count: 0 },
    { label: "Orders with Check Problem", count: 0 },
    { label: "RMB Special SET with no value", count: 20 },
    { label: "EUR Special SET with no value", count: 18 },
    { label: "Dimention Special SET with no value", count: 1 }
  ],
  items: [
    { label: "Missing Var Values EN", count: 38 },
    { label: "Items with No Taric Code", count: 0 },
    { label: "Items with mismatched tarics", count: 0 },
    { label: "Items with null category", count: 0 },
    { label: "Items with wrong shipping class (Na)", count: 529 }
  ],
  suppliers: [
    { label: "Items without suppliers", count: 0 },
    { label: "Items without RMB Price", count: 4 },
    { label: "Items isPO ='No' with URL='null'", count: 16 },
    { label: "Suppliers items isPO ='null'", count: 165 }
  ],
  pictures: [
    { label: "Is New Picture Required", count: 13 },
    { label: "List unused pictures", count: 4 },
    { label: "Items without picture", count: 11 },
    { label: "Picture with multiple parents", count: 1 }
  ]
};

export default function Dashboard() {
  const router = useRouter();
  const [todayDate, setTodayDate] = useState("2026-05-18");

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setTodayDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const handleBack = () => {
    router.push("/scheduled");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#212529] font-['Poppins'] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E9ECEF]">
          <div>
            <PageHeader title="Reports & Control" icon={ClipboardList} />
            <p className="text-sm text-gray-500 mt-1 font-medium">
              System health audit, live currency tracking, and data integrity metrics.
            </p>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-[#212529] border border-[#E9ECEF] rounded-[4px] shadow-sm font-semibold transition-all duration-200 active:scale-95 text-sm"
            style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
            Back
          </button>
        </div>

        {/* Currency Rates Section - Styled like Gtech Dashboard Widget */}
        <div
          className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
        >
          <div
            className="px-6 py-4 border-b border-[#E9ECEF] flex items-center justify-between"
            style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#8CC21B]">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                Today <span className="text-[#8CC21B] font-extrabold">{todayDate}</span> Currency Rates
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <Globe className="w-3.5 h-3.5" />
              Live Rates
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(currencyRates).map(([key, item]) => (
              <div
                key={key}
                className="bg-[#F8F9FA] rounded-lg p-5 border border-[#E9ECEF] hover:border-[#8CC21B]/40 hover:bg-white transition-all duration-300 flex justify-between items-center group"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    {item.label} ({key})
                  </span>
                  <div className="text-3xl font-extrabold text-[#212529] tracking-tight">
                    <span className="text-[#8CC21B] font-bold text-2xl mr-1">{item.symbol}</span>
                    {item.rate}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white border border-[#E9ECEF] flex items-center justify-center text-lg font-bold text-gray-600 group-hover:bg-[#E8F4D6] group-hover:text-[#6B8F1A] group-hover:border-transparent transition-all duration-300">
                  {key}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2x2 Grid of Audit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Orders Card */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
          >
            <div
              className="px-6 py-4 border-b border-[#E9ECEF] flex items-center gap-3"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1.5 rounded bg-blue-50">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-[#212529]">Orders</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {controlData.orders.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="text-blue-600 hover:text-blue-800 hover:underline text-[14px] font-semibold cursor-pointer transition-colors">
                    {item.label}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center justify-center min-w-[28px] h-6 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
                        ? "bg-[#E8F4D6] text-[#6B8F1A] border-[#C5E899]"
                        : "bg-[#FFEBEE] text-[#D32F2F] border-[#FFCDD2]"
                      }`}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Items Card */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
          >
            <div
              className="px-6 py-4 border-b border-[#E9ECEF] flex items-center gap-3"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1.5 rounded bg-emerald-50">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-[#212529]">Items</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {controlData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="text-blue-600 hover:text-blue-800 hover:underline text-[14px] font-semibold cursor-pointer transition-colors">
                    {item.label}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center justify-center min-w-[28px] h-6 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
                        ? "bg-[#E8F4D6] text-[#6B8F1A] border-[#C5E899]"
                        : "bg-[#FFEBEE] text-[#D32F2F] border-[#FFCDD2]"
                      }`}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Suppliers Card */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
          >
            <div
              className="px-6 py-4 border-b border-[#E9ECEF] flex items-center gap-3"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1.5 rounded bg-amber-50">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-[#212529]">Suppliers</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {controlData.suppliers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="text-blue-600 hover:text-blue-800 hover:underline text-[14px] font-semibold cursor-pointer transition-colors">
                    {item.label}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center justify-center min-w-[28px] h-6 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
                        ? "bg-[#E8F4D6] text-[#6B8F1A] border-[#C5E899]"
                        : "bg-[#FFEBEE] text-[#D32F2F] border-[#FFCDD2]"
                      }`}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pictures Card */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
          >
            <div
              className="px-6 py-4 border-b border-[#E9ECEF] flex items-center gap-3"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1.5 rounded bg-rose-50">
                <ImageIcon className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-[#212529]">Pictures</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {controlData.pictures.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="text-blue-600 hover:text-blue-800 hover:underline text-[14px] font-semibold cursor-pointer transition-colors">
                    {item.label}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center justify-center min-w-[28px] h-6 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
                        ? "bg-[#E8F4D6] text-[#6B8F1A] border-[#C5E899]"
                        : "bg-[#FFEBEE] text-[#D32F2F] border-[#FFCDD2]"
                      }`}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
