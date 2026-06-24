"use client";
import React from "react";
import { DataTable } from "./DataTable";

interface TotalCol {
    label?: string;
    value?: string | number;
    width?: string;
    align?: "left" | "center" | "right";
    colSpan?: number;
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
    const tfoot = showTotals && (
        <tfoot className="bg-[#343A40] text-[11px] font-bold text-white border-t border-gray-600">
            {totalCols ? (
                <tr>
                    {totalCols.map((col, idx) => (
                        <td
                            key={idx}
                            colSpan={col.colSpan}
                            style={col.width && !col.colSpan ? { width: col.width, minWidth: col.width } : {}}
                            className={`px-2 py-3 border-r border-gray-600/30 last:border-r-0 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                            {col.label && <span className="text-gray-300 mr-2">{col.label}:</span>}
                            {col.value}
                        </td>
                    ))}
                </tr>
            ) : (
                <tr>
                    <td colSpan={columns.length > 3 ? columns.length - 3 : 1} className="px-2 py-3 border-r border-gray-600/30 text-left">
                        {totalLabel}
                    </td>
                    <td className="w-[100px] text-center border-r border-gray-600/30 px-2">{totalQty}</td>
                    <td className="w-[120px] text-left border-r border-gray-600/30 px-2">
                        €{totalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="w-[100px]"></td>
                </tr>
            )}
        </tfoot>
    );

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
                tfoot={tfoot}
            />
        </div>
    );
};

export default SpreadSheet;
