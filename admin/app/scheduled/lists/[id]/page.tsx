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
  Stack,
  useTheme,
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
import {
  ImageIcon,
  X,
  Clock,
  FileText,
  User,
  Shield,
  Package,
} from "lucide-react";
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
  getCustomerLists,
  bulkAcknowledgeChanges,
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

// Enhanced FieldHighlight Component for change tracking
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
      {hasChanges && (
        <>
          <Warning
            sx={{
              position: "absolute",
              top: -6,
              right: -6,
              fontSize: 16,
              color: "#f44336",
              backgroundColor: "white",
              borderRadius: "50%",
              zIndex: 1,
            }}
          />
          {fieldName && (
            <Tooltip
              title={`Feld "${fieldName}" wurde vom Kunden geändert`}
              arrow
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -12,
                  left: 8,
                  backgroundColor: "#f44336",
                  color: "white",
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  zIndex: 2,
                }}
              >
                Geändert
              </Box>
            </Tooltip>
          )}
        </>
      )}
    </Box>
  );
};

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

// List Tabs Component
function ListTabs({ currentListId, allLists, onListChange, loading }: any) {
  const theme = useTheme();

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
            const hasChanges = list.items?.some(
              (item: any) =>
                item.changesNeedAcknowledgment ||
                item.hasChanges ||
                item.shouldHighlight
            );

            return (
              <Card
                key={list.id}
                sx={{
                  minWidth: { xs: 200, sm: 240 },
                  p: 2,
                  py: 1,
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
                      {hasChanges && (
                        <Chip
                          label="Has Changes"
                          size="small"
                          color="error"
                          sx={{ ml: 1, fontSize: "0.6rem", height: 16 }}
                        />
                      )}
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

// Modified DeliveryCell component with change highlighting
function DeliveryCell({ row, period, onUpdateDelivery }: any) {
  const delivery = row.deliveries?.[period];
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(
    delivery?.status || DELIVERY_STATUS.PENDING
  );

  const hasChanges =
    (row.changesNeedAcknowledgment || row.hasChanges || row.shouldHighlight) &&
    row.changedFields?.includes(`deliveries.${period}`);

  const handleSave = () => {
    onUpdateDelivery(row.id, period, {
      quantity: delivery?.quantity || 0,
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
    <FieldHighlight hasChanges={hasChanges} fieldName={`Lieferung ${period}`}>
      <Tooltip
        title={
          <Box sx={{ color: "white" }}>
            <Typography color="white" variant="caption" display="block">
              Period: {period}
            </Typography>
            <Typography color="white" variant="caption" display="block">
              Quantity: {delivery?.quantity || 0}
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
        </Box>
      </Tooltip>
    </FieldHighlight>
  );
}

// Enhanced Editable Quantity Cell with change highlighting
function EditableQuantityCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.quantity || 0);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    (row.changesNeedAcknowledgment || row.hasChanges || row.shouldHighlight) &&
    row.changedFields?.includes("quantity");

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
    <FieldHighlight
      hasChanges={hasChanges}
      fieldName="Menge"
      onClick={() => setIsEditing(true)}
    >
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

// Enhanced Editable Comment Cell with change highlighting
function EditableCommentCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.comment || "");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    (row.changesNeedAcknowledgment || row.hasChanges || row.shouldHighlight) &&
    row.changedFields?.includes("comment");

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
    <FieldHighlight
      hasChanges={hasChanges}
      fieldName="Kommentar"
      onClick={() => setIsEditing(true)}
    >
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
    </FieldHighlight>
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

// Enhanced Editable Interval Cell with change highlighting
function EditableIntervalCell({ row, onUpdateItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.interval || "monthly");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    (row.changesNeedAcknowledgment || row.hasChanges || row.shouldHighlight) &&
    row.changedFields?.includes("interval");

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
    <FieldHighlight
      hasChanges={hasChanges}
      fieldName="Intervall"
      onClick={() => setIsEditing(true)}
    >
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
              border: `2px solid ${isPending
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

function AddItemDialog({ open, onClose, onAddItem, listId }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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
                </Box>
              </Box>
            </Card>
          )}

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
  const customerId = params?.id as string;

  // State management
  const [allLists, setAllLists] = useState<any[]>([]);
  const [currentListId, setCurrentListId] = useState<string>("");
  const [currentList, setCurrentList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [acknowledgingSaving, setAcknowledgingSaving] = useState(false);

  // Count items with unacknowledged changes
  const itemsWithChanges = useMemo(() => {
    if (!currentList?.items) return [];
    return currentList.items.filter(
      (item: any) =>
        item.changesNeedAcknowledgment ||
        item.hasChanges ||
        item.shouldHighlight
    );
  }, [currentList?.items]);

  const deliveryPeriodsData = useMemo(() => {
    if (!currentList?.items) return { sortedPeriods: [], cargoNumbers: [] };
    return extractDeliveryPeriods(currentList.items);
  }, [currentList?.items]);

  // Sort activity logs with pending ones at the top
  const sortedActivityLogs = useMemo(() => {
    return [...activityLogs].sort((a, b) => {
      if (a.approvalStatus === "pending" && b.approvalStatus !== "pending")
        return -1;
      if (a.approvalStatus !== "pending" && b.approvalStatus === "pending")
        return 1;

      const dateA = new Date(a.performedAt || a.timestamp);
      const dateB = new Date(b.performedAt || b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
  }, [activityLogs]);

  // Load customer lists
  useEffect(() => {
    const loadCustomerLists = async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getCustomerLists(customerId);
        if (response && response.length > 0) {
          // Transform data to include change tracking
          const transformedLists = response.map((list: any) => ({
            ...list,
            items:
              list.items?.map((item: any) => ({
                ...item,
                // Add change tracking properties
                changesNeedAcknowledgment:
                  item.changesNeedAcknowledgment || false,
                hasChanges: item.hasChanges || false,
                shouldHighlight: item.shouldHighlight || false,
                changedFields: item.changedFields || [],
              })) || [],
          }));

          setAllLists(transformedLists);
          setCurrentListId(transformedLists[0].id);
          setCurrentList(transformedLists[0]);

          // Mock activity logs - replace with real API call
          const mockActivityLogs = [
            {
              id: "1",
              action: "item_updated",
              itemName:
                transformedLists[0].items?.[0]?.articleName || "Test Item",
              changes: { quantity: "5", comment: "Updated comment" },
              performedByType: "customer",
              performedAt: new Date().toISOString(),
              approvalStatus: "pending",
            },
          ];
          setActivityLogs(mockActivityLogs);
          setPendingApprovals(
            mockActivityLogs.filter((log) => log.approvalStatus === "pending")
              .length
          );
        }
      } catch (error) {
        console.error("Failed to load customer lists:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomerLists();
  }, [customerId]);

  // Handle list change
  const handleListChange = (listId: string) => {
    const selectedList = allLists.find((list) => list.id === listId);
    if (selectedList) {
      setCurrentListId(listId);
      setCurrentList(selectedList);
      setSelectedRows(new Set());
    }
  };

  // Handle acknowledging all changes
  const handleAcknowledgeAllChanges = async () => {
    if (!currentList || itemsWithChanges.length === 0) return;

    try {
      setAcknowledgingSaving(true);
      await bulkAcknowledgeChanges(currentList.id);

      // Update local state to clear changes
      setCurrentList((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) => ({
          ...item,
          changesNeedAcknowledgment: false,
          hasChanges: false,
          shouldHighlight: false,
          changedFields: [],
        })),
      }));

      // Update allLists as well
      setAllLists((prev) =>
        prev.map((list) =>
          list.id === currentListId
            ? {
              ...list,
              items: list.items.map((item: any) => ({
                ...item,
                changesNeedAcknowledgment: false,
                hasChanges: false,
                shouldHighlight: false,
                changedFields: [],
              })),
            }
            : list
        )
      );
    } catch (error) {
      console.error("Failed to acknowledge changes:", error);
    } finally {
      setAcknowledgingSaving(false);
    }
  };

  // Handle adding new item to list
  const handleAddItem = async (itemData: any) => {
    if (!currentList) return;

    try {
      setSaving(true);
      const response = await addItemToList(currentList.id, itemData);

      setCurrentList((prev: any) => ({
        ...prev,
        items: [...prev.items, response],
      }));

      setAllLists((prev) =>
        prev.map((list) =>
          list.id === currentListId
            ? { ...list, items: [...list.items, response] }
            : list
        )
      );
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

      setCurrentList((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) =>
          item.id === itemId ? { ...item, ...updateData } : item
        ),
      }));

      setAllLists((prev) =>
        prev.map((list) =>
          list.id === currentListId
            ? {
              ...list,
              items: list.items.map((item: any) =>
                item.id === itemId ? { ...item, ...updateData } : item
              ),
            }
            : list
        )
      );
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  };

  // Handle deleting selected items
  const handleDeleteSelectedItems = async () => {
    if (!currentList || selectedRows.size === 0) return;

    try {
      setSaving(true);
      const deletePromises = Array.from(selectedRows).map((itemId) =>
        deleteListItem(itemId)
      );

      await Promise.all(deletePromises);

      setCurrentList((prev: any) => ({
        ...prev,
        items: prev.items.filter((item: any) => !selectedRows.has(item.id)),
      }));

      setAllLists((prev) =>
        prev.map((list) =>
          list.id === currentListId
            ? {
              ...list,
              items: list.items.filter(
                (item: any) => !selectedRows.has(item.id)
              ),
            }
            : list
        )
      );

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
        setCurrentList((prev: any) => ({
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

        setAllLists((prev) =>
          prev.map((list) =>
            list.id === currentListId
              ? {
                ...list,
                items: list.items.map((item: any) => {
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
              }
              : list
          )
        );
      } catch (error) {
        console.error("Failed to update delivery:", error);
      }
    },
    [currentListId]
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
    } catch (error) {
      console.error("Failed to approve activity:", error);
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
    } catch (error) {
      console.error("Failed to reject activity:", error);
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
        key: "item_no_de",
        name: "Item No. DE",
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
        name: "Image",
        width: 100,
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
                    width: 65,
                    height: 65,
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
        renderCell: (props: any) => {
          const hasChanges =
            (props.row.changesNeedAcknowledgment ||
              props.row.hasChanges ||
              props.row.shouldHighlight) &&
            props.row.changedFields?.includes("articleName");
          return (
            <FieldHighlight hasChanges={hasChanges} fieldName="Artikelname">
              <Typography variant="body2" sx={{ fontSize: "14px", p: 1 }}>
                {props.row.articleName}
              </Typography>
            </FieldHighlight>
          );
        },
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

    const deliveryColumns = deliveryPeriodsData.sortedPeriods.map((period) => {
      const cargoNo = currentList?.items
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
    currentList?.items,
  ]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!currentList?.items) return [];

    return currentList.items.filter(
      (item: any) =>
        item.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentList?.items, searchTerm]);

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

  // Show error if no lists
  if (!allLists.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          No lists found for this customer
        </Alert>
        <CustomButton onClick={() => router.back()} startIcon={<ArrowBack />}>
          Go Back
        </CustomButton>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", py: 3, px: 0, pt: 0 }}>
      <Box sx={{ maxWidth: "85vw", mx: "auto" }}>
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
              <Box sx={{ display: "flex", flexDirection: "column" }}>
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
                    fontSize: 30,
                    lineHeight: 1.2,
                  }}
                >
                  {currentList.customer.companyName ||
                    currentList.customer.legalName ||
                    "Unknown Customer"}
                </Typography>
              </Box>
            </Box>

            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>

          <EnhancedBreadcrumbs
            listTitle={currentList?.name || "Customer Lists"}
          />

          {/* List Tabs */}
          <ListTabs
            currentListId={currentListId}
            allLists={allLists}
            onListChange={handleListChange}
            loading={loading}
          />
        </Box>

        {/* Changes Alert */}
        {itemsWithChanges.length > 0 && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: 2,
              backgroundColor: alpha("#ff9800", 0.05),
              border: "2px solid #ff9800",
              borderLeft: "6px solid #ff9800",
              boxShadow: "0 6px 20px rgba(255, 152, 0, 0.2)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "#e65100",
                    mb: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: "1.1rem",
                  }}
                >
                  <Warning fontSize="small" />
                  🟠 Unbestätigte Änderungen
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#ef6c00", mb: 1.5, fontWeight: 500 }}
                >
                  {itemsWithChanges.length} Artikel wurden vom Kunden geändert
                  und benötigen Admin-Bestätigung.
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                onClick={handleAcknowledgeAllChanges}
                disabled={acknowledgingSaving}
                startIcon={
                  acknowledgingSaving ? (
                    <CircularProgress size={18} />
                  ) : (
                    <Visibility />
                  )
                }
                sx={{
                  ml: 3,
                  backgroundColor: "#ff9800",
                  color: "white",
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  fontSize: "0.9rem",
                  "&:hover": {
                    backgroundColor: "#f57c00",
                    transform: "scale(1.02)",
                  },
                  whiteSpace: "nowrap",
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(255, 152, 0, 0.3)",
                }}
              >
                {acknowledgingSaving
                  ? "Bestätige..."
                  : `🟠 Alle Bestätigen (${itemsWithChanges.length})`}
              </Button>
            </Box>
          </Alert>
        )}

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
                    {itemsWithChanges.length > 0 && (
                      <Badge
                        badgeContent={itemsWithChanges.length}
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
                  "& .rdg-cell[aria-colindex]": {
                    "&:nth-of-type(n+6)": {
                      padding: "8px !important",
                      backgroundColor: "rgba(248, 255, 248, 0.7)",
                    },
                  },
                  "& .rdg-cell:focus-within": {
                    outline: "2px solid rgba(140, 194, 27, 0.4)",
                    outlineOffset: "-2px",
                    backgroundColor: "rgba(140, 194, 27, 0.05)",
                  },
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
          listId={currentList?.id}
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
