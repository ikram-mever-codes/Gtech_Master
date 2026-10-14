"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CircularProgress } from "@mui/material";
import {
  Download as DownloadIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { toast } from "react-hot-toast";
import CustomButton from "@/components/UI/CustomButton";
import { api } from "@/utils/api";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";

function getLastMonth(): string {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function shiftMonth(monthStr: string, direction: -1 | 1): string {
  const [yyyy, mm] = monthStr.split("-").map(Number);
  const d = new Date(yyyy, mm - 1 + direction, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(monthStr: string): string {
  if (!monthStr) return "";
  const [yyyy, mm] = monthStr.split("-").map(Number);
  const d = new Date(yyyy, mm - 1, 1);
  return d.toLocaleString("de-DE", { month: "long", year: "numeric" });
}

const CSV_DELIMITER = ";";

const HEADERS = [
  "Datum (vollständig)",
  "Konto",
  "Gegenkonto",
  "Betrag in EUR",
  "Rechnungsnummer",
  "Gegenpartei",
  "Buchungstext",
  "Zahlungsreferenz",
  "Kundennummer",
  "Buchungstyp",
];

function formatCSVField(field: any, header: string): string {
  if (field === null || field === undefined || field === "") return "";

  if (header === "Betrag in EUR") {
    const num = typeof field === "number" ? field : Number(field);
    return isNaN(num)
      ? String(field)
      : num.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  }

  const str = String(field);
  if (str.includes(CSV_DELIMITER) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function MonthlyExportPage() {
  const [month, setMonth] = useState<string>(getLastMonth());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExportData = useCallback(async (targetMonth: string) => {
    if (!targetMonth) {
      toast.error("Please select a month");
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.get(
        `/rechnungen/export/monthly?month=${targetMonth}`
      );
      const responseData = res || [];
      setData(responseData);
      if (responseData.length === 0) {
        toast("No data found for this month");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExportData(getLastMonth());
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(e.target.value);
  };

  const handleLoadData = () => {
    fetchExportData(month);
  };

  const handlePrevMonth = () => {
    const prev = shiftMonth(month, -1);
    setMonth(prev);
    fetchExportData(prev);
  };

  const handleNextMonth = () => {
    const next = shiftMonth(month, 1);
    setMonth(next);
    fetchExportData(next);
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return;

    const csvRows: string[] = [];
    csvRows.push(HEADERS.join(CSV_DELIMITER));

    for (const row of data) {
      const csvRow = HEADERS.map((h) => formatCSVField(row[h], h));
      csvRows.push(csvRow.join(CSV_DELIMITER));
    }

    const csvString = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const [yyyy, mm] = month.split("-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `RA${yyyy}${mm}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "Datum (vollständig)",
      render: (row) => row["Datum (vollständig)"],
    },
    { header: "Konto", render: (row) => row["Konto"] },
    { header: "Gegenkonto", render: (row) => row["Gegenkonto"] },
    {
      header: "Betrag in EUR",
      align: "right",
      render: (row) =>
        Number(row["Betrag in EUR"]).toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    { header: "Rechnungsnummer", render: (row) => row["Rechnungsnummer"] },
    { header: "Gegenpartei", render: (row) => row["Gegenpartei"] },
    { header: "Buchungstext", render: (row) => row["Buchungstext"] },
    { header: "Zahlungsreferenz", render: (row) => row["Zahlungsreferenz"] },
    { header: "Kundennummer", render: (row) => row["Kundennummer"] },
    {
      header: "Buchungstyp",
      align: "center",
      render: (row) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row["Buchungstyp"] === "Sammel"
            ? "bg-amber-100 text-amber-800"
            : "bg-blue-100 text-blue-800"
            }`}
        >
          {row["Buchungstyp"]}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full mx-auto font-['Poppins']">
      <div
        className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6 flex flex-col"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Monthly RA and RAK Export
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
              <button
                onClick={handlePrevMonth}
                disabled={loading}
                className="p-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous month"
              >
                <ChevronLeftIcon fontSize="small" className="text-gray-600" />
              </button>

              <div className="flex items-center gap-2 px-1">
                <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                  {formatMonthDisplay(month)}
                </span>
                <input
                  type="month"
                  value={month}
                  onChange={handleMonthChange}
                  className="sr-only"
                  id="month-picker"
                />
                <label
                  htmlFor="month-picker"
                  className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                  title="Pick a month"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </label>
              </div>

              <button
                onClick={handleNextMonth}
                disabled={loading}
                className="p-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next month"
              >
                <ChevronRightIcon fontSize="small" className="text-gray-600" />
              </button>
            </div>

            <CustomButton
              onClick={handleLoadData}
              disabled={loading}
              gradient
              size="small"
            >
              {loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                "Load Data"
              )}
            </CustomButton>

            <CustomButton
              onClick={handleDownloadCSV}
              disabled={data.length === 0}
              gradient
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
            >
              Download CSV
            </CustomButton>
          </div>
        </div>

        {data.length > 0 && (
          <div className="mb-3 text-xs text-gray-400 flex items-center gap-1">
            <DownloadIcon sx={{ fontSize: 14 }} />
            <span>
              File will be saved as{" "}
              <span className="font-mono font-medium text-gray-600">
                RA{month.replace("-", "")}.csv
              </span>
            </span>
          </div>
        )}

        <div className="mt-2">
          <DataTable
            data={data}
            columns={columns}
            loading={loading}
            emptyMessage='No data loaded. Select a month and click "Load Data".'
          />
        </div>
      </div>
    </div>
  );
}