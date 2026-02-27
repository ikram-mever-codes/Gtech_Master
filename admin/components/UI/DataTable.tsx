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
};

export function DataTable<T>({ data, columns, loading, emptyMessage = "No Data Found", showTotals = false }: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex items-center gap-3">
                    <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                    <span className="text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="p-8 text-center">
                <DocumentTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{emptyMessage}</p>
            </div>
        );
    }

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
                    {data.map((row, idx) => (
                        <tr key={(row as any).id || idx} className="hover:bg-gray-50 transition-colors">
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}
