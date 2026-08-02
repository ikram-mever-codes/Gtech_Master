"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Palette,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileCode2,
  FileCheck,
  Package,
  Plus,
  History,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  getAllSystemParameters,
  updateSystemColours,
  checkColourInUse,
  uploadDocumentTemplate,
  restoreDocumentTemplate,
  deleteDocumentTemplate,
  SystemColourItem,
  SystemParameter,
} from "@/api/system_parameters";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import SettingsTabs from "@/components/General/SettingsTabs";
import { BASE_URL } from "@/utils/constants";
import { DEFAULT_DYNAMIC_COLOURS } from "@/components/UI/SystemColourSelect";

const SERVER_ORIGIN = BASE_URL.replace(/\/api\/v1.*$/, "");

const presetPalettes: { name: string; colors: SystemColourItem[] }[] = [
  {
    name: "GTech Signature (Default)",
    colors: DEFAULT_DYNAMIC_COLOURS,
  },
  {
    name: "Corporate Emerald",
    colors: [
      { id: "1", name: "Emerald Green", hex: "#059669" },
      { id: "2", name: "Dark Emerald", hex: "#064E3B" },
      { id: "3", name: "Sky Cyan", hex: "#0284C7" },
      { id: "4", name: "Slate Dark", hex: "#0F172A" },
      { id: "5", name: "Light Gray", hex: "#F8FAFC" },
      { id: "6", name: "Success Green", hex: "#10B981" },
      { id: "7", name: "Amber Yellow", hex: "#F59E0B" },
      { id: "8", name: "Crimson Red", hex: "#EF4444" },
    ],
  },
  {
    name: "Modern Indigo",
    colors: [
      { id: "1", name: "Indigo Primary", hex: "#4F46E5" },
      { id: "2", name: "Deep Navy", hex: "#1E1B4B" },
      { id: "3", name: "Bright Cyan", hex: "#06B6D4" },
      { id: "4", name: "Charcoal Slate", hex: "#1E293B" },
      { id: "5", name: "Soft Amber", hex: "#F59E0B" },
      { id: "6", name: "Soft Red", hex: "#EF4444" },
    ],
  },
];

interface TemplateVersion {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  is_default?: boolean;
}

const DEFAULT_TEMPLATE_VERSION: TemplateVersion = {
  id: "default_svg",
  file_url: "/public/Customer_Document.svg",
  file_name: "Customer_Document.svg",
  file_type: "image/svg+xml",
  valid_from: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  is_active: true,
  is_default: true,
};

export default function ParametersTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [savingColours, setSavingColours] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  const [colours, setColours] = useState<SystemColourItem[]>(DEFAULT_DYNAMIC_COLOURS);
  const [customerDocParam, setCustomerDocParam] = useState<SystemParameter | null>(null);
  const [templateVersions, setTemplateVersions] = useState<TemplateVersion[]>([DEFAULT_TEMPLATE_VERSION]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getAllSystemParameters();
      if (res && res.success && Array.isArray(res.data)) {
        const colorParam = res.data.find((p: SystemParameter) => p.key === "system_colours");
        if (colorParam && colorParam.value) {
          if (Array.isArray(colorParam.value)) {
            setColours(colorParam.value);
          } else if (typeof colorParam.value === "object") {
            const converted = Object.entries(colorParam.value).map(([key, hex], idx) => ({
              id: String(idx + 1),
              name: key.charAt(0).toUpperCase() + key.slice(1),
              hex: String(hex),
            }));
            setColours(converted);
          }
        }

        const templateParam = res.data.find(
          (p: SystemParameter) => p.key === "customer_doc_template"
        );
        if (templateParam) {
          setCustomerDocParam(templateParam);
          if (templateParam.value && Array.isArray(templateParam.value.versions)) {
            setTemplateVersions(templateParam.value.versions);
          } else if (templateParam.file_url) {
            setTemplateVersions([{
              id: "legacy_v1",
              file_url: templateParam.file_url,
              file_name: templateParam.file_name || "Template",
              file_type: templateParam.file_type || "application/octet-stream",
              valid_from: templateParam.uploaded_at?.toString() || new Date().toISOString(),
              is_active: true,
            }]);
          } else {
            setTemplateVersions([DEFAULT_TEMPLATE_VERSION]);
          }
        } else {
          setTemplateVersions([DEFAULT_TEMPLATE_VERSION]);
        }
      }
    } catch (err) {
      console.error("Failed to load system parameters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleColourItemChange = (index: number, field: "name" | "hex", value: string) => {
    setColours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddColour = () => {
    setColours((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "New Color", hex: "#3B82F6" },
    ]);
  };

  const handleDeleteColour = async (index: number) => {
    if (colours.length <= 1) return;
    const itemToDelete = colours[index];
    if (itemToDelete?.hex) {
      const res: any = await checkColourInUse(itemToDelete.hex);
      if (res && res.inUse && res.count > 0) {
        alert(
          `Cannot delete: Color "${itemToDelete.name || itemToDelete.hex}" (${itemToDelete.hex}) is currently assigned to ${res.count} Angebot(s). Please reassign those records first.`
        );
        return;
      }
    }

    if (
      !window.confirm(
        `Are you sure you want to delete the color "${itemToDelete?.name || itemToDelete?.hex}"?`
      )
    ) {
      return;
    }
    setColours((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveColours = async () => {
    setSavingColours(true);
    try {
      await updateSystemColours(colours);
    } catch (err) {
      console.error(err);
      await fetchData();
    } finally {
      setSavingColours(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    try {
      const res: any = await uploadDocumentTemplate(file, "customer_doc_template");
      if (res && res.success) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingTemplate(false);
      e.target.value = "";
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!window.confirm("Restore this template version as active?")) return;
    setRestoringVersion(versionId);
    try {
      const res: any = await restoreDocumentTemplate("customer_doc_template", versionId);
      if (res && res.success) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm("Are you sure you want to reset the Customer Document template history? This cannot be undone.")) return;

    setDeletingTemplate(true);
    try {
      const res: any = await deleteDocumentTemplate("customer_doc_template");
      if (res && res.success) {
        setCustomerDocParam(null);
        setTemplateVersions([DEFAULT_TEMPLATE_VERSION]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingTemplate(false);
    }
  };

  const formatDateStamp = (dateString?: string) => {
    if (!dateString) return "Kein Datum";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch (e) {
      return dateString;
    }
  };

  const resolveFileUrl = (file_url?: string) => {
    if (!file_url) return "";
    if (file_url.startsWith("http")) return file_url;
    return `${SERVER_ORIGIN}${file_url}`;
  };

  const tableContent = (
    <div className="space-y-8 p-6">
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading parameters & templates...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8CC21B]/10 flex items-center justify-center text-[#8CC21B]">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">SystemColours</h3>
                  <p className="text-xs text-gray-400">Configure & name color palette for system & documents</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveColours}
                disabled={savingColours}
                className="px-4 py-2 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                {savingColours && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Colours
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Quick Palettes
              </label>
              <div className="flex flex-wrap gap-2">
                {presetPalettes.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setColours(preset.colors)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#8CC21B] text-xs font-medium text-gray-700 bg-gray-50 hover:bg-white transition-all flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/10"
                      style={{ backgroundColor: preset.colors[0]?.hex || "#8CC21B" }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Color Options ({colours.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddColour}
                  className="px-2.5 py-1 text-xs font-semibold text-[#8CC21B] hover:bg-[#8CC21B]/10 rounded-lg border border-[#8CC21B]/30 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Color
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {colours.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleColourItemChange(idx, "name", e.target.value)}
                        placeholder="Color Name (e.g. Green, Mild Green)"
                        className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#8CC21B]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="color"
                        value={item.hex}
                        onChange={(e) => handleColourItemChange(idx, "hex", e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={item.hex}
                        onChange={(e) => handleColourItemChange(idx, "hex", e.target.value)}
                        className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded-md font-mono bg-white uppercase text-center"
                      />
                      {colours.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteColour(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-all"
                          title="Remove color"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">CustomerDocument Template</h3>
                    <p className="text-xs text-gray-400">
                      Commercial tabs: Angebot, Auftrag, Rechnung, RK, Lieferschein
                    </p>
                  </div>
                </div>
              </div>

              {(() => {
                const activeVer = templateVersions.find((v) => v.is_active) || templateVersions[0] || DEFAULT_TEMPLATE_VERSION;
                const isDefault = activeVer.is_default === true;
                return (
                  <div className={`p-4 rounded-2xl border-2 space-y-3 ${isDefault ? "border-gray-200 bg-gray-50/40" : "border-emerald-100 bg-emerald-50/30"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDefault ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-600"}`}>
                          {isDefault ? <ShieldCheck className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{activeVer.file_name}</h4>
                          <p className="text-[11px] text-gray-500 font-mono">{activeVer.file_type}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isDefault ? "bg-gray-100 text-gray-600" : "bg-emerald-100 text-emerald-700"}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> {isDefault ? "Default" : "Active"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100 text-xs font-medium text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Active since:</span>
                      <span className="font-semibold font-mono text-gray-900">{formatDateStamp(activeVer.valid_from)}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {!isDefault && (
                        <a
                          href={resolveFileUrl(activeVer.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      )}

                      <label className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${uploadingTemplate ? "opacity-50 pointer-events-none" : ""} bg-blue-50 hover:bg-blue-100 text-blue-700`}>
                        {uploadingTemplate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                        {isDefault ? "Upload Custom Template" : "Replace Template"}
                        <input type="file" onChange={handleFileUpload} disabled={uploadingTemplate} className="hidden" />
                      </label>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={handleDeleteTemplate}
                          disabled={deletingTemplate}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ml-auto"
                        >
                          {deletingTemplate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {templateVersions.filter((v) => !v.is_active).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pt-1">
                    <History className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Version History ({templateVersions.filter((v) => !v.is_active).length} previous)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {templateVersions
                      .filter((v) => !v.is_active)
                      .map((ver) => (
                        <div
                          key={ver.id}
                          className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{ver.file_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-gray-400">Used:</span>
                              <span className="text-[10px] font-mono text-gray-500">{formatDateStamp(ver.valid_from)}</span>
                              {ver.valid_to && (
                                <>
                                  <span className="text-[10px] text-gray-400">→</span>
                                  <span className="text-[10px] font-mono text-gray-500">{formatDateStamp(ver.valid_to)}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!ver.is_default && (
                              <a
                                href={resolveFileUrl(ver.file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Download this version"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(ver.id)}
                              disabled={restoringVersion === ver.id}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all flex items-center gap-1"
                              title="Restore this version as active"
                            >
                              {restoringVersion === ver.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-purple-500" /> Additional Templates (Later)
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                  Upcoming
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400" /> GTechHK Document Template
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Later</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Hong Kong entity specific document layout and header configurations.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-400" /> GTechHK PackingList Template
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Later</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Custom packing list PDF template for HK logistics dispatching.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <MasterPageLayout
      title="Parameters & Templates"
      icon={Sliders}
      tableContent={tableContent}
    />
  );
}