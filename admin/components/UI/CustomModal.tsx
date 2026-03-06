import React, { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    width?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    width = "max-w-md",
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300">
            <div
                className={`bg-white rounded-2xl shadow-2xl w-full ${width} transform transition-all duration-300 scale-100 border border-gray-100 overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end items-center gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomModal;
