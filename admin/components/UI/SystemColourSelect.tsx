"use client";

import React, { useState, useEffect } from "react";
import { getAllSystemParameters, SystemColourItem } from "@/api/system_parameters";
import { XMarkIcon } from "@heroicons/react/24/outline";

export const DEFAULT_DYNAMIC_COLOURS: SystemColourItem[] = [
  { id: "1", name: "GTech Green", hex: "#8CC21B" },
  { id: "2", name: "Dark Green", hex: "#064E3B" },
  { id: "3", name: "Emerald Green", hex: "#10B981" },
  { id: "4", name: "Navy Blue", hex: "#1E293B" },
  { id: "5", name: "Sky Blue", hex: "#3B82F6" },
  { id: "6", name: "Amber Yellow", hex: "#F59E0B" },
  { id: "7", name: "Red", hex: "#EF4444" },
  { id: "8", name: "Dark Slate", hex: "#0F172A" },
  { id: "9", name: "White", hex: "#FFFFFF" },
];

interface SystemColourSelectProps {
  value?: string | null;
  onChange: (hex: string) => void;
  edit: boolean;
}

export default function SystemColourSelect({
  value,
  onChange,
  edit,
}: SystemColourSelectProps) {
  const [options, setOptions] = useState<SystemColourItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await getAllSystemParameters();
        const palette = res?.data?.find((p: any) => p.key === "system_colours")?.value;

        if (Array.isArray(palette) && palette.length > 0) {
          setOptions(palette);
        } else if (palette && typeof palette === "object") {
          const converted = Object.entries(palette).map(([key, hex], idx) => ({
            id: String(idx + 1),
            name: key.charAt(0).toUpperCase() + key.slice(1),
            hex: String(hex),
          }));
          setOptions(converted);
        } else {
          setOptions(DEFAULT_DYNAMIC_COLOURS);
        }
      } catch {
        setOptions(DEFAULT_DYNAMIC_COLOURS);
      }
    })();
  }, []);

  const matched = options.find(
    (o) =>
      o.hex?.toLowerCase() === value?.toLowerCase() ||
      o.name?.toLowerCase() === value?.toLowerCase()
  );

  if (!edit) {
    if (!matched) return null;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 select-none">
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: matched.hex }}
        />
        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
          {matched.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {matched && (
        <span
          className="w-5 h-5 rounded-md border border-black/10 shrink-0 transition-all"
          style={{ backgroundColor: matched.hex }}
        />
      )}
      <select
        value={matched ? matched.hex : ""}
        onChange={(e) => {
          const hex = e.target.value;
          onChange(hex);
        }}
        className="text-xs font-medium border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-[#8CC21B] transition-all min-w-[150px]"
      >
        <option value="">No colour</option>
        {options.map((opt) => (
          <option key={opt.id || opt.name} value={opt.hex}>
            {opt.name}
          </option>
        ))}
      </select>
      {(matched || (value && value !== "")) && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Clear colour"
          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}