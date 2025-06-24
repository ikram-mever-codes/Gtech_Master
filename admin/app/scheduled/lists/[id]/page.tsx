"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Breadcrumbs,
  Link,
  IconButton,
  InputAdornment,
  Card,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  CircularProgress,
  Alert,
  alpha,
  InputBase,
  styled,
  Autocomplete,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CardContent,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Divider,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Delete,
  Edit,
  Image,
  Save,
  Home,
  Search,
  CloudUpload,
  Refresh,
  CheckCircle,
  ErrorOutline,
  Info,
  HourglassEmpty,
  Cancel,
  ShoppingCart,
  Inventory,
  Category,
  LocalOffer,
  Schedule,
  CheckBoxOutlineBlank,
  CheckBox,
  AdminPanelSettings,
  History,
  Person,
  AccessTime,
  Visibility,
  ThumbUp,
  ThumbDown,
  Timeline,
  NotificationsActive,
  Warning,
  ExpandMore,
  Assignment,
  AccountCircle,
  Business,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  TrendingUp,
  Assessment,
  PlayArrow,
  Pending,
  CheckCircleOutline,
  PriorityHigh,
} from "@mui/icons-material";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { DataGrid, renderHeaderCell } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import { useDropzone } from "react-dropzone";
import { ImageIcon, X, Clock, FileText, User, Shield } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";

// Import API functions
import {
  addItemToList,
  updateListItem,
  deleteListItem,
  getListDetails,
  approveListItem,
  rejectListItem,
  searchItems,
  approveActivityLog,
  rejectActivityLog,
  Item,
} from "@/api/list";
import { DELIVERY_STATUS, INTERVAL_OPTIONS } from "@/utils/interfaces";
import { successStyles } from "@/utils/constants";

// Types for activity logs
interface ActivityLog {
  id: string;
  type:
    | "create"
    | "update"
    | "delete"
    | "quantity_change"
    | "status_change"
    | "delivery_update";
  description: string;
  itemName?: string;
  oldValue?: any;
  newValue?: any;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: Date;
  status: "pending" | "approved" | "rejected";
  requiresApproval: boolean;
  metadata?: any;
  action?: string;
  changes?: any;
  rejectionReason?: string;
  performedByType?: string;
  performedAt?: Date | string;
  approvalStatus?: "pending" | "approved" | "rejected";
}

// Tab Panel Component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DELIVERY_STATUS_CONFIG: any = {
  [DELIVERY_STATUS.PENDING]: {
    color: "warning",
    label: "Pending",
  },
  [DELIVERY_STATUS.PARTIAL]: {
    color: "info",
    label: "Partial",
  },
  [DELIVERY_STATUS.DELIVERED]: {
    color: "success",
    label: "Delivered",
  },
  [DELIVERY_STATUS.CANCELLED]: {
    color: "error",
    label: "Cancelled",
  },
};

// Modified DeliveryCell component - removed quantity editing
function DeliveryCell({ row, period, onUpdateDelivery }: any) {
  const delivery = row.deliveries?.[period];
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(
    delivery?.status || DELIVERY_STATUS.PENDING
  );

  const handleSave = () => {
    onUpdateDelivery(row.id, period, {
      quantity: delivery?.quantity || 0, // Keep existing quantity, don't allow editing
      status,
      deliveredAt:
        status === DELIVERY_STATUS.DELIVERED ? new Date() : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setStatus(delivery?.status || DELIVERY_STATUS.PENDING);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: 1,
          minWidth: 150,
        }}
      >
        <FormControl size="small">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as DELIVERY_STATUS)}
            sx={{
              height: 32,
              fontSize: "0.75rem",
            }}
          >
            {Object.values(DELIVERY_STATUS).map((statusOption: any) => (
              <MenuItem key={statusOption} value={statusOption}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {DELIVERY_STATUS_CONFIG[statusOption].icon}
                  <Typography variant="caption">
                    {DELIVERY_STATUS_CONFIG[statusOption].label}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={handleSave} color="success">
            <CheckCircle fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleCancel} color="error">
            <Cancel fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    );
  }

  const config =
    DELIVERY_STATUS_CONFIG[delivery?.status || DELIVERY_STATUS.PENDING];

  return (
    <Tooltip
      title={
        <Box sx={{ color: "white" }}>
          <Typography color="white" variant="caption" display="block">
            Period: {period}
          </Typography>
          <Typography color="white" variant="caption" display="block">
            Quantity: {delivery?.quantity || 0}
          </Typography>
          <Typography color="white" variant="caption" display="block">
            Status: {config.label}
          </Typography>
          {delivery?.deliveredAt && (
            <Typography color="white" variant="caption" display="block">
              Delivered: {new Date(delivery.deliveredAt).toLocaleDateString()}
            </Typography>
          )}
          {delivery?.cargoNo && (
            <Typography color="white" variant="caption" display="block">
              Cargo: {delivery.cargoNo}
            </Typography>
          )}
        </Box>
      }
    >
      <Box
        sx={{
          display: "flex",
          width: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          p: 1,
          cursor: "pointer",
          borderRadius: 1,
          minHeight: 60,
          "&:hover": {
            backgroundColor: alpha("#f5f5f5", 0.5),
          },
        }}
        onClick={() => setIsEditing(true)}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            gap: 0.5,
          }}
        >
          <Typography
            fontSize={"16px"}
            variant="caption"
            fontWeight={600}
            width={"100%"}
            display={"flex"}
            justifyContent={"center"}
          >
            {Number(delivery?.quantity || 0).toFixed(0) || 0}
          </Typography>
        </Box>
        <Chip
          label={config.label}
          size="small"
          color={config.color}
          sx={{
            fontSize: "0.65rem",
            height: 20,
            "& .MuiChip-label": {
              px: 1,
            },
          }}
        />
      </Box>
    </Tooltip>
  );
}

function EditableQuantityCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.quantity || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === row.quantity) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onUpdateItem(row.id, { quantity: Number(value) });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update quantity:", error);
      setValue(row.quantity);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(row.quantity);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
        }}
      >
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={saving}
          sx={{
            width: 80,
            "& .MuiOutlinedInput-root": {
              height: 32,
              fontSize: "0.875rem",
            },
          }}
          autoFocus
          onBlur={handleSave}
        />
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        "&:hover": {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
        },
        transition: "background-color 0.2s",
      }}
      onClick={() => setIsEditing(true)}
    >
      <Typography variant="body2" fontWeight={600} sx={{ fontSize: "16px" }}>
        {row.quantity || 0}
      </Typography>
    </Box>
  );
}

// Editable Comment Cell
function EditableCommentCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.comment || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === row.comment) {
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

  if (isEditing) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
        }}
      >
        <TextField
          size="small"
          multiline
          maxRows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={saving}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": {
              fontSize: "0.875rem",
            },
          }}
          autoFocus
          onBlur={handleSave}
          placeholder="Add comment..."
        />
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        "&:hover": {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
        },
        transition: "background-color 0.2s",
        p: 1,
      }}
      onClick={() => setIsEditing(true)}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: "14px",
          color: row.comment ? "text.primary" : "text.secondary",
          fontStyle: row.comment ? "normal" : "italic",
        }}
      >
        {row.comment || "Click to add comment..."}
      </Typography>
    </Box>
  );
}

// Function to extract and format delivery periods from all items
function extractDeliveryPeriods(items: any[]): {
  sortedPeriods: string[];
  periodCargoMap: Map<string, string[]>;
} {
  const periodsSet = new Set<string>();
  const periodCargoMap = new Map<string, string[]>();

  items.forEach((item) => {
    if (item.deliveries) {
      Object.entries(item.deliveries).forEach(
        ([period, deliveryDetails]: [string, any]) => {
          periodsSet.add(period);

          if (!periodCargoMap.has(period)) {
            periodCargoMap.set(period, []);
          }

          if (deliveryDetails.cargoNo) {
            const cargoNos =
              typeof deliveryDetails.cargoNo === "string"
                ? deliveryDetails.cargoNo
                    .split(",")
                    .map((c: string) => c.trim())
                : [deliveryDetails.cargoNo];

            // Add unique cargo numbers for this period
            const existingCargos = periodCargoMap.get(period)!;
            cargoNos.forEach((cargoNo: string) => {
              if (cargoNo && !existingCargos.includes(cargoNo)) {
                existingCargos.push(cargoNo);
              }
            });
          }
        }
      );
    }
  });

  // Sort periods chronologically
  const sortedPeriods = Array.from(periodsSet).sort((a, b) => {
    const [yearA, periodA] = a.split("-").map((p) => p.replace("T", ""));
    const [yearB, periodB] = b.split("-").map((p) => p.replace("T", ""));

    if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
    return parseInt(periodA) - parseInt(periodB);
  });

  return {
    sortedPeriods,
    periodCargoMap,
  };
}

function EditableIntervalCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.interval || "monthly");
  const [saving, setSaving] = useState(false);

  const handleSave = async (newValue: string) => {
    if (newValue === row.interval) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onUpdateItem(row.id, { interval: newValue });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update interval:", error);
      setValue(row.interval);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(row.interval);
    setIsEditing(false);
  };

  const getCurrentLabel = () => {
    const option = INTERVAL_OPTIONS.find(
      (opt) => opt.value === (row.interval || "monthly")
    );
    return option ? option.label : "Monatlich";
  };

  if (isEditing) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleSave(e.target.value);
            }}
            disabled={saving}
            sx={{
              fontSize: "0.875rem",
              height: 32,
            }}
            onClose={() => setIsEditing(false)}
            autoFocus
            open={isEditing}
          >
            {INTERVAL_OPTIONS.map((option: any) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {saving && <CircularProgress size={16} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        "&:hover": {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
        },
        transition: "background-color 0.2s",
      }}
      onClick={() => setIsEditing(true)}
    >
      <Typography variant="body2" sx={{ fontSize: "14px" }}>
        {getCurrentLabel()}
      </Typography>
    </Box>
  );
}

// Function to format period for display
function formatPeriodLabel(period: string, cargoNo: string): string {
  const monthMap: { [key: string]: string } = {
    "01": "Januar",
    "02": "Februar",
    "03": "März",
    "04": "April",
    "05": "Mai",
    "06": "Juni",
    "07": "Juli",
    "08": "August",
    "09": "September",
    "10": "Oktober",
    "11": "November",
    "12": "Dezember",
  };

  const [yearPart, periodNum] = period.split("-");
  const monthName = monthMap[periodNum] || `Period ${periodNum}`;

  return `Lieferung ${monthName} ${cargoNo}`;
}

// Enhanced Activity Log Component with improved UI
function ActivityLogCard({
  log,
  onApprove,
  onReject,
}: {
  log: any;
  onApprove: (logId: string) => void;
  onReject: (logId: string) => void;
}) {
  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "item_created":
        return <Add sx={{ color: theme.palette.success.main, fontSize: 20 }} />;
      case "update":
      case "item_updated":
        return <Edit sx={{ color: theme.palette.info.main, fontSize: 20 }} />;
      case "delete":
      case "item_deleted":
        return (
          <Delete sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        );
      case "quantity_changed":
        return (
          <TrendingUp
            sx={{ color: theme.palette.warning.main, fontSize: 20 }}
          />
        );
      case "status_changed":
        return (
          <Timeline sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
        );
      case "delivery_updated":
        return (
          <LocalOffer
            sx={{ color: theme.palette.secondary.main, fontSize: 20 }}
          />
        );
      default:
        return (
          <History sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
        );
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Chip
            label="Approved"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 600,
              fontSize: "0.75rem",
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
            icon={<CheckCircleOutline sx={{ fontSize: 14 }} />}
          />
        );
      case "rejected":
        return (
          <Chip
            label="Rejected"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
              fontWeight: 600,
              fontSize: "0.75rem",
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
            icon={<Cancel sx={{ fontSize: 14 }} />}
          />
        );
      case "pending":
        return (
          <Chip
            label="Pending Approval"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              fontWeight: 600,
              fontSize: "0.75rem",
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              animation: "pulse 2s infinite",
            }}
            icon={<PriorityHigh sx={{ fontSize: 14 }} />}
          />
        );
      default:
        return (
          <Chip
            label="Unknown"
            size="small"
            sx={{
              backgroundColor: alpha("#666", 0.1),
              color: "#666",
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
        );
    }
  };

  const formatTimestamp = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  };

  const getUserDisplayName = () => {
    return log.performedByType === "customer" ? "Customer" : "Admin";
  };

  const requiresApproval = log.approvalStatus === "pending";
  const isPending = log.approvalStatus === "pending";

  return (
    <Card
      sx={{
        mb: 2.5,
        border: isPending
          ? `2px solid ${theme.palette.warning.main}`
          : `1px solid ${alpha("#ADB5BD", 0.15)}`,
        borderRadius: 4,
        overflow: "hidden",
        transition: "all 0.3s ease",
        position: "relative",
        "&:hover": {
          boxShadow: isPending
            ? `0 8px 32px ${alpha(theme.palette.warning.main, 0.25)}`
            : "0 8px 24px rgba(0,0,0,0.12)",
          transform: "translateY(-2px)",
          borderColor: isPending
            ? theme.palette.warning.main
            : alpha(theme.palette.primary.main, 0.3),
        },
        ...(isPending && {
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.warning.main,
            0.03
          )} 0%, ${alpha(theme.palette.warning.main, 0.08)} 100%)`,
        }),
      }}
    >
      {/* Priority indicator for pending items */}
      {isPending && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`,
            animation: "shimmer 2s infinite linear",
          }}
        />
      )}

      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", gap: 3 }}>
          {/* Enhanced Activity Icon */}
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: isPending
                ? alpha(theme.palette.warning.main, 0.1)
                : alpha(theme.palette.primary.main, 0.08),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 56,
              height: 56,
              border: `2px solid ${
                isPending
                  ? alpha(theme.palette.warning.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1)
              }`,
              position: "relative",
              "&::after": isPending
                ? {
                    content: '""',
                    position: "absolute",
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: 3,
                    background: `linear-gradient(45deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`,
                    opacity: 0.3,
                    animation: "pulse 2s infinite",
                  }
                : {},
            }}
          >
            {getActivityIcon(log.action)}
          </Box>

          {/* Enhanced Activity Details */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{
                    fontSize: "1.1rem",
                    color: isPending
                      ? theme.palette.warning.dark
                      : "text.primary",
                    mb: 0.5,
                  }}
                >
                  {log.action
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l: any) => l.toUpperCase())}
                </Typography>

                {/* Enhanced metadata display */}
                {log.itemName && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontSize: "0.875rem",
                    }}
                  >
                    <Inventory sx={{ fontSize: 16 }} />
                    Item: <strong>{log.itemName}</strong>
                  </Typography>
                )}
              </Box>

              {getStatusChip(log.approvalStatus)}
            </Box>

            {/* Enhanced Change Details */}
            {log.changes && Object.keys(log.changes).length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  mb: 2.5,
                  p: 2.5,
                  backgroundColor: alpha(
                    isPending
                      ? theme.palette.warning.main
                      : theme.palette.primary.main,
                    0.05
                  ),
                  borderRadius: 3,
                  border: `1px solid ${alpha(
                    isPending
                      ? theme.palette.warning.main
                      : theme.palette.primary.main,
                    0.1
                  )}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{
                    mb: 1.5,
                    color: isPending
                      ? theme.palette.warning.dark
                      : theme.palette.primary.dark,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Timeline sx={{ fontSize: 18 }} />
                  Changes Made:
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {Object.entries(log.changes).map(
                    ([key, value]: [string, any]) => (
                      <Box
                        key={key}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          p: 1.5,
                          backgroundColor: "rgba(255,255,255,0.7)",
                          borderRadius: 2,
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: "text.primary",
                            minWidth: 80,
                            textTransform: "capitalize",
                          }}
                        >
                          {key}:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            backgroundColor: alpha(
                              theme.palette.info.main,
                              0.1
                            ),
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: "0.875rem",
                            fontFamily: "monospace",
                          }}
                        >
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </Typography>
                      </Box>
                    )
                  )}
                </Box>
              </Paper>
            )}

            {/* Enhanced Rejection Reason */}
            {log.rejectionReason && (
              <Alert
                severity="error"
                sx={{
                  mb: 2.5,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  "& .MuiAlert-message": {
                    width: "100%",
                  },
                }}
                icon={<ErrorOutline />}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{ mb: 0.5 }}
                >
                  Rejection Reason:
                </Typography>
                <Typography variant="body2">{log.rejectionReason}</Typography>
              </Alert>
            )}

            {/* Enhanced User and Timestamp */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: requiresApproval ? 3 : 0,
                p: 2,
                backgroundColor: alpha("#f8f9fa", 0.5),
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: "0.875rem",
                    backgroundColor:
                      log.performedByType === "customer"
                        ? theme.palette.info.main
                        : theme.palette.primary.main,
                    fontWeight: 600,
                  }}
                >
                  {getUserDisplayName().charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.primary"
                  >
                    {getUserDisplayName()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {log.performedByType}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTime fontSize="small" sx={{ color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {formatTimestamp(log.performedAt)}
                </Typography>
              </Box>
            </Box>

            {/* Enhanced Approval Actions */}
            {requiresApproval && (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mt: 2,
                  p: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.05),
                  borderRadius: 3,
                  border: `1px dashed ${alpha(
                    theme.palette.warning.main,
                    0.3
                  )}`,
                }}
              >
                <CustomButton
                  size="medium"
                  variant="contained"
                  sx={{
                    backgroundColor: theme.palette.success.main,
                    color: "white",
                    fontWeight: 600,
                    boxShadow: `0 4px 12px ${alpha(
                      theme.palette.success.main,
                      0.3
                    )}`,
                    "&:hover": {
                      backgroundColor: theme.palette.success.dark,
                      boxShadow: `0 6px 16px ${alpha(
                        theme.palette.success.main,
                        0.4
                      )}`,
                      transform: "translateY(-2px)",
                    },
                  }}
                  startIcon={<ThumbUp />}
                  onClick={() => onApprove(log.id)}
                >
                  Approve Changes
                </CustomButton>
                <CustomButton
                  size="medium"
                  variant="outlined"
                  sx={{
                    borderColor: theme.palette.error.main,
                    color: theme.palette.error.main,
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      borderColor: theme.palette.error.dark,
                      transform: "translateY(-2px)",
                    },
                  }}
                  startIcon={<ThumbDown />}
                  onClick={() => onReject(log.id)}
                >
                  Reject Changes
                </CustomButton>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Add Item Dialog Component - FIXED
function AddItemDialog({ open, onClose, onAddItem, listId }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setItems([]);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await searchItems(query);
        setItems(response || []);
      } catch (error) {
        console.error("Search failed:", error);
        setItems([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast.error("Please select an item");
      return;
    }

    try {
      setLoading(true);
      const itemData = {
        productId: selectedItem.id.toString(),
        quantity: 1,
        notes: "",
        productName: selectedItem.name || "Unknown Item",
        sku: selectedItem.articleNumber || "",
        category: "",
        price: 0,
        supplier: "",
        itemId: selectedItem.id.toString(),
        listId: listId,
        imageUrl: selectedItem.imageUrl || "",
      };

      await onAddItem(itemData);

      // Reset form
      setSelectedItem(null);
      setSearchTerm("");
      setItems([]);
      onClose();
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ShoppingCart sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontWeight={600}>
              Add Item to List
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Search Field */}
          <Autocomplete
            options={items}
            getOptionLabel={(option) => option.name || ""}
            value={selectedItem}
            onChange={(_, newValue) => setSelectedItem(newValue)}
            inputValue={searchTerm}
            onInputChange={(_, newInputValue) => setSearchTerm(newInputValue)}
            loading={searchLoading}
            filterOptions={(x) => x}
            clearOnBlur={false}
            clearOnEscape={false}
            renderOption={(props, option) => (
              <Box
                component="li"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
                onClick={() => {
                  setSelectedItem(option);
                  setItems([]);
                }}
              >
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: 2,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: alpha("#f5f5f5", 0.5),
                    border: "1px solid #e0e0e0",
                  }}
                >
                  {option.imageUrl ? (
                    <img
                      src={`https://system.gtech.de/storage/${option.imageUrl}`}
                      alt={option.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <ImageIcon />
                  )}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {option.name}
                  </Typography>
                  {option.articleNumber && (
                    <Typography variant="caption" color="text.secondary">
                      Art#: {option.articleNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search items by name..."
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "primary.main" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchLoading && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </InputAdornment>
                  ),
                }}
              />
            )}
            ListboxProps={{
              sx: {
                maxHeight: 300,
                "& .MuiAutocomplete-option": {
                  padding: 0,
                },
              },
            }}
          />

          {/* Selected Item Preview */}
          {selectedItem && (
            <Card
              sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: 2,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "white",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  {selectedItem.imageUrl ? (
                    <img
                      src={`https://system.gtech.de/storage/${selectedItem.imageUrl}`}
                      alt={selectedItem.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <ImageIcon />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedItem.name}
                  </Typography>
                  {selectedItem.articleNumber && (
                    <Typography variant="body2" color="text.secondary">
                      Article Number: {selectedItem.articleNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Card>
          )}

          {/* Empty State */}
          {!searchTerm && (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                px: 3,
                borderRadius: 2,
                border: "2px dashed #e0e0e0",
                bgcolor: "#fafafa",
              }}
            >
              <Search sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Start typing to search for items
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <CustomButton variant="outlined" onClick={onClose}>
          Cancel
        </CustomButton>
        <CustomButton
          variant="contained"
          gradient={true}
          onClick={handleSubmit}
          disabled={!selectedItem}
          loading={loading}
        >
          Add Item
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Enhanced Breadcrumbs
function EnhancedBreadcrumbs({ listTitle }: { listTitle: string }) {
  return (
    <Box sx={{ borderRadius: 3, px: 2.5, py: 1, display: "inline-flex" }}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link
          underline="none"
          color="inherit"
          href="/admin"
          sx={{
            display: "flex",
            alignItems: "center",
            fontSize: "0.85rem",
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
          <AdminPanelSettings fontSize="small" sx={{ mr: 0.5 }} />
          Admin Dashboard
        </Link>
        <Link
          underline="none"
          color="inherit"
          href="/admin/lists"
          sx={{
            fontSize: "0.85rem",
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
          Lists Management
        </Link>
        <Typography
          color="primary.main"
          fontWeight={600}
          sx={{ fontSize: "0.85rem", px: 1, py: 0.5 }}
        >
          {listTitle}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}

// Main Admin List Detail Component
const AdminListDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const listId = params?.id as string;

  // State management
  const [listData, setListData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const deliveryPeriodsData = useMemo(() => {
    if (!listData?.items) return { sortedPeriods: [], cargoNumbers: [] };
    return extractDeliveryPeriods(listData.items);
  }, [listData?.items]);

  // Sort activity logs with pending ones at the top
  const sortedActivityLogs = useMemo(() => {
    return [...activityLogs].sort((a, b) => {
      // First sort by approval status (pending first)
      if (a.approvalStatus === "pending" && b.approvalStatus !== "pending")
        return -1;
      if (a.approvalStatus !== "pending" && b.approvalStatus === "pending")
        return 1;

      // Then sort by timestamp (most recent first)
      const dateA = new Date(a.performedAt || a.timestamp);
      const dateB = new Date(b.performedAt || b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
  }, [activityLogs]);

  // Load list data and activity logs
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

        // Extract activity logs from response if available
        if (response.activityLogs) {
          setActivityLogs(response.activityLogs);
          setPendingApprovals(
            response.activityLogs.filter(
              (log: ActivityLog) =>
                (log.status === "pending" ||
                  log.approvalStatus === "pending") &&
                log.requiresApproval
            ).length
          );
        }
      } catch (error) {
        console.error("Failed to load list:", error);
      } finally {
        setLoading(false);
      }
    };

    loadListData();
  }, [listId]);

  // Handle adding new item to list
  const handleAddItem = async (itemData: any) => {
    if (!listData) return;

    try {
      setSaving(true);
      const response = await addItemToList(listData.id, itemData);

      // Update local state
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

  // Handle updating item
  const handleUpdateItem = async (itemId: string, updateData: any) => {
    try {
      const response = await updateListItem(itemId, updateData);

      // Update local state
      setListData((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) =>
          item.id === itemId ? { ...item, ...updateData } : item
        ),
      }));
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  };

  // Handle deleting selected items
  const handleDeleteSelectedItems = async () => {
    if (!listData || selectedRows.size === 0) return;

    try {
      setSaving(true);
      const deletePromises = Array.from(selectedRows).map((itemId) =>
        deleteListItem(itemId)
      );

      await Promise.all(deletePromises);

      // Update local state
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
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDelivery = useCallback(
    async (itemId: string, period: string, deliveryData: any) => {
      try {
        // Update local state immediately for better UX
        setListData((prev: any) => ({
          ...prev,
          items: prev.items.map((item: any) => {
            if (item.id === itemId) {
              const updatedDeliveries = {
                ...item.deliveries,
                [period]: {
                  ...item.deliveries?.[period],
                  ...deliveryData,
                  cargoNo:
                    deliveryData.cargoNo ||
                    item.deliveries?.[period]?.cargoNo ||
                    "",
                },
              };
              return {
                ...item,
                deliveries: updatedDeliveries,
              };
            }
            return item;
          }),
        }));
      } catch (error) {
        console.error("Failed to update delivery:", error);
        // Revert the local state change if API call fails
      }
    },
    []
  );

  // Handle activity log approval/rejection
  const handleApproveActivity = async (logId: string) => {
    try {
      await approveActivityLog(logId);

      setActivityLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                status: "approved" as const,
                approvalStatus: "approved" as const,
              }
            : log
        )
      );

      setPendingApprovals((prev) => prev - 1);
      toast.success("Activity approved successfully!", successStyles);
    } catch (error) {
      console.error("Failed to approve activity:", error);
      toast.error("Failed to approve activity");
    }
  };

  const handleRejectActivity = async (logId: string) => {
    try {
      await rejectActivityLog(logId, { reason: "Admin rejected the changes" });

      setActivityLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                status: "rejected" as const,
                approvalStatus: "rejected" as const,
              }
            : log
        )
      );

      setPendingApprovals((prev) => prev - 1);
      toast.success("Activity rejected successfully!", successStyles);
    } catch (error) {
      console.error("Failed to reject activity:", error);
      toast.error("Failed to reject activity");
    }
  };

  // Filter items based on search
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
      {
        key: "itemNumber",
        name: "Item #",
        width: 100,
        resizable: true,
      },
      {
        key: "articleNumber",
        name: "Article Number",
        width: 140,
        resizable: true,
      },
      {
        key: "imageUrl",
        name: "Image",
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
                    borderRadius: 2,
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
                    alt={props.row.articleName || "Product"}
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
                      {props.row.articleName || "Product Image"}
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
                    alt={props.row.articleName || "Product"}
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
        name: "Article Name",
        width: 300,
        resizable: true,
      },
      {
        key: "quantity",
        name: "Total Quantity",
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
        name: "Interval",
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

    // Add delivery columns dynamically (without duplication)
    const deliveryColumns = deliveryPeriodsData.sortedPeriods.map((period) => {
      const cargoNo = listData?.items
        .map((item: any) => item.deliveries?.[period]?.cargoNo)
        .find((cn: string) => cn);

      return {
        key: `delivery_${period}`,
        name: formatPeriodLabel(period, cargoNo || ""),
        width: 140,
        resizable: false,
        renderCell: (props: any) => (
          <DeliveryCell
            row={props.row}
            period={period}
            onUpdateDelivery={handleUpdateDelivery}
          />
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
    });

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
                return "Confirmed";
              case "pending":
                return "Pending";
              case "rejected":
                return "Rejected";
              default:
                return "Pending";
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
        name: "Marked",
        width: 80,
        resizable: true,
        renderCell: (props: any) => (
          <Checkbox
            size="small"
            checked={props.row.marked}
            icon={<CheckBoxOutlineBlank />}
            checkedIcon={<CheckBox />}
            onChange={() => {}}
          />
        ),
      },
      {
        key: "comment",
        name: "Comment",
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
  }, [
    deliveryPeriodsData,
    selectedRows,
    handleUpdateDelivery,
    handleUpdateItem,
    listData?.items,
  ]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!listData?.items) return [];

    return listData.items.filter(
      (item: any) =>
        item.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [listData?.items, searchTerm]);

  if (loading) {
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
      </Box>
    );
  }

  // Show error if no list data
  if (!listData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          List not found or failed to load
        </Alert>
        <CustomButton onClick={() => router.back()} startIcon={<ArrowBack />}>
          Go Back
        </CustomButton>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", py: 3, px: 0, pt: 0 }}>
      <Box sx={{ maxWidth: "75vw", mx: "auto" }}>
        {/* Header */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(10px)",
            borderRadius: 1,
            px: 2.5,
            py: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            border: "1px solid",
            borderColor: alpha("#ADB5BD", 0.15),
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
            <IconButton
              onClick={() => router.back()}
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
            >
              <ArrowBack />
            </IconButton>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <AdminPanelSettings
                sx={{ color: "primary.main", fontSize: 28 }}
              />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background:
                    "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
                  backgroundClip: "text",
                  textFillColor: "transparent",
                  letterSpacing: "-0.5px",
                }}
              >
                {listData.name}
              </Typography>
            </Box>

            <Chip
              label={listData.status}
              color={listData.status === "active" ? "success" : "default"}
              sx={{ ml: 2 }}
            />

            {pendingApprovals > 0 && (
              <Badge
                badgeContent={pendingApprovals}
                color="error"
                sx={{ ml: 2 }}
              >
                <NotificationsActive sx={{ color: "warning.main" }} />
              </Badge>
            )}

            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>

          <EnhancedBreadcrumbs listTitle={listData.name} />
        </Box>

        {/* Tabs */}
        <Card
          sx={{
            mb: 4,
            maxWidth: "91vw",
            borderRadius: 1,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
            border: "1px solid",
            borderColor: alpha("#ADB5BD", 0.15),
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={(event, newValue) => setTabValue(newValue)}
              sx={{
                px: 3,
                "& .MuiTab-root": {
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textTransform: "none",
                  minHeight: 60,
                  "&.Mui-selected": {
                    color: "primary.main",
                  },
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
              }}
            >
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Assignment />
                    Items Management
                  </Box>
                }
              />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <History />
                    Activity Logs
                    {pendingApprovals > 0 && (
                      <Badge
                        badgeContent={pendingApprovals}
                        color="error"
                        sx={{
                          ml: 1,
                          "& .MuiBadge-badge": {
                            animation: "pulse 2s infinite",
                            fontWeight: 700,
                          },
                        }}
                      />
                    )}
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {/* Tab Panel 1: Items Management */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 3 }}>
              {/* Action Bar */}
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
              >
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
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
                      width: 300,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
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

                  {selectedRows.size > 0 && (
                    <CustomButton
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={handleDeleteSelectedItems}
                      loading={saving}
                    >
                      Delete ({selectedRows.size})
                    </CustomButton>
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <CustomButton
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </CustomButton>

                  <CustomButton
                    variant="contained"
                    startIcon={<Save />}
                    color="primary"
                    gradient={true}
                    loading={saving}
                    onClick={() => toast.success("Changes saved!")}
                  >
                    Save Changes
                  </CustomButton>
                </Box>
              </Box>

              {/* Items Grid */}
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
                      backgroundColor: "rgba(140, 194, 27, 0.04) !important",
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
                  // Special styling for delivery columns
                  "& .rdg-cell[aria-colindex]": {
                    "&:nth-of-type(n+6)": {
                      padding: "8px !important",
                      backgroundColor: "rgba(248, 255, 248, 0.7)",
                    },
                  },
                  // Enhanced focus states
                  "& .rdg-cell:focus-within": {
                    outline: "2px solid rgba(140, 194, 27, 0.4)",
                    outlineOffset: "-2px",
                    backgroundColor: "rgba(140, 194, 27, 0.05)",
                  },
                  // Beautiful scrollbar
                  "& .rdg-viewport": {
                    "&::-webkit-scrollbar": {
                      width: "8px",
                      height: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "rgba(248, 250, 252, 0.5)",
                      borderRadius: "4px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background:
                        "linear-gradient(135deg, rgba(140, 194, 27, 0.3), rgba(140, 194, 27, 0.5))",
                      borderRadius: "4px",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, rgba(140, 194, 27, 0.5), rgba(140, 194, 27, 0.7))",
                      },
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

              {/* Footer */}
              {listData.items.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2.5,
                    px: 3,
                    py: 2,
                    backgroundColor: alpha(
                      theme.palette.background.default,
                      0.6
                    ),
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha("#ADB5BD", 0.1),
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      "&::before": {
                        content: '""',
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: theme.palette.info.main,
                        marginRight: 1,
                      },
                    }}
                  >
                    Showing {filteredItems.length} of {listData.items.length}{" "}
                    items
                  </Typography>

                  <Box sx={{ display: "flex", gap: 4 }}>
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: theme.palette.info.main,
                          display: "inline-block",
                          mr: 1,
                          boxShadow: `0 0 0 2px ${alpha(
                            theme.palette.info.main,
                            0.2
                          )}`,
                        }}
                      />
                      <strong>Total Items:</strong> {listData.items.length}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: theme.palette.success.main,
                          display: "inline-block",
                          mr: 1,
                          boxShadow: `0 0 0 2px ${alpha(
                            theme.palette.success.main,
                            0.2
                          )}`,
                        }}
                      />
                      <strong>Confirmed:</strong>{" "}
                      {
                        listData.items.filter(
                          (item: any) => item.changeStatus === "confirmed"
                        ).length
                      }
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: theme.palette.warning.main,
                          display: "inline-block",
                          mr: 1,
                          boxShadow: `0 0 0 2px ${alpha(
                            theme.palette.warning.main,
                            0.2
                          )}`,
                        }}
                      />
                      <strong>Pending:</strong>{" "}
                      {
                        listData.items.filter(
                          (item: any) =>
                            !item.changeStatus ||
                            item.changeStatus === "pending"
                        ).length
                      }
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: theme.palette.error.main,
                          display: "inline-block",
                          mr: 1,
                          boxShadow: `0 0 0 2px ${alpha(
                            theme.palette.error.main,
                            0.2
                          )}`,
                        }}
                      />
                      <strong>Rejected:</strong>{" "}
                      {
                        listData.items.filter(
                          (item: any) => item.changeStatus === "rejected"
                        ).length
                      }
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: theme.palette.primary.main,
                          display: "inline-block",
                          mr: 1,
                          boxShadow: `0 0 0 2px ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                        }}
                      />
                      <strong>Marked:</strong>{" "}
                      {listData.items.filter((item: any) => item.marked).length}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Tab Panel 2: Activity Logs */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 3 }}>
              {/* Activity Logs Header */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    Activity Logs & Approvals
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review and manage all list activities and customer requests
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                  {pendingApprovals > 0 && (
                    <Alert
                      severity="warning"
                      sx={{
                        borderRadius: 2,
                        "& .MuiAlert-message": {
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        },
                      }}
                    >
                      <Warning fontSize="small" />
                      {pendingApprovals} pending approval
                      {pendingApprovals > 1 ? "s" : ""}
                    </Alert>
                  )}

                  <CustomButton
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => {
                      // Refresh activity logs
                      window.location.reload();
                    }}
                  >
                    Refresh Logs
                  </CustomButton>
                </Box>
              </Box>

              {/* Activity Logs List */}
              <Box sx={{ maxHeight: "600px", overflowY: "auto" }}>
                {sortedActivityLogs.length === 0 ? (
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: "center",
                      borderRadius: 3,
                      border: "2px dashed #e0e0e0",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <History
                      sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
                    />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      No Activity Logs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Activity logs will appear here when customers make changes
                      to the list.
                    </Typography>
                  </Paper>
                ) : (
                  sortedActivityLogs.map((log) => (
                    <ActivityLogCard
                      key={log.id}
                      log={log}
                      onApprove={handleApproveActivity}
                      onReject={handleRejectActivity}
                    />
                  ))
                )}
              </Box>
            </Box>
          </TabPanel>
        </Card>

        {/* Add Item Dialog */}
        <AddItemDialog
          open={addItemDialog}
          onClose={() => setAddItemDialog(false)}
          onAddItem={handleAddItem}
          listId={listId}
        />

        {/* Add CSS animations */}
        <style jsx global>{`
          @keyframes pulse {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              opacity: 1;
            }
          }

          @keyframes shimmer {
            0% {
              background-position: -200px 0;
            }
            100% {
              background-position: calc(200px + 100%) 0;
            }
          }
        `}</style>
      </Box>
    </Box>
  );
};

export default AdminListDetailPage;
