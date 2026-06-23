"use client";
import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ViewEditToggle from "./ViewEditToggle";

interface ModalHeaderProps {
  entityName: string;
  entityNo?: string | number | null;
  icon?: React.ComponentType<any>;
  isEditMode: boolean;
  isEditEnabled: boolean;
  onToggleEdit?: () => void;
  onClose: () => void;
  extraHeaderElements?: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  entityName,
  entityNo,
  icon: Icon,
  isEditMode,
  isEditEnabled,
  onToggleEdit,
  onClose,
  extraHeaderElements,
}) => {
  const titleText = entityNo ? `${entityName} ${entityNo}` : entityName;

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[#8CC21B]/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#8CC21B]" />
          </div>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">
            {titleText}
          </h2>
          {extraHeaderElements}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        {isEditMode && onToggleEdit && (
          <ViewEditToggle
            isEditEnabled={isEditEnabled}
            onToggle={onToggleEdit}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ModalHeader;
