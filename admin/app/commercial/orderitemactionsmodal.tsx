"use client";

import React from "react";
import Select from "react-select";
import { RefreshCw } from "lucide-react";
import CustomModal from "@/components/UI/CustomModal";
import { CargoType } from "@/api/cargos";

// Four small modals from the original page.tsx, ported verbatim. They were
// rendered as page-level siblings (not nested inside InvoiceDetailsModal),
// so they stay separate components here too — page.tsx renders whichever
// are open, same as before.

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  cargos: CargoType[];
  targetCargoId: string;
  setTargetCargoId: (id: string) => void;
  onConfirm: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  cargos,
  targetCargoId,
  setTargetCargoId,
  onConfirm,
}) => {
  if (!isOpen || !selectedItem) return null;

  const cargoOptions = cargos
    .filter((c) => {
      const status = (c.cargo_status || "").trim().toLowerCase();
      return status !== "shipped" && status !== "delivered";
    })
    .map((c) => ({
      value: String(c.id),
      label: `${c.cargo_no} ${c.cargo_status ? `(${c.cargo_status})` : ""}`,
    }));

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedItem.cargo_id
          ? selectedItem.order_no
            ? `Reassign Order No: ${selectedItem.order_no}`
            : `Reassign Item ID: ${selectedItem.id}`
          : selectedItem.order_no
            ? `Assign Order No: ${selectedItem.order_no}`
            : `Assign Item ID: ${selectedItem.id}`
      }
    >
      <div className="p-4 space-y-4 min-h-[320px] flex flex-col justify-between">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
            Select Target Cargo
          </label>
          <Select
            className="text-sm"
            menuPortalTarget={
              typeof window !== "undefined" ? document.body : undefined
            }
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            options={cargoOptions}
            value={
              cargoOptions.find((opt) => opt.value === String(targetCargoId)) ||
              null
            }
            onChange={(opt: any) => setTargetCargoId(opt?.value || "")}
            placeholder="Search or Select Cargo..."
            isSearchable
            isClearable
          />
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[4px] transition-all uppercase"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!targetCargoId}
            className="px-6 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 disabled:opacity-50 transition-all font-bold uppercase shadow-md flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {selectedItem.cargo_id ? "Confirm Reassign" : "Confirm Assign"}
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  cargos: CargoType[];
  splitQty: number;
  setSplitQty: (qty: number) => void;
  targetCargoId: string;
  setTargetCargoId: (id: string) => void;
  splitRemarks: string;
  setSplitRemarks: (remarks: string) => void;
  onConfirm: () => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  cargos,
  splitQty,
  setSplitQty,
  targetCargoId,
  setTargetCargoId,
  splitRemarks,
  setSplitRemarks,
  onConfirm,
}) => {
  if (!isOpen || !selectedItem) return null;

  const cargoOptions = cargos
    .filter((c) => {
      const status = (c.cargo_status || "").trim().toLowerCase();
      return status !== "shipped" && status !== "delivered";
    })
    .map((c) => ({
      value: String(c.id),
      label: `${c.cargo_no} (${c.cargo_status})`,
    }));

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Split Item Position Across Cargos"
    >
      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Split Quantity:
          </label>
          <div className="relative">
            <input
              type="number"
              value={splitQty}
              onChange={(e) => setSplitQty(Number(e.target.value))}
              min={1}
              max={selectedItem.qty - 1}
              className="w-full border-2 border-[#10B981] rounded-xl p-3 text-lg outline-none focus:ring-0 shadow-sm"
              placeholder="Enter quantity to split"
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-2 px-1">
            Available to split: {selectedItem.qty}
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Target Cargo (Optional)
          </label>
          <Select
            menuPortalTarget={
              typeof window !== "undefined" ? document.body : undefined
            }
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            options={cargoOptions}
            value={
              cargoOptions.find((opt) => opt.value === targetCargoId) || null
            }
            onChange={(opt: any) => setTargetCargoId(opt?.value || "")}
            placeholder="Select cargo..."
            isClearable
            className="text-sm shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Review (CN)
          </label>
          <textarea
            value={splitRemarks}
            onChange={(e) => setSplitRemarks(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#10B981] min-h-[100px]"
            placeholder="Chinese review or split notes..."
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onConfirm}
            disabled={splitQty <= 0 || splitQty >= selectedItem.qty}
            className="w-full sm:w-auto px-10 py-3 bg-[#10B981] text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            Split & Move Item Position
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

interface TaricModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTaricGroup: any;
  tarics: any[];
  selectedTaricCode: string;
  setSelectedTaricCode: (code: string) => void;
  onConfirm: () => void;
}

export const TaricModal: React.FC<TaricModalProps> = ({
  isOpen,
  onClose,
  selectedTaricGroup,
  tarics,
  selectedTaricCode,
  setSelectedTaricCode,
  onConfirm,
}) => {
  if (!isOpen || !selectedTaricGroup) return null;

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title="Set Taric Code">
      <div className="p-4 space-y-4">
        <p className="text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-tight">
          Current taric code is :{" "}
          <span className="text-black ml-1">
            {selectedTaricGroup.taricCode}
          </span>
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select new taric code
          </label>
          <select
            value={selectedTaricCode}
            onChange={(e) => setSelectedTaricCode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#1A73E8] bg-white text-black"
          >
            <option value="">Select Taric Code</option>
            {tarics.map((t) => (
              <option key={t.id} value={t.code}>
                {t.code} -{" "}
                {t.description_de ||
                  t.name_de ||
                  t.name_en ||
                  "No description available"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 uppercase font-bold text-[10px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedTaricCode}
            className="px-6 py-2 text-sm bg-[#1A73E8] text-white rounded-lg hover:bg-[#1557B0] disabled:opacity-50 uppercase font-bold text-[10px]"
          >
            Update Taric
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

interface QtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  newQty: number;
  setNewQty: (qty: number) => void;
  qtyRemarks: string;
  setQtyRemarks: (remarks: string) => void;
  onConfirm: () => void;
}

export const QtyModal: React.FC<QtyModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  newQty,
  setNewQty,
  qtyRemarks,
  setQtyRemarks,
  onConfirm,
}) => {
  if (!isOpen || !selectedItem) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Update QtyLabel for this item"
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New QtyLabel
          </label>
          <input
            type="number"
            value={newQty}
            onChange={(e) => setNewQty(Number(e.target.value))}
            min={1}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8CC21B]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter Remarks
          </label>
          <textarea
            value={qtyRemarks}
            onChange={(e) => setQtyRemarks(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8CC21B]"
            placeholder="Enter remarks..."
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={newQty <= 0}
            className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Update QtyLabel
          </button>
        </div>
      </div>
    </CustomModal>
  );
};
