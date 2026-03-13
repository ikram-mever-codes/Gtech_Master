"use client";
import React from "react";
import { DataTable } from "./DataTable";

interface TotalCol {
    label?: string;
    value?: string | number;
    width?: string;
    align?: "left" | "center" | "right";
}

interface SpreadSheetProps {
    data: any[];
    columns: any[];
    title?: string;
    showTotals?: boolean;
    totalLabel?: string;
    totalQty?: number;
    totalPrice?: number;
    totalCols?: TotalCol[];
    loading?: boolean;
    renderRowDetails?: (row: any, index: number) => React.ReactNode;
    expandedRowId?: string | number | null;
}

const SpreadSheet: React.FC<SpreadSheetProps> = ({
    data,
    columns,
    showTotals,
    totalLabel = "Grand Total",
    totalQty,
    totalPrice,
    totalCols,
    loading = false,
    renderRowDetails,
    expandedRowId
}) => {
    return (
        <div className="bg-white rounded-[4px] overflow-hidden shadow-sm mb-4 border border-gray-200 [&_th]:!text-white [&_th]:!border-r-[#4A5568]">
            <DataTable
                data={data}
                columns={columns}
                loading={loading}
                emptyMessage="No items found"
                headerClassName="bg-[#343A40] border-b border-gray-300"
                getRowClassName={(row, idx) => `text-[#212529] font-medium transition-colors border-b border-gray-200 ${idx % 2 === 0 ? 'bg-[#EAF5E5] hover:bg-[#D4EDDA]' : 'bg-white hover:bg-gray-50'}`}
                renderRowDetails={renderRowDetails}
                expandedRowId={expandedRowId}
            />
            {showTotals && (
                <div className="bg-[#343A40] px-4 py-3 flex justify-between items-center border-t border-gray-600 text-[11px] font-bold text-white">
                    {totalCols ? (
                        <div className="flex w-full">
                            {totalCols.map((col, idx) => (
                                <div
                                    key={idx}
                                    style={{ width: col.width || "auto" }}
                                    className={`flex-none ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                                >
                                    {col.label && <span className="text-gray-300 mr-2">{col.label}:</span>}
                                    {col.value}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex w-full">
                            <div className="flex-1">{totalLabel}</div>
                            <div className="w-[100px] text-center border-x border-gray-500 px-2">{totalQty}</div>
                            <div className="w-[120px] text-left px-2">€{totalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="w-[100px]"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpreadSheet;
