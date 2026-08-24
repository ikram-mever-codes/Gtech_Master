"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileDown, ChevronRight, CheckCircle, Calendar, Ban } from "lucide-react";
import { downloadLieferscheinPdf, confirmLieferscheinDelivery, stornierLieferschein } from "@/api/lieferscheine";
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
import { toast } from "react-hot-toast";
import { successStyles, errorStyles } from "@/utils/constants";

interface ConfirmPopupProps {
  deliveryNoteNo: string;
  displayName: string;
  deliveryDate: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  deliveryNoteNo,
  displayName,
  deliveryDate,
  onConfirm,
  onCancel,
  isLoading,
}) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        <h3 className="text-base font-bold text-gray-900">Lieferung bestätigen</h3>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-6">
        Wurde Lieferung <strong>{deliveryNoteNo}</strong> an Kunde{" "}
        <strong>{displayName}</strong> erfolgreich am{" "}
        <strong>{deliveryDate}</strong> geliefert?
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Ja, bestätigen
        </button>
      </div>
    </div>
  </div>
);

const LieferscheinActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onView: (row: any) => void;
  onRefresh?: () => void;
}> = ({ row, rowIndex, onView, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // For "bestätige Lieferdatum" flow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Confirm popup state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDate, setPendingDate] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isBottom = rowIndex !== undefined && rowIndex >= 5;
  const status = row.status || "vorläufig";
  const isVorlaeufig = status === "vorläufig";

  const displayName =
    row.customerSnapshot?.displayName ||
    row.customerSnapshot?.display_name ||
    row.customer?.display_name ||
    row.customerName ||
    "—";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const handleLieferdatumHeute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date().toISOString().split("T")[0];
    setPendingDate(today);
    setIsOpen(false);
    setShowConfirm(true);
  };

  const handleBestaetigeLieferdatum = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDate(pickedDate);
    setShowDatePicker(false);
    setIsOpen(false);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmLieferscheinDelivery(row.id, pendingDate);
      toast.success("Lieferung erfolgreich bestätigt!", successStyles);
      setShowConfirm(false);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Fehler beim Bestätigen.", errorStyles);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      {showConfirm && (
        <ConfirmPopup
          deliveryNoteNo={row.deliveryNoteNo || row.id}
          displayName={displayName}
          deliveryDate={formatDate(pendingDate)}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          isLoading={isConfirming}
        />
      )}

      <div className="relative inline-block text-left" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
            setShowDatePicker(false);
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
                    await downloadLieferscheinPdf(
                      row.id,
                      row.deliveryNoteNo || row.delivery_note_number,
                    );
                  } catch (_) { }
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold">PDF öffnen</span>
              </button>
            </div>

            {isVorlaeufig && (
              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={handleLieferdatumHeute}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-emerald-50 text-emerald-700 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold">Lieferdatum HEUTE</span>
                </button>

                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(!showDatePicker);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-blue-50 text-blue-700 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold">bestätige Lieferdatum</span>
                  </button>
                  {showDatePicker && (
                    <div className="px-3 pb-2">
                      <input
                        type="date"
                        value={pickedDate}
                        onChange={(e) => setPickedDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg mb-1.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={handleBestaetigeLieferdatum}
                        className="w-full px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                      >
                        Datum bestätigen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

interface LieferscheinColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
  onRefresh?: () => void;
}

export function buildLieferscheinColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
  onRefresh,
}: LieferscheinColumnsArgs): ColumnDef<any>[] {
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
          title={row.deliveryNoteNo || row.id}
        >
          {row.deliveryNoteNo || row.id}
        </button>
      ),
    },
    kundeColumn,
    titelColumn,
    lieferortColumn,
    lieferdatumColumn,
    {
      header: "Versandart",
      width: "110px",
      align: "center",
      render: (row) => {
        const text =
          row.shipping_method ||
          row.shippingMethod ||
          row.shipping_provider ||
          "—";
        return (
          <div
            className="truncate max-w-[110px] text-sm text-gray-600 font-normal"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Status",
      width: "110px",
      align: "center",
      render: (row) => {
        const rawStatus = (row.status || "vorläufig").toLowerCase();
        let displayStatus = row.status || "vorläufig";
        if (rawStatus === "open") {
          displayStatus = "bestätigt";
        }
        const getStatusColor = (s: string) => {
          switch (s?.toLowerCase()) {
            case "vorläufig":
              return "bg-blue-50 text-blue-700 border-blue-200";
            case "bestätigt":
            case "open":
              return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "storniert":
              return "bg-rose-50 text-rose-700 border-rose-200";
            default:
              return "bg-gray-100 text-gray-700 border-gray-200";
          }
        };
        return (
          <span
            className={`text-[11px] px-2 py-0.5 rounded border shadow-xs font-medium ${getStatusColor(rawStatus)}`}
          >
            {displayStatus}
          </span>
        );
      },
    },
    {
      header: "",
      width: "45px",
      align: "center",
      render: (row, index) => (
        <LieferscheinActionMenu row={row} rowIndex={index} onView={onView} onRefresh={onRefresh} />
      ),
    },
  ];
}