"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    ArrowPathIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    TruckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
    getAllCargoTypes,
    getCargoTypeById,
    createCargoType,
    updateCargoType,
    deleteCargoType,
    CargoTypeObj,
} from "@/api/cargo_types";

const CargoTypesTab: React.FC = () => {
    const [cargoTypes, setCargoTypes] = useState<CargoTypeObj[]>([]);
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<number | null>(null);

    const [formData, setFormData] = useState<Partial<CargoTypeObj>>({
        type: "",
        duration: undefined,
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
        setFormData({ type: "", duration: undefined });
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
            };

            if (modalMode === "create") {
                await createCargoType(payload);
            } else if (modalMode === "edit" && editingId) {
                await updateCargoType(editingId, payload);
            }
            setShowModal(false);
            fetchCargoTypes();
        } catch (error: any) {
            // error already handled in API
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this cargo type?")) return;
        try {
            setLoading(true);
            await deleteCargoType(id);
            fetchCargoTypes();
        } catch (error) {
            // error already handled
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof CargoTypeObj, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4 px-6 pt-6">
                <h2 className="text-xl font-bold text-gray-800">Cargo Types</h2>
                <div className="flex gap-2">
                    <button
                        onClick={fetchCargoTypes}
                        disabled={loading}
                        className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-[4px] hover:bg-blue-700 flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        New Cargo Type
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto px-6 pb-6">
                {loading && cargoTypes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : cargoTypes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 overflow-hidden">
                        <TruckIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        No Cargo Types Found
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">ID</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Duration (Days)</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cargoTypes.map((ct) => (
                                <tr key={ct.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-800">{ct.id}</td>
                                    <td className="px-4 py-3 text-sm text-gray-800">{ct.type}</td>
                                    <td className="px-4 py-3 text-sm text-gray-800">{ct.duration ?? "-"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(ct.id)}
                                                className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded flex items-center gap-1 hover:bg-green-700"
                                            >
                                                <PencilIcon className="h-3 w-3" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ct.id)}
                                                className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded flex items-center gap-1 hover:bg-red-700"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded shadow-2xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold">
                                {modalMode === "create" ? "New Cargo Type" : "Edit Cargo Type"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-black">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                <input
                                    type="text"
                                    value={formData.type || ""}
                                    onChange={(e) => updateField("type", e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="e.g. DHL Express"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.duration || ""}
                                    onChange={(e) => updateField("duration", e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="e.g. 5"
                                    min={0}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !formData.type?.trim()}
                                    className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                                >
                                    {modalMode === "create" ? "Create" : "Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CargoTypesTab;
