"use client";
import React, { useState, useEffect } from "react";
import { XMarkIcon, TrashIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  Taric,
} from "@/api/items";
import { Supplier } from "@/api/suppliers";
import ModalHeader from "../UI/ModalHeader";
import ModalFooter from "../UI/ModalFooter";

interface ParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: number | null;
  onSaved: () => void;
  tarics: Taric[];
  suppliers: Supplier[];
}

const errorStyles = {
  style: {
    background: "#fff",
    color: "#e53e3e",
    border: "1px solid #fed7d7",
  },
};

const successStyles = {
  style: {
    background: "#fff",
    color: "#2f855a",
    border: "1px solid #c6f6d5",
  },
};

export const ParentModal: React.FC<ParentModalProps> = ({
  isOpen,
  onClose,
  parentId,
  onSaved,
  tarics,
  suppliers,
}) => {
  const isEditMode = parentId !== null;
  const [loading, setLoading] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(!isEditMode);
  const [activeSection, setActiveSection] = useState<"general" | "variations">("general");

  const [formData, setFormData] = useState<any>({
    de_no: "",
    name_de: "",
    name_en: "",
    name_cn: "",
    taric_id: "",
    supplier_id: "",
    is_active: "Y",
    var_de_1: "",
    var_de_2: "",
    var_de_3: "",
    var_en_1: "",
    var_en_2: "",
    var_en_3: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    setIsEditEnabled(!isEditMode);
    setActiveSection("general");

    if (isEditMode) {
      const fetchParent = async () => {
        setLoading(true);
        try {
          const res: any = await getParentById(parentId);
          if (res?.data) {
            const p = res.data;
            setFormData({
              de_no: p.de_no || "",
              name_de: p.name_de || "",
              name_en: p.name_en || "",
              name_cn: p.name_cn || "",
              taric_id: p.taric_id || "",
              supplier_id: p.supplier_id || "",
              is_active: p.is_active || "Y",
              var_de_1: p.var_de_1 || "",
              var_de_2: p.var_de_2 || "",
              var_de_3: p.var_de_3 || "",
              var_en_1: p.var_en_1 || "",
              var_en_2: p.var_en_2 || "",
              var_en_3: p.var_en_3 || "",
            });
          }
        } catch (err) {
          toast.error("Failed to load parent details", errorStyles);
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchParent();
    } else {
      setFormData({
        de_no: "",
        name_de: "",
        name_en: "",
        name_cn: "",
        taric_id: "",
        supplier_id: "",
        is_active: "Y",
        var_de_1: "",
        var_de_2: "",
        var_de_3: "",
        var_en_1: "",
        var_en_2: "",
        var_en_3: "",
      });
    }
  }, [isOpen, parentId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.de_no.trim()) {
      return toast.error("Parent number is required", errorStyles);
    }
    if (!formData.name_de.trim()) {
      return toast.error("German Name is required", errorStyles);
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        taric_id: formData.taric_id ? Number(formData.taric_id) : null,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
      };

      if (isEditMode) {
        await updateParent(parentId, payload);
      } else {
        await createParent(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to save parent",
        errorStyles
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParent = async () => {
    if (!parentId) return;
    if (!window.confirm("Delete this Parent? This cannot be undone.")) return;

    setLoading(true);
    try {
      await deleteParent(parentId);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error("Failed to delete parent", errorStyles);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <ModalHeader
          entityName="Parent"
          entityNo={isEditMode ? formData.de_no : null}
          icon={BuildingOfficeIcon}
          isEditMode={isEditMode}
          isEditEnabled={isEditEnabled}
          onToggleEdit={() => setIsEditEnabled(!isEditEnabled)}
          onClose={onClose}
        />
        <div className="px-6 py-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
          <nav className="flex space-x-2">
            {[
              { key: "general" as const, label: "General Info", icon: "📋" },
              { key: "variations" as const, label: "Variations", icon: "⚙️" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeSection === tab.key
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-black">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading details...</div>
          ) : activeSection === "general" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Parent No *
                </label>
                <input
                  type="text"
                  value={formData.de_no}
                  onChange={(e) => updateField("de_no", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="e.g. 50-001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.is_active}
                  onChange={(e) => updateField("is_active", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="Y">Active</option>
                  <option value="N">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  German Name *
                </label>
                <input
                  type="text"
                  value={formData.name_de}
                  onChange={(e) => updateField("name_de", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="German Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  English Name
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => updateField("name_en", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="English Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chinese Name
                </label>
                <input
                  type="text"
                  value={formData.name_cn}
                  onChange={(e) => updateField("name_cn", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Chinese Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  TARIC Code
                </label>
                <select
                  value={formData.taric_id}
                  onChange={(e) => updateField("taric_id", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Select TARIC...</option>
                  {tarics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} - {t.name_de || t.name_en || ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => updateField("supplier_id", e.target.value)}
                  disabled={!isEditEnabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.id}] {s.company_name || s.name || ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-sm font-bold text-gray-800 mb-3">German Variations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`var_de_${num}`}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Variation {num}
                      </label>
                      <input
                        type="text"
                        value={formData[`var_de_${num}`]}
                        onChange={(e) => updateField(`var_de_${num}`, e.target.value)}
                        disabled={!isEditEnabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder={`e.g. Farbe`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h4 className="text-sm font-bold text-gray-800 mb-3">English Variations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((num) => (
                    <div key={`var_en_${num}`}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Variation {num}
                      </label>
                      <input
                        type="text"
                        value={formData[`var_en_${num}`]}
                        onChange={(e) => updateField(`var_en_${num}`, e.target.value)}
                        disabled={!isEditEnabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder={`e.g. Color`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <ModalFooter
          isEditMode={isEditMode}
          isEditEnabled={isEditEnabled}
          onDelete={handleDeleteParent}
          onCancel={onClose}
          onSave={handleSave}
          saveLabel={isEditMode ? "Save Changes" : "Create Parent"}
          loading={loading}
          saveDisabled={loading || !formData.de_no.trim() || !formData.name_de.trim()}
        />

      </div>
    </div>
  );
};

export default ParentModal;
