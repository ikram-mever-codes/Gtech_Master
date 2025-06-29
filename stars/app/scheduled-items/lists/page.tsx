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
} from "lucide-react";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  createNewList,
  getAllListForACustomer,
  handleDuplicateList,
} from "@/api/lists";
import { api, handleApiError } from "@/utils/api";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { successStyles } from "@/utils/constants";

// Styled search field for consistent styling
const SearchField = styled(InputBase)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  borderRadius: 25,
  width: "100%",
  padding: "5px 15px",
  paddingLeft: 15,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  border: `1px solid ${alpha("#ADB5BD", 0.15)}`,
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: alpha(theme.palette.background.paper, 1),
    boxShadow: "0 4px 10px rgba(0,0,0,0.07)",
  },
  "&.Mui-focused": {
    boxShadow: "0 4px 15px rgba(140, 194, 27, 0.15)",
  },
}));

// Empty state illustration component

// Enhanced breadcrumbs
function EnhancedBreadcrumbs() {
  return (
    <Box
      sx={{
        borderRadius: 3,
        px: 2.5,
        py: 1,
        pt: 0,
        display: "inline-flex",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: alpha("#495057", 0.7),
          fontSize: "0.85rem",
        }}
      >
        <Box
          component="a"
          href="#"
          sx={{
            display: "flex",
            alignItems: "center",
            color: "inherit",
            textDecoration: "none",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            "&:hover": {
              bgcolor: "rgba(140, 194, 27, 0.08)",
              color: "primary.main",
            },
            transition: "all 0.2s",
          }}
        >
          <Home fontSize="small" sx={{ mr: 0.5 }} />
          Dashboard
        </Box>
        <Box
          component="span"
          sx={{
            mx: 1,
            color: alpha("#495057", 0.5),
            fontWeight: 600,
          }}
        >
          /
        </Box>
        <Typography
          color="primary.main"
          fontWeight={600}
          sx={{
            fontSize: "0.85rem",
            px: 1,
            py: 0.5,
          }}
        >
          Product Lists
        </Typography>
      </Box>
    </Box>
  );
}

// Create List Dialog Component
const CreateListDialog = ({ open, onClose, onSuccess, customerId }: any) => {
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!listName.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    if (!customerId.trim()) {
      toast.error("Please enter a customer ID");
      return;
    }

    setLoading(true);
    try {
      const listData = {
        name: listName.trim(),
        description: description.trim() || undefined,
        customerId: customerId.trim(),
      };

      const result = await createNewList(listData);

      // Reset form
      setListName("");
      setDescription("");

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
          Create New List
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={loading}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 3, mt: "2rem" }}
        >
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
const ListViewItem = ({
  list,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  router,
  customerId,
}: any) => {
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
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
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
            {list.items.length || 0} products
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2">
            {formatDate(list.lastUpdated || list.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            by {list.createdBy.customer.id ? "You" : "Admin"}
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
              ? "error"
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
              onClick={() => router.push(`/scheduled-items/lists/${list.id}`)}
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

// Grid view item component
const GridViewItem = ({
  list,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  router,
}: any) => {
  // State for more menu
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const menuOpen = Boolean(menuAnchor);

  return (
    <Card
      elevation={0}
      sx={{
        p: 0,
        height: "100%",
        border: "1px solid",
        borderColor: alpha("#ADB5BD", 0.15),
        borderRadius: 3,
        transition: "all 0.3s ease",
        overflow: "hidden",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {/* Card header with icon and status */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: alpha("#ADB5BD", 0.1),
          backgroundColor: alpha(theme.palette.background.default, 0.3),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FolderOpen style={{ color: theme.palette.primary.main }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {list.name}
          </Typography>
        </Box>
        <Box>
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
        </Box>
      </Box>

      {/* Card content */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Created by {list.creator || "Unknown"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated:{" "}
            {new Date(list.lastUpdated || list.createdAt).toLocaleDateString()}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            backgroundColor: alpha(theme.palette.background.default, 0.7),
            borderRadius: 2,
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClipboardList size={18} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {list.productsCount || 0}
            </Typography>
            <Typography variant="caption">Products</Typography>
          </Box>
        </Box>
      </Box>

      {/* Card actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          p: 2,
          mt: "auto",
          borderTop: "1px solid",
          borderColor: alpha("#ADB5BD", 0.1),
        }}
      >
        <CustomButton
          variant="contained"
          size="small"
          startIcon={<VisibilityOutlined />}
          rounded="medium"
          hoverEffect="scale"
          onClick={() => router.push(`/scheduled-items/lists/${list.id}`)}
        >
          View
        </CustomButton>

        <Box sx={{ display: "flex", gap: 1 }}>
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
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{
              color: theme.palette.text.secondary,
              backgroundColor: alpha(theme.palette.divider, 0.1),
              "&:hover": {
                backgroundColor: alpha(theme.palette.divider, 0.2),
              },
            }}
          >
            <MoreHoriz fontSize="small" />
          </IconButton>
        </Box>

        {/* More options menu */}
        <Menu
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={() => setMenuAnchor(null)}
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
      </Box>
    </Card>
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
          <X fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to delete <strong>{listName}</strong>?
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          This action cannot be undone. All products in this list will remain in
          your inventory.
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
        No Product Lists Yet
      </Typography>

      <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
        Create your first product list to organize your inventory efficiently.
        Lists help you group products for different purposes like catalogs,
        promotions, or seasonal collections.
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
        Create Your First List
      </CustomButton>
    </Box>
  );
};

// Main Page Component
const ProductListsPage = () => {
  // State for product lists
  const [productLists, setProductLists] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { customer } = useSelector((state: RootState) => state.customer);
  // UI state
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [createDialogOpen, setCreateDialogOpen] = useState<any>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<any>(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<any>("");
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

      const response = await getAllListForACustomer(customer?.id as string);
      setProductLists(response?.reverse());
    } catch (error) {
      console.error("Failed to fetch lists:", error);
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
  const filteredLists = productLists.filter(
    (list: any) =>
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (list.creator &&
        list.creator.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (list.status &&
        list.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginated lists
  const paginatedLists = filteredLists.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Event handlers
  const handleCreateListSuccess = async (newList: any) => {
    // Redirect to the new list page
    if (newList && newList.id) {
      router.push(`/scheduled-items/lists/${newList.id}`);
    } else {
      await fetchLists(false);
    }
  };

  const handleEditList = (list: any) => {
    // Navigate to list edit page
    router.push(`/scheduled-items/lists/${list.id}`);
  };

  const handleDeleteList = (list: any) => {
    setSelectedList(list);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedList) {
      setIsDeleting(true);
      try {
        // Add your delete API call here
        // await deleteListItem(selectedList.id as string);
        // Remove from local state
        setProductLists(
          productLists.filter((list: any) => list.id !== selectedList.id)
        );

        toast.success("List deleted successfully", successStyles);
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

  const handleDuplicatedList = async (list: any) => {
    try {
      const data = await handleDuplicateList(list);
      if (data?.success) {
        await fetchLists();
        toast.success("List duplicated successfully", successStyles);
      }
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
      <Container maxWidth="xl" sx={{ py: 3, pt: 1 }}>
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
      </Container>
    );
  }

  // Render page
  return (
    <Container maxWidth="xl" sx={{ py: 3, pt: 1 }}>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(10px)",
          borderRadius: 1,
          px: 2.5,
          py: 1,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          border: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <IconButton
            onClick={() => {
              router.back();
            }}
            sx={{
              mr: 1.5,
              bgcolor: "background.paper",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              "&:hover": {
                bgcolor: "background.paper",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              },
              transition: "all 0.2s",
            }}
            aria-label="back"
          >
            <ArrowBack />
          </IconButton>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
              backgroundClip: "text",
              textFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            Product Lists
          </Typography>

          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    transform: refreshing ? "none" : "rotate(180deg)",
                    transition: "transform 0.3s ease",
                  },
                }}
              >
                {refreshing ? (
                  <CircularProgress size={20} />
                ) : (
                  <Refresh fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <EnhancedBreadcrumbs />
      </Box>

      {/* Main Content Card */}
      <Card
        sx={{
          mb: 4,
          overflow: "visible",
          borderRadius: 1,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
          border: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
          backdropFilter: "blur(10px)",
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header with view controls */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ maxWidth: 500, width: "100%" }}>
              <SearchField
                placeholder="Search product lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                startAdornment={
                  <InputAdornment position="start">
                    <Search
                      sx={{
                        color: alpha(theme.palette.text.primary, 0.5),
                        mr: 1,
                      }}
                    />
                  </InputAdornment>
                }
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Box
                sx={{
                  display: "flex",
                  border: "1px solid",
                  borderColor: alpha("#ADB5BD", 0.2),
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <Tooltip title="List View">
                  <IconButton
                    size="small"
                    onClick={() => setViewMode("list")}
                    sx={{
                      borderRadius: 0,
                      bgcolor:
                        viewMode === "list"
                          ? alpha(theme.palette.primary.main, 0.1)
                          : "transparent",
                      color:
                        viewMode === "list"
                          ? theme.palette.primary.main
                          : "text.secondary",
                      p: 1,
                      "&:hover": {
                        bgcolor:
                          viewMode === "list"
                            ? alpha(theme.palette.primary.main, 0.15)
                            : alpha(theme.palette.action.hover, 0.7),
                      },
                    }}
                  >
                    <List size={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Grid View">
                  <IconButton
                    size="small"
                    onClick={() => setViewMode("grid")}
                    sx={{
                      borderRadius: 0,
                      bgcolor:
                        viewMode === "grid"
                          ? alpha(theme.palette.primary.main, 0.1)
                          : "transparent",
                      color:
                        viewMode === "grid"
                          ? theme.palette.primary.main
                          : "text.secondary",
                      p: 1,
                      "&:hover": {
                        bgcolor:
                          viewMode === "grid"
                            ? alpha(theme.palette.primary.main, 0.15)
                            : alpha(theme.palette.action.hover, 0.7),
                      },
                    }}
                  >
                    <Grid2X2 size={20} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Tooltip title="Filter Lists">
                <IconButton
                  onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: alpha("#ADB5BD", 0.2),
                    "&:hover": {
                      bgcolor: alpha(theme.palette.action.hover, 0.7),
                    },
                  }}
                >
                  <FilterList />
                </IconButton>
              </Tooltip>

              <CustomButton
                variant="contained"
                startIcon={<FolderPlus />}
                onClick={() => setCreateDialogOpen(true)}
                gradient={true}
                rounded="medium"
                hoverEffect="scale"
              >
                New List
              </CustomButton>
            </Box>
          </Box>

          {/* Empty state or lists */}
          {productLists.length === 0 ? (
            <EmptyState onCreateList={() => setCreateDialogOpen(true)} />
          ) : (
            <>
              {/* Lists display */}
              {viewMode === "list" ? (
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
                          Name
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Last Updated
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell
                          align="right"
                          sx={{ pr: 3, fontWeight: 600 }}
                        >
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
                          customerId={customer?.id}
                          onEdit={handleEditList}
                          onDelete={handleDeleteList}
                          onDuplicate={handleDuplicatedList}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Grid container spacing={3} sx={{ mb: 2 }}>
                  {paginatedLists.map((list: any) => (
                    <Grid item xs={12} sm={6} md={4} key={list.id}>
                      <GridViewItem
                        list={list}
                        router={router}
                        onEdit={handleEditList}
                        onDelete={handleDeleteList}
                        onDuplicate={handleDuplicatedList}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}

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
                  Showing{" "}
                  {Math.min(filteredLists.length, page * rowsPerPage + 1)} to{" "}
                  {Math.min(filteredLists.length, (page + 1) * rowsPerPage)} of{" "}
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
        </Box>
      </Card>

      {/* Create List Dialog */}
      <CreateListDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateListSuccess}
        customerId={customer?.id}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        listName={selectedList?.name}
        isDeleting={isDeleting}
      />
    </Container>
  );
};

export default ProductListsPage;
