"use client";
import React from "react";

interface ViewEditToggleProps {
  isEditEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ViewEditToggle: React.FC<ViewEditToggleProps> = ({
  isEditEnabled,
  onToggle,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200/80 rounded-xl select-none">
      <span className="text-xs font-semibold text-gray-600">
        {isEditEnabled ? "Edit Mode" : "View Only"}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
          isEditEnabled ? "bg-[#8CC21B]" : "bg-gray-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isEditEnabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};

export default ViewEditToggle;
