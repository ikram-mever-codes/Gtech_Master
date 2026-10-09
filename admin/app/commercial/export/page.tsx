"use client";

import React, { useState } from "react";
import { CircularProgress } from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import CustomButton from "@/components/UI/CustomButton";
import { api } from "@/utils/api";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";

export default function MonthlyExportPage() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");

  const [month, setMonth] = useState<string>(`${yyyy}-${mm}`);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExportData = async () => {
    if (!month) {
      toast.error("Please select a month");
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.get(`/rechnungen/export/monthly?month=${month}`);
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
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return;

    const headers = [
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

    const csvRows = [];
    csvRows.push(headers.join(","));
    const formatCSVField = (field: any) => {
      if (field === null || field === undefined) return "";
      let str = String(field);
      if (typeof field === "number") {
        str = field.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    for (const row of data) {
      const csvRow = headers.map((h) => formatCSVField(row[h]));
      csvRows.push(csvRow.join(","));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `DATEV_Export_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: ColumnDef<any>[] = [
    { header: "Datum", render: (row) => row["Datum (vollständig)"] },
    { header: "Konto", render: (row) => row["Konto"] },
    { header: "Gegenkonto", render: (row) => row["Gegenkonto"] },
    { header: "Betrag in EUR", align: "right", render: (row) => Number(row["Betrag in EUR"]).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { header: "Rechnungsnummer", render: (row) => row["Rechnungsnummer"] },
    { header: "Gegenpartei", render: (row) => row["Gegenpartei"] },
    { header: "Buchungstext", render: (row) => row["Buchungstext"] },
    { header: "Zahlungsreferenz", render: (row) => row["Zahlungsreferenz"] },
    { header: "Kundennummer", render: (row) => row["Kundennummer"] },
    {
      header: "Buchungstyp",
      align: "center",
      render: (row) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row["Buchungstyp"] === "Sammel" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-600">Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-[#8CC21B] focus:border-[#8CC21B] text-sm"
              />
            </div>
            <CustomButton onClick={fetchExportData} disabled={loading} gradient size="small">
              {loading ? <CircularProgress size={16} color="inherit" /> : "Load Data"}
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