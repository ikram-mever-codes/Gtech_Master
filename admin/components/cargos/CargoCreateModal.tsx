"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";
import { Truck } from "lucide-react";
import CustomModal from "@/components/UI/CustomModal";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { toast } from "react-hot-toast";
import {
    createCargo,
    CargoType,
} from "@/api/cargos";
import { getAllCargoTypes, CargoTypeObj } from "@/api/cargo_types";
import { WAREHOUSE_BILL_TO } from "@/components/General/BillToShipToForm";
import { getAllCustomers } from "@/api/customers";
import { getShippingAddresses } from "@/api/shipping_addresses";

const formatDateInput = (dateString: string | Date | undefined | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
};

interface CargoCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (newCargo: CargoType) => void;
}

const CargoCreateModal: React.FC<CargoCreateModalProps> = ({
    isOpen,
    onClose,
    onCreated,
}) => {
    const [loading, setLoading] = useState(false);
    const [cargoTypes, setCargoTypes] = useState<CargoTypeObj[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    const buildDefaultForm = (): Partial<CargoType> => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        return {
            customer_id: undefined,
            cargo_type_id: undefined,
            cargo_no: `C${yy}${mm}-`,
            pickup_date: "",
            dep_date: "",
            eta: "",
            note: "",
            online_track: "",
            remark: "",
            cargo_status: "Open",
            shipped_at: "",
            customer_type: "GT-Warehouse",
            ...WAREHOUSE_BILL_TO,
            ship_to_company_name: "",
            ship_to_display_name: "",
            ship_to_contact_person: "",
            ship_to_contact_phone: "",
            ship_to_country: "",
            ship_to_city: "",
            ship_to_postal_code: "",
            ship_to_full_address: "",
            ship_to_remarks: "",
        };
    };

    const [formData, setFormData] = useState<Partial<CargoType>>(buildDefaultForm());

    useEffect(() => {
        if (isOpen) {
            setFormData(buildDefaultForm());
        }
    }, [isOpen]);

    useEffect(() => {
        getAllCargoTypes().then((res: any) => {
            const data = res?.data?.data || res?.data || res;
            setCargoTypes(Array.isArray(data) ? data : []);
        });
        getAllCustomers({ limit: 1000 }).then((res: any) => {
            const data = res?.data ?? res;
            let arr: any[] = [];
            if (Array.isArray(data)) arr = data;
            else if (data?.businesses) arr = data.businesses;
            else if (data?.customers) arr = data.customers;
            setCustomers(arr);
        });
    }, []);

    const cargoTypeOptions = useMemo(
        () =>
            cargoTypes.map((ct) => ({
                value: String(ct.id),
                label: `${ct.type} (${ct.duration || 0} days)`,
            })),
        [cargoTypes],
    );

    const updateField = (field: string, value: any) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    const handleCustomerChange = useCallback(
        async (customerId: string | undefined) => {
            if (!customerId) {
                setFormData((prev) => ({
                    ...prev,
                    customer_id: undefined,
                    customer_type: "GT-Warehouse",
                    ...WAREHOUSE_BILL_TO,
                    ship_to_company_name: "",
                    ship_to_display_name: "",
                    ship_to_contact_person: "",
                    ship_to_contact_phone: "",
                    ship_to_country: "",
                    ship_to_city: "",
                    ship_to_postal_code: "",
                    ship_to_full_address: "",
                    ship_to_remarks: "",
                }));
                return;
            }

            const customer = customers.find(
                (c) => String(c.id) === String(customerId),
            );
            if (!customer) {
                setFormData((prev) => ({ ...prev, customer_id: customerId }));
                return;
            }

            const billTo = {
                customer_type: "Other Customer",
                bill_to_company_name: customer.companyName || "",
                bill_to_display_name: customer.companyName || "",
                bill_to_phone_no: customer.contactPhoneNumber || "",
                bill_to_tax_no: customer.taxNumber || "",
                bill_to_email: customer.email || "",
                bill_to_website: "",
                bill_to_contact_person: customer.legalName || "",
                bill_to_contact_phone: customer.contactPhoneNumber || "",
                bill_to_contact_mobile: "",
                bill_to_contact_email: customer.contactEmail || "",
                bill_to_country: customer.country || "",
                bill_to_city: customer.city || "",
                bill_to_postal_code: customer.postalCode || "",
                bill_to_full_address: [
                    customer.addressLine1 || customer.address || "",
                    customer.addressLine2 || "",
                ]
                    .filter(Boolean)
                    .join(" "),
            };

            let shipTo = {
                ship_to_company_name: customer.companyName || "",
                ship_to_display_name: customer.companyName || "",
                ship_to_contact_person: customer.legalName || "",
                ship_to_contact_phone: customer.contactPhoneNumber || "",
                ship_to_country: "",
                ship_to_city: "",
                ship_to_postal_code: "",
                ship_to_full_address: "",
                ship_to_remarks: "",
            };

            try {
                const res: any = await getShippingAddresses(String(customer.id));
                const addresses = res?.success ? res.data || [] : [];
                const def = addresses.find((a: any) => a.is_default);
                if (def) {
                    shipTo.ship_to_country = def.country?.name || "";
                    shipTo.ship_to_city = def.city || "";
                    shipTo.ship_to_postal_code = def.postal_code || "";
                    shipTo.ship_to_full_address = [
                        def.street,
                        def.address_additional_line || "",
                    ]
                        .filter(Boolean)
                        .join(" ");
                } else {
                    shipTo.ship_to_country = customer.deliveryCountry || customer.country || "";
                    shipTo.ship_to_city = customer.deliveryCity || customer.city || "";
                    shipTo.ship_to_postal_code = customer.deliveryPostalCode || customer.postalCode || "";
                    shipTo.ship_to_full_address = [
                        customer.deliveryAddressLine1 || customer.addressLine1 || customer.address || "",
                        customer.deliveryAddressLine2 || customer.addressLine2 || "",
                    ]
                        .filter(Boolean)
                        .join(" ");
                }
            } catch {
                shipTo.ship_to_country = customer.country || "";
                shipTo.ship_to_city = customer.city || "";
                shipTo.ship_to_postal_code = customer.postalCode || "";
                shipTo.ship_to_full_address = [
                    customer.addressLine1 || customer.address || "",
                    customer.addressLine2 || "",
                ]
                    .filter(Boolean)
                    .join(" ");
            }

            setFormData((prev) => ({
                ...prev,
                customer_id: customerId,
                ...billTo,
                ...shipTo,
            }));
        },
        [customers],
    );

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const cleanData = { ...formData };

            (["pickup_date", "dep_date", "eta", "shipped_at"] as const).forEach(
                (f) => {
                    if (cleanData[f] === "") (cleanData as any)[f] = null;
                },
            );

            const rawCargoNo = (cleanData.cargo_no || "").trim();
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const defaultPrefix = `C${yy}${mm}-`;
            const isCustomText =
                rawCargoNo &&
                rawCargoNo !== defaultPrefix &&
                !/^C\d{4,6}-\d+$/i.test(rawCargoNo);

            if (isCustomText) {
                const existingRemark = (cleanData.remark || cleanData.note || "").trim();
                cleanData.remark = existingRemark
                    ? existingRemark.includes(rawCargoNo)
                        ? existingRemark
                        : `${existingRemark} - ${rawCargoNo}`
                    : rawCargoNo;
                cleanData.note = cleanData.remark;
            }

            const res = await createCargo({ ...cleanData, orders: [] });
            const created: CargoType = res?.data || res;
            if (created?.id) {
                onCreated?.(created);
                onClose();
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    return (
        <CustomModal
            title=""
            isOpen={isOpen}
            onClose={onClose}
            width="max-w-3xl"
            showHeader={false}
            noPadding={true}
        >
            <div className="flex flex-col">
                <ModalHeader
                    entityName="Cargo"
                    icon={Truck}
                    isEditMode={false}
                    isEditEnabled={true}
                    onToggleEdit={() => { }}
                    onClose={onClose}
                />

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Cargo Type
                            </label>
                            <Select
                                className="text-sm"
                                options={cargoTypeOptions}
                                value={
                                    cargoTypeOptions.find(
                                        (opt) =>
                                            opt.value ===
                                            String(formData.cargo_type_id),
                                    ) || null
                                }
                                onChange={(v) =>
                                    updateField(
                                        "cargo_type_id",
                                        v?.value ? Number(v.value) : undefined,
                                    )
                                }
                                placeholder="Select cargo type..."
                                isSearchable
                                isClearable
                                menuPortalTarget={
                                    typeof window !== "undefined"
                                        ? document.body
                                        : undefined
                                }
                                styles={{
                                    menuPortal: (base) => ({
                                        ...base,
                                        zIndex: 9999,
                                    }),
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Cargo No (Leave blank to auto-generate)
                            </label>
                            <input
                                type="text"
                                value={formData.cargo_no || ""}
                                onChange={(e) =>
                                    updateField("cargo_no", e.target.value)
                                }
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all"
                                placeholder="Auto-generated if left blank"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Customer
                            </label>
                            <CustomerSearchInput
                                value={formData.customer_id || ""}
                                onChange={(id) =>
                                    handleCustomerChange(id || undefined)
                                }
                                placeholder="Search or select customer..."
                                mode="customers"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Pickup Date
                            </label>
                            <input
                                type="date"
                                value={formatDateInput(formData.pickup_date)}
                                onChange={(e) =>
                                    updateField(
                                        "pickup_date",
                                        e.target.value || null,
                                    )
                                }
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                ETD (Estimated Departure)
                            </label>
                            <input
                                type="date"
                                value={formatDateInput(formData.dep_date)}
                                onChange={(e) =>
                                    updateField(
                                        "dep_date",
                                        e.target.value || null,
                                    )
                                }
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                ETA (Estimated Arrival)
                            </label>
                            <input
                                type="date"
                                value={formatDateInput(formData.eta)}
                                onChange={(e) =>
                                    updateField("eta", e.target.value || null)
                                }
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Remark
                            </label>
                            <textarea
                                value={formData.remark || formData.note || ""}
                                onChange={(e) => {
                                    updateField("remark", e.target.value);
                                    updateField("note", e.target.value);
                                }}
                                rows={3}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all resize-none"
                                placeholder="Enter remark"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Online Tracking URL
                            </label>
                            <input
                                type="url"
                                value={formData.online_track || ""}
                                onChange={(e) =>
                                    updateField("online_track", e.target.value)
                                }
                                placeholder="Paste tracking link here..."
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <ModalFooter
                    isEditMode={false}
                    isEditEnabled={true}
                    onCancel={onClose}
                    onSave={handleSubmit}
                    saveLabel="Create Cargo"
                    loading={loading}
                />
            </div>
        </CustomModal>
    );
};

export default CargoCreateModal;
