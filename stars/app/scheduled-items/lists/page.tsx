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
  useTheme,
  useMediaQuery,
  Collapse,
  Stack,
  Avatar,
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
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import {
  X,
  List,
  Grid2X2,
  FileText,
  FolderPlus,
  ClipboardList,
  Calendar,
  User,
} from "lucide-react";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  createNewList,
  deleteList,
  deleteListItem,
  getAllListForACustomer,
  handleDuplicateList,
} from "@/api/lists";
import { api, handleApiError } from "@/utils/api";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { successStyles } from "@/utils/constants";

// Responsive styled search field
const SearchField = styled(InputBase)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  borderRadius: 25,
  width: "100%",
  padding: "8px 20px",
  paddingLeft: 20,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  border: `1px solid ${alpha("#ADB5BD", 0.2)}`,
  transition: "all 0.3s ease",
  fontSize: "0.95rem",
  "&:hover": {
    backgroundColor: alpha(theme.palette.background.paper, 1),
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    transform: "translateY(-1px)",
  },
  "&.Mui-focused": {
    boxShadow: "0 4px 20px rgba(140, 194, 27, 0.2)",
    borderColor: theme.palette.primary.main,
  },
  [theme.breakpoints.down("sm")]: {
    padding: "10px 16px",
    fontSize: "1rem",
  },
}));

// Mobile-optimized breadcrumbs
function EnhancedBreadcrumbs() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        borderRadius: 1,
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 0.5, sm: 1 },
        pt: 0,
        display: "inline-flex",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: alpha("#495057", 0.7),
          fontSize: { xs: "0.8rem", sm: "0.85rem" },
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
            px: { xs: 0.5, sm: 1 },
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
          {!isMobile && "Dashboard"}
        </Box>
        <Box
          component="span"
          sx={{
            mx: { xs: 0.5, sm: 1 },
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
            fontSize: { xs: "0.8rem", sm: "0.85rem" },
            px: { xs: 0.5, sm: 1 },
            py: 0.5,
          }}
        >
          Product Lists
        </Typography>
      </Box>
    </Box>
  );
}

// Responsive Create List Dialog
const CreateListDialog = ({ open, onClose, onSuccess, customerId }: any) => {
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          margin: isMobile ? 0 : 2,
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
          fontSize: { xs: "1.1rem", sm: "1.25rem" },
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <FolderPlus
            style={{
              marginRight: 10,
              color: theme.palette.primary.main,
              width: isMobile ? 20 : 24,
              height: isMobile ? 20 : 24,
            }}
          />
          Create New List
        </Box>
        <IconButton
          onClick={handleClose}
          size={isMobile ? "medium" : "small"}
          disabled={loading}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2.5, sm: 3 },
            mt: { xs: 1, sm: 2 },
          }}
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
                fontSize: { xs: "1rem", sm: "0.95rem" },
              },
              "& .MuiInputLabel-root": {
                fontSize: { xs: "1rem", sm: "0.95rem" },
              },
            }}
          />

          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={isMobile ? 4 : 3}
            variant="outlined"
            disabled={loading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: { xs: "1rem", sm: "0.95rem" },
              },
              "& .MuiInputLabel-root": {
                fontSize: { xs: "1rem", sm: "0.95rem" },
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          pt: { xs: 1, sm: 2 },
          borderTop: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
          gap: { xs: 1, sm: 0 },
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <CustomButton
          variant="outlined"
          onClick={handleClose}
          rounded="medium"
          disabled={loading}
          fullWidth={isMobile}
          sx={{
            minHeight: { xs: 48, sm: 36 },
            order: { xs: 2, sm: 1 },
          }}
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
          fullWidth={isMobile}
          sx={{
            minHeight: { xs: 48, sm: 36 },
            order: { xs: 1, sm: 2 },
          }}
        >
          {loading ? "Creating..." : "Create List"}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

// Mobile-optimized List Card Component
const MobileListCard = ({
  list,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  router,
  customerId,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const menuOpen = Boolean(menuAnchor);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Card
      elevation={0}
      sx={{
        mb: 2,
        border: "1px solid",
        borderColor: alpha("#ADB5BD", 0.15),
        borderRadius: 1,
        transition: "all 0.3s ease",
        overflow: "hidden",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {/* Main content */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 48,
              display: { xs: "none", sm: "block" },
              height: 48,
            }}
          >
            <FolderOpen />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 1,
              }}
            >
              <Typography
                variant="h6"
                component="div"
                fontWeight={600}
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                  flex: 1,
                  mr: 1,
                }}
              >
                {list.name}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ ml: 1, flexShrink: 0 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
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
                sx={{ fontWeight: 500 }}
              />
              <Typography variant="body2" color="text.secondary">
                {list.items?.length || 0} products
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Calendar size={14} />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(list.lastUpdated || list.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <User size={14} />
                <Typography variant="caption" color="text.secondary">
                  {list.createdBy?.customer?.id ? "You" : "Admin"}
                </Typography>
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: "flex", gap: 1, pt: 1 }}>
              <CustomButton
                variant="contained"
                size="small"
                startIcon={<VisibilityOutlined />}
                rounded="medium"
                onClick={() => router.push(`/scheduled-items/lists/${list.id}`)}
                sx={{ flex: 1, minHeight: 36 }}
              >
                View
              </CustomButton>
              <CustomButton
                variant="outlined"
                size="small"
                startIcon={<EditOutlined />}
                rounded="medium"
                onClick={() => onEdit(list)}
                sx={{ flex: 1, minHeight: 36 }}
              >
                Edit
              </CustomButton>
            </Box>
          </Box>
        </Box>
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
    </Card>
  );
};

// Desktop List view item component (unchanged but optimized)
const ListViewItem = ({
  list,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  router,
  customerId,
}: any) => {
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const menuOpen = Boolean(menuAnchor);

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
            {list.items?.length || 0} products
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2">
            {formatDate(list.lastUpdated || list.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            by {list.createdBy?.customer?.id ? "You" : "Admin"}
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

// Grid view item component (responsive)
const GridViewItem = ({
  list,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  router,
}: any) => {
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const menuOpen = Boolean(menuAnchor);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
          transform: isMobile ? "none" : "translateY(-4px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: alpha("#ADB5BD", 0.1),
          backgroundColor: alpha(theme.palette.background.default, 0.3),
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              p: { xs: 1, sm: 1.5 },
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FolderOpen
              style={{
                color: theme.palette.primary.main,
                width: isMobile ? 20 : 24,
                height: isMobile ? 20 : 24,
              }}
            />
          </Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{
              fontSize: { xs: "0.95rem", sm: "1rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {list.name}
          </Typography>
        </Box>
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
            minWidth: 60,
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
          }}
        />
      </Box>

      {/* Card content */}
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
          >
            Created by {list.creator || "Unknown"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
          >
            Last updated:{" "}
            {new Date(list.lastUpdated || list.createdAt).toLocaleDateString()}
          </Typography>
        </Box>

        <Box
          sx={{
            p: { xs: 1, sm: 1.5 },
            backgroundColor: alpha(theme.palette.background.default, 0.7),
            borderRadius: 2,
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClipboardList size={isMobile ? 16 : 18} />
          </Box>
          <Box>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ fontSize: { xs: "0.85rem", sm: "0.875rem" } }}
            >
              {list.productsCount || 0}
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
            >
              Products
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Card actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          p: { xs: 1.5, sm: 2 },
          mt: "auto",
          borderTop: "1px solid",
          borderColor: alpha("#ADB5BD", 0.1),
          gap: 1,
        }}
      >
        <CustomButton
          variant="contained"
          size="small"
          startIcon={<VisibilityOutlined />}
          rounded="medium"
          hoverEffect="scale"
          onClick={() => router.push(`/scheduled-items/lists/${list.id}`)}
          sx={{
            flex: 1,
            minHeight: { xs: 36, sm: 32 },
            fontSize: { xs: "0.8rem", sm: "0.875rem" },
          }}
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
              width: { xs: 36, sm: 32 },
              height: { xs: 36, sm: 32 },
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
              width: { xs: 36, sm: 32 },
              height: { xs: 36, sm: 32 },
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

// Mobile-optimized Delete Dialog
const DeleteDialog = ({
  open,
  onClose,
  onConfirm,
  listName,
  isDeleting,
}: any) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          margin: isMobile ? 0 : 2,
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
          fontSize: { xs: "1.1rem", sm: "1.25rem" },
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Delete
            style={{
              marginRight: 10,
              color: theme.palette.error.main,
              width: isMobile ? 20 : 24,
              height: isMobile ? 20 : 24,
            }}
          />
          Delete List
        </Box>
        <IconButton
          onClick={onClose}
          size={isMobile ? "medium" : "small"}
          disabled={isDeleting}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        <Typography
          variant="body1"
          sx={{
            mb: 2,
            fontSize: { xs: "1rem", sm: "0.875rem" },
          }}
        >
          Are you sure you want to delete <strong>{listName}</strong>?
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: { xs: "0.9rem", sm: "0.875rem" },
          }}
        >
          This action cannot be undone. All products in this list will remain in
          your inventory.
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          pt: { xs: 1, sm: 2 },
          borderTop: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
          gap: { xs: 1, sm: 0 },
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <CustomButton
          variant="outlined"
          onClick={onClose}
          rounded="medium"
          disabled={isDeleting}
          fullWidth={isMobile}
          sx={{
            minHeight: { xs: 48, sm: 36 },
            order: { xs: 2, sm: 1 },
          }}
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
          fullWidth={isMobile}
          sx={{
            minHeight: { xs: 48, sm: 36 },
            order: { xs: 1, sm: 2 },
          }}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

// Enhanced Empty state component
const EmptyState = ({ onCreateList }: any) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        textAlign: "center",
        maxWidth: { xs: "100%", sm: 500 },
        mx: "auto",
        mt: { xs: 2, sm: 4 },
        mb: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box
        sx={{
          width: { xs: 80, sm: 120 },
          height: { xs: 80, sm: 120 },
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: { xs: 2, sm: 3 },
        }}
      >
        <FolderPlus
          style={{
            color: theme.palette.primary.main,
            width: isMobile ? 40 : 60,
            height: isMobile ? 40 : 60,
          }}
        />
      </Box>

      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontWeight: 700,
          mb: { xs: 1.5, sm: 2 },
          fontSize: { xs: "1.3rem", sm: "1.5rem" },
          background: "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
          backgroundClip: "text",
          textFillColor: "transparent",
        }}
      >
        No Product Lists Yet
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mb: { xs: 2, sm: 3 },
          color: "text.secondary",
          fontSize: { xs: "0.9rem", sm: "1rem" },
          lineHeight: 1.6,
        }}
      >
        Create your first product list to organize your inventory efficiently.
        Lists help you group products for different purposes like catalogs,
        promotions, or seasonal collections.
      </Typography>

      <CustomButton
        variant="contained"
        size={isMobile ? "medium" : "large"}
        startIcon={<FolderPlus />}
        onClick={onCreateList}
        gradient={true}
        rounded="medium"
        hoverEffect="scale"
        sx={{
          px: { xs: 3, sm: 4 },
          minHeight: { xs: 48, sm: 56 },
          fontSize: { xs: "0.9rem", sm: "1rem" },
        }}
      >
        Create Your First List
      </CustomButton>
    </Box>
  );
};

// Main Page Component
const ProductListsPage = () => {
  const [productLists, setProductLists] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { customer } = useSelector((state: RootState) => state.customer);

  const [viewMode, setViewMode] = useState("list");
  const [createDialogOpen, setCreateDialogOpen] = useState<any>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<any>(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<any>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Force mobile view on small screens
  useEffect(() => {
    if (isSmallMobile && viewMode === "list") {
      setViewMode("mobile");
    }
  }, [isSmallMobile, viewMode]);

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

  useEffect(() => {
    fetchLists();
  }, []);

  const filteredLists = productLists.filter(
    (list: any) =>
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (list.creator &&
        list.creator.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (list.status &&
        list.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedLists = filteredLists.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleCreateListSuccess = async (newList: any) => {
    if (newList && newList.id) {
      router.push(`/scheduled-items/lists/${newList.id}`);
    } else {
      await fetchLists(false);
    }
  };

  const handleEditList = (list: any) => {
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
        const data = await deleteList(selectedList.id as string);

        if (data?.success) {
          setProductLists(
            productLists.filter((list: any) => list.id !== selectedList.id)
          );

          toast.success("List deleted successfully", successStyles);
          setDeleteDialogOpen(false);
          setSelectedList(null);
        }
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
    fetchLists(true);
  };

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
    setPage(0); // Reset pagination when changing view
  };

  if (loading) {
    return (
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, sm: 3 },
          pt: { xs: 1, sm: 1 },
          px: { xs: 1, sm: 2 },
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
      </Container>
    );
  }

  return (
    <Container
      sx={{
        width: "100vw",
        py: { xs: 2, sm: 3 },
        pt: { xs: 1, sm: 1 },
        px: { xs: 1, sm: 2 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: { xs: 1.5, sm: 2 },
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: { xs: 1, sm: 1 },
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.5, sm: 1 },
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          border: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: { xs: 1, sm: 1.5 },
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <IconButton
            onClick={() => router.back()}
            sx={{
              mr: { xs: 1, sm: 1.5 },
              bgcolor: "background.paper",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              "&:hover": {
                bgcolor: "background.paper",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              },
              transition: "all 0.2s",
            }}
            aria-label="back"
          >
            <ArrowBack fontSize={isSmallMobile ? "small" : "medium"} />
          </IconButton>

          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
              background: "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
              backgroundClip: "text",
              textFillColor: "transparent",
              letterSpacing: "-0.5px",
              flex: 1,
            }}
          >
            Product Lists
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
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
                  <Refresh fontSize={isSmallMobile ? "small" : "medium"} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <EnhancedBreadcrumbs />
      </Box>
      <Card
        sx={{
          mb: { xs: 2, sm: 4 },
          overflow: "visible",
          borderRadius: { xs: 1, sm: 1 },
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
          border: "1px solid",
          borderColor: alpha("#ADB5BD", 0.15),
          backdropFilter: "blur(10px)",
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Search and Controls */}
          <Stack
            spacing={{ xs: 2, md: 0 }}
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            {/* Search */}
            <Box sx={{ maxWidth: { xs: "100%", md: 500 }, width: "100%" }}>
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

            {/* Controls */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                mt: { xs: 0, md: 0 },
                justifyContent: { xs: "space-between", md: "flex-end" },
              }}
            >
              {/* Filter Button */}

              {/* Create Button */}
              <CustomButton
                variant="contained"
                startIcon={<FolderPlus />}
                onClick={() => setCreateDialogOpen(true)}
                gradient={true}
                rounded="medium"
                hoverEffect="scale"
                size={isSmallMobile ? "medium" : "large"}
                sx={{
                  minHeight: { xs: 40, sm: 44 },
                  px: { xs: 2, sm: 3 },
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                }}
              >
                {isSmallMobile ? "New" : "New List"}
              </CustomButton>
            </Stack>
          </Stack>

          {/* Content */}
          {productLists.length === 0 ? (
            <EmptyState onCreateList={() => setCreateDialogOpen(true)} />
          ) : (
            <>
              {/* Lists Display */}
              {isSmallMobile || viewMode === "mobile" ? (
                // Mobile Card View
                <Box sx={{ mb: 2 }}>
                  {paginatedLists.map((list: any) => (
                    <MobileListCard
                      key={list.id}
                      list={list}
                      router={router}
                      customerId={customer?.id}
                      onEdit={handleEditList}
                      onDelete={handleDeleteList}
                      onDuplicate={handleDuplicatedList}
                    />
                  ))}
                </Box>
              ) : viewMode === "list" ? (
                // Desktop Table View
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
                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 2 }}>
                  {paginatedLists.map((list: any) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={list.id}>
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
                  mt: { xs: 2, sm: 0 },
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                >
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
                    ".MuiTablePagination-toolbar": {
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    },
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Card>
      {/* Dialogs */}
      <CreateListDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateListSuccess}
        customerId={customer?.id}
      />
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
