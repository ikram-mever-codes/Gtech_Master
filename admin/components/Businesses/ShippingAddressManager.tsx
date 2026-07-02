"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import {
  getShippingAddresses,
  createShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress,
  CompanyShippingAddress,
} from "@/api/shipping_addresses";
import { Country } from "@/api/countries";
import { toast } from "react-hot-toast";
import { formatCountryCode } from "@/utils/address";

interface ShippingAddressManagerProps {
  companyId: string;
  countries: Country[];
  displayName?: string;
}

export const ShippingAddressManager: React.FC<ShippingAddressManagerProps> = ({
  companyId,
  countries,
  displayName,
}) => {
  const [shippingAddresses, setShippingAddresses] = useState<CompanyShippingAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  const [addressForm, setAddressForm] = useState({
    name: "",
    address_additional_line: "",
    street: "",
    postal_code: "",
    city: "",
    country_id: "",
    is_default: false,
  });

  const fetchShippingAddresses = useCallback(async () => {
    if (!companyId) return;
    try {
      const res: any = await getShippingAddresses(companyId);
      if (res && res.success) {
        setShippingAddresses(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch shipping addresses", err);
    }
  }, [companyId]);

  useEffect(() => {
    fetchShippingAddresses();
    setShowAddressForm(false);
    setEditingAddressId(null);
  }, [companyId, fetchShippingAddresses]);

  const handleSaveShippingAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    const { name, street, postal_code, city, country_id, address_additional_line, is_default } = addressForm;
    if (!name.trim() || !street.trim() || !postal_code.trim() || !city.trim()) {
      toast.error("Name, street, postal code and city are required.");
      return;
    }

    setAddressSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        street: street.trim(),
        postal_code: postal_code.trim(),
        city: city.trim(),
        country_id: country_id || null,
        address_additional_line: address_additional_line ? address_additional_line.trim() : null,
        is_default,
      };

      if (editingAddressId) {
        await updateShippingAddress(companyId, editingAddressId, payload);
        toast.success("Shipping address updated successfully");
      } else {
        await createShippingAddress(companyId, payload);
        toast.success("Shipping address added successfully");
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({
        name: "",
        address_additional_line: "",
        street: "",
        postal_code: "",
        city: "",
        country_id: "",
        is_default: false,
      });
      fetchShippingAddresses();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save address");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteShippingAddress = async (addressId: string) => {
    if (!companyId) return;
    if (!confirm("Are you sure you want to delete this shipping address?")) return;

    try {
      await deleteShippingAddress(companyId, addressId);
      toast.success("Shipping address deleted successfully");
      fetchShippingAddresses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete shipping address");
    }
  };

  const handleSetDefaultShippingAddress = async (addressId: string) => {
    if (!companyId) return;
    try {
      await setDefaultShippingAddress(companyId, addressId);
      toast.success("Default shipping address updated");
      fetchShippingAddresses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to set default shipping address");
    }
  };

  return (
    <div className="rounded-xl p-4 -mx-4 mt-4 bg-blue-50 border border-blue-200/70 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-500" />
          <span>Shipping Addresses {displayName ? `${displayName} ` : ""}</span>
          <span className="text-xs font-normal text-gray-500">
            ({shippingAddresses.length})
          </span>
        </h3>
        {!showAddressForm && (
          <button
            type="button"
            onClick={() => {
              const deCountry = countries.find((c) => c.iso2 === "DE");
              const deCountryId = deCountry ? deCountry.id : "";
              setEditingAddressId(null);
              setAddressForm({
                name: "",
                address_additional_line: "",
                street: "",
                postal_code: "",
                city: "",
                country_id: deCountryId,
                is_default: false,
              });
              setShowAddressForm(true);
            }}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-all flex items-center gap-1 font-semibold"
          >
            <Plus className="h-3 w-3" />
            Add Address
          </button>
        )}
      </div>

      {showAddressForm && (
        <form onSubmit={handleSaveShippingAddress} className="bg-white border border-blue-200 rounded-lg p-4 space-y-3 shadow-sm text-black">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            {editingAddressId ? "Edit Shipping Address" : "New Shipping Address"}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Address Name *</label>
              <input
                type="text"
                required
                value={addressForm.name}
                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                placeholder="e.g. Frankfurt Warehouse"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Street & No. *</label>
              <input
                type="text"
                required
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                placeholder="Musterstraße 12"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Additional line</label>
              <input
                type="text"
                value={addressForm.address_additional_line || ""}
                onChange={(e) => setAddressForm({ ...addressForm, address_additional_line: e.target.value })}
                placeholder="c/o Depot B"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Postal Code *</label>
              <input
                type="text"
                required
                value={addressForm.postal_code}
                onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                placeholder="12345"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">City *</label>
              <input
                type="text"
                required
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                placeholder="Berlin"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Country</label>
              <select
                value={addressForm.country_id || ""}
                onChange={(e) => setAddressForm({ ...addressForm, country_id: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
              >
                <option value="">No Country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.iso2} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_default_addr"
                checked={addressForm.is_default}
                onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500/20"
              />
              <label htmlFor="is_default_addr" className="text-xs font-semibold text-gray-700 cursor-pointer">
                Set as default shipping address
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setShowAddressForm(false);
                setEditingAddressId(null);
              }}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addressSubmitting}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {addressSubmitting ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {shippingAddresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            No shipping addresses for this business yet.
          </p>
        ) : (
          shippingAddresses.map((addr) => (
            <div
              key={addr.id}
              className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  <span>{addr.name}</span>
                  {addr.is_default && (
                    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase tracking-wider">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {addr.street}
                  {addr.address_additional_line ? `, ${addr.address_additional_line}` : ""}
                  {` · ${addr.postal_code} ${addr.city}`}
                  {formatCountryCode(addr.country?.name) ? ` · ${formatCountryCode(addr.country?.name)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!addr.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultShippingAddress(addr.id)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                    title="Set as default"
                  >
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddressId(addr.id);
                    setAddressForm({
                      name: addr.name,
                      address_additional_line: addr.address_additional_line || "",
                      street: addr.street,
                      postal_code: addr.postal_code,
                      city: addr.city,
                      country_id: addr.country?.id || "",
                      is_default: addr.is_default,
                    });
                    setShowAddressForm(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Edit shipping address"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteShippingAddress(addr.id)}
                  title="Delete shipping address"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};