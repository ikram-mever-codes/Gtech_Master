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
}

const SpreadSheet: React.FC<SpreadSheetProps> = ({
    data,
    columns,
    showTotals,
    totalLabel = "Grand Total",
    totalQty,
    totalPrice,
    totalCols,
    loading = false
}) => {
    return (
        <div className="bg-[#2D3748] rounded-md overflow-hidden shadow-lg mb-4 border border-[#4A5568]">
            <DataTable
                data={data}
                columns={columns}
                loading={loading}
                emptyMessage="No items found"
                getRowClassName={() => "bg-[#2D3748] text-gray-200 border-b border-[#4A5568] hover:bg-[#3A4A63] transition-colors"}
            />
            {showTotals && (
                <div className="bg-[#2D3748] px-4 py-3 flex justify-between items-center border-t-2 border-[#8CC21B]/30 text-xs font-bold text-white">
                    {totalCols ? (
                        totalCols.map((col, idx) => (
                            <div
                                key={idx}
                                style={{ width: col.width || "auto" }}
                                className={`flex-1 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                            >
                                {col.label && <span className="text-gray-400 mr-2">{col.label}:</span>}
                                {col.value}
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="flex-1 text-[#8CC21B]">{totalLabel}</div>
                            <div className="w-[100px] text-center border-x border-gray-600 px-2">Qty: {totalQty}</div>
                            <div className="w-[120px] text-right text-[#8CC21B]">€{totalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="w-[100px]"></div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpreadSheet;
