"use client";

import React from "react";
import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface FilterResetIconProps {
  isActive: boolean;
  onReset?: () => void;
  className?: string;
}

export const FilterResetIcon: React.FC<FilterResetIconProps> = ({
  isActive,
  onReset,
  className = "",
}) => {
  if (!isActive) {
    return <FunnelIcon className={`w-4 h-4 text-primary shrink-0 ${className}`} />;
  }

  return (
    <button
      type="button"
      onClick={onReset}
      className={`w-6 h-6 rounded-md bg-rose-600 text-white hover:bg-rose-100 hover:text-rose-600 border border-transparent hover:border-rose-300 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${className}`}
      title="Reset all filters"
    >
      <XMarkIcon className="w-3.5 h-3.5 stroke-[2.5]" />
    </button>
  );
};

export default FilterResetIcon;
