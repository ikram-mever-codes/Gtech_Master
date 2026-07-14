"use client";

import React, { useState, useEffect } from "react";
import {
  Hash,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAllNumberSequences,
  createNumberSequence,
  updateNumberSequence,
  deactivateNumberSequence,
  NumberSequence,
} from "@/api/number_sequence_service";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";

export default function NumberSequencesPage() {
  const [sequences, setSequences] = useState<NumberSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sequenceKey, setSequenceKey] = useState("");
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [formatPattern, setFormatPattern] = useState("{prefix}{yy}{mm}-{number}");
  const [nextRunningNo, setNextRunningNo] = useState(1);
  const [minDigits, setMinDigits] = useState(2);
  const [selectedSequence, setSelectedSequence] = useState<NumberSequence | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const [editFormatPattern, setEditFormatPattern] = useState("");
  const [editNextRunningNo, setEditNextRunningNo] = useState(1);
  const [editMinDigits, setEditMinDigits] = useState(2);
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getAllNumberSequences();
      if (res && res.success) {
        setSequences(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load number sequences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setSequenceKey("");
    setName("");
    setPrefix("");
    setFormatPattern("{prefix}{yy}{mm}-{number}");
    setNextRunningNo(1);
    setMinDigits(2);
    setShowCreateModal(false);
  };

  const handleCreateSubmit = async () => {
    if (!sequenceKey.trim()) {
      toast.error("Sequence Key is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!prefix.trim()) {
      toast.error("Prefix is required");
      return;
    }
    if (nextRunningNo < 1) {
      toast.error("Next running number must be at least 1");
      return;
    }
    if (minDigits < 1) {
      toast.error("Min digits must be at least 1");
      return;
    }

    setSubmitting(true);
    const payload = {
      sequenceKey: sequenceKey.trim().toLowerCase(),
      name: name.trim(),
      prefix: prefix.trim(),
      formatPattern: formatPattern.trim() || undefined,
      startingNumber: Number(nextRunningNo),
      minDigits: Number(minDigits),
      isActive: true,
    };

    try {
      const res: any = await createNumberSequence(payload);
      if (res && res.success) {
        fetchData();
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Operation failed";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (seq: NumberSequence) => {
    setSelectedSequence(seq);
    setEditName(seq.name);
    setEditPrefix(seq.prefix);
    setEditFormatPattern(seq.formatPattern || "");
    setEditNextRunningNo(seq.nextRunningNo);
    setEditMinDigits(seq.minDigits);
    setEditIsActive(seq.isActive);
    setIsEditEnabled(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedSequence) return;
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editPrefix.trim()) {
      toast.error("Prefix is required");
      return;
    }
    if (editNextRunningNo < 1) {
      toast.error("Next running number must be at least 1");
      return;
    }
    if (editMinDigits < 1) {
      toast.error("Min digits must be at least 1");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: editName.trim(),
      prefix: editPrefix.trim(),
      formatPattern: editFormatPattern.trim(),
      nextRunningNo: Number(editNextRunningNo),
      minDigits: Number(editMinDigits),
      isActive: editIsActive,
    };

    try {
      const res: any = await updateNumberSequence(selectedSequence.sequenceKey, payload);
      if (res && res.success) {
        fetchData();
        setShowEditModal(false);
        setSelectedSequence(null);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Failed to update sequence";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    if (isEditEnabled) {
      setIsEditEnabled(false);
      if (selectedSequence) {
        setEditName(selectedSequence.name);
        setEditPrefix(selectedSequence.prefix);
        setEditFormatPattern(selectedSequence.formatPattern || "");
        setEditNextRunningNo(selectedSequence.nextRunningNo);
        setEditMinDigits(selectedSequence.minDigits);
        setEditIsActive(selectedSequence.isActive);
      }
    } else {
      setShowEditModal(false);
      setSelectedSequence(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedSequence) return;
    if (!confirm(`Are you sure you want to deactivate the "${selectedSequence.name}" sequence?`)) return;

    setSubmitting(true);
    try {
      await deactivateNumberSequence(selectedSequence.sequenceKey);
      fetchData();
      setShowEditModal(false);
      setSelectedSequence(null);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Failed to deactivate sequence";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSequences = sequences.filter((seq) => {
    const q = searchQuery.toLowerCase().trim();
    const nameVal = (seq.name || "").toLowerCase();
    const keyVal = (seq.sequenceKey || "").toLowerCase();
    const prefixVal = (seq.prefix || "").toLowerCase();
    return (
      nameVal.includes(q) ||
      keyVal.includes(q) ||
      prefixVal.includes(q)
    );
  });

  const actionButtons = (
    <CustomButton
      startIcon={<Plus className="w-5 h-5" />}
      gradient={true}
      onClick={() => {
        resetForm();
        setShowCreateModal(true);
      }}
    >
      Add Sequence
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, key, or prefix..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
        />
      </div>
      <button
        onClick={fetchData}
        className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all flex items-center gap-1.5 text-sm font-semibold"
        title="Refresh"
      >
        <RefreshCw className="h-4.5 w-4.5" />
        Refresh
      </button>
    </div>
  );

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading sequences...
          </span>
        </div>
      ) : filteredSequences.length === 0 ? (
        <div className="p-12 text-center">
          <Hash className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">No number sequences found.</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search or create a new number sequence.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Sequence Key</th>
                <th className="px-6 py-4">Prefix</th>
                <th className="px-6 py-4">Format Pattern</th>
                <th className="px-6 py-4 text-center">Next Number</th>
                <th className="px-6 py-4 text-center">Min Digits</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredSequences.map((seq) => (
                <tr
                  key={seq.id}
                  onClick={() => handleRowClick(seq)}
                  className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {seq.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1">
                      {seq.sequenceKey}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-700">
                    {seq.prefix}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    {seq.formatPattern}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-[#8CC21B]">
                    {seq.nextRunningNo}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {seq.minDigits}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${seq.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                    >
                      {seq.isActive ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";
  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50 hover:bg-white focus:bg-white";

  const modalContent = (
    <>
      <CustomModal
        isOpen={showCreateModal}
        onClose={resetForm}
        title="Create Number Sequence"
        noPadding={true}
        showHeader={false}
        width="max-w-lg"
      >
        <div className="bg-white rounded-2xl overflow-hidden">
          <ModalHeader
            entityName="Create Number Sequence"
            isEditMode={false}
            isEditEnabled={true}
            onClose={resetForm}
          />
          <div className="p-6 space-y-4">
            <div>
              <label className={labelClass}>Sequence Key (Fixed once created)</label>
              <select
                value={sequenceKey}
                onChange={(e) => setSequenceKey(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a sequence key...</option>
                <option value="offer">offer (Angebot)</option>
                <option value="order">order (Auftrag)</option>
                <option value="transfer_order">transfer_order (Bestellung)</option>
                <option value="invoice">invoice (Rechnung)</option>
                <option value="invoice_correction">invoice_correction (Rechnungskorrektur)</option>
                <option value="delivery_note">delivery_note (Lieferschein)</option>
                <option value="customer">customer (Kunden-Nr. / Customer Number)</option>
                <option value="cargo">cargo (Cargo-Nr. / Cargo Number)</option>
                <option value="closed_ci">closed_ci (Verifizierte CI-Nr.)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Display Name</label>
              <input
                type="text"
                placeholder="e.g. Customer Number, Cargo Sequence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              >
              </input>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. C, CAR"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Min Digits (Zero padding)</label>
                <input
                  type="number"
                  min="1"
                  value={minDigits}
                  onChange={(e) => setMinDigits(parseInt(e.target.value) || 1)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Format Pattern</label>
              <input
                type="text"
                placeholder="{prefix}{yy}{mm}-{number}"
                value={formatPattern}
                onChange={(e) => setFormatPattern(e.target.value)}
                className={inputClass}
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Placeholders: {"{prefix}"}, {"{yyyy}"} (4-digit year), {"{yy}"} (2-digit year), {"{mm}"} (month), {"{number}"} (padded running number)
              </span>
            </div>
            <div>
              <label className={labelClass}>Starting Number</label>
              <input
                type="number"
                min="1"
                value={nextRunningNo}
                onChange={(e) => setNextRunningNo(parseInt(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
          </div>
          <ModalFooter
            isEditMode={false}
            isEditEnabled={true}
            onCancel={resetForm}
            onSave={handleCreateSubmit}
            loading={submitting}
            saveDisabled={submitting}
            showDelete={false}
          />
        </div>
      </CustomModal>
      {selectedSequence && (
        <CustomModal
          isOpen={showEditModal}
          onClose={handleEditCancel}
          title="Number Sequence Details"
          noPadding={true}
          showHeader={false}
          width="max-w-lg"
        >
          <div className="bg-white rounded-2xl overflow-hidden">
            <ModalHeader
              entityName="Sequence"
              entityNo={selectedSequence.name}
              icon={Hash}
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
              onClose={handleEditCancel}
            />
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Sequence Key</label>
                <div className="px-4 py-2.5 text-sm font-semibold text-gray-900 font-mono bg-gray-50 border border-gray-100 rounded-xl">
                  {selectedSequence.sequenceKey}
                </div>
              </div>

              <div>
                <label className={labelClass}>Display Name</label>
                {isEditEnabled ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <div className="px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-xl">
                    {selectedSequence.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prefix</label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editPrefix}
                      onChange={(e) => setEditPrefix(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <div className="px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-xl font-bold">
                      {selectedSequence.prefix}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Min Digits</label>
                  {isEditEnabled ? (
                    <input
                      type="number"
                      min="1"
                      value={editMinDigits}
                      onChange={(e) => setEditMinDigits(parseInt(e.target.value) || 1)}
                      className={inputClass}
                    />
                  ) : (
                    <div className="px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-xl">
                      {selectedSequence.minDigits}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Format Pattern</label>
                {isEditEnabled ? (
                  <>
                    <input
                      type="text"
                      value={editFormatPattern}
                      onChange={(e) => setEditFormatPattern(e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Placeholders: {"{prefix}"}, {"{yy}"}, {"{mm}"}, {"{number}"}
                    </span>
                  </>
                ) : (
                  <div className="px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-xl font-mono text-xs">
                    {selectedSequence.formatPattern}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Next Running Number</label>
                  {isEditEnabled ? (
                    <input
                      type="number"
                      min="1"
                      value={editNextRunningNo}
                      onChange={(e) => setEditNextRunningNo(parseInt(e.target.value) || 1)}
                      className={inputClass}
                    />
                  ) : (
                    <div className="px-4 py-2.5 text-sm font-semibold text-[#8CC21B] bg-gray-50 border border-gray-100 rounded-xl">
                      {selectedSequence.nextRunningNo}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  {isEditEnabled ? (
                    <select
                      value={editIsActive ? "active" : "inactive"}
                      onChange={(e) => setEditIsActive(e.target.value === "active")}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <div className="px-4 py-2 text-sm font-semibold bg-gray-50 border border-gray-100 rounded-xl">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedSequence.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                      >
                        {selectedSequence.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ModalFooter
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onCancel={handleEditCancel}
              onSave={handleEditSave}
              onDelete={handleDelete}
              loading={submitting}
              saveDisabled={submitting}
              showDelete={true}
            />
          </div>
        </CustomModal>
      )}
    </>
  );

  return (
    <MasterPageLayout
      title="Number Sequences"
      icon={Hash}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}