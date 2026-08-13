"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Search,
  ExternalLink,
  X,
} from "lucide-react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import {
  getWeiterversandServiceProviders,
  createWeiterversandServiceProvider,
  updateWeiterversandServiceProvider,
  deleteWeiterversandServiceProvider,
  WeiterversandServiceProvider,
} from "@/api/weiterversand_service_providers";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";

export default function WeiterversandServiceProvidersPage() {
  const [providers, setProviders] = useState<WeiterversandServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State (Create)
  const [pos, setPos] = useState<string>("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [remark, setRemark] = useState("");

  // Form State (Edit)
  const [selectedProvider, setSelectedProvider] = useState<WeiterversandServiceProvider | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [editPos, setEditPos] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editRemark, setEditRemark] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getWeiterversandServiceProviders();
      setProviders(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load service providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setPos("");
    setName("");
    setWebsite("");
    setRemark("");
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Service provider name is required");
      return;
    }

    setSubmitting(true);
    const payload = {
      pos: pos !== "" ? parseInt(pos) || 0 : undefined,
      name: name.trim(),
      website: website.trim() || undefined,
      remark: remark.trim() || undefined,
    };

    try {
      await createWeiterversandServiceProvider(payload);
      toast.success("Service provider created successfully");
      fetchData();
      resetForm();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (provider: WeiterversandServiceProvider) => {
    setSelectedProvider(provider);
    setEditPos(provider.pos !== undefined ? String(provider.pos) : "0");
    setEditName(provider.name || "");
    setEditWebsite(provider.website || "");
    setEditRemark(provider.remark || "");
    setIsEditEnabled(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedProvider?.id) return;
    if (!editName.trim()) {
      toast.error("Service provider name is required");
      return;
    }

    setSubmitting(true);
    try {
      await updateWeiterversandServiceProvider(selectedProvider.id, {
        pos: parseInt(editPos) || 0,
        name: editName.trim(),
        website: editWebsite.trim(),
        remark: editRemark.trim(),
      });
      toast.success("Service provider updated successfully");
      fetchData();
      setShowEditModal(false);
      setSelectedProvider(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDelete = async () => {
    if (!selectedProvider?.id) return;
    if (
      !confirm(
        `Are you sure you want to delete the service provider "${selectedProvider.name}"? This action cannot be undone.`
      )
    )
      return;

    setSubmitting(true);
    try {
      await deleteWeiterversandServiceProvider(selectedProvider.id);
      toast.success("Service provider deleted successfully");
      fetchData();
      setShowEditModal(false);
      setSelectedProvider(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    if (!isEditEnabled) {
      setShowEditModal(false);
      setSelectedProvider(null);
    } else {
      setIsEditEnabled(false);
      if (selectedProvider) {
        setEditPos(String(selectedProvider.pos || 0));
        setEditName(selectedProvider.name || "");
        setEditWebsite(selectedProvider.website || "");
        setEditRemark(selectedProvider.remark || "");
      }
    }
  };

  const filteredProviders = providers.filter((provider) => {
    const q = searchQuery.toLowerCase().trim();
    const nameVal = (provider.name || "").toLowerCase();
    const webVal = (provider.website || "").toLowerCase();
    const remVal = (provider.remark || "").toLowerCase();
    return nameVal.includes(q) || webVal.includes(q) || remVal.includes(q);
  });

  const actionButtons = (
    <CustomButton
      startIcon={<Plus className="w-5 h-5" />}
      gradient={true}
      onClick={() => {
        resetForm();
        setShowModal(true);
      }}
    >
      Provider
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-gray-400 shrink-0 select-none px-0.5">
        <FunnelIcon className="w-4 h-4 text-primary" />
      </div>
      <div className="relative w-80 shrink-0">
        <input
          type="text"
          placeholder="Search service providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
            searchQuery
              ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
              : "text-gray-900 border-gray-300 bg-white"
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading service providers...
          </span>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-12 text-center">
          <Truck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">
            No service providers found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search or create a new service provider.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 text-center w-20">Pos</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Website</th>
                <th className="px-6 py-4">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProviders.map((provider) => {
                const formattedWeb = provider.website
                  ? provider.website.startsWith("http://") || provider.website.startsWith("https://")
                    ? provider.website
                    : `https://${provider.website}`
                  : null;

                return (
                  <tr
                    key={provider.id}
                    onClick={() => handleRowClick(provider)}
                    className="hover:bg-gray-50/50 cursor-pointer transition-all"
                  >
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-gray-600">
                      {provider.pos}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {provider.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {formattedWeb ? (
                        <a
                          href={formattedWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          <span className="truncate max-w-[200px]">
                            {provider.website}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs max-w-xs truncate">
                      {provider.remark || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const modalContent = (
    <>
      <CustomModal
        isOpen={showModal}
        onClose={resetForm}
        title="Create Service Provider"
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="pos"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Pos (Position)
            </label>
            <input
              id="pos"
              type="number"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              placeholder="e.g. 1 (leave empty for auto)"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="provider_name"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Name *
            </label>
            <input
              id="provider_name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DHL Express"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="website"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Website
            </label>
            <input
              id="website"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. www.dhl.com"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="remark"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Remark
            </label>
            <textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Primary forwarding agent in Germany"
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Create Provider
            </button>
          </div>
        </form>
      </CustomModal>

      {selectedProvider && (
        <CustomModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProvider(null);
          }}
          title=""
          showHeader={false}
          noPadding={true}
          width="max-w-xl"
        >
          <div className="bg-white rounded-2xl overflow-hidden">
            <ModalHeader
              entityName="Service Provider"
              entityNo={selectedProvider.name}
              icon={Truck}
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
              onClose={() => {
                setShowEditModal(false);
                setSelectedProvider(null);
              }}
            />
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Pos
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="number"
                      value={editPos}
                      onChange={(e) => setEditPos(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm font-mono font-semibold text-gray-900">
                      {selectedProvider.pos}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Name
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                      {selectedProvider.name}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Website
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm text-gray-900">
                      {selectedProvider.website ? (
                        <a
                          href={
                            selectedProvider.website.startsWith("http://") || selectedProvider.website.startsWith("https://")
                              ? selectedProvider.website
                              : `https://${selectedProvider.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {selectedProvider.website}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Remark
                  </label>
                  {isEditEnabled ? (
                    <textarea
                      rows={3}
                      value={editRemark}
                      onChange={(e) => setEditRemark(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedProvider.remark || "—"}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ModalFooter
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onDelete={handleEditDelete}
              onCancel={handleEditCancel}
              onSave={handleEditSave}
              loading={submitting}
              saveDisabled={submitting}
              saveLabel="Save Changes"
            />
          </div>
        </CustomModal>
      )}
    </>
  );

  return (
    <MasterPageLayout
      title="WeiterversandServiceProviders"
      icon={Truck}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}