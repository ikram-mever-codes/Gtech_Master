"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    ArrowPathIcon,
    PlusIcon,
    XMarkIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { Truck } from "lucide-react";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/UI/PageHeader";
import {
    getAllCargoTypes,
    getCargoTypeById,
    createCargoType,
    updateCargoType,
    deleteCargoType,
    CargoTypeObj,
} from "@/api/cargo_types";

const CargoTypesTab = React.forwardRef<any, {}>((props, ref) => {
    const [cargoTypes, setCargoTypes] = useState<CargoTypeObj[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<number | null>(null);

    const [formData, setFormData] = useState<Partial<CargoTypeObj>>({
        type: "",
        duration: undefined,
        has_pl: true,
    });

    const fetchCargoTypes = useCallback(async () => {
        setLoading(true);
        try {
            const response: any = await getAllCargoTypes();
            const data = response?.data?.data || response?.data || response;
            setCargoTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching cargo types:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCargoTypes();
    }, [fetchCargoTypes]);

    const handleOpenCreate = () => {
        setFormData({ type: "", duration: undefined, has_pl: true });
        setModalMode("create");
        setEditingId(null);
        setShowModal(true);
    };

    const handleOpenEdit = async (id: number) => {
        try {
            setLoading(true);
            const response: any = await getCargoTypeById(id);
            if (response.success && response.data) {
                const ct = response.data;
                setFormData({
                    type: ct.type || "",
                    duration: ct.duration,
                    has_pl: ct.has_pl !== undefined ? ct.has_pl : true,
                });
                setModalMode("edit");
                setEditingId(id);
                setShowModal(true);
            }
        } catch (error) {
            toast.error("Failed to load cargo type");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.type?.trim()) {
            return toast.error("Type is required");
        }
        try {
            setLoading(true);
            const payload: any = {
                type: formData.type,
                duration: formData.duration ? Number(formData.duration) : null,
                has_pl: formData.has_pl !== undefined ? formData.has_pl : true,
            };

            if (modalMode === "create") {
                await createCargoType(payload);
            } else if (modalMode === "edit" && editingId) {
                await updateCargoType(editingId, payload);
            }
            setShowModal(false);
            fetchCargoTypes();
        } catch (error: any) {
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this cargo type?")) return;
        try {
            setLoading(true);
            await deleteCargoType(id);
            setShowModal(false);
            fetchCargoTypes();
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof CargoTypeObj, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const filteredCargoTypes = cargoTypes.filter(ct =>
        ct.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    React.useImperativeHandle(ref, () => ({
        handleOpenCreate,
        fetchCargoTypes,
    }));

    return (
        <div>
            <div className="mb-6 mx-6 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search cargo types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-transparent outline-none text-black transition-all"
                        />
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="px-3.5 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Reset
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto px-6 pb-6">
                {loading && cargoTypes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : filteredCargoTypes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 overflow-hidden">
                        <Truck className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        No Cargo Types Found
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">ID</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Duration (Days)</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Create PL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCargoTypes.map((ct) => (
                                    <tr
                                        key={ct.id}
                                        onClick={() => handleOpenEdit(ct.id)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm text-gray-800 font-bold">{ct.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800 font-semibold">{ct.type}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800">{ct.duration ?? "-"}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ct.has_pl !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                                {ct.has_pl !== false ? "Yes" : "No"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {modalMode === "create" ? "New Cargo Type" : "Edit Cargo Type"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-black">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                                <input
                                    type="text"
                                    value={formData.type || ""}
                                    onChange={(e) => updateField("type", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-transparent outline-none text-sm text-black"
                                    placeholder="e.g. DHL Express"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.duration || ""}
                                    onChange={(e) => updateField("duration", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-transparent outline-none text-sm text-black"
                                    placeholder="e.g. 5"
                                    min={0}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="has_pl"
                                    checked={formData.has_pl !== false}
                                    onChange={(e) => updateField("has_pl", e.target.checked)}
                                    className="h-4 w-4 text-[#8CC21B] border-gray-300 rounded focus:ring-[#8CC21B] cursor-pointer"
                                />
                                <label htmlFor="has_pl" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Create PL (Packing List)
                                </label>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <div>
                                    {modalMode === "edit" && editingId && (
                                        <button
                                            onClick={() => handleDelete(editingId)}
                                            disabled={loading}
                                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                            Delete
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !formData.type?.trim()}
                                        className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#8CC21B] to-[#7ab318] hover:from-[#7ab318] hover:to-[#6ba114] rounded-lg transition-all shadow-md disabled:opacity-50"
                                    >
                                        {modalMode === "create" ? "Create" : "Update"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default CargoTypesTab;
