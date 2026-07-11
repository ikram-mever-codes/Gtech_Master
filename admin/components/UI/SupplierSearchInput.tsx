"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { getAllSuppliers } from "@/api/suppliers";

interface SupplierSearchInputProps {
  value: string | number;
  onChange: (id: string, name: string, fullObj?: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  initialLabel?: string;
}

export const SupplierSearchInput: React.FC<SupplierSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search by supplier name or ID...",
  disabled = false,
  className = "",
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
        const res = await getAllSuppliers({ limit: 1000 });
        if (active) {
          const rawList = (res?.data ?? res) || [];
          setList(rawList);
        }
      } catch (err) {
        console.error("Failed to load search options in SupplierSearchInput:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadList();
    return () => {
      active = false;
    };
  }, []);

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
    return String(item.id) === String(value);
  });

  const getSupplierDisplayName = (item: any) => {
    if (!item) return "";
    return item.company_name || item.name || `ID: ${item.id}`;
  };

  const displayLabel = selectedItem ? getSupplierDisplayName(selectedItem) : initialLabel;

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
        const id = String(item.id).toLowerCase();
        const name = (item.name || "").toLowerCase();
        const companyName = (item.company_name || "").toLowerCase();
        const nameCN = (item.name_cn || "").toLowerCase();
        return (
          id.includes(term) ||
          name.includes(term) ||
          companyName.includes(term) ||
          nameCN.includes(term)
        );
      })
      .slice(0, 50);
  })();

  const handleSelect = (item: any) => {
    onChange(String(item.id), getSupplierDisplayName(item), item);
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
              const isSelected = String(item.id) === String(value);
              const displayName = getSupplierDisplayName(item);
              const hasCN = item.name_cn && item.name_cn.trim() !== "";
              const subLabel = `ID: ${item.id}${hasCN ? ` | CN: ${item.name_cn}` : ""}`;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`px-3.5 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected
                    ? "bg-[#8CC21B]/10 text-[#5f8512] font-semibold"
                    : "hover:bg-gray-50 text-gray-700"
                    }`}
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="font-medium truncate">{displayName}</span>
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
