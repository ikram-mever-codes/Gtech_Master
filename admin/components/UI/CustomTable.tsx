// "use client";
// import React, { useState } from "react";
// import {
//   Box,
//   IconButton,
//   Paper,
//   Menu,
//   MenuItem,
//   Chip,
//   Avatar,
//   Typography,
//   Divider,
//   Tooltip,
//   TextField,
//   InputAdornment,
//   Button,
//   CircularProgress,
//   TablePagination,
//   useTheme,
// } from "@mui/material";
// import {
//   LucideMoreVertical,
//   LucideSearch,
//   LucideFilter,
//   LucideX,
//   LucideEye,
//   LucideTrash2,
//   LucidePencil,
//   LucideUserPlus,
// } from "lucide-react";
// import {
//   DataGrid,
//   GridColDef,
//   GridToolbarContainer,
//   GridToolbarExport,
//   GridToolbarFilterButton,
//   GridSortDirection,
//   GridSortModel,
// } from "@mui/x-data-grid";
// import { styled } from "@mui/material/styles";

// // Types
// interface CustomTableProps {
//   columns: GridColDef[];
//   rows: any[];
//   loading?: boolean;
//   title?: string;
//   searchFields?: string[];
//   onRowClick?: (row: any) => void;
//   onAddNew?: () => void;
//   addNewLabel?: string;
//   enableFilters?: boolean;
//   enableExport?: boolean;
//   enableSorting?: boolean;
//   rowHeight?: number;
//   pageSizeOptions?: number[];
//   defaultPageSize?: number;
// }

// // Styled components
// const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
//   border: "none",
//   "& .MuiDataGrid-columnHeaders": {
//     backgroundColor: theme.palette.background.paper,
//     borderBottom: `1px solid ${theme.palette.divider}`,
//     "& .MuiDataGrid-columnHeaderTitle": {
//       fontWeight: 600,
//       color: theme.palette.text.primary,
//     },
//     "& .MuiDataGrid-columnHeader": {
//       "&:not(:last-child)": {
//         borderRight: `1px solid ${theme.palette.divider}`,
//       },
//       "& .MuiDataGrid-iconButtonContainer": {
//         display: "none",
//       },
//     },
//   },
//   "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell": {
//     padding: theme.spacing(0, 2),
//     "&:focus": {
//       outline: "none",
//     },
//     "&:not(:last-child)": {
//       borderRight: `1px solid ${theme.palette.divider}`,
//     },
//   },
//   "& .MuiDataGrid-cell": {
//     borderBottom: `1px solid ${theme.palette.divider}`,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   "& .MuiDataGrid-row": {
//     "&:nth-of-type(even)": {
//       backgroundColor: theme.palette.background.default,
//     },
//     "&:hover": {
//       backgroundColor: theme.palette.action.hover,
//       cursor: "pointer",
//     },
//     "&.Mui-selected": {
//       backgroundColor: theme.palette.action.selected,
//       "&:hover": {
//         backgroundColor: theme.palette.action.selected,
//       },
//     },
//   },
//   "& .MuiDataGrid-footerContainer": {
//     borderTop: `1px solid ${theme.palette.divider}`,
//   },
//   "& .MuiDataGrid-toolbarContainer": {
//     padding: theme.spacing(2),
//     backgroundColor: "transparent",
//     borderBottom: `1px solid ${theme.palette.divider}`,
//   },
//   "& .MuiDataGrid-virtualScroller": {
//     backgroundColor: theme.palette.background.paper,
//   },
//   "& .MuiDataGrid-columnHeaderTitleContainer": {
//     justifyContent: "center",
//   },
// }));

// const ActionMenu = ({ row, actions }: { row: any; actions: any[] }) => {
//   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//   const open = Boolean(anchorEl);
//   const theme = useTheme();

//   const handleClick = (event: React.MouseEvent<HTMLElement>) => {
//     event.stopPropagation();
//     setAnchorEl(event.currentTarget);
//   };

//   const handleClose = () => {
//     setAnchorEl(null);
//   };

//   return (
//     <Box display="flex" justifyContent="center" width="100%">
//       <IconButton
//         onClick={handleClick}
//         size="small"
//         sx={{
//           "&:hover": {
//             backgroundColor: theme.palette.action.hover,
//           },
//         }}
//       >
//         <LucideMoreVertical size={18} />
//       </IconButton>
//       <Menu
//         anchorEl={anchorEl}
//         open={open}
//         onClose={handleClose}
//         onClick={(e) => e.stopPropagation()}
//         PaperProps={{
//           elevation: 4,
//           sx: {
//             borderRadius: "8px",
//             minWidth: 200,
//             boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
//             "& .MuiMenuItem-root": {
//               fontSize: "0.875rem",
//               padding: theme.spacing(1, 2),
//               minHeight: "auto",
//             },
//           },
//         }}
//       >
//         {actions.map((action, index) => (
//           <React.Fragment key={index}>
//             {action.divider && index !== 0 && (
//               <Divider sx={{ my: 0.5, borderColor: theme.palette.divider }} />
//             )}
//             <MenuItem
//               onClick={(e: any) => {
//                 e.stopPropagation();
//                 action.onClick(row);
//                 handleClose();
//               }}
//               sx={{
//                 color: action.color || "inherit",
//                 "&:hover": {
//                   backgroundColor: action.danger
//                     ? theme.palette.error.light
//                     : theme.palette.action.hover,
//                 },
//               }}
//             >
//               <Box display="flex" alignItems="center" gap={1.5}>
//                 {action.icon}
//                 <Typography variant="body2">{action.label}</Typography>
//               </Box>
//             </MenuItem>
//           </React.Fragment>
//         ))}
//       </Menu>
//     </Box>
//   );
// };

// const CustomToolbar = ({
//   title,
//   onAddNew,
//   addNewLabel,
//   enableFilters,
//   enableExport,
//   searchText,
//   setSearchText,
//   searchFields,
// }: any) => {
//   const theme = useTheme();

//   return (
//     <GridToolbarContainer
//       sx={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         p: theme.spacing(2),
//       }}
//     >
//       <Box>
//         {title && (
//           <Typography variant="h6" sx={{ fontWeight: 600 }}>
//             {title}
//           </Typography>
//         )}
//       </Box>

//       <Box display="flex" gap={2} alignItems="center">
//         <TextField
//           variant="outlined"
//           size="small"
//           placeholder="Search..."
//           value={searchText}
//           onChange={(e) => setSearchText(e.target.value)}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <LucideSearch size={18} color={theme.palette.text.secondary} />
//               </InputAdornment>
//             ),
//             endAdornment: searchText && (
//               <InputAdornment position="end">
//                 <IconButton
//                   size="small"
//                   onClick={() => setSearchText("")}
//                   sx={{ color: theme.palette.text.secondary }}
//                 >
//                   <LucideX size={16} />
//                 </IconButton>
//               </InputAdornment>
//             ),
//           }}
//           sx={{
//             width: 300,
//             "& .MuiOutlinedInput-root": {
//               borderRadius: "8px",
//               "& input": {
//                 padding: theme.spacing(1, 1.5),
//               },
//             },
//           }}
//         />

//         {enableFilters && (
//           <Button
//             variant="outlined"
//             startIcon={<LucideFilter size={18} />}
//             sx={{
//               borderRadius: "8px",
//               textTransform: "none",
//               px: 2,
//               py: 1,
//               borderColor: theme.palette.divider,
//               color: theme.palette.text.primary,
//             }}
//           >
//             Filters
//           </Button>
//         )}

//         {onAddNew && (
//           <Button
//             variant="contained"
//             onClick={onAddNew}
//             startIcon={<LucideUserPlus size={18} />}
//             sx={{
//               borderRadius: "8px",
//               textTransform: "none",
//               boxShadow: "none",
//               px: 2,
//               py: 1,
//             }}
//           >
//             {addNewLabel || "Add New"}
//           </Button>
//         )}

//         {enableExport && <GridToolbarExport />}
//       </Box>
//     </GridToolbarContainer>
//   );
// };

// const CustomTable = ({
//   columns,
//   rows,
//   loading = false,
//   title,
//   searchFields = ["name", "email"],
//   onRowClick,
//   onAddNew,
//   addNewLabel,
//   enableFilters = true,
//   enableExport = true,
//   enableSorting = true,
//   rowHeight = 60,
//   pageSizeOptions = [10, 25, 50],
//   defaultPageSize = 10,
// }: CustomTableProps) => {
//   const theme = useTheme();
//   const [searchText, setSearchText] = useState("");
//   const [pageSize, setPageSize] = useState(defaultPageSize);
//   const [sortModel, setSortModel] = useState<GridSortModel>([
//     { field: "id", sort: "asc" as GridSortDirection },
//   ]);

//   const hasActionColumn = columns.some((col) => col.field === "actions");
//   const tableColumns = hasActionColumn
//     ? columns.map((col) => ({
//         ...col,
//         headerAlign: "center",
//         align: "center",
//         renderCell: (params: any) => (
//           <Box width="100%" display="flex" justifyContent="center">
//             {col.renderCell ? (
//               col.renderCell(params)
//             ) : (
//               <Typography variant="body2" noWrap>
//                 {params.value}
//               </Typography>
//             )}
//           </Box>
//         ),
//       }))
//     : [
//         ...columns.map((col) => ({
//           ...col,
//           headerAlign: "center",
//           align: "center",
//           renderCell: (params: any) => (
//             <Box width="100%" display="flex" justifyContent="center">
//               {col.renderCell ? (
//                 col.renderCell(params)
//               ) : (
//                 <Typography variant="body2" noWrap>
//                   {params.value}
//                 </Typography>
//               )}
//             </Box>
//           ),
//         })),
//         {
//           field: "actions",
//           headerName: "Actions",
//           width: 100,
//           sortable: false,
//           filterable: false,
//           headerAlign: "center",
//           align: "center",
//           renderCell: (params: any) => (
//             <ActionMenu
//               row={params.row}
//               actions={[
//                 {
//                   label: "View",
//                   icon: <LucideEye size={16} />,
//                   onClick: (row: any) => console.log("View", row),
//                 },
//                 {
//                   label: "Edit",
//                   icon: <LucidePencil size={16} />,
//                   onClick: (row: any) => console.log("Edit", row),
//                 },
//                 {
//                   label: "Delete",
//                   icon: <LucideTrash2 size={16} />,
//                   onClick: (row: any) => console.log("Delete", row),
//                   color: theme.palette.error.main,
//                   danger: true,
//                   divider: true,
//                 },
//               ]}
//             />
//           ),
//         },
//       ];

//   // Filter rows based on search text
//   const filteredRows = rows.filter((row) =>
//     searchFields.some((field) =>
//       String(row[field]).toLowerCase().includes(searchText.toLowerCase())
//     )
//   );

//   return (
//     <Paper
//       elevation={0}
//       sx={{
//         borderRadius: "5px",
//         border: `1px solid #464a4f`,
//         overflow: "hidden",
//         backgroundColor: theme.palette.background.paper,
//         boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
//       }}
//     >
//       <StyledDataGrid
//         rows={filteredRows}
//         columns={tableColumns}
//         loading={loading}
//         rowHeight={rowHeight}
//         pageSizeOptions={pageSizeOptions}
//         disableColumnResize
//         disableColumnMenu
//         initialState={{
//           pagination: {
//             paginationModel: { pageSize, page: 0 },
//           },
//         }}
//         onPaginationModelChange={(params) => setPageSize(params.pageSize)}
//         sortModel={sortModel}
//         onSortModelChange={(model) => setSortModel(model)}
//         onRowClick={(params) => onRowClick && onRowClick(params.row)}
//         slots={{
//           toolbar: () => (
//             <CustomToolbar
//               title={title}
//               onAddNew={onAddNew}
//               addNewLabel={addNewLabel}
//               enableFilters={enableFilters}
//               enableExport={enableExport}
//               searchText={searchText}
//               setSearchText={setSearchText}
//               searchFields={searchFields}
//             />
//           ),
//           loadingOverlay: () => (
//             <Box
//               sx={{
//                 height: "100%",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: 2,
//                 backgroundColor: theme.palette.background.paper,
//               }}
//             >
//               <CircularProgress size={24} />
//               <Typography variant="body2" color="text.secondary">
//                 Loading data...
//               </Typography>
//             </Box>
//           ),
//           noRowsOverlay: () => (
//             <Box
//               sx={{
//                 height: "100%",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: 2,
//                 p: 4,
//                 backgroundColor: theme.palette.background.paper,
//               }}
//             >
//               <img
//                 src="/empty-state.svg"
//                 alt="No data"
//                 style={{ width: 150, opacity: 0.7 }}
//               />
//               <Typography variant="h6" color="text.secondary">
//                 No data available
//               </Typography>
//               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
//                 {searchText
//                   ? "No results match your search criteria"
//                   : "There are no records to display"}
//               </Typography>
//               {onAddNew && (
//                 <Button
//                   variant="contained"
//                   onClick={onAddNew}
//                   startIcon={<LucideUserPlus size={18} />}
//                   sx={{
//                     borderRadius: "8px",
//                     textTransform: "none",
//                   }}
//                 >
//                   {addNewLabel || "Add New"}
//                 </Button>
//               )}
//             </Box>
//           ),
//         }}
//         slotProps={{
//           toolbar: {
//             printOptions: { disableToolbarButton: true },
//           },
//           columnsPanel: {
//             sx: {
//               "& .MuiDataGrid-panelFooter": {
//                 display: "none",
//               },
//             },
//           },
//           baseButton: {
//             sx: {
//               borderRadius: "8px",
//               textTransform: "none",
//             },
//           },
//         }}
//         sx={{
//           "& .MuiDataGrid-columnHeader": {
//             "& .MuiDataGrid-iconButtonContainer": {
//               visibility: enableSorting ? "visible" : "hidden",
//             },
//             "& .MuiDataGrid-sortIcon": {
//               opacity: 1,
//               color: theme.palette.text.secondary,
//             },
//           },
//           "& .MuiDataGrid-cellContent": {
//             width: "100%",
//             textAlign: "center",
//           },
//         }}
//       />
//     </Paper>
//   );
// };

// export default CustomTable;

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
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

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

  return (
    <div className="bg-white rounded-xl border border-[#E9ECEF] shadow-sm  overflow-hidden">
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
              {(onView || onEdit || onDelete) && (
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
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-4 text-center"
                >
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8CC21B] border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-4 text-center"
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-[#ADB5BD] mb-2 text-sm font-poppins">
                      No users found
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
                  {(onView || onEdit || onDelete) && (
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
