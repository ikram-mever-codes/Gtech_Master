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
  Globe,
  Loader2
} from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import { getDashboardReports } from "@/api/dashboard";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const router = useRouter();
  const [todayDate, setTodayDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currencyRates, setCurrencyRates] = useState({
    EUR: { label: "Euro", rate: "1.00", symbol: "€" },
    USD: { label: "US Dollar", rate: "1.16", symbol: "$" },
    RMB: { label: "Chinese Yuan", rate: "7.92", symbol: "¥" }
  });

  const [controlData, setControlData] = useState({
    orders: [
      { label: "Orders unassigned to cargo", count: 0, type: "unassigned_cargo" },
      { label: "Orders with purchase problem", count: 0, type: "purchase_problem" },
      { label: "Orders with Check Problem", count: 0, type: "check_problem" },
      { label: "RMB Special SET with no value", count: 0, type: "rmb_special_no_value" },
      { label: "EUR Special SET with no value", count: 0, type: "eur_special_no_value" },
      { label: "Dimension Special SET with no value", count: 0, type: "dimension_special_no_value" }
    ],
    items: [
      { label: "Missing Var Values EN", count: 0, type: "missing_var_values_en" },
      { label: "Items with No Taric Code", count: 0, type: "no_taric" },
      { label: "Items with mismatched tarics", count: 0, type: "mismatched_tarics" },
      { label: "Items with null category", count: 0, type: "null_category" },
      { label: "Items with wrong shipping class (Na)", count: 0, type: "wrong_shipping_class" }
    ],
    suppliers: [
      { label: "Items without suppliers", count: 0, type: "no_supplier" },
      { label: "Items without RMB Price", count: 0, type: "no_rmb_price" },
      { label: "Items isPO ='No' with URL='null'", count: 0, type: "is_po_no_url_null" },
      { label: "Suppliers items isPO ='null'", count: 0, type: "is_po_null" }
    ],
    pictures: [
      { label: "Is New Picture Required", count: 0, type: "new_picture_required" },
      { label: "List unused pictures", count: 0, type: "unused_pictures" },
      { label: "Items without picture", count: 0, type: "no_picture" },
      { label: "Picture with multiple parents", count: 0, type: "multiple_parents_pictures" }
    ]
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await getDashboardReports();
        if (response && response.success && response.data) {
          const { rates, date } = response.data.currencyRates;
          setTodayDate(date);
          setCurrencyRates({
            EUR: { label: "Euro", rate: "1.00", symbol: "€" },
            USD: { label: "US Dollar", rate: Number(rates.USD).toFixed(2), symbol: "$" },
            RMB: { label: "Chinese Yuan", rate: Number(rates.RMB).toFixed(2), symbol: "¥" }
          });

          if (response.data.controlData) {
            setControlData(response.data.controlData);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast.error("Failed to load live reports and currency rates");
      } finally {
        setIsLoading(false);
      }
    };

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setTodayDate(`${yyyy}-${mm}-${dd}`);

    fetchDashboardData();
  }, []);

  const handleBack = () => {
    router.push("/scheduled");
  };

  const handleNavigation = (category: string, type: string) => {
    if (category === "orders") {
      if (type === "unassigned_cargo") {
        router.push(`/invoices?tab=orders&filter=${type}&hide_banner=true`);
      } else if (type === "purchase_problem" || type === "check_problem") {
        router.push(`/orders?tab=problems&filter=${type}&hide_banner=true`);
      } else if (
        type === "rmb_special_no_value" ||
        type === "eur_special_no_value" ||
        type === "dimension_special_no_value"
      ) {
        router.push(`/invoices?tab=order_items&filter=${type}&hide_banner=true`);
      } else {
        router.push(`/invoices?tab=order_items&filter=${type}&hide_banner=true`);
      }
    } else if (category === "items") {
      if (type === "wrong_shipping_class") {
        router.push(`/items?tab=warehouse&filter=${type}&hide_banner=true`);
      } else {
        router.push(`/items?tab=items&filter=${type}&hide_banner=true`);
      }
    } else if (category === "suppliers") {
      router.push(`/items?tab=items&filter=${type}&hide_banner=true`);
    } else if (category === "pictures") {
      router.push(`/items?tab=items&filter=${type}&hide_banner=true`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#212529] font-['Poppins'] py-5 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#E9ECEF]">
          <div>
            <PageHeader title="Reports & Control" icon={ClipboardList} />
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-[#212529] border border-[#E9ECEF] rounded-[4px] shadow-sm font-semibold transition-all duration-200 active:scale-95 text-xs sm:text-sm"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
            Back
          </button>
        </div>

        <div
          className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
          style={{ boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}
        >
          <div
            className="px-4 py-2.5 border-b border-[#E9ECEF] flex items-center justify-between"
            style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#8CC21B]">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#212529] flex items-center gap-1.5">
                Today <span className="text-[#8CC21B] font-extrabold">{todayDate}</span> Currency Rates
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3" />
              Live Rates
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(currencyRates).map(([key, item]) => (
              <div
                key={key}
                className="bg-[#F8F9FA] rounded-md p-3.5 border border-[#E9ECEF] hover:border-[#8CC21B]/40 hover:bg-white transition-all duration-300 flex justify-between items-center group relative overflow-hidden"
              >
                {isLoading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8CC21B]" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block font-sans">
                    {item.label} ({key})
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#212529] tracking-tight">
                    <span className="text-[#8CC21B] font-bold text-lg mr-0.5">{item.symbol}</span>
                    {item.rate}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-white border border-[#E9ECEF] flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-[#E8F4D6] group-hover:text-[#6B8F1A] group-hover:border-transparent transition-all duration-300">
                  {key}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden relative"
            style={{ boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#8CC21B]" />
              </div>
            )}
            <div
              className="px-4 py-2.5 border-b border-[#E9ECEF] flex items-center gap-2"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1 rounded bg-blue-50">
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-[#212529]">Orders</h3>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              {controlData.orders.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span
                    onClick={() => handleNavigation("orders", item.type)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-[13px] font-semibold cursor-pointer transition-colors leading-tight"
                  >
                    {item.label}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center min-w-[24px] h-5 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
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

          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden relative"
            style={{ boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#8CC21B]" />
              </div>
            )}
            <div
              className="px-4 py-2.5 border-b border-[#E9ECEF] flex items-center gap-2"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1 rounded bg-emerald-50">
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-[#212529]">Items</h3>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              {controlData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span
                    onClick={() => handleNavigation("items", item.type)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-[13px] font-semibold cursor-pointer transition-colors leading-tight"
                  >
                    {item.label}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center min-w-[24px] h-5 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
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

          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden relative"
            style={{ boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#8CC21B]" />
              </div>
            )}
            <div
              className="px-4 py-2.5 border-b border-[#E9ECEF] flex items-center gap-2"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1 rounded bg-amber-50">
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-[#212529]">Suppliers</h3>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              {controlData.suppliers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span
                    onClick={() => handleNavigation("suppliers", item.type)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-[13px] font-semibold cursor-pointer transition-colors leading-tight"
                  >
                    {item.label}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center min-w-[24px] h-5 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
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

          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden relative"
            style={{ boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)" }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#8CC21B]" />
              </div>
            )}
            <div
              className="px-4 py-2.5 border-b border-[#E9ECEF] flex items-center gap-2"
              style={{ background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)" }}
            >
              <div className="p-1 rounded bg-rose-50">
                <ImageIcon className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-[#212529]">Pictures</h3>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              {controlData.pictures.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group py-0.5 border-b border-gray-50 last:border-0 last:pb-0">
                  <span
                    onClick={() => handleNavigation("pictures", item.type)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-[13px] font-semibold cursor-pointer transition-colors leading-tight"
                  >
                    {item.label}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center min-w-[24px] h-5 border transition-all duration-300 group-hover:scale-105 shadow-sm ${item.count === 0
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