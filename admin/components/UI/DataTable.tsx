import React from 'react';
import { ArrowPathIcon } from "@heroicons/react/24/outline";

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
    expandedRowIds?: (string | number)[] | Set<string | number>;
    isRowExpanded?: (row: T, index: number) => boolean;
    onRowClick?: (row: T, index: number, event: React.MouseEvent) => void;
    headerClassName?: string;
    thClassName?: string;
    tdClassName?: string;
    tfoot?: React.ReactNode;
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
    expandedRowIds,
    isRowExpanded,
    onRowClick,
    headerClassName,
    thClassName,
    tdClassName,
    tfoot
}: DataTableProps<T>) {

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
            <table className="w-full border-collapse">
                <thead className={headerClassName || "bg-gray-50/50 border-b border-gray-100"}>
                    <tr>
                        {columns.map((c, i) => (
                            <th
                                key={i}
                                className={thClassName || `px-4 py-3.5 text-${c.align || "left"} text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100`}
                                style={c.width ? { width: c.width, minWidth: c.width } : {}}
                            >
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white text-sm divide-y divide-gray-100">
                    {showTotals && data.length > 0 && (
                        <tr className="bg-gray-50/50 font-bold text-gray-800 border-b border-gray-100">
                            {columns.map((c, i) => (
                                <td
                                    key={`total-${i}`}
                                    className={`px-4 py-3 text-${c.align || "left"} border-b border-gray-100 text-xs`}
                                    style={c.width ? { width: c.width, minWidth: c.width } : {}}
                                >
                                    {c.renderTotal ? c.renderTotal(data) : null}
                                </td>
                            ))}
                        </tr>
                    )}
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center">
                                <div className="inline-flex items-center gap-3">
                                    <ArrowPathIcon className="h-5 w-5 animate-spin text-[#8CC21B]" />
                                    <span className="text-gray-500 text-sm font-semibold font-poppins">Loading data...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500 text-sm font-medium font-poppins">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => {
                            const possibleKeys = [
                                (row as any).id,
                                (row as any)._id,
                                (row as any).order_no,
                                (row as any).invoiceNumber,
                                (row as any).offerNumber,
                                idx
                            ].filter((v) => v !== undefined && v !== null);

                            let isExpanded = false;
                            if (isRowExpanded) {
                                isExpanded = isRowExpanded(row, idx);
                            } else if (expandedRowIds) {
                                if (expandedRowIds instanceof Set) {
                                    isExpanded = possibleKeys.some(
                                        (k) => expandedRowIds.has(k) || expandedRowIds.has(String(k)) || (!isNaN(Number(k)) && expandedRowIds.has(Number(k)))
                                    );
                                } else if (Array.isArray(expandedRowIds)) {
                                    isExpanded = possibleKeys.some(
                                        (k) => expandedRowIds.includes(k) || expandedRowIds.includes(String(k)) || (!isNaN(Number(k)) && expandedRowIds.includes(Number(k)))
                                    );
                                }
                            } else if (expandedRowId !== undefined && expandedRowId !== null) {
                                isExpanded = possibleKeys.some(
                                    (k) => k === expandedRowId || String(k) === String(expandedRowId)
                                );
                            }

                            return (
                                <React.Fragment key={(row as any).id || (row as any)._id || idx}>
                                    <tr
                                        className={`hover:bg-gray-50/50 transition-all ${getRowClassName ? getRowClassName(row, idx) : ""} ${onRowClick ? "cursor-pointer" : ""}`}
                                        onClick={(e) => {
                                            if (!onRowClick) return;
                                            const target = e.target as HTMLElement;
                                            const interactive = target.closest('button, a, input, select, textarea, [role="button"], .interactive');
                                            if (interactive) return;
                                            onRowClick(row, idx, e);
                                        }}
                                    >
                                        {columns.map((c, i) => (
                                            <td
                                                key={i}
                                                className={tdClassName || `px-4 py-3.5 text-${c.align || "left"} border-b border-gray-100 text-gray-700 font-medium`}
                                                style={c.width ? { width: c.width, minWidth: c.width } : {}}
                                            >
                                                {c.render(row, idx)}
                                            </td>
                                        ))}
                                    </tr>
                                    {isExpanded && renderRowDetails && (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                                                {renderRowDetails(row, idx)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
                {tfoot}
            </table>
        </div>
    );
}
