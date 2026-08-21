"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileDown, ChevronRight, FileText, Mail } from "lucide-react";
import { downloadRechnungKPdf } from "@/api/rechnungen_k";
import { downloadRechnungEml } from "@/api/rechnungen";
import { ColumnDef } from "@/components/UI/DataTable";
import {
  buildExpandColumn,
  datumColumn,
  kundeColumn,
  titelColumn,
  lieferortColumn,
  lieferdatumColumn,
  buildNettowertColumn,
} from "./sharedColumns";

const RkActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onView: (row: any) => void;
}> = ({ row, rowIndex, onView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isBottom = rowIndex !== undefined && rowIndex >= 5;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-xs cursor-pointer ${isOpen
          ? "border-[#8CC21B] bg-lime-50 text-[#8CC21B] ring-2 ring-[#8CC21B]/20"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
          }`}
        title="Aktionen"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-90 text-[#8CC21B]" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${isBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } w-60 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
        >
          <div className="p-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setIsOpen(false);
                try {
                  await downloadRechnungKPdf(
                    row.id,
                    row.invoiceNumber || row.invoice_number,
                  );
                } catch (_) { }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold">PDF öffnen</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setIsOpen(false);
                try {
                  const targetId = row.original_rechnung_id || row.id;
                  await downloadRechnungEml(
                    targetId,
                    row.invoiceNumber || row.invoice_number,
                  );
                } catch (_) { }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#8CC21B] shrink-0" />
              <span className="text-xs font-semibold">PDF in Email</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onView(row);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold">Rechnungskorrektur öffnen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface RkColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);

export function buildRkColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
}: RkColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    datumColumn,
    {
      header: "Nr",
      width: "80px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
          className="truncate max-w-[80px] text-green-600 font-semibold hover:underline cursor-pointer"
          title={row.invoiceNumber || row.order_no || row.id}
        >
          {row.invoiceNumber || row.order_no || row.id}
        </button>
      ),
    },
    kundeColumn,
    titelColumn,
    lieferortColumn,
    lieferdatumColumn,
    buildNettowertColumn(valueNetCalc),
    {
      header: "Status",
      width: "90px",
      align: "center",
      render: (row) => (
        <span className="text-[11px] px-2 py-0.5 rounded border shadow-xs font-medium bg-rose-50 text-rose-700 border-rose-200 uppercase">
          {row.status || "RK"}
        </span>
      ),
    },
    {
      header: "",
      width: "45px",
      align: "center",
      render: (row, index) => (
        <RkActionMenu row={row} rowIndex={index} onView={onView} />
      ),
    },
  ];
}
