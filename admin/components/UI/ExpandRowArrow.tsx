"use client";

import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

export interface ExpandRowArrowProps {
  isExpanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
  title?: string;
  isEmpty?: boolean;
  className?: string;
}

export const ExpandRowArrow: React.FC<ExpandRowArrowProps> = ({
  isExpanded,
  onToggle,
  title,
  isEmpty = false,
  className = "",
}) => {
  const textColor = isEmpty
    ? "text-red-500 hover:text-red-700"
    : isExpanded
      ? "text-emerald-600 hover:text-emerald-700"
      : "text-gray-400 hover:text-gray-700";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 ${textColor} ${className}`}
      title={title || (isExpanded ? "Collapse" : "Expand")}
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  );
};
export default ExpandRowArrow;