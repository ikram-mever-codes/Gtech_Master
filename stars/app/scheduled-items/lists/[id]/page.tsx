"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  InputAdornment,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Checkbox,
  CircularProgress,
  Alert,
  alpha,
  Select,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
  Container,
  Stack,
  Avatar,
  Collapse,
  Fab,
  Grid,
  FormControl,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Delete,
  Edit,
  Image,
  Search,
  Refresh,
  CheckCircle,
  Cancel,
  CheckBoxOutlineBlank,
  CheckBox,
  ExpandMore,
  ExpandLess,
  LocalShipping,
  Schedule,
  LocationOn,
  Info,
} from "@mui/icons-material";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import { ImageIcon, X, Package, Hash } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";

// Import API functions
import {
  addItemToList,
  updateListItem,
  deleteListItem,
  getListDetails,
  searchItems,
  updateList,
  getAllListForACustomer,
} from "@/api/lists";
import { DELIVERY_STATUS, INTERVAL_OPTIONS } from "@/utils/interfaces";
import {
  DELIVERY_STATUS_CONFIG,
  errorStyles,
  formatPeriodLabel,
  successStyles,
} from "@/utils/constants";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import DeliveryDetailsModal, {
  DeliveryCell,
  EditableCommentCell,
  EditableIntervalCell,
  EditableMarkedCell,
  EditableQuantityCell,
} from "@/components/List/DelieveryDetails";
import { AddItemDialog } from "@/components/List/AddItemDialog";

const CARGO_STATUS_OPTIONS = [
  {
    value: "preparing",
    label: "Preparing",
    color: "warning",
    icon: <Schedule />,
  },
  {
    value: "shipped",
    label: "Shipped",
    color: "info",
    icon: <LocalShipping />,
  },
  {
    value: "in_transit",
    label: "In Transit",
    color: "primary",
    icon: <LocationOn />,
  },
  {
    value: "arrived",
    label: "Arrived",
    color: "success",
    icon: <CheckCircle />,
  },
  { value: "delayed", label: "Delayed", color: "error", icon: <Schedule /> },
];

const MobileItemCard = ({ item, onUpdateItem, onSelect, isSelected }: any) => {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState({
    quantity: item.quantity || 0,
    comment: item.comment || "",
    interval: item.interval || "monthly",
  });

  const handleFieldSave = async (field: string, value: any) => {
    try {
      await onUpdateItem(item.id, { [field]: value });
      setEditingField(null);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      setValues((prev) => ({ ...prev, [field]: item[field] }));
    }
  };

  const toggleMarked = async () => {
    try {
      await onUpdateItem(item.id, { marked: !item.marked });
    } catch (error) {
      console.error("Failed to update marked status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "Bestätigt";
      case "pending":
        return "Ausstehend";
      case "rejected":
        return "Abgelehnt";
      default:
        return "Ausstehend";
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        border: "1px solid",
        borderColor: isSelected
          ? theme.palette.primary.main
          : alpha("#E0E7FF", 0.8),
        borderRadius: 1,
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.02)
          : "background.paper",
        boxShadow: isSelected
          ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`
          : "0 2px 12px rgba(0,0,0,0.04)",
        "&:hover": {
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          borderColor: alpha(theme.palette.primary.main, 0.4),
          transform: "translateY(-2px)",
        },
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          p: 2,
          background: isSelected
            ? `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.04
              )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`
            : `linear-gradient(135deg, ${alpha("#F8FAFC", 0.8)} 0%, ${alpha(
                "#F1F5F9",
                0.6
              )} 100%)`,
          borderBottom: `1px solid ${alpha("#E2E8F0", 0.6)}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Checkbox */}
          <Grid item xs="auto">
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() => onSelect(item.id)}
              sx={{
                color: alpha(theme.palette.primary.main, 0.6),
                "&.Mui-checked": {
                  color: theme.palette.primary.main,
                },
              }}
            />
          </Grid>

          {/* Product Image */}
          <Grid item xs="auto">
            <Avatar
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1,
                border: `2px solid ${alpha("#FFFFFF", 0.8)}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                background: alpha("#F8FAFC", 0.9),
              }}
            >
              {item.imageUrl ? (
                <img
                  src={`https://system.gtech.de/storage/${item.imageUrl}`}
                  alt={item.articleName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 6,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Package size={24} color={theme.palette.text.secondary} />
              )}
            </Avatar>
          </Grid>

          {/* Product Info */}
          <Grid item xs>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                fontSize: "0.95rem",
                lineHeight: 1.4,
                mb: 0.5,
                color: theme.palette.text.primary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {item.articleName}
            </Typography>

            {/* Article Info Row */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}
            >
              {item.articleNumber && (
                <Chip
                  label={`${item.articleNumber}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: "0.7rem",
                    height: 22,
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.info.main, 0.08),
                    borderColor: alpha(theme.palette.info.main, 0.2),
                    color: theme.palette.info.main,
                  }}
                />
              )}
              {item.item_no_de && (
                <Chip
                  label={`DE: ${item.item_no_de}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: "0.7rem",
                    height: 22,
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                    borderColor: alpha(theme.palette.secondary.main, 0.2),
                    color: theme.palette.secondary.main,
                  }}
                />
              )}
            </Stack>

            {/* Status and Marked Row */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={getStatusLabel(item.changeStatus)}
                size="small"
                color={getStatusColor(item.changeStatus)}
                sx={{
                  fontWeight: 500,
                  borderRadius: 1,
                  fontSize: "0.75rem",
                }}
              />
              {item.marked && (
                <Chip
                  label="Markiert"
                  size="small"
                  color="primary"
                  variant="filled"
                  sx={{
                    borderRadius: 1,
                    fontSize: "0.7rem",
                    height: 22,
                  }}
                />
              )}
            </Stack>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs="auto">
            <Stack direction="column" spacing={0.5}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  color: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                {expanded ? (
                  <ExpandLess fontSize="small" />
                ) : (
                  <ExpandMore fontSize="small" />
                )}
              </IconButton>
              <IconButton
                size="small"
                onClick={toggleMarked}
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: item.marked
                    ? alpha(theme.palette.success.main, 0.1)
                    : alpha(theme.palette.grey[500], 0.08),
                  border: `1px solid ${
                    item.marked
                      ? alpha(theme.palette.success.main, 0.3)
                      : alpha(theme.palette.grey[500], 0.2)
                  }`,
                  color: item.marked
                    ? theme.palette.success.main
                    : theme.palette.grey[600],
                  "&:hover": {
                    backgroundColor: item.marked
                      ? alpha(theme.palette.success.main, 0.2)
                      : alpha(theme.palette.grey[500], 0.15),
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                <CheckBox fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Expanded Details Section */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2, backgroundColor: alpha("#FAFBFC", 0.5) }}>
          {/* Editable Fields Grid */}
          <Grid container spacing={2}>
            {/* Quantity Field */}
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 2px 8px ${alpha(
                      theme.palette.primary.main,
                      0.08
                    )}`,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    mb: 0.5,
                    display: "block",
                  }}
                >
                  Menge
                </Typography>
                {editingField === "quantity" ? (
                  <TextField
                    size="small"
                    type="number"
                    value={values.quantity}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    onBlur={() =>
                      handleFieldSave("quantity", Number(values.quantity))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleFieldSave("quantity", Number(values.quantity));
                      } else if (e.key === "Escape") {
                        setValues((prev) => ({
                          ...prev,
                          quantity: item.quantity,
                        }));
                        setEditingField(null);
                      }
                    }}
                    fullWidth
                    autoFocus
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1,
                        height: 32,
                      },
                    }}
                  />
                ) : (
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      cursor: "pointer",
                      p: 0.8,
                      borderRadius: 1,
                      minHeight: 32,
                      display: "flex",
                      alignItems: "center",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                      },
                    }}
                    onClick={() => {
                      setEditingField("quantity");
                      setValues((prev) => ({
                        ...prev,
                        quantity: item.quantity,
                      }));
                    }}
                  >
                    {item.quantity || 0}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Interval Field */}
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 2px 8px ${alpha(
                      theme.palette.primary.main,
                      0.08
                    )}`,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    mb: 0.5,
                    display: "block",
                  }}
                >
                  Intervall
                </Typography>
                {editingField === "interval" ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={values.interval}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          interval: e.target.value,
                        }));
                        handleFieldSave("interval", e.target.value);
                      }}
                      onClose={() => setEditingField(null)}
                      autoFocus
                      open={editingField === "interval"}
                      sx={{
                        borderRadius: 1,
                        height: 32,
                      }}
                    >
                      {INTERVAL_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{
                      cursor: "pointer",
                      p: 0.8,
                      borderRadius: 1,
                      minHeight: 32,
                      display: "flex",
                      alignItems: "center",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                      },
                    }}
                    onClick={() => {
                      setEditingField("interval");
                      setValues((prev) => ({
                        ...prev,
                        interval: item.interval,
                      }));
                    }}
                  >
                    {INTERVAL_OPTIONS.find((opt) => opt.value === item.interval)
                      ?.label || "Monatlich"}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Comment Field - Full Width */}
            <Grid item xs={12}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                  border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 2px 8px ${alpha(
                      theme.palette.primary.main,
                      0.08
                    )}`,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    mb: 0.5,
                    display: "block",
                  }}
                >
                  Kommentar
                </Typography>
                {editingField === "comment" ? (
                  <TextField
                    size="small"
                    multiline
                    rows={2}
                    value={values.comment}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        comment: e.target.value,
                      }))
                    }
                    onBlur={() => handleFieldSave("comment", values.comment)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleFieldSave("comment", values.comment);
                      } else if (e.key === "Escape") {
                        setValues((prev) => ({
                          ...prev,
                          comment: item.comment,
                        }));
                        setEditingField(null);
                      }
                    }}
                    fullWidth
                    autoFocus
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1,
                      },
                    }}
                  />
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: "pointer",
                      p: 0.8,
                      borderRadius: 1,
                      minHeight: 40,
                      display: "flex",
                      alignItems: "center",
                      color: item.comment
                        ? theme.palette.text.primary
                        : theme.palette.text.secondary,
                      fontStyle: item.comment ? "normal" : "italic",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                      },
                    }}
                    onClick={() => {
                      setEditingField("comment");
                      setValues((prev) => ({ ...prev, comment: item.comment }));
                    }}
                  >
                    {item.comment || "Kommentar hinzufügen..."}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Delivery Information */}
            {item.deliveries && Object.keys(item.deliveries).length > 0 && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.info.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.info.main,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      mb: 1,
                      display: "block",
                    }}
                  >
                    Lieferungen
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(item.deliveries).map(
                      ([period, delivery]: [string, any]) => (
                        <Grid item xs={6} key={period}>
                          <Box
                            sx={{
                              p: 1,
                              backgroundColor: "background.paper",
                              borderRadius: 1,
                              border: `1px solid ${alpha("#E2E8F0", 0.6)}`,
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              display="block"
                            >
                              {period}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Menge: {delivery.quantity || 0}
                            </Typography>
                            <Chip
                              label={
                                DELIVERY_STATUS_CONFIG[
                                  delivery.status || DELIVERY_STATUS.PENDING
                                ]?.label || "Pending"
                              }
                              size="small"
                              color={
                                DELIVERY_STATUS_CONFIG[
                                  delivery.status || DELIVERY_STATUS.PENDING
                                ]?.color || "default"
                              }
                              sx={{
                                fontSize: "0.65rem",
                                height: 18,
                                borderRadius: 1,
                                mt: 0.5,
                              }}
                            />
                          </Box>
                        </Grid>
                      )
                    )}
                  </Grid>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </Collapse>
    </Card>
  );
};

// Horizontal List Tabs Component - Attached to Main Content
function ListTabs({ currentListId, customerId, onListChange }: any) {
  const [allLists, setAllLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchAllLists = async () => {
      try {
        setLoading(true);
        const response = await getAllListForACustomer(customerId);
        setAllLists(response || []);
      } catch (error) {
        console.error("Failed to fetch all lists:", error);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchAllLists();
    }
  }, [customerId]);

  if (loading || allLists.length <= 1) return null;

  return (
    <Box
      sx={{
        borderTop: `1px solid ${alpha("#E2E8F0", 0.8)}`,
        backgroundColor: alpha("#F8FAFC", 0.6),
        backdropFilter: "blur(10px)",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: `1px solid ${alpha("#E2E8F0", 0.6)}`,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          color="primary.main"
          sx={{ mb: 0.5 }}
        >
          Switch Between Lists
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Quick navigation between your product lists
        </Typography>
      </Box>

      <Box
        sx={{
          px: { xs: 1, sm: 2 },
          py: 2,
          overflowX: "auto",
          "&::-webkit-scrollbar": {
            height: 6,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: alpha("#f1f1f1", 0.5),
            borderRadius: 3,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(theme.palette.primary.main, 0.3),
            borderRadius: 3,
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.5),
            },
          },
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            minWidth: "max-content",
            pb: 1,
          }}
        >
          {allLists.map((list) => {
            const isActive = list.id === currentListId;
            return (
              <Card
                key={list.id}
                sx={{
                  minWidth: { xs: 200, sm: 240 },
                  p: 2,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: isActive
                    ? theme.palette.primary.main
                    : alpha("#E2E8F0", 0.8),
                  backgroundColor: isActive
                    ? alpha(theme.palette.primary.main, 0.08)
                    : "background.paper",
                  borderRadius: 1,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    transform: "translateY(-2px)",
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.primary.main,
                      0.12
                    )}`,
                  },
                }}
                onClick={() => !isActive && onListChange(list.id)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      backgroundColor: isActive
                        ? theme.palette.primary.main
                        : alpha(theme.palette.primary.main, 0.1),
                      color: isActive ? "white" : "primary.main",
                    }}
                  >
                    <Package size={18} />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={isActive ? 600 : 500}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        mb: 0.3,
                      }}
                    >
                      {list.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {list.items?.length || 0} items
                    </Typography>
                  </Box>

                  {isActive && (
                    <Chip
                      label="Current"
                      size="small"
                      color="primary"
                      sx={{
                        fontWeight: 500,
                        fontSize: "0.7rem",
                        height: 20,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
              </Card>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

// Main Component
const ListManagementPage = () => {
  const router = useRouter();
  const params = useParams();
  const listId = params?.id as string;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { customer } = useSelector((state: RootState) => state.customer);

  const [listData, setListData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const handleUpdateTitle = async () => {
    if (!editedTitle.trim()) {
      toast.error("Title cannot be empty", errorStyles);
      return;
    }

    try {
      setSaving(true);
      await updateList(listData.id, { name: editedTitle });
      setListData((prev: any) => ({ ...prev, name: editedTitle }));
      setIsEditingTitle(false);
      toast.success("Title updated successfully", successStyles);
    } catch (error) {
      console.error("Failed to update title:", error);
      toast.error("Failed to update title", errorStyles);
    } finally {
      setSaving(false);
    }
  };
  const handleUpdateItem = async (itemId: string, updateData: any) => {
    try {
      await updateListItem(itemId, updateData);
      setListData((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) =>
          item.id === itemId ? { ...item, ...updateData } : item
        ),
      }));
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item", errorStyles);
    }
  };
  function extractDeliveryPeriods(items: any[]): { sortedPeriods: string[] } {
    const periodsSet = new Set<string>();

    items.forEach((item) => {
      if (item.deliveries) {
        Object.keys(item.deliveries).forEach((period) => {
          periodsSet.add(period);
        });
      }
    });

    const sortedPeriods = Array.from(periodsSet).sort((a, b) => {
      const [yearA, periodA] = a.split("-").map((p) => p.replace("T", ""));
      const [yearB, periodB] = b.split("-").map((p) => p.replace("T", ""));

      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      return parseInt(periodA) - parseInt(periodB);
    });

    return { sortedPeriods };
  }

  useEffect(() => {
    const loadListData = async () => {
      if (!listId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getListDetails(listId);
        setListData(response);
        setEditedTitle(response.name);
      } catch (error) {
        console.error("Failed to load list:", error);
      } finally {
        setLoading(false);
      }
    };

    loadListData();
  }, [listId]);

  const deliveryPeriodsData = useMemo(() => {
    if (!listData?.items) return { sortedPeriods: [] };
    return extractDeliveryPeriods(listData.items);
  }, [listData?.items]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "selection",
        name: "",
        width: 50,
        frozen: true,
        renderCell: (props: any) => (
          <Checkbox
            size="small"
            checked={selectedRows.has(props.row.id)}
            onChange={() => {
              const newSelectedRows = new Set(selectedRows);
              if (newSelectedRows.has(props.row.id)) {
                newSelectedRows.delete(props.row.id);
              } else {
                newSelectedRows.add(props.row.id);
              }
              setSelectedRows(newSelectedRows);
            }}
          />
        ),
      },
      // {
      //   key: "itemNumber",
      //   name: "Artikel-Nr.",
      //   width: 100,
      //   resizable: true,
      // },

      {
        key: "item_no_de",
        name: "Item No. DE",
        width: 120,
        resizable: true,
        renderCell: (props: any) => (
          <Typography variant="body2" sx={{ fontSize: "14px" }}>
            {props.row.item_no_de || "-"}
          </Typography>
        ),
      },
      {
        key: "articleNumber",
        name: "Artikelnummer",
        width: 140,
        resizable: true,
      },
      {
        key: "imageUrl",
        name: "Bild",
        width: 80,
        resizable: true,
        frozen: true,
        renderCell: (props: any) => {
          const [imageOpen, setImageOpen] = useState(false);

          if (!props.row.imageUrl) {
            return (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.disabled",
                  width: "100%",
                  height: 60,
                }}
              >
                <Image fontSize="small" />
              </Box>
            );
          }

          return (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  width: "100%",
                }}
                onClick={() => setImageOpen(true)}
              >
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 1,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "2px solid #fff",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <img
                    src={`https://system.gtech.de/storage/${props.row.imageUrl}`}
                    alt={props.row.articleName || "Produkt"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #999;"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>';
                    }}
                  />
                </Box>
              </Box>

              <Dialog
                open={imageOpen}
                onClose={() => setImageOpen(false)}
                maxWidth="md"
                PaperProps={{
                  sx: {
                    borderRadius: 3,
                    overflow: "hidden",
                  },
                }}
              >
                <DialogTitle>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="h6" fontWeight={600}>
                      {props.row.articleName || "Produktbild"}
                    </Typography>
                    <IconButton
                      onClick={() => setImageOpen(false)}
                      size="small"
                    >
                      <X fontSize="small" />
                    </IconButton>
                  </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                  <img
                    src={`https://system.gtech.de/storage/${props.row.imageUrl}`}
                    alt={props.row.articleName || "Produkt"}
                    style={{
                      width: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </DialogContent>
              </Dialog>
            </>
          );
        },
      },
      {
        key: "articleName",
        name: "Artikelname",
        width: 350, // Increased width for better visibility
        resizable: true,
        renderCell: (props: any) => (
          <Tooltip
            title={props.row.articleName || ""}
            arrow
            placement="top-start"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: "rgba(33, 33, 33, 0.95)",
                  color: "white",
                  fontSize: "0.875rem",
                  borderRadius: 1,
                  maxWidth: 400,
                  wordWrap: "break-word",
                  whiteSpace: "pre-wrap",
                },
              },
              arrow: {
                sx: {
                  color: "rgba(33, 33, 33, 0.95)",
                },
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                cursor: "help",
                py: 1,
                px: 0.5,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: "14px",
                  lineHeight: 1.4,
                  width: "100%",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflow: "visible",
                  textOverflow: "unset",
                  display: "block",
                  maxHeight: "none",
                  fontWeight: 500,
                }}
              >
                {props.row.articleName || "-"}
              </Typography>
            </Box>
          </Tooltip>
        ),
      },
      {
        key: "quantity",
        name: "Gesamtmenge",
        width: 120,
        resizable: true,
        renderCell: (props: any) => (
          <EditableQuantityCell
            row={props.row}
            onUpdateItem={handleUpdateItem}
          />
        ),
      },
      {
        key: "interval",
        name: "Intervall",
        width: 130,
        resizable: true,
        renderCell: (props: any) => (
          <EditableIntervalCell
            row={props.row}
            onUpdateItem={handleUpdateItem}
          />
        ),
      },
    ];

    function extractDeliveryPeriods(items: any[]): { sortedPeriods: string[] } {
      const periodsSet = new Set<string>();

      items.forEach((item) => {
        if (item.deliveries) {
          Object.keys(item.deliveries).forEach((period) => {
            periodsSet.add(period);
          });
        }
      });

      const sortedPeriods = Array.from(periodsSet).sort((a, b) => {
        const [yearA, periodA] = a.split("-").map((p) => p.replace("T", ""));
        const [yearB, periodB] = b.split("-").map((p) => p.replace("T", ""));

        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return parseInt(periodA) - parseInt(periodB);
      });

      return { sortedPeriods };
    }

    // Add delivery columns dynamically (read-only)
    const deliveryColumns = deliveryPeriodsData.sortedPeriods.map(
      (period: any) => {
        const cargoNo = listData?.items
          .map((item: any) => item.deliveries?.[period]?.cargoNo)
          .find((cn: string) => cn);

        return {
          key: `delivery_${period}`,
          name: formatPeriodLabel(period, cargoNo || ""),
          width: 140,
          resizable: false,
          renderCell: (props: any) => (
            <DeliveryCell row={props.row} period={period} />
          ),
          renderHeaderCell: (props: any) => (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "8px 4px",
                maxWidth: "500px",
                textWrap: "wrap",
              }}
            >
              <div>{formatPeriodLabel(period, cargoNo || "")}</div>
            </Box>
          ),
        };
      }
    );

    const endColumns = [
      {
        key: "changeStatus",
        name: "Status",
        width: 150,
        resizable: true,
        renderCell: (props: any) => {
          const getStatusColor = (status: string) => {
            switch (status?.toLowerCase()) {
              case "confirmed":
                return "success";
              case "pending":
                return "warning";
              case "rejected":
                return "error";
              default:
                return "default";
            }
          };

          const getStatusLabel = (status: string) => {
            switch (status?.toLowerCase()) {
              case "confirmed":
                return "Bestätigt";
              case "pending":
                return "Ausstehend";
              case "rejected":
                return "Abgelehnt";
              default:
                return "Ausstehend";
            }
          };

          return (
            <Chip
              label={getStatusLabel(props.row.changeStatus)}
              size="small"
              color={getStatusColor(props.row.changeStatus)}
              sx={{ minWidth: 100, borderRadius: "10px" }}
            />
          );
        },
      },
      {
        key: "marked",
        name: "Markiert",
        width: 120,
        resizable: true,
        renderCell: (props: any) => (
          <EditableMarkedCell row={props.row} onUpdateItem={handleUpdateItem} />
        ),
      },
      {
        key: "comment",
        name: "Kommentar",
        width: 200,
        resizable: true,
        renderCell: (props: any) => (
          <EditableCommentCell
            row={props.row}
            onUpdateItem={handleUpdateItem}
          />
        ),
      },
    ];

    return [...baseColumns, ...deliveryColumns, ...endColumns];
  }, [deliveryPeriodsData, selectedRows, handleUpdateItem]);

  const handleAddItem = async (itemData: any) => {
    if (!listData) return;

    try {
      setSaving(true);
      const response = await addItemToList(listData.id, itemData);
      setListData((prev: any) => ({
        ...prev,
        items: [...prev.items, response],
      }));
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelectedItems = async () => {
    if (!listData || selectedRows.size === 0) return;

    try {
      setSaving(true);
      const deletePromises = Array.from(selectedRows).map((itemId) =>
        deleteListItem(itemId)
      );

      await Promise.all(deletePromises);

      setListData((prev: any) => ({
        ...prev,
        items: prev.items.filter((item: any) => !selectedRows.has(item.id)),
      }));

      setSelectedRows(new Set());
      toast.success(
        `${selectedRows.size} item(s) deleted successfully!`,
        successStyles
      );
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast.error("Failed to delete items", errorStyles);
    } finally {
      setSaving(false);
    }
  };

  const handleListChange = (newListId: string) => {
    router.push(`/scheduled-items/lists/${newListId}`);
  };

  const handleItemSelect = (itemId: string) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(itemId)) {
      newSelectedRows.delete(itemId);
    } else {
      newSelectedRows.add(itemId);
    }
    setSelectedRows(newSelectedRows);
  };

  const filteredItems = useMemo(() => {
    if (!listData?.items) return [];

    return listData.items.filter(
      (item: any) =>
        item.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [listData?.items, searchTerm]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "60vh",
          }}
        >
          <CircularProgress size={40} />
        </Box>
      </Container>
    );
  }

  if (!listData) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
          List not found or failed to load
        </Alert>
        <CustomButton onClick={() => router.back()} startIcon={<ArrowBack />}>
          Go Back
        </CustomButton>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        overflowX: "hidden",
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2 },
        width: "95vw",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: { xs: 1.5, sm: 2 },
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: 1,
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.5, sm: 2 },
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: { xs: 1, sm: 1.5 },
            flexWrap: { xs: "wrap", sm: "nowrap" },
            gap: 1,
          }}
        >
          <IconButton
            onClick={() => router.back()}
            sx={{
              mr: { xs: 1, sm: 1.5 },
              bgcolor: "background.paper",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
              "&:hover": {
                bgcolor: "background.paper",
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <ArrowBack fontSize={isSmallMobile ? "small" : "medium"} />
          </IconButton>

          {isEditingTitle ? (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
            >
              <TextField
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: { xs: 36, sm: 40 },
                    backgroundColor: "background.paper",
                    borderRadius: 1,
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={handleUpdateTitle}
                disabled={saving}
                sx={{
                  color: "success.main",
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                {saving ? <CircularProgress size={16} /> : <CheckCircle />}
              </IconButton>
              <IconButton
                size="small"
                onClick={() => {
                  setIsEditingTitle(false);
                  setEditedTitle(listData.name);
                }}
                disabled={saving}
                sx={{
                  color: "error.main",
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <Cancel />
              </IconButton>
            </Box>
          ) : (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
            >
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.3rem", sm: "1.8rem", md: "2.2rem" },
                  background:
                    "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
                  backgroundClip: "text",
                  textFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  cursor: "pointer",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    opacity: 0.8,
                  },
                }}
                onClick={() => {
                  setEditedTitle(listData.name);
                  setIsEditingTitle(true);
                }}
              >
                {listData.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setEditedTitle(listData.name);
                  setIsEditingTitle(true);
                }}
                sx={{
                  color: "primary.main",
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Quick Info */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: "0px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
            }}
          >
            <Hash fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              List Number:{" "}
              <strong>{listData.listNumber || "Not assigned"}</strong>
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
            }}
          >
            <Chip
              label={`${listData.items?.length || 0} items`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ borderRadius: 1 }}
            />
            {selectedRows.size > 0 && (
              <Chip
                label={`${selectedRows.size} selected`}
                size="small"
                color="secondary"
                variant="filled"
                sx={{ borderRadius: 1 }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Card
        sx={{
          mb: 0,
          borderRadius: 1,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
          border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Action Bar */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <TextField
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: "100%", sm: 300 },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    borderRadius: 1,
                    border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                    "&:hover": {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                    "&.Mui-focused": {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 0 2px ${alpha(
                        theme.palette.primary.main,
                        0.1
                      )}`,
                    },
                  },
                }}
              />
              <CustomButton
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddItemDialog(true)}
                gradient={true}
                hoverEffect="scale"
              >
                Add Item
              </CustomButton>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                flexWrap: "wrap",
                justifyContent: { xs: "stretch", sm: "flex-end" },
              }}
            >
              {selectedRows.size > 0 && (
                <CustomButton
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleDeleteSelectedItems}
                  loading={saving}
                  size={isSmallMobile ? "medium" : "small"}
                  sx={{
                    flex: { xs: 1, sm: "none" },
                    borderRadius: 1,
                  }}
                >
                  Delete ({selectedRows.size})
                </CustomButton>
              )}

              <CustomButton
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
                size={isSmallMobile ? "medium" : "small"}
                sx={{
                  flex: { xs: 1, sm: "none" },
                  borderRadius: 1,
                }}
              >
                Refresh
              </CustomButton>
            </Box>
          </Stack>

          {/* Items Display */}
          {isMobile ? (
            // Mobile Card View
            <Box>
              {filteredItems.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 6,
                    px: 3,
                    borderRadius: 1,
                    border: "2px dashed #e0e0e0",
                    bgcolor: "#fafafa",
                  }}
                >
                  <Package
                    size={48}
                    style={{ color: "#ccc", marginBottom: 16 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {searchTerm ? "No items found" : "No items in this list"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Add your first item to get started"}
                  </Typography>
                  {!searchTerm && (
                    <CustomButton
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setAddItemDialog(true)}
                      gradient={true}
                      sx={{ borderRadius: 1 }}
                    >
                      Add First Item
                    </CustomButton>
                  )}
                </Box>
              ) : (
                <Box>
                  {filteredItems.map((item: any) => (
                    <MobileItemCard
                      key={item.id}
                      item={item}
                      onUpdateItem={handleUpdateItem}
                      onSelect={handleItemSelect}
                      isSelected={selectedRows.has(item.id)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            // Desktop Table View
            <Paper
              elevation={2}
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
              }}
            >
              {filteredItems.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
                  <Package
                    size={64}
                    style={{ color: "#ccc", marginBottom: 24 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {searchTerm ? "No items found" : "No items in this list"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Add your first item to get started"}
                  </Typography>
                  {!searchTerm && (
                    <CustomButton
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setAddItemDialog(true)}
                      gradient={true}
                      sx={{ borderRadius: 1 }}
                    >
                      Add First Item
                    </CustomButton>
                  )}
                </Box>
              ) : (
                <Box sx={{ height: "600px" }}>
                  <Paper
                    elevation={3}
                    sx={{
                      height: "600px",
                      width: "100%",
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e8f0fe",
                      overflow: "hidden",
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                      "& .rdg": {
                        border: "none !important",
                        "--rdg-selection-color":
                          "rgba(140, 194, 27, 0.15) !important",
                        "--rdg-background-color": "#ffffff !important",
                        "--rdg-header-background-color":
                          "linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%) !important",
                        fontFamily:
                          '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                      },
                      "& .rdg-header-row": {
                        background:
                          "linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%)",
                        borderBottom: "2px solid rgba(140, 194, 27, 0.2)",
                        fontWeight: 600,
                        minHeight: "75px !important",
                        color: "#2d3748",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                      },
                      "& .rdg-header-cell": {
                        padding: "8px 12px !important",
                        display: "flex !important",
                        alignItems: "center !important",
                        justifyContent: "center !important",
                        borderRight: "1px solid rgba(140, 194, 27, 0.1)",
                        background: "transparent",
                        color: "#2d3748",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        "&:hover": {
                          background: "rgba(140, 194, 27, 0.05)",
                        },
                      },
                      "& .rdg-cell": {
                        padding: "12px 16px !important",
                        display: "flex !important",
                        alignItems: "center !important",
                        borderRight: "1px solid rgba(226, 232, 240, 0.8)",
                        borderBottom: "1px solid rgba(226, 232, 240, 0.6)",
                        backgroundColor: "#ffffff",
                        color: "#374151",
                        fontSize: "0.875rem",
                        transition: "all 0.2s ease",
                      },
                      "& .rdg-row": {
                        minHeight: "80px !important",
                        "&:hover": {
                          backgroundColor:
                            "rgba(140, 194, 27, 0.04) !important",
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 12px rgba(140, 194, 27, 0.08)",
                          "& .rdg-cell": {
                            backgroundColor: "rgba(140, 194, 27, 0.04)",
                            borderColor: "rgba(140, 194, 27, 0.15)",
                          },
                        },
                      },
                      "& .rdg-row:nth-of-type(even)": {
                        backgroundColor: "rgba(248, 250, 252, 0.5)",
                        "& .rdg-cell": {
                          backgroundColor: "rgba(248, 250, 252, 0.5)",
                        },
                      },
                      "& .rdg-row:nth-of-type(odd)": {
                        backgroundColor: "#ffffff",
                        "& .rdg-cell": {
                          backgroundColor: "#ffffff",
                        },
                      },
                      "& .rdg-row.rdg-row-selected": {
                        backgroundColor: "rgba(140, 194, 27, 0.08) !important",
                        "& .rdg-cell": {
                          backgroundColor: "rgba(140, 194, 27, 0.08)",
                          borderColor: "rgba(140, 194, 27, 0.2)",
                        },
                      },
                    }}
                  >
                    <DataGrid
                      columns={columns}
                      rows={filteredItems}
                      rowKeyGetter={(row: any) => row.id}
                      selectedRows={selectedRows}
                      onSelectedRowsChange={setSelectedRows}
                      rowHeight={80}
                      headerRowHeight={75}
                      className="fill-grid"
                      style={{
                        height: "100%",
                        border: "none",
                        fontSize: "0.875rem",
                        backgroundColor: "#ffffff",
                        fontFamily:
                          '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                      }}
                      defaultColumnOptions={{
                        sortable: true,
                        resizable: true,
                      }}
                    />
                  </Paper>
                </Box>
              )}
            </Paper>
          )}

          {/* Stats Footer */}
          {listData.items.length > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
                mt: 3,
                px: 3,
                py: 2,
                backgroundColor: alpha("#F8FAFC", 0.8),
                borderRadius: 1,
                border: `1px solid ${alpha("#E2E8F0", 0.6)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {filteredItems.length} of {listData.items.length} items
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 2, sm: 4 },
                  flexWrap: "wrap",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                <Typography variant="body2">
                  <strong>Total:</strong> {listData.items.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Confirmed:</strong>{" "}
                  {
                    listData.items.filter(
                      (item: any) => item.changeStatus === "confirmed"
                    ).length
                  }
                </Typography>
                <Typography variant="body2">
                  <strong>Marked:</strong>{" "}
                  {listData.items.filter((item: any) => item.marked).length}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Horizontal List Navigation Tabs - Attached to Main Content */}
        <ListTabs
          currentListId={listId}
          customerId={customer?.id}
          onListChange={handleListChange}
        />
      </Card>

      {/* Floating Add Button (Mobile) */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setAddItemDialog(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
            boxShadow: "0 8px 24px rgba(140, 194, 27, 0.3)",
            "&:hover": {
              background: "linear-gradient(45deg, #7AB819 30%, #45A047 90%)",
              transform: "scale(1.1)",
            },
          }}
        >
          <Add />
        </Fab>
      )}

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addItemDialog}
        onClose={() => setAddItemDialog(false)}
        onAddItem={handleAddItem}
        listId={listId}
      />
    </Box>
  );
};

export default ListManagementPage;
