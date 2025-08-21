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
  FilterList,
  Clear,
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
  getAllLists,
} from "@/api/list";
import { DELIVERY_STATUS, INTERVAL_OPTIONS } from "@/utils/interfaces";
import { successStyles } from "@/utils/constants";

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
              title={`Field "${fieldName}" was changed by customer`}
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
                Changed
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
    <FieldHighlight hasChanges={hasChanges} fieldName={`Delivery ${period}`}>
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
      fieldName="Quantity"
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
      fieldName="Comment"
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
    return option ? option.label : "Monthly";
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
      fieldName="Interval"
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
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };

  const [yearPart, periodNum] = period.split("-");
  const monthName = monthMap[periodNum] || `Period ${periodNum}`;

  return `${monthName} ${yearPart} ${cargoNo ? `(${cargoNo})` : ""}`;
}

// Enhanced Breadcrumbs
function EnhancedBreadcrumbs() {
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
            borderRadius: 1,
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
        <Typography
          color="primary.main"
          fontWeight={600}
          sx={{ fontSize: "0.85rem", px: 1, py: 0.5 }}
        >
          All Items Management
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}

// Main Admin All Items Page Component
const AdminAllItemsPage = () => {
  const router = useRouter();

  // State management
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Filter states
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedList, setSelectedList] = useState<string>("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);

  // Count items with unacknowledged changes
  const itemsWithChanges = useMemo(() => {
    return allItems.filter(
      (item: any) =>
        item.changesNeedAcknowledgment ||
        item.hasChanges ||
        item.shouldHighlight
    );
  }, [allItems]);

  const deliveryPeriodsData = useMemo(() => {
    if (!allItems.length) return { sortedPeriods: [], cargoNumbers: [] };
    return extractDeliveryPeriods(allItems);
  }, [allItems]);

  // Load all items from all lists
  useEffect(() => {
    const loadAllItems = async () => {
      try {
        setLoading(true);
        const response = await getAllLists();

        if (response && response.length > 0) {
          // Extract all items from all lists and add company/list info
          const allCombinedItems: any[] = [];
          const uniqueCustomers: any[] = [];
          const allListsData: any[] = [];

          response.forEach((list: any) => {
            // Add list to lists array
            allListsData.push({
              id: list.id,
              name: list.name,
              customerId: list.customer?.id,
              customerName:
                list.customer?.companyName || list.customer?.legalName,
            });

            // Add customer to customers array if not exists
            if (
              list.customer &&
              !uniqueCustomers.find((c) => c.id === list.customer.id)
            ) {
              uniqueCustomers.push({
                id: list.customer.id,
                name: list.customer.companyName || list.customer.legalName,
                email: list.customer.email,
              });
            }

            // Process each item in the list
            if (list.items && list.items.length > 0) {
              list.items.forEach((item: any) => {
                allCombinedItems.push({
                  ...item,
                  // Add company/list information
                  companyName:
                    list.customer?.companyName ||
                    list.customer?.legalName ||
                    "Unknown Company",
                  listName: list.name || "Unknown List",
                  listId: list.id,
                  customerId: list.customer?.id,
                  // Add change tracking properties
                  changesNeedAcknowledgment:
                    item.changesNeedAcknowledgment || false,
                  hasChanges: item.hasChanges || false,
                  shouldHighlight: item.shouldHighlight || false,
                  changedFields: item.changedFields || [],
                });
              });
            }
          });

          setAllItems(allCombinedItems);
          setCustomers(uniqueCustomers);
          setLists(allListsData);
        }
      } catch (error) {
        console.error("Failed to load all items:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllItems();
  }, []);

  // Handle updating item
  const handleUpdateItem = async (itemId: string, updateData: any) => {
    try {
      await updateListItem(itemId, updateData);

      setAllItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updateData } : item
        )
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item");
    }
  };

  // Handle deleting selected items
  const handleDeleteSelectedItems = async () => {
    if (selectedRows.size === 0) return;

    try {
      setSaving(true);
      const deletePromises = Array.from(selectedRows).map((itemId) =>
        deleteListItem(itemId)
      );

      await Promise.all(deletePromises);

      setAllItems((prev) =>
        prev.filter((item: any) => !selectedRows.has(item.id))
      );

      setSelectedRows(new Set());
      toast.success(
        `${selectedRows.size} item(s) deleted successfully!`,
        successStyles
      );
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast.error("Failed to delete items");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDelivery = useCallback(
    async (itemId: string, period: string, deliveryData: any) => {
      try {
        setAllItems((prev) =>
          prev.map((item: any) => {
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
          })
        );
      } catch (error) {
        console.error("Failed to update delivery:", error);
      }
    },
    []
  );

  // Filter items based on search term, customer, and list
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item: any) =>
          item.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.articleNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.listName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by customer
    if (selectedCustomer) {
      filtered = filtered.filter(
        (item: any) => item.customerId === selectedCustomer
      );
    }

    // Filter by list
    if (selectedList) {
      filtered = filtered.filter((item: any) => item.listId === selectedList);
    }

    return filtered;
  }, [allItems, searchTerm, selectedCustomer, selectedList]);

  // Get available lists for selected customer
  const availableLists = useMemo(() => {
    if (!selectedCustomer) return lists;
    return lists.filter((list) => list.customerId === selectedCustomer);
  }, [lists, selectedCustomer]);

  // Define columns
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
        key: "companyName",
        name: "Company",
        width: 150,
        resizable: true,
        renderCell: (props: any) => (
          <Typography
            variant="body2"
            sx={{ fontSize: "14px", p: 1, fontWeight: 500 }}
          >
            {props.row.companyName}
          </Typography>
        ),
      },
      {
        key: "listName",
        name: "List",
        width: 120,
        resizable: true,
        renderCell: (props: any) => (
          <Typography
            variant="body2"
            sx={{ fontSize: "14px", p: 1, fontWeight: 500 }}
          >
            {props.row.listName}
          </Typography>
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
            <FieldHighlight hasChanges={hasChanges} fieldName="Item No.">
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
                    alt={props.row.articleName || "Product"}
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
            <FieldHighlight hasChanges={hasChanges} fieldName="Article Name">
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
      const cargoNo = allItems
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
    allItems,
  ]);

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
                  All Items Management
                </Typography>
              </Box>
            </Box>

            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>

          <EnhancedBreadcrumbs />
        </Box>
        {/* Changes Alert
        {itemsWithChanges.length > 0 && (
          <Alert
            severity="warning"
            sx={{
              mb : 2,
              borderRadius: 1,
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
                  🟠 Unconfirmed Changes
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#ef6c00", mb: 1.5, fontWeight: 500 }}
                >
                  {itemsWithChanges.length} items have been changed by customers
                  and require admin confirmation.
                </Typography>
              </Box>
            </Box>
          </Alert>
        )} */}
        {/* Filter Section */}
        <Card
          sx={{
            mb: 2,
            borderRadius: 1,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid",
            borderColor: alpha("#E2E8F0", 0.8),
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <FilterList sx={{ color: "primary.main", mr: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                Filters
              </Typography>
            </Box>

            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={4} sx={{ width: "200px" }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Customer</InputLabel>
                  <Select
                    value={selectedCustomer}
                    onChange={(e) => {
                      setSelectedCustomer(e.target.value);
                      setSelectedList("");
                    }}
                    label="Filter by Customer"
                  >
                    <MenuItem value="">
                      <em>All Customers</em>
                    </MenuItem>
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" sx={{ width: "200px" }}>
                  <InputLabel>Filter by List</InputLabel>
                  <Select
                    value={selectedList}
                    onChange={(e) => setSelectedList(e.target.value)}
                    label="Filter by List"
                    disabled={!selectedCustomer}
                  >
                    <MenuItem value="">
                      <em>All Lists</em>
                    </MenuItem>
                    {availableLists.map((list) => (
                      <MenuItem key={list.id} value={list.id}>
                        {list.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={() => {
                      setSelectedCustomer("");
                      setSelectedList("");
                      setSearchTerm("");
                    }}
                    size="small"
                  >
                    Clear Filters
                  </Button>
                  <Chip
                    label={`${filteredItems.length} items`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        {/* Main Content */}
        <Card
          sx={{
            mb: 4,
            maxWidth: "95vw",
            borderRadius: 1,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
            border: "1px solid",
            borderColor: alpha("#ADB5BD", 0.15),
          }}
        >
          <Box sx={{ p: 3 }}>
            {/* Action Bar */}
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <TextField
                  placeholder="Search items, companies, lists..."
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
                      borderRadius: 1,
                    },
                  }}
                />

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
              }}
            >
              {filteredItems.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
                  <Package
                    size={64}
                    style={{ color: "#ccc", marginBottom: 24 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No items found
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {searchTerm || selectedCustomer || selectedList
                      ? "Try adjusting your filters or search terms"
                      : "No items available"}
                  </Typography>
                </Box>
              ) : (
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
              )}
            </Paper>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default AdminAllItemsPage;
