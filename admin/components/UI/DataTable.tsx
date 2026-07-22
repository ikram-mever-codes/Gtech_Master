import React, { useState, useMemo } from 'react';
import { ArrowPathIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { sortData } from "@/hooks/useTableSort";

export type ColumnDef<T> = {
    header: string;
    render: (row: T, index: number) => React.ReactNode;
    align?: "left" | "center" | "right";
    renderTotal?: (data: T[]) => React.ReactNode;
    width?: string | number;
    sortKey?: string;
    sortValue?: (row: T) => any;
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
    sortColumn?: string | null;
    sortDirection?: 'ASC' | 'DESC' | null;
    onSort?: (sortKey: string, direction: 'ASC' | 'DESC' | null) => void;
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
    tfoot,
    sortColumn,
    sortDirection,
    onSort
}: DataTableProps<T>) {

    const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
    const [internalSortDirection, setInternalSortDirection] = useState<'ASC' | 'DESC' | null>(null);

    const isControlled = sortColumn !== undefined;
    const currentSortColumn = isControlled ? sortColumn : internalSortColumn;
    const currentSortDirection = isControlled ? sortDirection : internalSortDirection;

    const handleHeaderClick = (sortKey: string) => {
        let nextDirection: 'ASC' | 'DESC' | null = 'ASC';
        if (currentSortColumn === sortKey) {
            if (currentSortDirection === 'ASC') {
                nextDirection = 'DESC';
            } else if (currentSortDirection === 'DESC') {
                nextDirection = null;
            }
        }

        if (!isControlled) {
            setInternalSortColumn(nextDirection ? sortKey : null);
            setInternalSortDirection(nextDirection);
        }

        if (onSort) {
            onSort(sortKey, nextDirection);
        }
    };

    const processedData = useMemo(() => {
        if (!currentSortColumn || !currentSortDirection) return data;

        const customSortValues: Record<string, (row: T) => any> = {};
        columns.forEach((col) => {
            if (col.sortKey && col.sortValue) {
                customSortValues[col.sortKey] = col.sortValue;
            }
        });

        return sortData(data, currentSortColumn, currentSortDirection, customSortValues);
    }, [data, currentSortColumn, currentSortDirection, columns]);

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
            <table className="w-full border-collapse">
                <thead className={headerClassName || "bg-gray-50/50 border-b border-gray-100"}>
                    <tr>
                        {columns.map((c, i) => {
                            const isSortable = !!c.sortKey;
                            const isActiveSort = currentSortColumn === c.sortKey;
                            return (
                                <th
                                    key={i}
                                    className={`${thClassName || `px-4 py-3.5 text-${c.align || "left"} text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100`} ${isSortable ? 'cursor-pointer select-none hover:text-gray-700 transition-colors group' : ''}`}
                                    style={c.width ? { width: c.width, minWidth: c.width } : {}}
                                    onClick={() => isSortable && handleHeaderClick(c.sortKey!)}
                                >
                                    <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                        <span>{c.header}</span>
                                        {isSortable && (
                                            <span className="shrink-0">
                                                {isActiveSort ? (
                                                    currentSortDirection === 'ASC' ? (
                                                        <ChevronUpIcon className="h-4 w-4 text-primary stroke-[3px]" />
                                                    ) : (
                                                        <ChevronDownIcon className="h-4 w-4 text-primary stroke-[3px]" />
                                                    )
                                                ) : (
                                                    <span className="text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <svg
                                                            className="h-3.5 w-3.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M7 10l5-5 5 5M7 14l5 5 5-5"
                                                            />
                                                        </svg>
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="bg-white text-sm divide-y divide-gray-100">
                    {showTotals && processedData.length > 0 && (
                        <tr className="bg-gray-50/50 font-bold text-gray-800 border-b border-gray-100">
                            {columns.map((c, i) => (
                                <td
                                    key={`total-${i}`}
                                    className={`px-4 py-3 text-${c.align || "left"} border-b border-gray-100 text-xs`}
                                    style={c.width ? { width: c.width, minWidth: c.width } : {}}
                                >
                                    {c.renderTotal ? c.renderTotal(processedData) : null}
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
                    ) : processedData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500 text-sm font-medium font-poppins">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        processedData.map((row, idx) => {
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