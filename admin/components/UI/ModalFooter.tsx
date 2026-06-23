"use client";
import React from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

interface ModalFooterProps {
  isEditMode: boolean;
  isEditEnabled: boolean;
  onDelete?: () => void;
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  loading?: boolean;
  saveDisabled?: boolean;
  showDelete?: boolean;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  isEditMode,
  isEditEnabled,
  onDelete,
  onCancel,
  onSave,
  saveLabel,
  loading = false,
  saveDisabled = false,
  showDelete = true,
}) => {
  const showDeleteBtn = isEditMode && isEditEnabled && showDelete && onDelete;
  const isWritable = !isEditMode || isEditEnabled;
  const cancelLabel = isEditMode && !isEditEnabled ? "Close" : "Cancel";

  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 select-none w-full">
      <div>
        {showDeleteBtn && (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
        >
          {cancelLabel}
        </button>
        {isWritable && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || loading}
            className="px-5 py-2.5 text-sm font-medium bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saveLabel || (isEditMode ? "Save Changes" : "Create")}
          </button>
        )}
      </div>
    </div>
  );
};

export default ModalFooter;
