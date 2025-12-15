// app/library/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PresentationChartBarIcon,
  FolderIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudArrowUpIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getFiles,
  uploadFile,
  deleteFile,
  updateFile,
  getFileStats,
  type LibraryFile,
  type FileFilters,
  type FileStats,
} from "@/api/library";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";
import { getAllCustomers } from "@/api/customers";
import Image from "next/image";

const LibraryPage: React.FC = () => {
  // State management
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [allFiles, setAllFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<FileStats | null>(null);

  const { user } = useSelector((state: RootState) => state.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add state for customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const itemsPerPage = 20;

  // Filter state
  const [filters, setFilters] = useState<FileFilters>({
    search: "",
    type: "",
    customerId: "",
    page: 1,
    limit: itemsPerPage,
    sortBy: "uploadedAt",
    sortOrder: "DESC",
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    description: "",
    tags: "",
    isPublic: true,
    customerId: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    description: "",
    tags: "",
    isPublic: true,
  });

  // Fetch customers on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await getAllCustomers();
        if (response?.data?.data) {
          setCustomers(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response: any = await getFiles(filters);
      setFiles(response.data);
      console.log("Fetched files:", response);
      setAllFiles(response.data);
      setTotalRecords(response.data.length);
      setTotalPages(response?.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await getFileStats();
      if (response?.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchStatistics();
  }, [fetchFiles]);

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("description", uploadForm.description);
        formData.append("tags", uploadForm.tags);
        formData.append("isPublic", uploadForm.isPublic.toString());
        if (uploadForm.customerId) {
          formData.append("customerId", uploadForm.customerId);
        }

        await uploadFile(formData);
      }

      // Reset form and close modal
      setUploadForm({
        description: "",
        tags: "",
        isPublic: true,
        customerId: "",
      });
      setShowUploadModal(false);

      // Refresh files list
      fetchFiles();
      fetchStatistics();
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFile(fileId);
        fetchFiles();
        fetchStatistics();
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
  };

  // Handle file update
  const handleUpdateFile = async (fileId: string) => {
    try {
      await updateFile(fileId, {
        description: editForm.description,
        tags: editForm.tags.split(",").map((tag) => tag.trim()),
        isPublic: editForm.isPublic,
      });
      setEditModeEnabled(false);
      setEditingFileId(null);
      fetchFiles();
    } catch (error) {
      console.error("Error updating file:", error);
    }
  };

  // Handle file preview
  const handlePreview = (file: LibraryFile) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "IMAGE":
        return <PhotoIcon className="h-6 w-6 text-blue-500" />;
      case "PDF":
        return <DocumentTextIcon className="h-6 w-6 text-red-500" />;
      case "DOCUMENT":
        return <DocumentIcon className="h-6 w-6 text-blue-400" />;
      case "SPREADSHEET":
        return <TableCellsIcon className="h-6 w-6 text-green-500" />;
      case "PRESENTATION":
        return <PresentationChartBarIcon className="h-6 w-6 text-orange-500" />;
      case "ARCHIVE":
        return <FolderIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <DocumentIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  // Get file type color
  const getFileTypeColor = (fileType: string) => {
    const colors: Record<string, string> = {
      IMAGE: "bg-blue-100 text-blue-800",
      PDF: "bg-red-100 text-red-800",
      DOCUMENT: "bg-blue-100 text-blue-800",
      SPREADSHEET: "bg-green-100 text-green-800",
      PRESENTATION: "bg-orange-100 text-orange-800",
      ARCHIVE: "bg-yellow-100 text-yellow-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[fileType] || colors.OTHER;
  };

  // Handle bulk download
  const handleBulkDownload = () => {
    if (selectedFiles.size === 0) {
      toast.error("No files selected");
      return;
    }

    selectedFiles.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        window.open(file.url, "_blank");
      }
    });
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) {
      toast.error("No files selected");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedFiles.size} file(s)?`
      )
    ) {
      try {
        for (const fileId of Array.from(selectedFiles)) {
          await deleteFile(fileId);
        }
        setSelectedFiles(new Set());
        fetchFiles();
        fetchStatistics();
      } catch (error) {
        console.error("Error deleting files:", error);
      }
    }
  };

  // Render file preview
  const renderPreview = () => {
    if (!previewFile) return null;

    switch (previewFile.fileType) {
      case "IMAGE":
        return (
          <div className="relative w-full h-96">
            <Image
              src={previewFile.url}
              alt={previewFile.originalName}
              fill
              className="object-contain rounded-lg"
              unoptimized
            />
          </div>
        );
      case "PDF":
        return (
          <iframe
            src={previewFile.url}
            className="w-full h-96 rounded-lg"
            title={previewFile.originalName}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
            {getFileIcon(previewFile.fileType)}
            <p className="mt-4 text-gray-600">Preview not available</p>
            <a
              href={previewFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 w-full flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Library</h1>
            <p className="text-gray-600">Manage and organize your files</p>
          </div>
          <div>
            <div className="flex gap-3">
              {/* Bulk Actions */}
              {selectedFiles.size > 0 && (
                <>
                  <CustomButton
                    onClick={handleBulkDownload}
                    className="px-4 py-2 bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700/90 transition-all flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Download ({selectedFiles.size})
                  </CustomButton>
                  {user?.role === UserRole.ADMIN && (
                    <CustomButton
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-700/90 transition-all flex items-center gap-2"
                    >
                      <TrashIcon className="h-5 w-5" />
                      Delete ({selectedFiles.size})
                    </CustomButton>
                  )}
                </>
              )}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                Filters
              </button>

              <button
                onClick={fetchFiles}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <CustomButton
                gradient={true}
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all flex items-center gap-2"
              >
                <CloudArrowUpIcon className="h-5 w-5" />
                Upload
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                  placeholder="Search files..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                >
                  <option value="">All Types</option>
                  <option value="IMAGE">Images</option>
                  <option value="PDF">PDFs</option>
                  <option value="DOCUMENT">Documents</option>
                  <option value="SPREADSHEET">Spreadsheets</option>
                  <option value="PRESENTATION">Presentations</option>
                  <option value="ARCHIVE">Archives</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <select
                  value={filters.customerId}
                  onChange={(e) =>
                    setFilters({ ...filters, customerId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                  disabled={loadingCustomers}
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName || customer.legalName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                >
                  <option value="uploadedAt">Upload Date</option>
                  <option value="fileSize">File Size</option>
                  <option value="originalName">File Name</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.totalFiles}
                  </p>
                </div>
                <div className="bg-gray-100 rounded-full p-3">
                  <FolderIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatFileSize(statistics.totalSize)}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <TableCellsIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {statistics.stats.slice(0, 2).map((stat) => (
              <div
                key={stat.type}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 capitalize">
                      {stat.type.toLowerCase()}s
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.count}
                    </p>
                  </div>
                  <div
                    className={`rounded-full p-3 ${getFileTypeColor(
                      stat.type
                    )}`}
                  >
                    {getFileIcon(stat.type)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Files Grid */}
        <div className="bg-white/80 backdrop-blur-sm rounded-md shadow-lg border border-gray-100/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading files...</span>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No files found</p>
              <p className="text-gray-500 text-sm mt-2">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedFiles.size === files.length &&
                          files.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(new Set(files.map((f) => f.id)));
                          } else {
                            setSelectedFiles(new Set());
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visibility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => handleFileSelect(file.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {file.thumbnailUrl ? (
                            <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                              <Image
                                src={file.thumbnailUrl}
                                alt={file.originalName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              {getFileIcon(file.fileType)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.originalName}
                            </div>
                            {file.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {file.description}
                              </div>
                            )}
                            {file.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {file.tags.slice(0, 3).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {file.tags.length > 3 && (
                                  <span className="text-xs text-gray-400">
                                    +{file.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getFileTypeColor(
                            file.fileType
                          )}`}
                        >
                          {file.fileType.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {file.isPublic ? (
                          <span className="inline-flex items-center text-green-600 text-sm">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600 text-sm">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Private
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(file)}
                            className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                            title="Preview"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-700 transition-colors p-1"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </a>
                          {(user?.role === UserRole.ADMIN ||
                            file.uploadedById === user?.id) && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingFileId(file.id);
                                  setEditForm({
                                    description: file.description || "",
                                    tags: file.tags.join(", "),
                                    isPublic: file.isPublic,
                                  });
                                  setEditModeEnabled(true);
                                }}
                                className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords} files
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded-lg transition-all ${
                          currentPage === pageNum
                            ? "bg-gray-600 text-white"
                            : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-3 py-1 text-sm rounded-lg transition-all ${
                          currentPage === totalPages
                            ? "bg-gray-600 text-white"
                            : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Upload Files
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                  <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Drag & drop files here or
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
                  >
                    Browse Files
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Supports images, PDFs, documents, spreadsheets, and more
                  </p>
                </div>

                {/* Upload Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      placeholder="Optional description for your files..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={uploadForm.tags}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, tags: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      placeholder="e.g., invoice, logo, contract"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer (Optional)
                      </label>
                      <select
                        value={uploadForm.customerId}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            customerId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                        disabled={loadingCustomers}
                      >
                        <option value="">No specific customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.companyName || customer.legalName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Visibility
                      </label>
                      <select
                        value={uploadForm.isPublic.toString()}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            isPublic: e.target.value === "true",
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      >
                        <option value="true">Public (Everyone can view)</option>
                        <option value="false">
                          Private (Only you can view)
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                  >
                    Cancel
                  </button>
                  {uploading && (
                    <div className="flex items-center gap-2 px-4 py-2 text-gray-600">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 truncate">
                  {previewFile.originalName}
                </h2>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">{renderPreview()}</div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    File Details
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Type:</dt>
                      <dd className="font-medium">{previewFile.fileType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Size:</dt>
                      <dd className="font-medium">
                        {formatFileSize(previewFile.fileSize)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Uploaded:</dt>
                      <dd className="font-medium">
                        {new Date(previewFile.uploadedAt).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(previewFile.uploadedAt).toLocaleTimeString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Visibility:</dt>
                      <dd className="font-medium">
                        {previewFile.isPublic ? "Public" : "Private"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {previewFile.description || "No description provided"}
                  </p>

                  {previewFile.tags.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {previewFile.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                >
                  Close
                </button>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModeEnabled && editingFileId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit File Details
                </h2>
                <button
                  onClick={() => {
                    setEditModeEnabled(false);
                    setEditingFileId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Update description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tags: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="e.g., invoice, logo, contract"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    value={editForm.isPublic.toString()}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        isPublic: e.target.value === "true",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                  >
                    <option value="true">Public (Everyone can view)</option>
                    <option value="false">Private (Only you can view)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditModeEnabled(false);
                    setEditingFileId(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                >
                  Cancel
                </button>
                <CustomButton
                  onClick={() => handleUpdateFile(editingFileId)}
                  className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all"
                >
                  Save Changes
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
