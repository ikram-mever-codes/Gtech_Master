"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Button,
  Badge,
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
  Business,
  LocalShipping,
  Schedule,
  LocationOn,
  Info,
  Visibility,
  NotificationImportant,
  Warning,
} from "@mui/icons-material";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { Package, Hash, X, ImageIcon, EditIcon } from "lucide-react";
import {
  searchListsByCustomerNamee,
  updateListItem,
  deleteListItem,
  addItemToList,
  updateList,
  acknowledgeListItemChanges,
  bulkAcknowledgeChanges,
} from "@/api/lists";
import { RootState } from "../Redux/store";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  errorStyles,
  formatPeriodLabel,
  successStyles,
} from "@/utils/constants";
import CustomButton from "@/components/UI/CustomButton";
import { logoutCustomer, updateCustomerProfile } from "@/api/customer";

// Types
interface ListItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  completed: boolean;
  articleName?: string;
  articleNumber?: string;
  item_no_de?: string;
  imageUrl?: string;
  comment?: string;
  marked?: boolean;
  changeStatus?: string;
  deliveries?: any;
  interval?: string;
  changesNeedAcknowledgment?: boolean;
  hasChanges?: boolean;
  shouldHighlight?: boolean;
  lastModifiedBy?: "company" | "customer";
  lastModifiedAt?: string;
  changedFields?: string[];
}

interface ListData {
  id: string;
  name: string;
  description: string;
  items: any[];
  createdAt: string;
  lastModified: string;
  listNumber?: string;
  changesNeedingAcknowledgment?: number;
  pendingChangesCount?: number;
}

const INTERVAL_OPTIONS = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "quarterly", label: "Vierteljährlich" },
  { value: "yearly", label: "Jährlich" },
];

const DELIVERY_STATUS = {
  PENDING: "pending",
  PARTIAL: "partial",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const DELIVERY_STATUS_CONFIG: any = {
  [DELIVERY_STATUS.PENDING]: { color: "warning", label: "Pending" },
  [DELIVERY_STATUS.PARTIAL]: { color: "info", label: "Partial" },
  [DELIVERY_STATUS.DELIVERED]: { color: "success", label: "Delivered" },
  [DELIVERY_STATUS.CANCELLED]: { color: "error", label: "Cancelled" },
};

// Enhanced FieldHighlight Component
const FieldHighlight = ({
  hasChanges,
  fieldName,
  children,
  onClick,
}: {
  hasChanges: boolean;
  fieldName?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 1,
        backgroundColor: hasChanges ? "#ffebee" : "transparent",
        border: hasChanges ? `2px solid #f44336` : "2px solid transparent",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: hasChanges
            ? "#ffcdd2"
            : alpha(theme.palette.primary.main, 0.04),
          borderColor: hasChanges
            ? "#f44336"
            : alpha(theme.palette.primary.main, 0.2),
        },
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {children}
    </Box>
  );
};

// Utility function to extract delivery periods
function extractDeliveryPeriods(items: any[]): { sortedPeriods: string[] } {
  const periodsWithEta: { period: string; eta?: string }[] = [];

  items.forEach((item) => {
    if (item.deliveries) {
      Object.entries(item.deliveries).forEach(
        ([period, delivery]: [string, any]) => {
          periodsWithEta.push({
            period,
            eta: delivery.eta,
          });
        }
      );
    }
  });

  // Remove duplicates and sort by eta date
  const uniquePeriods = Array.from(new Set(periodsWithEta.map((p) => p.period)))
    .map((period) => {
      return {
        period,
        eta: periodsWithEta.find((p) => p.period === period)?.eta,
      };
    })
    .sort((a, b) => {
      // If either doesn't have an eta, put it at the end
      if (!a.eta && !b.eta) return 0;
      if (!a.eta) return 1;
      if (!b.eta) return -1;

      // Compare dates
      return new Date(a.eta).getTime() - new Date(b.eta).getTime();
    });

  return { sortedPeriods: uniquePeriods.map((p) => p.period) };
}

// Delivery Cell Component
const DeliveryCell = ({ row, period }: any) => {
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const delivery = row.deliveries?.[period];

  if (!delivery) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "text.disabled",
        }}
      >
        <Typography variant="caption">-</Typography>
      </Box>
    );
  }

  const status = delivery.status || "NSO";

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          height: "100%",
          cursor: "pointer",
          p: 1,
          borderRadius: 1,
          "&:hover": {
            backgroundColor: alpha("#8CC21B", 0.05),
          },
        }}
        onClick={() => setDeliveryModalOpen(true)}
      >
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "14px" }}>
          {delivery.quantity || 0}
        </Typography>
        <Chip
          label={status}
          size="small"
          color={"primary"}
          sx={{
            fontSize: "0.65rem",
            height: 18,
            borderRadius: 1,
          }}
        />
      </Box>

      <Dialog
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              Delivery Details -{" "}
              {formatPeriodLabel(period, delivery.cargoNo || "")}
            </Typography>
            <IconButton
              onClick={() => setDeliveryModalOpen(false)}
              size="small"
            >
              <X />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Article Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Name:</strong> {row.articleName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Article Number:</strong> {row.articleNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Artikelnr:</strong> {row.item_no_de}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Delivery Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Quantity:</strong> {delivery.quantity || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong>{" "}
                <Chip label={status} size="small" color={"primary"} />
              </Typography>
              {delivery.eta && (
                <Typography variant="body2" color="text.secondary">
                  <strong>ETA:</strong>{" "}
                  {new Date(delivery.eta).toLocaleDateString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                <strong>Cargo Number:</strong>{" "}
                {delivery.cargoNo || "Not assigned"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Period:</strong> {period}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Static Quantity Cell (No longer editable)
function StaticQuantityCell({ row }: any) {
  return (
    <FieldHighlight hasChanges={false} fieldName="Menge">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          p: 1,
        }}
      >
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "16px" }}>
          {row.quantity || 0}
        </Typography>
      </Box>
    </FieldHighlight>
  );
}

// Static Interval Cell (No longer editable)
function StaticIntervalCell({ row }: any) {
  const hasChanges =
    (row.changesNeedAcknowledgment || row.hasChanges || row.shouldHighlight) &&
    row.changedFields?.includes("interval");

  const getCurrentLabel = () => {
    const option = INTERVAL_OPTIONS.find(
      (opt) => opt.value === (row.interval || "monthly")
    );
    return option ? option.label : "Monatlich";
  };

  return (
    <FieldHighlight hasChanges={hasChanges} fieldName="Intervall">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          p: 1,
        }}
      >
        <Typography variant="body2" sx={{ fontSize: "14px" }}>
          {getCurrentLabel()}
        </Typography>
      </Box>
    </FieldHighlight>
  );
}
// Enhanced Editable Comment Cell with FieldHighlight and Edit Icon
function EditableCommentCell({
  row,
  onUpdateItem,
  isEditable,
  router,
  companyName,
  listId,
}: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.comment || "");
  const [saving, setSaving] = useState(false);
  const [showEditIcon, setShowEditIcon] = useState(false);

  const hasChanges =
    (row.changesNeedAcknowledgment || row.hasChanges || row.shouldHighlight) &&
    row.changedFields?.includes("comment");

  // Check for auto-edit on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editItemId = urlParams.get("editItem");
    const editField = urlParams.get("editField");

    if (editItemId === row.id && editField === "comment" && isEditable) {
      setTimeout(() => {
        setIsEditing(true);
        setValue(row.comment || "");
      }, 300);
    }
  }, [row.id, isEditable, row.comment]);

  const handleSave = async () => {
    if (!isEditable || value === row.comment) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onUpdateItem(row.id, { comment: value });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
      setValue(row.comment);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(row.comment);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleEditAttempt = () => {
    if (isEditable) {
      setIsEditing(true);
    } else {
      // Store edit information in query params
      const editParams = new URLSearchParams({
        redirect: `/${companyName}`,
        editItem: row.id,
        editField: "comment",
        listId: listId || "",
      });
      router.push(`/login?${editParams.toString()}`);
    }
  };

  if (isEditing && isEditable) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
      >
        <TextField
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={saving}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.875rem" },
          }}
          autoFocus
          onBlur={handleSave}
        />
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <FieldHighlight
      hasChanges={hasChanges}
      fieldName="Kommentar"
      onClick={handleEditAttempt}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          p: 1,
          position: "relative",
          "&:hover": {
            backgroundColor: isEditable ? "action.hover" : "transparent",
          },
          cursor: isEditable ? "pointer" : "default",
        }}
        onMouseEnter={() => isEditable && setShowEditIcon(true)}
        onMouseLeave={() => setShowEditIcon(false)}
      >
        <Typography variant="body2" sx={{ fontSize: "14px", flex: 1 }}>
          {row.comment || "Add comment..."}
        </Typography>

        <Box
          sx={{
            transition: "opacity 0.2s ease",
            display: "flex",
            alignItems: "center",
            ml: 1,
          }}
        >
          <Edit sx={{ fontSize: "16px" }} />
        </Box>
      </Box>
    </FieldHighlight>
  );
}

// Simple Add Item Dialog
const AddItemDialog = ({ open, onClose, onAddItem, listId }: any) => {
  const [formData, setFormData] = useState({
    articleName: "",
    articleNumber: "",
    item_no_de: "",
    quantity: 0,
    interval: "monthly",
    comment: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.articleName.trim()) {
      toast.error("Article name is required", errorStyles);
      return;
    }

    try {
      setSaving(true);
      await onAddItem(formData);
      setFormData({
        articleName: "",
        articleNumber: "",
        item_no_de: "",
        quantity: 0,
        interval: "monthly",
        comment: "",
      });
      onClose();
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Add New Item</Typography>
          <IconButton onClick={onClose} size="small">
            <X />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Article Name *"
              value={formData.articleName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  articleName: e.target.value,
                }))
              }
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Article Number"
              value={formData.articleNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  articleNumber: e.target.value,
                }))
              }
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Artikelnr"
              value={formData.item_no_de}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, item_no_de: e.target.value }))
              }
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: Number(e.target.value),
                }))
              }
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <Select
                value={formData.interval}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, interval: e.target.value }))
                }
                variant="outlined"
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Comment"
              multiline
              rows={3}
              value={formData.comment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                sx={{
                  background:
                    "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
                  "&:hover": {
                    background:
                      "linear-gradient(45deg, #7AB819 30%, #45A047 90%)",
                  },
                }}
              >
                {saving ? <CircularProgress size={20} /> : "Add Item"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced List Tabs Component with editable list names
function ListTabs({
  currentListId,
  allLists,
  onListChange,
  onListNameUpdate,
  loading,
  isEditable,
  router,
}: any) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEditStart = (listId: string, currentName: string) => {
    if (!isEditable) {
      router.push("/login");
      return;
    }
    setEditingListId(listId);
    setEditingName(currentName);
  };

  const handleEditSave = async (listId: string) => {
    if (!editingName.trim()) return;

    try {
      setSaving(true);
      await onListNameUpdate(listId, editingName);
      setEditingListId(null);
    } catch (error) {
      console.error("Failed to update list name:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingListId(null);
    setEditingName("");
  };

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
          px: { xs: 1, sm: 2 },
          py: 1,
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
          {allLists.map((list: any) => {
            const isActive = list.id === currentListId;
            const isEditing = editingListId === list.id;

            return (
              <Card
                key={list.id}
                sx={{
                  minWidth: { xs: 220, sm: 260 },
                  p: 2,
                  py: 1,
                  cursor: isEditing ? "default" : "pointer",
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
                    transform: isEditing ? "none" : "translateY(-2px)",
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.primary.main,
                      0.12
                    )}`,
                  },
                }}
                onClick={() => !isActive && !isEditing && onListChange(list.id)}
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
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(list.id, list.name);
                      }}
                      sx={{
                        p: 0.3,
                        opacity: 0.7,
                        "&:hover": { opacity: 1 },
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <TextField
                          size="small"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEditSave(list.id);
                            } else if (e.key === "Escape") {
                              handleEditCancel();
                            }
                          }}
                          disabled={saving}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              height: 28,
                              fontSize: "0.85rem",
                            },
                          }}
                          autoFocus
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleEditSave(list.id)}
                          disabled={saving || !editingName.trim()}
                          sx={{ p: 0.5 }}
                        >
                          {saving ? (
                            <CircularProgress size={14} />
                          ) : (
                            <CheckCircle fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleEditCancel}
                          disabled={saving}
                          sx={{ p: 0.5 }}
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={isActive ? 600 : 500}
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              mb: 0.3,
                              flex: 1,
                            }}
                          >
                            {list.name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {list.items?.length || 0} items
                        </Typography>
                      </>
                    )}
                  </Box>

                  {isActive && !isEditing && (
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

// Enhanced Mobile Item Card Component (only comment editable)
const MobileItemCard = ({
  item,
  onUpdateItem,
  onSelect,
  isSelected,
  isEditable,
  companyName,
  listId,
  router,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const [editingComment, setEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState(item.comment || "");
  const theme = useTheme();

  const hasAnyChanges =
    item.changesNeedAcknowledgment || item.hasChanges || item.shouldHighlight;

  // Check for auto-edit on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editItemId = urlParams.get("editItem");
    const editField = urlParams.get("editField");

    if (editItemId === item.id && editField === "comment" && isEditable) {
      setExpanded(true);
      setTimeout(() => {
        setEditingComment(true);
        setCommentValue(item.comment || "");
      }, 300);
    }
  }, [item.id, isEditable, item.comment]);

  const handleCommentSave = async () => {
    if (!isEditable) return;

    try {
      await onUpdateItem(item.id, { comment: commentValue });
      setEditingComment(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
      setCommentValue(item.comment || "");
    }
  };

  const handleCommentEditAttempt = () => {
    if (isEditable) {
      setEditingComment(true);
      setCommentValue(item.comment || "");
    } else {
      // Store edit information in query params
      const editParams = new URLSearchParams({
        redirect: `/${companyName}`,
        editItem: item.id,
        editField: "comment",
        listId: listId || "",
      });
      router.push(`/login?${editParams.toString()}`);
    }
  };

  const toggleMarked = async () => {
    if (!isEditable) return;

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
      data-testid={`item-${item.id}`}
      sx={{
        mb: 2,
        border: "2px solid",
        borderColor: hasAnyChanges
          ? "#f44336"
          : isSelected
          ? theme.palette.primary.main
          : alpha("#E0E7FF", 0.8),
        borderRadius: 2,
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: hasAnyChanges
          ? "#ffebee"
          : isSelected
          ? alpha(theme.palette.primary.main, 0.02)
          : "background.paper",
        boxShadow: hasAnyChanges
          ? `0 4px 20px ${alpha("#f44336", 0.15)}`
          : isSelected
          ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`
          : "0 2px 12px rgba(0,0,0,0.04)",
        "&:hover": {
          boxShadow: hasAnyChanges
            ? `0 8px 32px ${alpha("#f44336", 0.2)}`
            : `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          transform: "translateY(-2px)",
        },
      }}
    >
      {/* Enhanced change indicator */}
      {hasAnyChanges && (
        <Box
          sx={{
            backgroundColor: "#f44336",
            color: "white",
            p: 1,
            textAlign: "center",
          }}
        >
          <Typography variant="caption" fontWeight={600} fontSize="0.75rem">
            🔴 ARTIKEL GEÄNDERT
          </Typography>
        </Box>
      )}

      {/* Header Section */}
      <Box
        sx={{
          p: 2,
          background: hasAnyChanges
            ? `#ffcdd2`
            : isSelected
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
              disabled={!isEditable}
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
                width: 70,
                height: 56,
                borderRadius: 1,
                border: hasAnyChanges
                  ? `2px solid #f44336`
                  : `2px solid ${alpha("#FFFFFF", 0.8)}`,
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
                    borderRadius: 3,
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
            <Box sx={{ position: "relative" }}>
              {hasAnyChanges && (
                <Chip
                  label="Geändert"
                  size="small"
                  color="error"
                  variant="filled"
                  icon={<Warning fontSize="small" />}
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: 0,
                    fontSize: "0.65rem",
                    height: 18,
                    borderRadius: 1,
                    zIndex: 1,
                  }}
                />
              )}
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
                  pr: hasAnyChanges ? 8 : 0,
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
                      backgroundColor: alpha(
                        theme.palette.secondary.main,
                        0.08
                      ),
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
            </Box>
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
                disabled={!isEditable}
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
          <Grid container spacing={2}>
            {/* Quantity Field (Static) */}
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
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
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    p: 0.8,
                    borderRadius: 1,
                    minHeight: 32,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {item.quantity || 0}
                </Typography>
              </Box>
            </Grid>

            {/* Interval Field (Static) */}
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: "background.paper",
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
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{
                    p: 0.8,
                    borderRadius: 1,
                    minHeight: 32,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {INTERVAL_OPTIONS.find((opt) => opt.value === item.interval)
                    ?.label || "Monatlich"}
                </Typography>
              </Box>
            </Grid>

            {/* Comment Field (Editable) */}
            <Grid item xs={12}>
              <FieldHighlight
                hasChanges={
                  (item.changesNeedAcknowledgment ||
                    item.hasChanges ||
                    item.shouldHighlight) &&
                  item.changedFields?.includes("comment")
                }
                fieldName="Kommentar"
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: "background.paper",
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
                  {editingComment && isEditable ? (
                    <TextField
                      size="small"
                      multiline
                      rows={2}
                      value={commentValue}
                      onChange={(e) => setCommentValue(e.target.value)}
                      onBlur={handleCommentSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSave();
                        } else if (e.key === "Escape") {
                          setCommentValue(item.comment || "");
                          setEditingComment(false);
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
                        cursor: isEditable ? "pointer" : "default",
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
                          backgroundColor: isEditable
                            ? alpha(theme.palette.primary.main, 0.04)
                            : "transparent",
                        },
                      }}
                      onClick={() => {
                        handleCommentEditAttempt();
                      }}
                    >
                      {item.comment || "Kommentar hinzufügen..."}
                    </Typography>
                  )}
                </Box>
              </FieldHighlight>
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

// Main component
const ListManagerPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { customer } = useSelector((state: RootState) => state.customer);
  const companyName = params?.companyName as string;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allLists, setAllLists] = useState<ListData[]>([]);
  const [currentListId, setCurrentListId] = useState<string>("");
  const [currentList, setCurrentList] = useState<ListData | null>(null);
  const [error, setError] = useState<string>("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isEditingCompanyName, setIsEditingCompanyName] =
    useState<boolean>(false);
  const [editedCompanyName, setEditedCompanyName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [addItemDialog, setAddItemDialog] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Check if user is authenticated and can edit
  const isEditable = customer !== null;

  // Count items with unacknowledged changes
  const itemsWithChanges = useMemo(() => {
    if (!currentList?.items) return [];
    return currentList.items.filter((item) => item.hasChanges);
  }, [currentList?.items]);

  // Check for auto-edit parameters from URL
  useEffect(() => {
    const handleAutoEdit = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const editItemId = urlParams.get("editItem");
      const editField = urlParams.get("editField");
      const editListId = urlParams.get("listId");

      if (editItemId && editField && isEditable && currentList?.items) {
        // Find the item to edit
        const itemToEdit = currentList.items.find(
          (item: any) => item.id === editItemId
        );

        if (itemToEdit && editField === "comment") {
          // Auto-enable editing for comment field
          setTimeout(() => {
            // Scroll to the item
            const targetElement =
              document.querySelector(`[data-testid="item-${editItemId}"]`) ||
              document.querySelector(`[data-row-key="${editItemId}"]`);
            if (targetElement) {
              targetElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }

            // Clear the URL parameters after a short delay
            setTimeout(() => {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete("editItem");
              newUrl.searchParams.delete("editField");
              newUrl.searchParams.delete("listId");
              window.history.replaceState({}, "", newUrl.toString());
            }, 1000);
          }, 500);
        }
      }
    };

    if (currentList && isEditable) {
      handleAutoEdit();
    }
  }, [currentList, isEditable, isMobile]);

  // Fetch all lists for the company
  useEffect(() => {
    const fetchCompanyLists = async () => {
      if (!companyName) return;

      setIsLoading(true);
      setError("");
      setEditedCompanyName(companyName);

      try {
        const result = await searchListsByCustomerNamee(companyName);

        if (result && result.length > 0) {
          // Transform the data structure
          const transformedLists = result.map((list: any, index: number) => ({
            ...list,
            items:
              list.items?.map((item: any, itemIndex: number) => ({
                ...item,
                id: item.id || `${index}-${itemIndex}`,
                name: item.name || item.articleName || "Unknown Item",
                quantity: item.quantity || 0,
                category: item.category || "Uncategorized",
                completed: item.completed || false,
                articleName: item.articleName || item.name,
                articleNumber: item.articleNumber || item.sku,
                changeStatus: item.changeStatus || "pending",
                marked: item.marked || false,
                interval: item.interval || "monthly",
                changesNeedAcknowledgment:
                  item.changesNeedAcknowledgment || false,
                hasChanges: item.hasChanges || false,
                shouldHighlight: item.shouldHighlight || false,
                lastModifiedBy: item.lastModifiedBy || "customer",
                lastModifiedAt: item.lastModifiedAt,
                changedFields: item.changedFields || [],
              })) || [],
          }));

          setAllLists(transformedLists);

          if (transformedLists[0]) {
            setCurrentListId(transformedLists[0].id);
            setCurrentList(transformedLists[0]);
          }
        } else {
          setError("No lists found for this company.");
        }
      } catch (err: any) {
        setError(
          err.message || "Failed to fetch company lists. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyLists();
  }, [companyName]);

  const handleListChange = (listId: string) => {
    const selectedList = allLists.find((list) => list.id === listId);
    if (selectedList) {
      setCurrentListId(listId);
      setCurrentList(selectedList);
      setSelectedRows(new Set());
    }
  };

  const handleListNameUpdate = async (listId: string, newName: string) => {
    if (!isEditable || !newName.trim()) return;

    try {
      await updateList(listId, { name: newName });
      // Update list name in state
      const updatedLists = allLists.map((list) =>
        list.id === listId ? { ...list, name: newName } : list
      );
      setAllLists(updatedLists);

      if (currentListId === listId) {
        setCurrentList((prev) => (prev ? { ...prev, name: newName } : null));
      }
    } catch (error) {
      console.error("Failed to update list name:", error);
      toast.error("Failed to update list name", errorStyles);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updateData: any
  ): Promise<void> => {
    if (!isEditable || !currentList) return;

    try {
      await updateListItem(itemId, updateData);
      // Update the current list
      const updatedList = {
        ...currentList,
        items: currentList.items.map((item) =>
          item.id === itemId ? { ...item, ...updateData } : item
        ),
      };
      setCurrentList(updatedList);

      // Update in allLists array
      setAllLists((prev) =>
        prev.map((list) => (list.id === currentListId ? updatedList : list))
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item", errorStyles);
    }
  };

  const handleItemSelect = (itemId: string): void => {
    if (!isEditable) return;

    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(itemId)) {
      newSelectedRows.delete(itemId);
    } else {
      newSelectedRows.add(itemId);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleUpdateCompanyName = async () => {
    if (!isEditable || !editedCompanyName.trim()) {
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();

      formData.append("companyName", editedCompanyName);
      const data = await updateCustomerProfile(formData, dispatch);
      router.push(`/${editedCompanyName}`);
      setIsEditingCompanyName(false);
    } catch (error) {
      console.error("Failed to update company name:", error);
      toast.error("Failed to update company name", errorStyles);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (itemData: any) => {
    if (!currentList || !isEditable) return;

    try {
      setSaving(true);
      const response = await addItemToList(currentList.id, itemData);
      const updatedList = {
        ...currentList,
        items: [...currentList.items, response],
      };
      setCurrentList(updatedList);

      // Update in allLists array
      setAllLists((prev) =>
        prev.map((list) => (list.id === currentListId ? updatedList : list))
      );
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelectedItems = async () => {
    if (!currentList || selectedRows.size === 0 || !isEditable) return;

    try {
      setSaving(true);
      const deletePromises = Array.from(selectedRows).map((itemId) =>
        deleteListItem(itemId)
      );

      await Promise.all(deletePromises);

      const updatedList = {
        ...currentList,
        items: currentList.items.filter(
          (item: any) => !selectedRows.has(item.id)
        ),
      };
      setCurrentList(updatedList);

      // Update in allLists array
      setAllLists((prev) =>
        prev.map((list) => (list.id === currentListId ? updatedList : list))
      );

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

  const filteredItems = useMemo(() => {
    if (!currentList?.items) return [];

    return currentList.items.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentList?.items, searchTerm]);

  // Extract delivery periods for columns
  const deliveryPeriodsData = useMemo(() => {
    if (!currentList?.items) return { sortedPeriods: [] };
    return extractDeliveryPeriods(currentList.items);
  }, [currentList?.items]);

  const dispatch = useDispatch();

  // Enhanced Desktop columns configuration (only comment editable)
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "item_no_de",
        name: "Artikelnr",
        width: 120,
        resizable: true,
        renderCell: (props: any) => {
          const hasChanges =
            (props.row.changesNeedAcknowledgment ||
              props.row.hasChanges ||
              props.row.shouldHighlight) &&
            props.row.changedFields?.includes("item_no_de");
          return (
            <FieldHighlight hasChanges={hasChanges} fieldName="Artikelnr">
              <Typography variant="body2" sx={{ fontSize: "14px", p: 1 }}>
                {props.row.item_no_de || "-"}
              </Typography>
            </FieldHighlight>
          );
        },
      },
      {
        key: "imageUrl",
        name: "Bild",
        width: 150,
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
                  height: 80,
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
                    width: 80,
                    height: 80,
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
        name: "Item Name DE",
        width: 500,
        resizable: true,
        renderCell: (props: any) => {
          return (
            <FieldHighlight hasChanges={false} fieldName="Artikelname">
              <Tooltip
                title={props.row.articleName || ""}
                arrow
                placement="top-start"
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
                    position: "relative",
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
                      color: "inherit",
                    }}
                  >
                    {props.row.articleName || "-"}
                  </Typography>
                </Box>
              </Tooltip>
            </FieldHighlight>
          );
        },
      },
      {
        key: "quantity",
        name: "Gesamtmenge",
        width: 120,
        resizable: true,
        renderCell: (props: any) => <StaticQuantityCell row={props.row} />,
      },
      {
        key: "interval",
        name: "Intervall",
        width: 130,
        resizable: true,
        renderCell: (props: any) => <StaticIntervalCell row={props.row} />,
      },
    ];

    const deliveryColumns = deliveryPeriodsData.sortedPeriods.map(
      (period: any) => {
        const cargoNo = currentList?.items
          .map((item: any) => item.deliveries?.[period]?.cargoNo)
          .find((cn: string) => cn);

        const cargoStatus = currentList?.items
          .map((item: any) => item.deliveries?.[period]?.cargoStatus)
          .find((cn: string) => cn);

        const eta = currentList?.items
          .map((item: any) => item.deliveries?.[period]?.eta)
          .find((cn: string) => cn);

        function formatEta(etaDate: any) {
          if (!etaDate) return null;
          const now = new Date();
          const eta = new Date(etaDate);
          if (isNaN(eta.getTime())) return etaDate;

          const isCurrentYear = eta.getFullYear() === now.getFullYear();

          if (isCurrentYear) {
            return eta.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
            });
          } else {
            return eta.toLocaleDateString("de-DE");
          }
        }

        // Status descriptions mapping
        const statusDescriptions: Record<string, string> = {
          open: "Cargo planned - The shipment is in the planning phase",
          packed:
            "Goods are packed - Items have been prepared and packaged for shipment",
          shipped:
            "Cargo is sent out - The shipment has left the origin facility",
          arrived:
            "Arrived in Germany - The shipment has reached its destination in Germany",
        };

        const renderTooltipContent = () => (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
              {cargoStatus ? `${cargoStatus.toUpperCase()}` : "No Status"}
            </Typography>
            <Typography variant="body2">
              {cargoStatus
                ? statusDescriptions[cargoStatus.toLowerCase()]
                : "No status information available"}
            </Typography>
            {eta && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                Estimated arrival: {formatEta(eta)}
              </Typography>
            )}
          </Box>
        );

        const tooltipProps = {
          title: renderTooltipContent(),
          arrow: true,
          placement: "top" as const,
          componentsProps: {
            tooltip: {
              sx: {
                bgcolor: "common.white",
                color: "text.primary",
                boxShadow: 1,
                border: "1px solid",
                borderColor: "divider",
                maxWidth: 300,
              },
            },
            arrow: {
              sx: {
                color: "common.white",
                "&:before": {
                  border: "1px solid",
                  borderColor: "divider",
                },
              },
            },
          },
        };

        return {
          key: `delivery_${period}`,
          name: formatPeriodLabel(period, cargoNo || ""),
          width: 180,
          resizable: false,
          renderCell: (props: any) => (
            <Tooltip {...tooltipProps}>
              <span>
                <DeliveryCell row={props.row} period={period} />
              </span>
            </Tooltip>
          ),
          renderHeaderCell: (props: any) => (
            <Tooltip {...tooltipProps}>
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
                <div className="flex gap-0 text-sm flex-col">
                  <span>{formatPeriodLabel(period, cargoNo || "")}</span>
                  {cargoStatus && (
                    <span className="w-max h-max p-1 px-3 text-xs bg-yellow-500 text-white rounded-full">
                      {cargoStatus}
                    </span>
                  )}
                  {eta && (
                    <span>
                      Eta: <span className="font-medium">{formatEta(eta)}</span>
                    </span>
                  )}
                </div>
              </Box>
            </Tooltip>
          ),
        };
      }
    );

    const endColumns: any = [
      {
        key: "comment",
        name: "Remark",
        width: 200,
        resizable: true,
        renderCell: (props: any) => (
          <EditableCommentCell
            row={props.row}
            router={router}
            onUpdateItem={handleUpdateItem}
            isEditable={isEditable}
            companyName={companyName}
            listId={currentListId}
          />
        ),
      },
    ];

    return [...baseColumns, ...deliveryColumns, ...endColumns];
  }, [
    deliveryPeriodsData,
    selectedRows,
    handleUpdateItem,
    isEditable,
    currentList,
  ]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading company lists...</Typography>
      </Box>
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
          {/* Company Name Section */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <IconButton
                  onClick={() => window.history.back()}
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
                <Business color="primary" fontSize="small" />

                {/* Company Name with Edit Functionality */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {isEditingCompanyName ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flex: 1,
                      }}
                    >
                      <TextField
                        value={editedCompanyName}
                        onChange={(e) => setEditedCompanyName(e.target.value)}
                        size="small"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            height: { xs: 32, sm: 36 },
                            backgroundColor: "background.paper",
                            borderRadius: 1,
                            fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={handleUpdateCompanyName}
                        disabled={saving || !isEditable}
                        sx={{
                          color: "success.main",
                          backgroundColor: alpha(
                            theme.palette.success.main,
                            0.1
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.success.main,
                            0.2
                          )}`,
                        }}
                      >
                        {saving ? (
                          <CircularProgress size={16} />
                        ) : (
                          <CheckCircle />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setIsEditingCompanyName(false);
                          setEditedCompanyName(companyName);
                        }}
                        disabled={saving}
                        sx={{
                          color: "error.main",
                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                          border: `1px solid ${alpha(
                            theme.palette.error.main,
                            0.2
                          )}`,
                        }}
                      >
                        <Cancel />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          fontSize: {
                            xs: "1.3rem",
                            sm: "1.8rem",
                            md: "2.2rem",
                          },
                          background:
                            "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          letterSpacing: "-0.5px",
                        }}
                        onClick={() => {
                          if (isEditable) {
                            setEditedCompanyName(companyName);
                            setIsEditingCompanyName(true);
                          }
                        }}
                      >
                        {editedCompanyName || companyName}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (isEditable) {
                            setEditedCompanyName(companyName);
                            setIsEditingCompanyName(true);
                          } else {
                            router.push("/login");
                          }
                        }}
                        sx={{
                          color: "primary.main",
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.1
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
              <div className="flex gap-3 justify-center flex-row-reverse items-center">
                {isEditable ? (
                  <div className="flex items-center gap-3">
                    {/* Logged In Label */}
                    <Chip
                      label="Logged In as:"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />

                    {/* User Profile Section */}
                    <div className="relative group">
                      {/* Profile Image and Display Name */}
                      <div className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100">
                        <Avatar
                          src={customer?.avatar}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {customer?.companyName || "User"}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>

                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-1 w-48  bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100000]">
                        <div className="p-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {customer?.companyName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {customer?.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Settings Menu */}
                        <div className="p-1">
                          <button
                            onClick={() => {
                              router.push("/settings");
                            }}
                            className="w-full text-left px-3 py-2 text-sm cursor-pointer text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Edit Profile
                          </button>
                        </div>

                        {/* Logout Button */}
                        <div className="p-2 border-t border-gray-100">
                          <button
                            onClick={async () => {
                              await logoutCustomer(dispatch);
                            }}
                            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium"
                          >
                            🚪 Log Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Chip
                    label="Read Only"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ borderRadius: 1 }}
                  />
                )}
              </div>
            </Box>

            {/* List Tabs with Editable Names */}
            <ListTabs
              currentListId={currentListId}
              allLists={allLists}
              onListChange={handleListChange}
              onListNameUpdate={handleListNameUpdate}
              loading={isLoading}
              router={router}
              isEditable={isEditable}
            />
          </Box>
        </Box>
      </Box>

      {/* Error State */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 1,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: "#991B1B",
              mb: 1,
            }}
          >
            Error Loading Lists
          </Typography>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      {currentList && (
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
              justifyContent="flex-start"
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
                      backgroundColor: alpha(
                        theme.palette.background.paper,
                        0.8
                      ),
                      outline: "none",
                      border: "none",
                      borderRadius: 1,
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
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  justifyContent: { xs: "stretch", sm: "flex-end" },
                }}
              >
                {selectedRows.size > 0 && isEditable && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleDeleteSelectedItems}
                    disabled={saving}
                    sx={{
                      flex: { xs: 1, sm: "none" },
                      borderRadius: 1,
                    }}
                  >
                    Delete ({selectedRows.size})
                  </Button>
                )}

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => window.location.reload()}
                  sx={{
                    flex: { xs: 1, sm: "none" },
                    borderRadius: 1,
                  }}
                >
                  Refresh
                </Button>
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
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
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
                    {!searchTerm && isEditable && (
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setAddItemDialog(true)}
                        sx={{
                          background:
                            "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
                          "&:hover": {
                            background:
                              "linear-gradient(45deg, #7AB819 30%, #45A047 90%)",
                          },
                          borderRadius: 1,
                        }}
                      >
                        Add First Item
                      </Button>
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
                        isEditable={isEditable}
                        companyName={companyName}
                        listId={currentListId}
                        router={router}
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
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
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
                    {!searchTerm && isEditable && (
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setAddItemDialog(true)}
                        sx={{
                          background:
                            "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
                          "&:hover": {
                            background:
                              "linear-gradient(45deg, #7AB819 30%, #45A047 90%)",
                          },
                          borderRadius: 1,
                        }}
                      >
                        Add First Item
                      </Button>
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
                          backgroundColor:
                            "rgba(140, 194, 27, 0.08) !important",
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
          </Box>
        </Card>
      )}

      {/* Floating Add Button (Mobile) */}
      {isMobile && isEditable && (
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
        listId={currentListId}
      />
    </Box>
  );
};

export default ListManagerPage;
