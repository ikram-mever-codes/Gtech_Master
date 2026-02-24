import React, { useEffect } from "react";

export interface BillToShipToData {
    customer_type?: string;
    bill_to_company_name?: string;
    bill_to_display_name?: string;
    bill_to_phone_no?: string;
    bill_to_tax_no?: string;
    bill_to_email?: string;
    bill_to_website?: string;
    bill_to_contact_person?: string;
    bill_to_contact_phone?: string;
    bill_to_contact_mobile?: string;
    bill_to_contact_email?: string;
    bill_to_country?: string;
    bill_to_city?: string;
    bill_to_postal_code?: string;
    bill_to_full_address?: string;
    ship_to_company_name?: string;
    ship_to_display_name?: string;
    ship_to_contact_person?: string;
    ship_to_contact_phone?: string;
    ship_to_country?: string;
    ship_to_city?: string;
    ship_to_postal_code?: string;
    ship_to_full_address?: string;
    ship_to_remarks?: string;
}

export const WAREHOUSE_DETAILS: Partial<BillToShipToData> = {
    bill_to_company_name: "GTech Industries GmbH",
    bill_to_display_name: "GTech",
    bill_to_phone_no: "+4923043389510",
    bill_to_tax_no: "DE977540238364617",
    bill_to_email: "info@gtech.de",
    bill_to_website: "www.gtech.de",
    bill_to_contact_person: "Markus",
    bill_to_contact_phone: "+4923043389510",
    bill_to_contact_mobile: "+4915121856340",
    bill_to_contact_email: "info@gtech.de",
    bill_to_country: "Germany",
    bill_to_city: "Schwerte",
    bill_to_postal_code: "58239",
    bill_to_full_address: "Reichshofstr. 137",
    ship_to_company_name: "GTech Industries GmbH",
    ship_to_display_name: "GTech",
    ship_to_contact_person: "Markus",
    ship_to_contact_phone: "+4923043389510",
    ship_to_country: "Germany",
    ship_to_city: "Schwerte",
    ship_to_postal_code: "58239",
    ship_to_full_address: "Reichshofstr. 137",
};

interface BillToShipToFormProps {
    data: Partial<BillToShipToData>;
    onChange: (field: keyof BillToShipToData, value: any) => void;
    onBatchChange: (updates: Partial<BillToShipToData>) => void;
    isEditEnabled: boolean;
    selectedCustomer?: any;
}

const BillToShipToForm: React.FC<BillToShipToFormProps> = ({
    data,
    onChange,
    onBatchChange,
    isEditEnabled,
    selectedCustomer,
}) => {
    // Auto-fill logic for GT-Warehouse
    useEffect(() => {
        if (data.customer_type === "GT-Warehouse") {
            onBatchChange(WAREHOUSE_DETAILS);
        }
    }, [data.customer_type]);

    // Auto-fill logic for Other Customer (from selected customer)
    useEffect(() => {
        if (data.customer_type === "Other Customer" && selectedCustomer) {
            onBatchChange({
                bill_to_company_name: selectedCustomer.legalName || selectedCustomer.companyName || "",
                bill_to_email: selectedCustomer.email || selectedCustomer.contactEmail || "",
                bill_to_phone_no: selectedCustomer.contactPhoneNumber || "",
                bill_to_country: selectedCustomer.country || "",
                bill_to_city: selectedCustomer.city || "",
                bill_to_postal_code: selectedCustomer.postalCode || "",
                bill_to_full_address: selectedCustomer.addressLine1 || "",
                ship_to_company_name: selectedCustomer.companyName || "",
                ship_to_country: selectedCustomer.deliveryCountry || selectedCustomer.country || "",
                ship_to_city: selectedCustomer.deliveryCity || selectedCustomer.city || "",
                ship_to_postal_code: selectedCustomer.deliveryPostalCode || selectedCustomer.postalCode || "",
                ship_to_full_address: selectedCustomer.deliveryAddressLine1 || selectedCustomer.addressLine1 || "",
            });
        }
    }, [data.customer_type, selectedCustomer]);

    const isGTWarehouse = data.customer_type === "GT-Warehouse";

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-[4px] p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <span className="bg-blue-100 text-blue-600 p-1.5 rounded-[4px] text-sm">📄</span>
                    BILL TO:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Customer Type:</label>
                        <select
                            value={data.customer_type || "Other Customer"}
                            onChange={(e) => onChange("customer_type", e.target.value)}
                            disabled={!isEditEnabled}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 bg-white"
                        >
                            <option value="GT-Warehouse">GT-Warehouse</option>
                            <option value="Other Customer">Other Customer</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company Name:</label>
                        <input
                            type="text"
                            value={data.bill_to_company_name || ""}
                            onChange={(e) => onChange("bill_to_company_name", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Customer display name:</label>
                        <input
                            type="text"
                            value={data.bill_to_display_name || ""}
                            onChange={(e) => onChange("bill_to_display_name", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone No:</label>
                        <input
                            type="text"
                            value={data.bill_to_phone_no || ""}
                            onChange={(e) => onChange("bill_to_phone_no", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tax No (EORI):</label>
                        <input
                            type="text"
                            value={data.bill_to_tax_no || ""}
                            onChange={(e) => onChange("bill_to_tax_no", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company Email:</label>
                        <input
                            type="text"
                            value={data.bill_to_email || ""}
                            onChange={(e) => onChange("bill_to_email", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Website:</label>
                        <input
                            type="text"
                            value={data.bill_to_website || ""}
                            onChange={(e) => onChange("bill_to_website", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact person name:</label>
                        <input
                            type="text"
                            value={data.bill_to_contact_person || ""}
                            onChange={(e) => onChange("bill_to_contact_person", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Phone:</label>
                        <input
                            type="text"
                            value={data.bill_to_contact_phone || ""}
                            onChange={(e) => onChange("bill_to_contact_phone", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Mobile:</label>
                        <input
                            type="text"
                            value={data.bill_to_contact_mobile || ""}
                            onChange={(e) => onChange("bill_to_contact_mobile", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Email:</label>
                        <input
                            type="text"
                            value={data.bill_to_contact_email || ""}
                            onChange={(e) => onChange("bill_to_contact_email", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Country:</label>
                        <input
                            type="text"
                            value={data.bill_to_country || ""}
                            onChange={(e) => onChange("bill_to_country", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">City:</label>
                        <input
                            type="text"
                            value={data.bill_to_city || ""}
                            onChange={(e) => onChange("bill_to_city", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Postal Code:</label>
                        <input
                            type="text"
                            value={data.bill_to_postal_code || ""}
                            onChange={(e) => onChange("bill_to_postal_code", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Address:</label>
                        <input
                            type="text"
                            value={data.bill_to_full_address || ""}
                            onChange={(e) => onChange("bill_to_full_address", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[4px] p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <span className="bg-green-100 text-green-600 p-1.5 rounded-[4px] text-sm">📦</span>
                    SHIP TO:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Company Name:</label>
                        <input
                            type="text"
                            value={data.ship_to_company_name || ""}
                            onChange={(e) => onChange("ship_to_company_name", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Receiver display name:</label>
                        <input
                            type="text"
                            value={data.ship_to_display_name || ""}
                            onChange={(e) => onChange("ship_to_display_name", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Contact Person:</label>
                        <input
                            type="text"
                            value={data.ship_to_contact_person || ""}
                            onChange={(e) => onChange("ship_to_contact_person", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Contact Phone:</label>
                        <input
                            type="text"
                            value={data.ship_to_contact_phone || ""}
                            onChange={(e) => onChange("ship_to_contact_phone", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Country:</label>
                        <input
                            type="text"
                            value={data.ship_to_country || ""}
                            onChange={(e) => onChange("ship_to_country", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery City:</label>
                        <input
                            type="text"
                            value={data.ship_to_city || ""}
                            onChange={(e) => onChange("ship_to_city", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Postal Code:</label>
                        <input
                            type="text"
                            value={data.ship_to_postal_code || ""}
                            onChange={(e) => onChange("ship_to_postal_code", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Full Address:</label>
                        <input
                            type="text"
                            value={data.ship_to_full_address || ""}
                            onChange={(e) => onChange("ship_to_full_address", e.target.value)}
                            disabled={!isEditEnabled || isGTWarehouse}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks:</label>
                        <textarea
                            value={data.ship_to_remarks || ""}
                            onChange={(e) => onChange("ship_to_remarks", e.target.value)}
                            disabled={!isEditEnabled}
                            rows={1}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillToShipToForm;
