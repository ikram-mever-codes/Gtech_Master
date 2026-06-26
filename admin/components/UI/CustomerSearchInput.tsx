"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { getAllCustomers } from "@/api/customers";
import { fetchStarBusinessesForDropdown } from "@/api/contacts";

interface CustomerSearchInputProps {
  value: string | number;
  onChange: (id: string, name: string, fullObj?: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  mode?: "customers" | "businesses";
  initialLabel?: string;
}

export const CustomerSearchInput: React.FC<CustomerSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search by name or number...",
  disabled = false,
  className = "",
  mode = "customers",
  initialLabel = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const loadList = async () => {
      setLoading(true);
      try {
        if (mode === "customers") {
          const res = await getAllCustomers({ limit: 1000 });
          if (active) {
            const rawList = res?.data?.customers || res?.data || [];
            setList(rawList);
          }
        } else {
          const res = await fetchStarBusinessesForDropdown("");
          if (active) {
            setList(res || []);
          }
        }
      } catch (err) {
        console.error("Failed to load search options in CustomerSearchInput:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadList();
    return () => {
      active = false;
    };
  }, [mode]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const selectedItem = list.find((item) => {
    const id = mode === "customers" ? item.id : item.value;
    const nameLabel =
      mode === "customers"
        ? item.companyName || item.legalName || item.name || ""
        : item.label || item.companyName || "";
    return (
      String(id) === String(value) ||
      (value && String(nameLabel).toLowerCase() === String(value).toLowerCase())
    );
  });

  const displayLabel = selectedItem
    ? mode === "customers"
      ? selectedItem.companyName || selectedItem.legalName || selectedItem.name || ""
      : selectedItem.label || selectedItem.companyName || ""
    : initialLabel;
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(displayLabel);
    }
  }, [isOpen, displayLabel]);
  const handleFocus = () => {
    setIsOpen(true);
    setSearchTerm("");
  };
  const filteredOptions = (() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list.slice(0, 50);

    return list
      .filter((item) => {
        if (mode === "customers") {
          const companyName = (item.companyName || "").toLowerCase();
          const legalName = (item.legalName || "").toLowerCase();
          const customerNumber = (item.customerNumber || "").toLowerCase();
          const email = (item.email || "").toLowerCase();
          return (
            companyName.includes(term) ||
            legalName.includes(term) ||
            customerNumber.includes(term) ||
            email.includes(term)
          );
        } else {
          const label = (item.label || "").toLowerCase();
          const desc = (item.description || "").toLowerCase();
          const val = (String(item.value) || "").toLowerCase();
          return (
            label.includes(term) ||
            desc.includes(term) ||
            val.includes(term)
          );
        }
      })
      .slice(0, 50);
  })();

  const handleSelect = (item: any) => {
    if (mode === "customers") {
      onChange(
        String(item.id),
        item.companyName || item.legalName || item.name || "",
        item
      );
    } else {
      onChange(
        String(item.value),
        item.label || item.companyName || "",
        item
      );
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("", "");
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={searchTerm}
          onFocus={handleFocus}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed bg-white/70"
        />
        {(value || searchTerm) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg scrollbar-thin">
          {loading && list.length === 0 ? (
            <div className="px-3.5 py-4 text-center text-xs text-gray-400">
              Loading options...
            </div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((item) => {
              const itemId = mode === "customers" ? item.id : item.value;
              const nameLabel =
                mode === "customers"
                  ? item.companyName || item.legalName || "Unnamed Customer"
                  : item.label || "Unnamed Business";

              const isSelected =
                String(itemId) === String(value) ||
                (value && String(nameLabel).toLowerCase() === String(value).toLowerCase());

              const subLabel =
                mode === "customers"
                  ? item.customerNumber
                    ? `No: ${item.customerNumber}`
                    : item.email
                  : item.description || item.email;

              return (
                <div
                  key={itemId}
                  onClick={() => handleSelect(item)}
                  className={`px-3.5 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected
                    ? "bg-[#8CC21B]/10 text-[#5f8512] font-semibold"
                    : "hover:bg-gray-50 text-gray-700"
                    }`}
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="font-medium truncate">{nameLabel}</span>
                    {subLabel && (
                      <span className="text-[10px] text-gray-400 truncate">
                        {subLabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircleIcon className="h-4 w-4 text-[#8CC21B] shrink-0" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-3.5 py-4 text-center text-xs text-gray-400">
              No matches found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};