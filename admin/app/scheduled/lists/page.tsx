"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  IconButton,
  Card,
  Grid,
  Tooltip,
  alpha,
  InputBase,
  InputAdornment,
  Menu,
  MenuItem,
  Badge,
  Chip,
  Divider,
  Paper,
  styled,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Autocomplete,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Search,
  FilterList,
  MoreVert,
  Home,
  Sort,
  EditNote,
  Delete,
  AutoAwesome,
  Notifications,
  Refresh,
  Assignment,
  VisibilityOutlined,
  EditOutlined,
  DeleteOutlined,
  ContentCopy,
  MoreHoriz,
  FolderOutlined,
  FolderOpen,
  CloudDownload,
  Print,
  Close,
} from "@mui/icons-material";
import {
  X,
  List,
  Grid2X2,
  FileText,
  FolderPlus,
  ClipboardList,
  PlusIcon,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { createNewList, getAllLists, deleteListItem } from "@/api/list";
import { api, handleApiError } from "@/utils/api";
import { getAllCustomers } from "@/api/customers";

// Create List Dialog Component
const CreateListDialog = ({ open, onClose, onSuccess }: any) => {
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Fetch customers when dialog opens
  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      // Replace with actual API call
      const response = await getAllCustomers();
      setCustomers(response?.data || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      handleApiError(error, "Failed to load customers");
      // Fallback sample data
    } finally {
      setCustomersLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!listName.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    setLoading(true);
    try {
      const listData = {
        name: listName.trim(),
        description: description.trim() || undefined,
        customerId: selectedCustomer.id,
      };

      const result = await createNewList(listData);

      // Reset form
      setListName("");
      setDescription("");
      setSelectedCustomer(null);

      onSuccess(result);
      onClose();
    } catch (error) {
      console.error("Failed to create list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setListName("");
      setDescription("");
      setSelectedCustomer(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <FolderPlus
            style={{ marginRight: 10, color: theme.palette.primary.main }}
          />
          Create New List for Customer
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={loading}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 3, mt: "2rem" }}
        >
          <Autocomplete
            options={customers}
            getOptionLabel={(option) =>
              `${option.companyName} (${option.email})`
            }
            value={selectedCustomer}
            onChange={(event, newValue) => setSelectedCustomer(newValue)}
            loading={customersLoading}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Customer"
                required
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {customersLoading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <UserCircle size={20} style={{ marginRight: 10 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {option.companyName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email}
                  </Typography>
                </Box>
              </Box>
            )}
          />

          <TextField
            label="List Name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            fullWidth
            required
            variant="outlined"
            disabled={loading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />

          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            disabled={loading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          borderTop: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
        }}
      >
        <CustomButton
          variant="outlined"
          onClick={handleClose}
          rounded="medium"
          disabled={loading}
        >
          Cancel
        </CustomButton>
        <CustomButton
          variant="contained"
          onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={16} /> : <FolderPlus />}
          rounded="medium"
          hoverEffect="scale"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create List"}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

// List view item component
const ListViewItem = ({ list, onEdit, onDelete, onDuplicate, router }: any) => {
  // State for more menu
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const menuOpen = Boolean(menuAnchor);

  // Format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <TableRow
      hover
      sx={{
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <TableCell
        sx={{
          pl: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FolderOpen style={{ color: theme.palette.primary.main }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" component="div" fontWeight={600}>
              {list.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {list.description || "No description"}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <UserCircle size={20} color={theme.palette.text.secondary} />
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {list.customer?.companyName || "Unknown Customer"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {list.customer?.email || "No email"}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell className=" flex justify-center items-center">
        <Typography
          variant="body2"
          className=" text-center self-center"
          fontWeight={600}
        >
          {list?.items?.length || 0}
        </Typography>
      </TableCell>

      <TableCell>
        <Box>
          <Typography variant="body2">
            {formatDate(list.updatedAt || list.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            by {list.createdBy?.name || "Admin"}
          </Typography>
        </Box>
      </TableCell>

      <TableCell>
        <Chip
          label={list.status || "Active"}
          size="small"
          color={
            list.status === "Active"
              ? "success"
              : list.status === "Draft"
              ? "default"
              : list.status === "Archived"
              ? "error"
              : "primary"
          }
          sx={{
            fontWeight: 500,
            minWidth: 70,
          }}
        />
      </TableCell>

      <TableCell align="right" sx={{ pr: 3 }}>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Tooltip title="View List">
            <IconButton
              size="small"
              onClick={() => router.push(`/scheduled/lists/${list.id}`)}
              sx={{
                color: theme.palette.info.main,
                backgroundColor: alpha(theme.palette.info.main, 0.1),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.info.main, 0.2),
                },
              }}
            >
              <VisibilityOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit List">
            <IconButton
              size="small"
              onClick={() => onEdit(list)}
              sx={{
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="More Options">
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.divider, 0.2),
                },
              }}
            >
              <MoreHoriz fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* More options menu */}
        <Menu
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              border: `1px solid ${alpha("#ADB5BD", 0.15)}`,
              width: 180,
            },
          }}
        >
          {/* <MenuItem
            onClick={() => {
              onDuplicate(list);
              setMenuAnchor(null);
            }}
            sx={{
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <ContentCopy
              fontSize="small"
              sx={{ color: theme.palette.secondary.main }}
            />
            <Typography variant="body2">Duplicate</Typography>
          </MenuItem> */}
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              // Handle print
            }}
            sx={{
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Print
              fontSize="small"
              sx={{ color: theme.palette.secondary.main }}
            />
            <Typography variant="body2">Print</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              // Handle export
            }}
            sx={{
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <CloudDownload
              fontSize="small"
              sx={{ color: theme.palette.secondary.main }}
            />
            <Typography variant="body2">Export</Typography>
          </MenuItem>
          <Divider sx={{ my: 1, borderColor: alpha("#ADB5BD", 0.15) }} />
          <MenuItem
            onClick={() => {
              onDelete(list);
              setMenuAnchor(null);
            }}
            sx={{
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              color: theme.palette.error.main,
            }}
          >
            <DeleteOutlined
              fontSize="small"
              sx={{ color: theme.palette.error.main }}
            />
            <Typography variant="body2">Delete</Typography>
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
};

// Delete confirmation dialog
const DeleteDialog = ({
  open,
  onClose,
  onConfirm,
  listName,
  isDeleting,
}: any) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Delete
            style={{ marginRight: 10, color: theme.palette.error.main }}
          />
          Delete List
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isDeleting}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to delete <strong>{listName}</strong>?
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          This action cannot be undone. All items in this list will be removed.
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          borderTop: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
        }}
      >
        <CustomButton
          variant="outlined"
          onClick={onClose}
          rounded="medium"
          disabled={isDeleting}
        >
          Cancel
        </CustomButton>
        <CustomButton
          variant="contained"
          onClick={onConfirm}
          color="error"
          startIcon={isDeleting ? <CircularProgress size={16} /> : <Delete />}
          rounded="medium"
          hoverEffect="scale"
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

// Empty state component
const EmptyState = ({ onCreateList }: any) => {
  return (
    <Box
      sx={{
        textAlign: "center",
        maxWidth: 500,
        mx: "auto",
        mt: 4,
        mb: 8,
        px: 3,
        py: 5,
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontWeight: 700,
          mb: 2,
          background: "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
          backgroundClip: "text",
          textFillColor: "transparent",
        }}
      >
        No Lists Found
      </Typography>

      <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
        Start by creating lists for your customers. Lists help organize products
        for different customers, projects, or purposes.
      </Typography>

      <CustomButton
        variant="contained"
        size="large"
        startIcon={<FolderPlus />}
        onClick={onCreateList}
        gradient={true}
        rounded="medium"
        hoverEffect="scale"
        sx={{ px: 4 }}
      >
        Create First List
      </CustomButton>
    </Box>
  );
};

// Main Page Component
const AdminListsPage = () => {
  // State for lists
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const router = useRouter();

  // Fetch lists from backend
  const fetchLists = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const response = await getAllLists();
      setLists(response || []);
    } catch (error) {
      console.error("Failed to fetch lists:", error);
      setError("Failed to load lists. Please try again.");
      handleApiError(error, "Failed to load lists");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load lists on component mount
  useEffect(() => {
    fetchLists();
  }, []);

  // Filter lists based on search term
  const filteredLists = lists.filter(
    (list: any) =>
      list.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated lists
  const paginatedLists = filteredLists.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Event handlers
  const handleCreateListSuccess = async (newList: any) => {
    // Refresh the lists to show the new one
    await fetchLists(false);
  };

  const handleEditList = (list: any) => {
    // Navigate to list edit page
    router.push(`/scheduled/lists/${list.id}
      `);
  };

  const handleDeleteList = (list: any) => {
    setSelectedList(list);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedList) {
      setIsDeleting(true);
      try {
        await deleteListItem(selectedList.id);
        // Remove from local state
        setLists(lists.filter((list: any) => list.id !== selectedList.id));
        setDeleteDialogOpen(false);
        setSelectedList(null);
      } catch (error) {
        console.error("Failed to delete list:", error);
        handleApiError(error, "Failed to delete list");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDuplicateList = async (list: any) => {
    try {
      // Create a duplicate with a modified name
      const duplicateData = {
        name: `${list.name} (Copy)`,
        description: list.description,
        customerId: list.customer?.id || list.customerId,
      };

      await createNewList(duplicateData);
      await fetchLists(false);
    } catch (error) {
      console.error("Failed to duplicate list:", error);
      handleApiError(error, "Failed to duplicate list");
    }
  };

  const handleRefresh = () => {
    fetchLists(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full mx-auto px-0">
        <div
          className="bg-white rounded-lg shadow-sm pb-[7rem] p-8 px-9"
          style={{
            border: "1px solid #e0e0e0",
            background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}
          >
            <CircularProgress size={40} />
          </Box>
        </div>
      </div>
    );
  }

  // Render page
  return (
    <div className="w-full mx-auto px-0">
      <div
        className="bg-white rounded-lg shadow-sm pb-[7rem] p-8 px-9"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Typography
              variant="h4"
              sx={{ color: "secondary.main", fontSize: "30px" }}
            >
              Lists Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage all customer lists and create new ones
            </Typography>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <Paper
              className="flex items-center px-4 py-2 flex-1 max-w-md"
              sx={{
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                border: "1px solid #e0e0e0",
              }}
            >
              <Search className="text-gray-400 mr-2" />
              <InputBase
                placeholder="Search lists, customers..."
                className="flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  "& input": {
                    padding: "4px",
                  },
                }}
              />
            </Paper>

            <CustomButton
              startIcon={<PlusIcon color="white" size={18} />}
              gradient
              shadow="large"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create List
            </CustomButton>
          </div>
        </div>

        {/* Filters and Refresh Button */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel sx={{ color: "text.secondary" }}>Status</InputLabel>
            <Select
              value=""
              sx={{
                borderRadius: "8px",
                "& .MuiSelect-select": {
                  py: 1.2,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: "8px",
                    mt: 1,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                },
              }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Archived">Archived</MenuItem>
            </Select>
          </FormControl>

          {/* Refresh Button */}
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              borderRadius: "8px",
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.main,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {/* Total Lists Count */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              ml: "auto",
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              px: 2,
              py: 1,
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            Total Lists: {lists.length}
          </Typography>
        </div>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Lists Table */}
        {lists.length === 0 ? (
          <EmptyState onCreateList={() => setCreateDialogOpen(true)} />
        ) : (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: alpha("#ADB5BD", 0.15),
                mb: 2,
                overflow: "hidden",
                "& ::-webkit-scrollbar": {
                  width: "10px",
                  height: "10px",
                },
                "& ::-webkit-scrollbar-track": {
                  backgroundColor: alpha("#f1f1f1", 0.5),
                  borderRadius: "10px",
                },
                "& ::-webkit-scrollbar-thumb": {
                  backgroundColor: alpha("#888", 0.4),
                  borderRadius: "10px",
                  border: "2px solid transparent",
                  backgroundClip: "content-box",
                  "&:hover": {
                    backgroundColor: alpha("#555", 0.5),
                  },
                },
              }}
            >
              <Table>
                <TableHead
                  sx={{
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ pl: 3, fontWeight: 600 }}>
                      List Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Updated</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="right" sx={{ pr: 3, fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLists.map((list: any) => (
                    <ListViewItem
                      key={list.id}
                      list={list}
                      router={router}
                      onEdit={handleEditList}
                      onDelete={handleDeleteList}
                      onDuplicate={handleDuplicateList}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {Math.min(filteredLists.length, page * rowsPerPage + 1)}{" "}
                to {Math.min(filteredLists.length, (page + 1) * rowsPerPage)} of{" "}
                {filteredLists.length} lists
              </Typography>

              <TablePagination
                component="div"
                count={filteredLists.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{
                  ".MuiTablePagination-select": {
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: alpha("#ADB5BD", 0.2),
                    py: 0.5,
                    pl: 1,
                  },
                  ".MuiTablePagination-selectIcon": {
                    top: "calc(50% - 12px)",
                  },
                }}
              />
            </Box>
          </>
        )}

        {/* Create List Dialog */}
        <CreateListDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateListSuccess}
        />

        {/* Delete Dialog */}
        <DeleteDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          listName={selectedList?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default AdminListsPage;
