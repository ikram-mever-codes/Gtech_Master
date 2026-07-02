import React, { useEffect, useState } from "react";
import { getShippingAddresses, CompanyShippingAddress } from "@/api/shipping_addresses";
import { formatCountryCode } from "@/utils/address";

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

export const WAREHOUSE_BILL_TO: Partial<BillToShipToData> = {
    bill_to_company_name: "GTech Industries GmbH",
    bill_to_display_name: "GTech",
    bill_to_phone_no: "+4923158697565",
    bill_to_tax_no: "DE977540238364617",
    bill_to_email: "info@gtech.de",
    bill_to_website: "www.gtech.de",
    bill_to_contact_person: "Markus",
    bill_to_contact_phone: "+4923158697565",
    bill_to_contact_mobile: "+4915121856340",
    bill_to_contact_email: "info@gtech.de",
    bill_to_country: "Germany",
    bill_to_city: "Dortmund",
    bill_to_postal_code: "44263",
    bill_to_full_address: "Antonio-Segni-Str. 4",
};

export const WAREHOUSE_SHIP_TO: Partial<BillToShipToData> = {
    ship_to_company_name: "GTech Industries GmbH",
    ship_to_display_name: "GTech",
    ship_to_contact_person: "Markus",
    ship_to_contact_phone: "+4923158697565",
    ship_to_country: "Germany",
    ship_to_city: "Dortmund",
    ship_to_postal_code: "44263",
    ship_to_full_address: "Antonio-Segni-Str. 4",
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
    useEffect(() => {
        if (data.customer_type === "GT-Warehouse") {
            onBatchChange(WAREHOUSE_BILL_TO);
        }
    }, [data.customer_type]);

    const [addressProfile, setAddressProfile] = useState<string>("main");
    const [dbShippingAddresses, setDbShippingAddresses] = useState<CompanyShippingAddress[]>([]);
    const [prevCustomerId, setPrevCustomerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchShippingAddresses = async () => {
            if (!selectedCustomer?.id) {
                setDbShippingAddresses([]);
                return;
            }
            try {
                const res: any = await getShippingAddresses(selectedCustomer.id);
                if (res && res.success) {
                    setDbShippingAddresses(res.data || []);
                }
            } catch (err) {
                console.error("Failed to load customer shipping addresses", err);
            }
        };
        fetchShippingAddresses();
    }, [selectedCustomer]);

    const mainAddressStr = selectedCustomer ? [
        selectedCustomer.addressLine1 || selectedCustomer.address || selectedCustomer.businessDetails?.address,
        selectedCustomer.city || selectedCustomer.businessDetails?.city,
        formatCountryCode(selectedCustomer.country || selectedCustomer.businessDetails?.country)
    ].filter(Boolean).join(", ") : "";

    const deliveryAddressStr = selectedCustomer ? [
        selectedCustomer.deliveryAddressLine1,
        selectedCustomer.deliveryCity,
        formatCountryCode(selectedCustomer.deliveryCountry)
    ].filter(Boolean).join(", ") : "";

    const applyShipToAddress = (
        country: string,
        city: string,
        postalCode: string,
        fullAddress: string,
        extraFields: Partial<BillToShipToData> = {}
    ) => {
        if (!selectedCustomer) return;
        onBatchChange({
            ship_to_company_name: selectedCustomer.companyName || "",
            ship_to_display_name: selectedCustomer.companyName || "",
            ship_to_contact_person: selectedCustomer.legalName || "",
            ship_to_contact_phone: selectedCustomer.contactPhoneNumber || selectedCustomer.phoneNumber || selectedCustomer.contactPhone || selectedCustomer.businessDetails?.contactPhone || selectedCustomer.businessDetails?.phoneNumber || "",
            ship_to_country: country || "",
            ship_to_city: city || "",
            ship_to_postal_code: postalCode || "",
            ship_to_full_address: fullAddress || "",
            ...extraFields
        });
    };

    const handleAddressProfileChange = (profileType: string) => {
        if (!selectedCustomer) return;

        if (profileType === "main") {
            const mainFullAddress = [
                selectedCustomer.addressLine1 || selectedCustomer.address || selectedCustomer.businessDetails?.address || "",
                selectedCustomer.addressLine2 || ""
            ].filter(Boolean).join(" ");
            applyShipToAddress(
                selectedCustomer.country || selectedCustomer.businessDetails?.country || "",
                selectedCustomer.city || selectedCustomer.businessDetails?.city || "",
                selectedCustomer.postalCode || selectedCustomer.businessDetails?.postalCode || "",
                mainFullAddress
            );
        } else if (profileType === "delivery") {
            const deliveryFullAddress = [
                selectedCustomer.deliveryAddressLine1 || "",
                selectedCustomer.deliveryAddressLine2 || ""
            ].filter(Boolean).join(" ");
            applyShipToAddress(
                selectedCustomer.deliveryCountry || "",
                selectedCustomer.deliveryCity || "",
                selectedCustomer.deliveryPostalCode || "",
                deliveryFullAddress
            );
        } else {
            const targetAddress = dbShippingAddresses.find(a => a.id === profileType);
            if (targetAddress) {
                const fullAddressStr = [
                    targetAddress.street,
                    targetAddress.address_additional_line || ""
                ].filter(Boolean).join(" ");
                applyShipToAddress(
                    targetAddress.country?.name || "",
                    targetAddress.city || "",
                    targetAddress.postal_code || "",
                    fullAddressStr
                );
            }
        }
    };

    useEffect(() => {
        if (selectedCustomer) {
            const customerChanged = prevCustomerId !== null && String(prevCustomerId) !== String(selectedCustomer.id);
            setPrevCustomerId(selectedCustomer.id);

            const hasExistingAddress = !customerChanged && !!(data.ship_to_company_name || data.ship_to_full_address || data.ship_to_city);

            if (hasExistingAddress) {
                const matchedProfile = dbShippingAddresses.find(addr => {
                    const fullAddressStr = [
                        addr.street,
                        addr.address_additional_line || ""
                    ].filter(Boolean).join(" ");
                    return (
                        addr.city?.toLowerCase() === data.ship_to_city?.toLowerCase() &&
                        addr.postal_code === data.ship_to_postal_code &&
                        fullAddressStr.toLowerCase() === data.ship_to_full_address?.toLowerCase()
                    );
                });

                if (matchedProfile) {
                    setAddressProfile(matchedProfile.id);
                } else {
                    const deliveryFullAddress = [
                        selectedCustomer.deliveryAddressLine1 || "",
                        selectedCustomer.deliveryAddressLine2 || ""
                    ].filter(Boolean).join(" ");
                    if (
                        selectedCustomer.deliveryCity?.toLowerCase() === data.ship_to_city?.toLowerCase() &&
                        selectedCustomer.deliveryPostalCode === data.ship_to_postal_code &&
                        deliveryFullAddress.toLowerCase() === data.ship_to_full_address?.toLowerCase()
                    ) {
                        setAddressProfile("delivery");
                    } else {
                        const mainFullAddress = [
                            selectedCustomer.addressLine1 || selectedCustomer.address || selectedCustomer.businessDetails?.address || "",
                            selectedCustomer.addressLine2 || ""
                        ].filter(Boolean).join(" ");
                        if (
                            (selectedCustomer.city || selectedCustomer.businessDetails?.city)?.toLowerCase() === data.ship_to_city?.toLowerCase() &&
                            (selectedCustomer.postalCode || selectedCustomer.businessDetails?.postalCode) === data.ship_to_postal_code &&
                            mainFullAddress.toLowerCase() === data.ship_to_full_address?.toLowerCase()
                        ) {
                            setAddressProfile("main");
                        } else {
                            setAddressProfile("");
                        }
                    }
                }
                return;
            }

            const defaultAddress = dbShippingAddresses.find(a => a.is_default);
            if (defaultAddress) {
                setAddressProfile(defaultAddress.id);
                const fullAddressStr = [
                    defaultAddress.street,
                    defaultAddress.address_additional_line || ""
                ].filter(Boolean).join(" ");
                applyShipToAddress(
                    defaultAddress.country?.name || "",
                    defaultAddress.city || "",
                    defaultAddress.postal_code || "",
                    fullAddressStr,
                    { customer_type: "Other Customer" }
                );
                return;
            }

            const hasDelivery = !!(selectedCustomer.deliveryAddressLine1 || selectedCustomer.deliveryCity || selectedCustomer.deliveryCountry);
            const initialProfile = hasDelivery ? "delivery" : "main";
            setAddressProfile(initialProfile);

            const country = hasDelivery ? (selectedCustomer.deliveryCountry || "") : (selectedCustomer.country || selectedCustomer.businessDetails?.country || "");
            const city = hasDelivery ? (selectedCustomer.deliveryCity || "") : (selectedCustomer.city || selectedCustomer.businessDetails?.city || "");
            const postalCode = hasDelivery ? (selectedCustomer.deliveryPostalCode || "") : (selectedCustomer.postalCode || selectedCustomer.businessDetails?.postalCode || "");
            const fullAddress = hasDelivery
                ? ((selectedCustomer.deliveryAddressLine1 || "") + (selectedCustomer.deliveryAddressLine2 ? " " + selectedCustomer.deliveryAddressLine2 : ""))
                : ((selectedCustomer.addressLine1 || selectedCustomer.address || selectedCustomer.businessDetails?.address || "") + (selectedCustomer.addressLine2 ? " " + selectedCustomer.addressLine2 : ""));

            applyShipToAddress(country, city, postalCode, fullAddress, { customer_type: "Other Customer" });
        }
    }, [selectedCustomer, dbShippingAddresses, data.ship_to_company_name, data.ship_to_full_address, data.ship_to_city]);

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
                    {selectedCustomer && (
                        <div className="md:col-span-4 bg-gray-50/50 p-4 rounded-[4px] border border-gray-200/80 mb-2">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Address Profile:</label>
                            <select
                                value={addressProfile}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setAddressProfile(val);
                                    handleAddressProfileChange(val);
                                }}
                                disabled={!isEditEnabled || isGTWarehouse}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 bg-white cursor-pointer font-medium text-gray-700"
                            >
                                <option value="main">Main Address {mainAddressStr ? `— ${mainAddressStr}` : ""}</option>
                                <option value="delivery">Delivery Address {deliveryAddressStr ? `— ${deliveryAddressStr}` : "— (Not Set)"}</option>
                                {dbShippingAddresses.map((addr) => (
                                    <option key={addr.id} value={addr.id}>
                                        {addr.name}{addr.is_default ? " (Default)" : ""} — {addr.street}, {addr.city}{formatCountryCode(addr.country?.name) ? `, ${formatCountryCode(addr.country?.name)}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
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