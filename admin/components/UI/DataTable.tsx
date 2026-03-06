import React from 'react';
import { ArrowPathIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export type ColumnDef<T> = {
    header: string;
    render: (row: T, index: number) => React.ReactNode;
    align?: "left" | "center" | "right";
    renderTotal?: (data: T[]) => React.ReactNode;
    width?: string | number;
};

export type DataTableProps<T> = {
    data: T[];
    columns: ColumnDef<T>[];
    loading: boolean;
    emptyMessage?: string;
    showTotals?: boolean;
    getRowClassName?: (row: T, index: number) => string;
    renderRowDetails?: (row: T, index: number) => React.ReactNode;
    expandedRowId?: string | number | null;
    onRowClick?: (row: T, index: number) => void;
};

export function DataTable<T>({
    data,
    columns,
    loading,
    emptyMessage = "No Data Found",
    showTotals = false,
    getRowClassName,
    renderRowDetails,
    expandedRowId,
    onRowClick
}: DataTableProps<T>) {


    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        {columns.map((c, i) => (
                            <th
                                key={i}
                                className={`px-2 py-2 text-${c.align || "left"} text-[10px] font-bold text-gray-600 uppercase tracking-tight border border-gray-200`}
                                style={c.width ? { width: c.width, minWidth: c.width } : {}}
                            >
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {showTotals && data.length > 0 && (
                        <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-200">
                            {columns.map((c, i) => (
                                <td
                                    key={`total-${i}`}
                                    className={`px-2 py-1.5 text-${c.align || "left"} border border-gray-200 text-[11px]`}
                                    style={c.width ? { width: c.width, minWidth: c.width } : {}}
                                >
                                    {c.renderTotal ? c.renderTotal(data) : null}
                                </td>
                            ))}
                        </tr>
                    )}
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center">
                                <div className="inline-flex items-center gap-3">
                                    <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500" />
                                    <span className="text-gray-500 text-xs">Loading data...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 text-xs font-medium">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => {
                            const isExpanded = expandedRowId !== undefined && expandedRowId !== null && ((row as any).id === expandedRowId || (row as any)._id === expandedRowId);

                            return (
                                <React.Fragment key={(row as any).id || (row as any)._id || idx}>
                                    <tr
                                        className={`hover:bg-gray-50 transition-colors ${getRowClassName ? getRowClassName(row, idx) : ""} ${onRowClick ? "cursor-pointer" : ""}`}
                                        onClick={() => onRowClick && onRowClick(row, idx)}
                                    >
                                        {columns.map((c, i) => (
                                            <td
                                                key={i}
                                                className={`px-2 py-1.5 text-${c.align || "left"} border border-gray-200 text-[11px] leading-tight`}
                                                style={c.width ? { width: c.width, minWidth: c.width } : {}}
                                            >
                                                {c.render(row, idx)}
                                            </td>
                                        ))}
                                    </tr>
                                    {isExpanded && renderRowDetails && (
                                        <tr>
                                            <td colSpan={columns.length} className="px-4 py-4 bg-gray-50 border border-gray-200">
                                                {renderRowDetails(row, idx)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
