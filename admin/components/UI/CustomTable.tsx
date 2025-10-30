"use client";
import React, { useState } from "react";
import {
  LucideMoreVertical,
  LucideSearch,
  LucideX,
  LucideEye,
  LucideTrash2,
  LucidePencil,
  LucideChevronDown,
  LucideChevronUp,
  LucideMail,
} from "lucide-react";

interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  title?: string;
  loading?: boolean;
  searchable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onView?: (row: any) => void;
  onResendVerification?: (row: any) => void; // NEW: Custom action for resend verification
}

const CustomTable: React.FC<TableProps> = ({
  columns,
  data,
  title,
  loading = false,
  searchable = true,
  pagination = true,
  pageSize = 10,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  onResendVerification, // NEW: Custom action prop
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Check if there's already an actions column in the provided columns
  const hasActionsColumn = columns.some((col) => col.key === "actions");

  // Filter and sort data
  const filteredData = data.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  // Sort handler
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Action menu component
  const ActionMenu = ({ row }: { row: any }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-1 rounded-full hover:bg-[#8CC21B]/10 transition-colors"
        >
          <LucideMoreVertical className="w-5 h-5 text-[#262A2E]" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
              <div className="py-1.5">
                {onView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(row);
                      setIsOpen(false);
                    }}
                    className="flex items-center px-4 py-2.5 text-sm text-[#262A2E] hover:bg-[#8CC21B]/10 w-full text-left transition-colors"
                  >
                    <LucideEye className="mr-3 w-4 h-4 text-[#8CC21B]" />
                    View
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row);
                      setIsOpen(false);
                    }}
                    className="flex items-center px-4 py-2.5 text-sm text-[#262A2E] hover:bg-[#8CC21B]/10 w-full text-left transition-colors"
                  >
                    <LucidePencil className="mr-3 w-4 h-4 text-[#8CC21B]" />
                    Edit
                  </button>
                )}

                {/* NEW: Resend Verification Action */}
                {onResendVerification && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResendVerification(row);
                      setIsOpen(false);
                    }}
                    className="flex items-center px-4 py-2.5 text-sm text-[#262A2E] hover:bg-[#8CC21B]/10 w-full text-left transition-colors"
                  >
                    <LucideMail className="mr-3 w-4 h-4 text-[#8CC21B]" />
                    Resend Verification
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row);
                      setIsOpen(false);
                    }}
                    className="flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                  >
                    <LucideTrash2 className="mr-3 w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Calculate colspan for empty states
  const colSpanCount =
    columns.length +
    ((onView || onEdit || onDelete || onResendVerification) && !hasActionsColumn
      ? 1
      : 0);

  return (
    <div className="bg-white rounded-xl border border-[#E9ECEF] shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-[#E9ECEF] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F8F9FA]">
        {title && (
          <h2 className="text-lg font-semibold text-[#262A2E] font-poppins">
            {title}
          </h2>
        )}

        {searchable && (
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LucideSearch className="h-4 w-4 text-[#8CC21B]" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-[#E9ECEF] rounded-lg focus:ring-2 focus:ring-[#8CC21B] focus:border-[#8CC21B] w-full transition-all font-poppins"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <LucideX className="h-4 w-4 text-[#8CC21B] hover:text-[#6EA017] transition-colors" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-[#E9ECEF]">
          <thead className="bg-[#F8F9FA]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3.5 text-${
                    column.align || "left"
                  } text-xs font-semibold text-[#262A2E] uppercase tracking-wide cursor-pointer transition-colors font-poppins`}
                  onClick={() => requestSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center font-bold text-md justify-between">
                    {column.label}
                    {sortConfig?.key === column.key && (
                      <span className="text-[#8CC21B]">
                        {sortConfig.direction === "asc" ? (
                          <LucideChevronUp className="w-4 h-4" />
                        ) : (
                          <LucideChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {/* Only show Actions column if there are actions AND no custom actions column exists */}
              {(onView || onEdit || onDelete || onResendVerification) &&
                !hasActionsColumn && (
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-right text-xs font-semibold text-[#262A2E] uppercase tracking-wide font-poppins"
                  >
                    Actions
                  </th>
                )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#E9ECEF]">
            {loading ? (
              <tr>
                <td colSpan={colSpanCount} className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8CC21B] border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-[#ADB5BD] mb-2 text-sm font-poppins">
                      No data found
                    </div>
                    {searchTerm && (
                      <div className="text-sm text-[#6C757D] font-poppins">
                        Try adjusting your search terms
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`even:bg-[#F8F9FA] hover:bg-[#F1F3F5] ${
                    onRowClick ? "cursor-pointer" : ""
                  } transition-colors`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-${
                        column.align || "left"
                      } text-sm font-medium text-[#262A2E] font-poppins`}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                  {/* Only show Actions cell if there are actions AND no custom actions column exists */}
                  {(onView || onEdit || onDelete || onResendVerification) &&
                    !hasActionsColumn && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ActionMenu row={row} />
                      </td>
                    )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#E9ECEF] flex items-center justify-between bg-[#F8F9FA]">
          <div className="text-sm text-[#495057] font-poppins">
            Showing{" "}
            <span className="font-medium text-[#262A2E]">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-[#262A2E]">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[#262A2E]">
              {sortedData.length}
            </span>{" "}
            results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 border border-[#E9ECEF] rounded-md text-sm font-medium text-[#262A2E] hover:bg-[#8CC21B]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-poppins"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 border border-[#E9ECEF] rounded-md text-sm font-medium text-[#262A2E] hover:bg-[#8CC21B]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-poppins"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTable;
