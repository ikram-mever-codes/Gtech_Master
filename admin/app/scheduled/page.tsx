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
  debounce,
  Stepper,
  Step,
  StepLabel,
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
  Close,
  Done,
  DoneAll,
} from "@mui/icons-material";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
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
  Calendar,
} from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";

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
  fetchAllListsWithMISRefresh,
  refreshItemsFromMIS,
  acknowledgeItemChanges,
  createNewList,
  updateListItemComment,
  acknowledgeListItemChanges,
  acknowledgeItemFieldChanges,
  updateListContactPerson,
  updateListItemDeliveryInfo,
} from "@/api/list";
import { getAllCustomers } from "@/api/customers";
import {
  DELIVERY_STATUS,
  INTERVAL_OPTIONS,
  UserRole,
} from "@/utils/interfaces";
import { successStyles } from "@/utils/constants";
import { DataGrid } from "react-data-grid";
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";
import { getAllContactPersons } from "@/api/contacts";
import { log } from "console";
import { json } from "stream/consumers";

function AddItemDialog({
  open,
  onClose,
  onAddItem,
  customers,
  lists,
  onRefresh,
  selectedCustomerId,
  selectedListId,
  setSelectedCustomerId,
  setSelectedListId,
}: any) {
  const theme = useTheme();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<any>("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState<any>(false);
  const [quantity, setQuantity] = useState<number | string>("");
  const [interval, setInterval] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setSelectedItem(null);
      setItems([]);
      setSearchTerm("");
      setQuantity("");
      setInterval("");
    }
  }, [open, setSelectedCustomerId, setSelectedListId]);

  const availableLists = React.useMemo(() => {
    if (!selectedCustomerId) return [];
    return lists.filter((list: any) => list.customerId === selectedCustomerId);
  }, [lists, selectedCustomerId]);

  const selectedCustomer =
    customers.find((c: any) => c.id === selectedCustomerId) || null;

  const selectedList =
    availableLists.find((l: any) => l.id === selectedListId) || null;

  // Temporary fallback until API is fixed
  const fallbackSearch = async (query: string) => {
    // Return empty array or mock data
    return [];
  };

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setItems([]);
        return;
      }

      setSearchLoading(true);
      try {
        let response;
        try {
          response = await searchItems(query);
        } catch (apiError) {
          console.warn("API search failed, using fallback:", apiError);
          response = await fallbackSearch(query);
        }

        setItems(Array.isArray(response) ? response : []);
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

  const handleAddItem = async () => {
    if (!selectedItem || !selectedListId || !selectedCustomerId) {
      toast.error("Please complete all required fields");
      return;
    }

    try {
      setSaving(true);

      const itemData = {
        productId: selectedItem.id.toString(),
        quantity: quantity ? Number(quantity) : 1,
        interval: interval || "",
        notes: "",
        productName: selectedItem.name || "Unknown Item",
        sku: selectedItem.articleNumber || "",
        category: "",
        price: 0,
        supplier: "",
        itemId: selectedItem.id.toString(),
        listId: selectedListId,
        customerId: selectedCustomerId,
        imageUrl: selectedItem.imageUrl || "",
      };

      const response = await addItemToList(selectedListId, itemData);

      if (onAddItem) {
        // Call the onAddItem callback to update state optimistically
        onAddItem(response);
      }

      onClose();
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  console.log(JSON.stringify(customers));

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
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Customer Selection */}
          <FormControl fullWidth>
            <InputLabel>Select Customer</InputLabel>
            <Select
              value={selectedCustomerId || ""}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedListId(null);
              }}
              label="Select Customer"
            >
              {customers.map((customer: any) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.companyName || customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* List Selection */}
          <FormControl fullWidth disabled={!selectedCustomerId}>
            <InputLabel>Select List</InputLabel>
            <Select
              value={selectedListId || ""}
              onChange={(e) => {
                setSelectedListId(e.target.value);
              }}
              label="Select List"
            >
              {availableLists.map((list: any) => (
                <MenuItem key={list.id} value={list.id}>
                  {list.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {availableLists.length === 0 && selectedCustomerId && (
            <Alert severity="warning">
              No lists found for the selected customer.
            </Alert>
          )}

          {/* Item Search */}
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
            disabled={!selectedListId}
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
                    width: 50,
                    height: 50,
                    borderRadius: 1,
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
                    <ImageIcon size={20} />
                  )}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {option.name}
                  </Typography>
                  {option.articleNumber && (
                    <Typography variant="caption" color="text.secondary">
                      {option.articleNumber}
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
                label="Search Items"
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

          <div className="w-full h-max flex justify-between items-center gap-4">
            {/* Quantity Input */}
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              variant="outlined"
              placeholder="Enter quantity"
              InputProps={{
                inputProps: { min: 0 },
              }}
            />

            {/* Interval Selection */}
            <FormControl fullWidth>
              <InputLabel>Interval</InputLabel>
              <Select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                label="Interval"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Selected Item Preview */}
          {selectedItem && selectedList && (
            <Card
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
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
                    <ImageIcon size={32} />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedItem.name}
                  </Typography>
                  {selectedItem.articleNumber && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedItem.articleNumber}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="success.main"
                    fontWeight={500}
                  >
                    Ready to add to: {selectedList.name}
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}

          {!searchTerm && selectedListId && (
            <Box
              sx={{
                textAlign: "center",
                py: 3,
                px: 2,
                borderRadius: 2,
                border: "2px dashed #e0e0e0",
                bgcolor: "#fafafa",
              }}
            >
              <Search sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
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
          onClick={handleAddItem}
          disabled={!selectedItem || !selectedListId || !selectedCustomerId}
          loading={saving}
        >
          Add Item
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}

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
        width: "100%",
        backgroundColor: hasChanges
          ? alpha("#ff1744", 0.15) // Red background for unacknowledged changes
          : "transparent",
        border: hasChanges
          ? `2px solid ${alpha("#ff1744", 0.5)}`
          : "2px solid transparent",
        transition: "all 0.3s ease",
        animation: hasChanges ? "pulseRed 2s infinite" : "none",
        "@keyframes pulseRed": {
          "0%": {
            backgroundColor: alpha("#ff1744", 0.15),
            borderColor: alpha("#ff1744", 0.5),
          },
          "50%": {
            backgroundColor: alpha("#ff1744", 0.25),
            borderColor: "#ff1744",
          },
          "100%": {
            backgroundColor: alpha("#ff1744", 0.15),
            borderColor: alpha("#ff1744", 0.5),
          },
        },
        "&:hover": {
          backgroundColor: hasChanges
            ? alpha("#ff1744", 0.25)
            : alpha(theme.palette.primary.main, 0.04),
          borderColor: hasChanges
            ? "#ff1744"
            : alpha(theme.palette.primary.main, 0.2),
          transform: hasChanges ? "scale(1.02)" : "none",
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
              top: -8,
              right: -8,
              fontSize: 18,
              color: "#ff1744",
              backgroundColor: "white",
              borderRadius: "50%",
              zIndex: 2,
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%": {
                  transform: "scale(1)",
                  opacity: 1,
                },
                "50%": {
                  transform: "scale(1.1)",
                  opacity: 0.8,
                },
                "100%": {
                  transform: "scale(1)",
                  opacity: 1,
                },
              },
            }}
          />
          {fieldName && (
            <Tooltip
              title={`Field "${fieldName}" has unacknowledged customer changes`}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -14,
                  left: 8,
                  backgroundColor: "#ff1744",
                  color: "white",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  boxShadow: "0 2px 8px rgba(255,23,68,0.3)",
                  zIndex: 3,
                }}
              >
                Unacknowledged
              </Box>
            </Tooltip>
          )}
        </>
      )}
    </Box>
  );
};

// Item Activity Logs Dialog Component
function ItemActivityLogsDialog({
  open,
  onClose,
  item,
  activityLogs,
  onSwitchToMainActivityTab,
}: {
  open: boolean;
  onClose: () => void;
  item: any;
  activityLogs: any[];
  onSwitchToMainActivityTab: () => void;
}) {
  const theme = useTheme();

  const itemLogs = useMemo(() => {
    // Filter logs for the specific item and sort by timestamp (newest first)
    return activityLogs
      .filter((log) => log.itemId === item?.id)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [activityLogs, item]);

  const formatLogDescription = (log: any) => {
    // Use the pre-formatted message from the ActivityLog interface
    return log.message;
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
            <History sx={{ color: "primary.main" }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Activity Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item?.articleName || "Item"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {itemLogs.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <History sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No activity logs found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This item has no recorded activities yet.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {itemLogs.map((log, index) => (
                <Card
                  key={index}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: alpha("#E2E8F0", 0.8),
                    "&:hover": {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "14px" }}>
                    {formatLogDescription(log)}
                  </Typography>
                  {!log.acknowledged && log.userRole === "customer" && (
                    <Typography
                      variant="caption"
                      color="warning.main"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Pending acknowledgment
                    </Typography>
                  )}
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <CustomButton
          gradient={true}
          onClick={onSwitchToMainActivityTab}
          startIcon={<History />}
        >
          View All Activity Logs
        </CustomButton>
        <CustomButton variant="contained" onClick={onClose}>
          Close
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
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

// Activity Log Card Component
function ActivityLogCard({ log, customerName, listName }: any) {
  const theme = useTheme();

  const getActionIcon = () => {
    // Since the schema uses a pre-formatted message, we use a generic icon
    // Adjust based on userRole for visual distinction
    return log.userRole === "admin" ? (
      <CheckCircle sx={{ color: "primary.main", fontSize: 18 }} />
    ) : (
      <History sx={{ color: "text.secondary", fontSize: 18 }} />
    );
  };

  const getActionColor = () => {
    return log.userRole === "admin" ? "primary" : "secondary";
  };

  const getAcknowledgmentStatus = () => {
    if (log.userRole === "admin") {
      return { color: "success", label: "Acknowledged", icon: <CheckCircle /> };
    }
    return log.acknowledged
      ? { color: "success", label: "Acknowledged", icon: <CheckCircle /> }
      : { color: "warning", label: "Pending", icon: <HourglassEmpty /> };
  };

  const acknowledgmentStatus = getAcknowledgmentStatus();

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha("#E2E8F0", 0.8),
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: alpha(
                theme.palette[getActionColor()]?.main ||
                theme.palette.grey[500],
                0.1
              ),
              flexShrink: 0,
            }}
          >
            {getActionIcon()}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography
                variant="body1"
                fontWeight={600}
                sx={{ fontSize: "0.95rem" }}
              >
                {log.message}
              </Typography>
              <Chip
                size="small"
                color={acknowledgmentStatus.color as any}
                variant="outlined"
                icon={React.cloneElement(acknowledgmentStatus.icon, {
                  fontSize: "small",
                })}
                label={acknowledgmentStatus.label}
                sx={{ ml: "auto", fontSize: "0.7rem" }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Business sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {customerName}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Assignment sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {listName}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {new Date(log.timestamp).toLocaleString()}
                </Typography>
              </Box>

              <Chip
                size="small"
                variant="filled"
                color={log.userRole === "admin" ? "primary" : "secondary"}
                label={log.userRole === "admin" ? "Admin" : "Customer"}
                sx={{
                  fontSize: "0.65rem",
                  height: 20,
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
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

// Fixed DeliveryCell component with proper props
function DeliveryCell({
  row,
  cargoNo,
  onUpdateDelivery,
  onAcknowledgeField,
}: any) {
  // Find the delivery for this specific cargo number
  const getDeliveryForCargo = () => {
    if (!row.deliveries) return null;

    for (const [period, delivery] of Object.entries(row.deliveries)) {
      const deliveryInfo = delivery as any;
      if (
        deliveryInfo?.cargoNo &&
        String(deliveryInfo.cargoNo).trim() === cargoNo
      ) {
        return { period, delivery: deliveryInfo };
      }
    }
    return null;
  };

  const deliveryData = getDeliveryForCargo();
  if (!deliveryData) {
    return <Box sx={{ textAlign: "center", p: 1 }}>-</Box>;
  }

  const { period, delivery } = deliveryData;
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(
    delivery?.status || DELIVERY_STATUS.PENDING
  );

  const hasUnacknowledgedChanges =
    row.unacknowledgedFields?.includes(`delivery_${period}`) ||
    row.pendingChanges?.some(
      (c: any) =>
        c.field === `delivery_${period}` && c.changeStatus === "pending"
    );

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

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAcknowledgeField) {
      await onAcknowledgeField(row.listId, row.id, [`delivery_${period}`]);
    }
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
                    {DELIVERY_STATUS_CONFIG[statusOption]?.label ||
                      statusOption}
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

  return (
    <FieldHighlight
      hasChanges={hasUnacknowledgedChanges}
      fieldName={`Delivery ${period}`}
    >
      <Tooltip
        title={
          <Box sx={{ color: "white" }}>
            <Typography color="white" variant="caption" display="block">
              Zeitraum: {period}
            </Typography>
            <Typography color="white" variant="caption" display="block">
              Menge: {delivery?.quantity || 0}
            </Typography>
            {delivery?.deliveredAt && (
              <Typography color="white" variant="caption" display="block">
                Geliefert am:{" "}
                {new Date(delivery.deliveredAt).toLocaleDateString()}
              </Typography>
            )}
            {delivery?.cargoNo && (
              <Typography color="white" variant="caption" display="block">
                Fracht: {delivery.cargoNo}
              </Typography>
            )}
            {hasUnacknowledgedChanges && (
              <Typography
                color="white"
                variant="caption"
                display="block"
                sx={{ mt: 1 }}
              >
                ⚠️ Nicht bestätigte Änderungen
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
            position: "relative",
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
              sx={{
                color: hasUnacknowledgedChanges ? "#d32f2f" : "inherit",
              }}
            >
              {Number(delivery?.quantity || 0).toFixed(0) || 0}
            </Typography>
          </Box>
          {hasUnacknowledgedChanges && (
            <IconButton
              size="small"
              onClick={handleAcknowledge}
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                backgroundColor: "#ff1744",
                color: "white",
                width: 16,
                height: 16,
                "&:hover": {
                  backgroundColor: "#d32f2f",
                },
              }}
            >
              <Done sx={{ fontSize: 12 }} />
            </IconButton>
          )}
        </Box>
      </Tooltip>
    </FieldHighlight>
  );
}

function EditableQuantityCell({ row, onUpdateItem, onAcknowledgeField }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.quantity || 0);
  const [saving, setSaving] = useState(false);

  // Check if this specific field has unacknowledged changes
  const hasUnacknowledgedChanges =
    row.unacknowledgedFields?.includes("quantity") ||
    row.pendingChanges?.some(
      (c: any) => c.field === "quantity" && c.changeStatus === "pending"
    );

  const handleSave = async () => {
    if (value === row.quantity) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await updateListItem(row.id, { quantity: Number(value) });

      // Update state optimistically
      if (onUpdateItem) {
        onUpdateItem(row.id, { quantity: Number(value) });
      }

      setIsEditing(false);
      toast.success("Quantity updated", successStyles);
    } catch (error) {
      console.error("Failed to update quantity:", error);
      setValue(row.quantity);
      toast.error("Failed to update quantity");
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

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAcknowledgeField) {
      await onAcknowledgeField(row.listId, row.id, ["quantity"]);
    }
  };

  if (isEditing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
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
      hasChanges={hasUnacknowledgedChanges}
      fieldName="Quantity"
      onClick={() => setIsEditing(true)}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "0px",
          cursor: "pointer",
          borderRadius: 1,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          },
          transition: "background-color 0.2s",
          p: 1,
          position: "relative",
        }}
      >
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            fontSize: "16px",
            width: "100%",

            textAlign: "center",
            color: hasUnacknowledgedChanges ? "#d32f2f" : "#64748B",
          }}
        >
          {row.quantity || 0}
        </Typography>
        {hasUnacknowledgedChanges && (
          <IconButton
            size="small"
            onClick={handleAcknowledge}
            sx={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "#ff1744",
              color: "white",
              width: 20,
              height: 20,
              "&:hover": {
                backgroundColor: "#d32f2f",
              },
            }}
          >
            <Done sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </FieldHighlight>
  );
}

// Enhanced Editable Comment Cell with dedicated comment update endpoint
function EditableCommentCell({ row, onUpdateItem, onAcknowledgeField }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.comment || "");
  const [saving, setSaving] = useState(false);

  const hasUnacknowledgedChanges =
    row.unacknowledgedFields?.includes("comment") ||
    row.pendingChanges?.some(
      (c: any) => c.field === "comment" && c.changeStatus === "pending"
    );

  const handleSave = async () => {
    if (value === row.comment) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await updateListItemComment(row.id, { comment: value });

      // Update state optimistically
      if (onUpdateItem) {
        onUpdateItem(row.id, { comment: value });
      }

      setIsEditing(false);
      toast.success("Comment updated", successStyles);
    } catch (error) {
      console.error("Failed to update comment:", error);
      setValue(row.comment);
      toast.error("Failed to update comment");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(row.comment);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAcknowledgeField) {
      await onAcknowledgeField(row.listId, row.id, ["comment"]);
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
      hasChanges={hasUnacknowledgedChanges}
      fieldName="Comment"
      onClick={() => setIsEditing(true)}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          cursor: "pointer",
          borderRadius: 1,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          },
          transition: "background-color 0.2s",
          p: 1,
          position: "relative",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: "14px",
            color: hasUnacknowledgedChanges
              ? "#d32f2f"
              : row.comment
                ? "text.primary"
                : "text.secondary",
            fontStyle: row.comment ? "normal" : "italic",
            flex: 1,
          }}
        >
          {row.comment || "Click to add comment..."}
        </Typography>
        {hasUnacknowledgedChanges && (
          <IconButton
            size="small"
            onClick={handleAcknowledge}
            sx={{
              backgroundColor: "#ff1744",
              color: "white",
              width: 20,
              height: 20,
              "&:hover": {
                backgroundColor: "#d32f2f",
              },
            }}
          >
            <Done sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </FieldHighlight>
  );
}

// Enhanced Editable Interval Cell with change highlighting
function EditableIntervalCell({ row, onUpdateItem, onAcknowledgeField }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.interval || "monthly");
  const [saving, setSaving] = useState(false);

  const hasUnacknowledgedChanges =
    row.unacknowledgedFields?.includes("interval") ||
    row.pendingChanges?.some(
      (c: any) => c.field === "interval" && c.changeStatus === "pending"
    );

  const handleSave = async (newValue: string) => {
    if (newValue === row.interval) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await updateListItem(row.id, { interval: newValue });

      // Update state optimistically
      if (onUpdateItem) {
        onUpdateItem(row.id, { interval: newValue });
      }

      setIsEditing(false);
      toast.success("Interval updated", successStyles);
    } catch (error) {
      console.error("Failed to update interval:", error);
      setValue(row.interval);
      toast.error("Failed to update interval");
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAcknowledgeField) {
      await onAcknowledgeField(row.listId, row.id, ["interval"]);
    }
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
      hasChanges={hasUnacknowledgedChanges}
      fieldName="Interval"
      onClick={() => setIsEditing(true)}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          cursor: "pointer",
          borderRadius: 1,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          },
          transition: "background-color 0.2s",
          p: 1,
          position: "relative",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: "14px",
            color: hasUnacknowledgedChanges ? "#d32f2f" : "inherit",
            flex: 1,
            height: "15px",
          }}
        >
          {getCurrentLabel()}
        </Typography>
        {hasUnacknowledgedChanges && (
          <IconButton
            size="small"
            onClick={handleAcknowledge}
            sx={{
              backgroundColor: "#ff1744",
              color: "white",
              width: 20,
              height: 20,
              "&:hover": {
                backgroundColor: "#d32f2f",
              },
            }}
          >
            <Done sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </FieldHighlight>
  );
}

function CreateListDialog({
  open,
  onClose,
  customers,
  onRefresh,
  selectedCustomerId,
  setSelectedCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  customers: any[];
  onRefresh?: () => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: any;
}) {
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCustomer =
    customers.find((c: any) => c.id === selectedCustomerId) || null;

  useEffect(() => {
    if (open) {
      console.log("CreateListDialog open. Customers:", customers);
    }
    if (!open) {
      setSelectedCustomerId("");
      setListName("");
      setDescription("");
      setDeliveryDate("");
    }
  }, [open, customers]);

  const handleCreateList = async () => {
    if (!selectedCustomerId || !listName.trim()) {
      toast.error("Please select a customer and enter a list name");
      return;
    }

    try {
      setSaving(true);

      const listData = {
        name: listName.trim(),
        description: description.trim() || undefined,
        deliveryDate: deliveryDate || undefined,
        customerId: selectedCustomerId,
      };

      await createNewList(listData);

      if (onRefresh) {
        await onRefresh();
      }

      onClose();
    } catch (error) {
      console.error("Failed to create list:", error);
    } finally {
      setSaving(false);
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
            <Assignment sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontWeight={600}>
              Create New List
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Customer Selection */}
          <FormControl fullWidth>
            <InputLabel>Select Customer *</InputLabel>
            <Select
              value={selectedCustomerId || ""}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
              }}
              label="Select Customer *"
              required
            >
              {customers.map((customer: any) => (
                <MenuItem key={customer.id} value={customer.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Business fontSize="small" />
                    <Typography>{customer.companyName || customer.name}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* List Name */}
          <TextField
            label="List Name *"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Enter list name (e.g., Q1 2024 Orders, Monthly Supplies)"
            fullWidth
            required
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Assignment sx={{ color: "primary.main" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for the list..."
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FileText
                    size={20}
                    style={{ color: theme.palette.primary.main }}
                  />
                </InputAdornment>
              ),
            }}
          />

          {/* Selected Customer Preview */}
          {selectedCustomer && (
            <Card
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Business sx={{ color: "primary.main" }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedCustomer.companyName || selectedCustomer.name}
                  </Typography>
                  {selectedCustomer.email && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedCustomer.email}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="success.main"
                    fontWeight={500}
                  >
                    Selected Customer
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <CustomButton variant="outlined" onClick={onClose}>
          Cancel
        </CustomButton>
        <CustomButton
          variant="contained"
          onClick={handleCreateList}
          disabled={!selectedCustomerId || !listName.trim()}
          loading={saving}
          startIcon={<Add />}
        >
          Create List
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}

// Main Admin All Items Page Component
const AdminAllItemsPage = () => {
  const router = useRouter();

  // State management
  const [createListDialog, setCreateListDialog] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allActivityLogs, setAllActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactPersons, setContactPersons] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const { user } = useSelector((state: RootState) => state.user);
  // Activity logs dialog state
  const [activityLogsDialog, setActivityLogsDialog] = useState(false);
  const [selectedItemForLogs, setSelectedItemForLogs] = useState<any>(null);

  // Filter states
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedList, setSelectedList] = useState<string>("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);

  // Count items with unacknowledged changes
  const itemsWithChanges = useMemo(() => {
    return allItems.filter(
      (item: any) =>
        item.hasUnacknowledgedChanges || item.unacknowledgedFields?.length > 0
    );
  }, [allItems]);

  const deliveryColumnsData = useMemo(() => {
    if (!allItems.length) return { sortedCargos: [], cargoDataMap: new Map() };
    return extractUniqueCargos(allItems);
  }, [allItems]);

  // Filter activity logs based o n current filters
  const filteredActivityLogs = useMemo(() => {
    let filtered = allActivityLogs;
    // Filter by customer
    if (selectedCustomer) {
      filtered = filtered.filter(
        (log: any) => log.customerId === selectedCustomer
      );
    }

    // Filter by list
    if (selectedList) {
      filtered = filtered.filter((log: any) => log.listId === selectedList);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (log: any) =>
          log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.listName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          JSON.stringify(log.changes)
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Sort by most recent first
    return filtered.sort(
      (a: any, b: any) =>
        new Date(b.timestamp || b.performedAt).getTime() -
        new Date(a.timestamp || a.performedAt).getTime()
    );
  }, [allActivityLogs, selectedCustomer, selectedList, searchTerm]);

  const updateListContact = async (listId: string, contactId: string) => {
    const response = await updateListContactPerson(listId, contactId);
    if (response && response.success) {
      await loadAllItems();
    }
  };

  const loadAllItems = async () => {
    try {
      setLoading(true);
      const response = await getAllLists();

      if (response && response.length > 0) {
        const allCombinedItems: any[] = [];
        const allCombinedActivityLogs: any[] = [];
        const uniqueCustomers: any[] = [];
        const allListsData: any[] = [];

        response.forEach((list: any) => {
          allListsData.push({
            id: list.id,
            name: list.name,
            customerId: list.customer?.id,
            customerName:
              list.customer?.companyName || list.customer?.legalName,
            unacknowledgedChangesCount: list.unacknowledgedChangesCount || 0,
            pendingChanges: list.pendingChanges || [],
            contactPerson: list.contactPerson || null, // Add contact person data
          });

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

          // Process activity logs for this list
          if (list.activityLogs && list.activityLogs.length > 0) {
            list.activityLogs.forEach((log: any) => {
              allCombinedActivityLogs.push({
                ...log,
                customerId: list.customer?.id,
                listId: list.id,
                customerName:
                  list.customer?.companyName ||
                  list.customer?.legalName ||
                  "Unknown Company",
                listName: list.name || "Unknown List",
              });
            });
          }

          if (list.items && list.items.length > 0) {
            list.items.forEach((item: any) => {
              const itemUnacknowledgedFields = item.unacknowledgedFields || [];
              const hasUnacknowledgedChanges =
                item.hasUnacknowledgedChanges || false;
              const itemPendingChanges = item.pendingChanges || [];

              allCombinedItems.push({
                ...item,
                companyName:
                  list.customer?.companyName ||
                  list.customer?.legalName ||
                  "Unknown Company",
                listName: list.name || "Unknown List",
                listId: list.id,
                customerId: list.customer?.id,
                unacknowledgedFields: itemUnacknowledgedFields,
                hasUnacknowledgedChanges: hasUnacknowledgedChanges,
                pendingChanges: itemPendingChanges,
                changedFields: itemUnacknowledgedFields,
                contactPerson: list.contactPerson || null,
              });
            });
          }
        });

        // Fetch all customers to ensure we have a complete list for the dropdown
        try {
          const allCustomersResponse = await getAllCustomers();
          if (allCustomersResponse && allCustomersResponse.data) {
            const allCustomers = allCustomersResponse.data;

            // Merge customers from lists with all customers to ensure we have everyone
            allCustomers.forEach((customer: any) => {
              if (!uniqueCustomers.find((c) => c.id === customer.id)) {
                uniqueCustomers.push({
                  id: customer.id,
                  name: customer.companyName || customer.legalName,
                  companyName: customer.companyName || customer.legalName,
                  email: customer.email,
                });
              }
            });
          }
        } catch (err) {
          console.error("Failed to fetch all customers:", err);
        }

        setAllItems(allCombinedItems);
        setAllActivityLogs(allCombinedActivityLogs);
        setCustomers(uniqueCustomers);
        setLists(allListsData);
      } else {
        // If no lists found, still try to fetch customers
        try {
          const allCustomersResponse = await getAllCustomers();
          if (allCustomersResponse && allCustomersResponse.data) {
            const formattedCustomers = allCustomersResponse.data.map((customer: any) => ({
              id: customer.id,
              name: customer.companyName || customer.legalName,
              companyName: customer.companyName || customer.legalName,
              email: customer.email,
            }));
            setCustomers(formattedCustomers);
          }
        } catch (err) {
          console.error("Failed to fetch all customers:", err);
        }
      }
    } catch (error) {
      console.error("Failed to load all items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };
  const handleRefetchItemData = async () => {
    const data = await fetchAllListsWithMISRefresh(true);
    if (data) {
      await loadAllItems();
    }
  };

  const fetchContactPersons = async () => {
    const data = await getAllContactPersons();
    if (data?.success) {
      setContactPersons(data.data.contactPersons);
    }
  };
  // Load all items from all lists
  useEffect(() => {
    loadAllItems();
    fetchContactPersons();
  }, []);

  console.log(allItems);
  // Enhanced handleUpdateItem with optimistic state updates
  const handleUpdateItem = useCallback((itemId: string, updateData: any) => {
    // Optimistically update the state
    setAllItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, ...updateData } : item
      )
    );
  }, []);

  // Handle adding item - optimistic update
  const handleAddItemOptimistic = useCallback(
    (newItem: any) => {
      // Add the new item to the state with current timestamp
      const itemWithMetadata = {
        ...newItem,
        id: newItem.id || `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        companyName:
          customers.find((c) => c.id === newItem.customerId)?.name ||
          "Unknown Company",
        listName:
          lists.find((l) => l.id === newItem.listId)?.name || "Unknown List",
      };

      setAllItems((prev) => [itemWithMetadata, ...prev]);
    },
    [customers, lists]
  );

  // Handle deleting selected items
  const handleDeleteSelectedItems = async () => {
    if (selectedRows.size === 0) return;

    try {
      setSaving(true);

      // Optimistically remove items from state
      setAllItems((prev) =>
        prev.filter((item: any) => !selectedRows.has(item.id))
      );

      // Clear selection
      setSelectedRows(new Set());

      // Make API calls in the background
      const deletePromises = Array.from(selectedRows).map((itemId) =>
        deleteListItem(itemId)
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedRows.size} item(s) deleted successfully!`,
        successStyles
      );
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast.error("Failed to delete items");
      // Reload data on error to restore correct state
      await loadAllItems();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDelivery = useCallback(
    async (itemId: string, period: string, deliveryData: any) => {
      try {
        // Optimistically update the state
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

        // Make API call in background
        await updateListItemDeliveryInfo(itemId, { ...deliveryData, period });
      } catch (error) {
        console.error("Failed to update delivery:", error);
        toast.error("Failed to update delivery");
      }
    },
    []
  );

  // Handle acknowledge field changes
  const handleAcknowledgeField = async (
    listId: string,
    itemId: string,
    fields: string[]
  ) => {
    try {
      await acknowledgeItemFieldChanges(listId, itemId, fields);

      // Optimistically update the state
      setAllItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const updatedUnacknowledgedFields =
              item.unacknowledgedFields?.filter(
                (f: string) => !fields.includes(f)
              ) || [];

            return {
              ...item,
              unacknowledgedFields: updatedUnacknowledgedFields,
              hasUnacknowledgedChanges: updatedUnacknowledgedFields.length > 0,
              pendingChanges: item.pendingChanges?.map((change: any) =>
                fields.includes(change.field)
                  ? { ...change, changeStatus: "acknowledged" }
                  : change
              ),
            };
          }
          return item;
        })
      );

      toast.success(
        `Field${fields.length > 1 ? "s" : ""} acknowledged`,
        successStyles
      );
    } catch (error) {
      console.error("Failed to acknowledge field:", error);
      toast.error("Failed to acknowledge field");
      // Reload data on error
      await loadAllItems();
    }
  };

  // Handle opening activity logs for specific item
  const handleOpenItemActivityLogs = (item: any) => {
    setSelectedItemForLogs(item);
    setActivityLogsDialog(true);
  };

  // Handle switching to main activity tab from item dialog
  const handleSwitchToMainActivityTab = () => {
    setActivityLogsDialog(false);
    setCurrentTab(1); // Switch to activity logs tab
  };

  // Filter items based on search term, customer, and list
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Always sort by createdAt first (newest first) before applying filters
    filtered = [...filtered].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Filter by search term
    if (searchTerm && currentTab === 0) {
      filtered = filtered.filter(
        (item: any) =>
          item?.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Filter by changes only
    if (showOnlyChanges) {
      filtered = filtered.filter(
        (item: any) =>
          item.hasUnacknowledgedChanges || item.unacknowledgedFields?.length > 0
      );
    }

    return filtered;
  }, [
    allItems,
    searchTerm,
    selectedCustomer,
    selectedList,
    showOnlyChanges,
    currentTab,
  ]);

  // Get available lists for selected customer
  const availableLists = useMemo(() => {
    if (!selectedCustomer) return lists;
    return lists.filter((list) => list.customerId === selectedCustomer);
  }, [lists, selectedCustomer]);
  // Enhanced function to extract unique cargo numbers with proper ETA sorting
  function extractUniqueCargos(items: any[]): {
    sortedCargos: string[];
    cargoDataMap: Map<
      string,
      {
        period: string;
        eta?: number;
        cargoStatus?: string;
        cargoType?: string;
        parsedEta: number;
      }
    >;
  } {
    const cargoMap = new Map<
      string,
      {
        period: string;
        eta?: number;
        cargoStatus?: string;
        cargoType?: string;
        parsedEta: number;
      }
    >();

    // Utility function to parse ETA dates for proper sorting
    function parseEtaForSorting(etaDate: any): number {
      if (!etaDate) return Number.MAX_SAFE_INTEGER; // Put items without ETA at the end

      try {
        // Handle different date formats
        if (typeof etaDate === "string") {
          // Try parsing as ISO string first
          const isoDate = new Date(etaDate);
          if (!isNaN(isoDate.getTime())) {
            return isoDate.getTime();
          }

          // Try parsing German date format (DD.MM.YYYY)
          const germanFormatMatch = etaDate.match(
            /(\d{1,2})\.(\d{1,2})\.(\d{4})/
          );
          if (germanFormatMatch) {
            const [, day, month, year] = germanFormatMatch;
            const date = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day)
            );
            return date.getTime();
          }

          // Try parsing other common formats
          const date = new Date(etaDate);
          if (!isNaN(date.getTime())) {
            return date.getTime();
          }
        } else if (typeof etaDate === "number") {
          // Assume it's already a timestamp
          return etaDate;
        }

        // If all parsing fails, put at the end
        return Number.MAX_SAFE_INTEGER;
      } catch (error) {
        console.warn("Failed to parse ETA date:", etaDate, error);
        return Number.MAX_SAFE_INTEGER;
      }
    }

    items.forEach((item) => {
      if (item.deliveries) {
        Object.entries(item.deliveries).forEach(
          ([period, deliveryDetails]: [string, any]) => {
            if (deliveryDetails?.cargoNo) {
              const cargoNo = String(deliveryDetails.cargoNo).trim();

              // Skip invalid cargo numbers
              if (
                !cargoNo ||
                cargoNo === "null" ||
                cargoNo === "undefined" ||
                cargoNo === ""
              ) {
                return;
              }

              const parsedEta = parseEtaForSorting(deliveryDetails.eta);

              // If cargo doesn't exist or current ETA is earlier, update it
              if (!cargoMap.has(cargoNo)) {
                cargoMap.set(cargoNo, {
                  period: period,
                  eta: deliveryDetails.eta,
                  cargoStatus: deliveryDetails.cargoStatus,
                  cargoType: deliveryDetails.cargoType,
                  parsedEta: parsedEta,
                });
              } else {
                // Update if this instance has an earlier ETA
                const existing = cargoMap.get(cargoNo)!;
                if (parsedEta < existing.parsedEta) {
                  cargoMap.set(cargoNo, {
                    period: period,
                    eta: deliveryDetails.eta,
                    cargoStatus: deliveryDetails.cargoStatus,
                    cargoType: deliveryDetails.cargoType,
                    parsedEta: parsedEta,
                  });
                }
              }
            }
          }
        );
      }
    });

    // Sort cargo numbers by parsed ETA, then alphabetically
    const sortedCargos = Array.from(cargoMap.keys()).sort((a, b) => {
      const dataA = cargoMap.get(a)!;
      const dataB = cargoMap.get(b)!;

      // Sort by parsed ETA first
      const etaComparison = dataA.parsedEta - dataB.parsedEta;
      if (etaComparison !== 0) {
        return etaComparison;
      }

      // If same ETA, sort alphabetically by cargo number
      return a.localeCompare(b);
    });

    return {
      sortedCargos,
      cargoDataMap: cargoMap,
    };
  }

  // Utility function to format ETA dates for display
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

  // Enhanced function to format cargo column labels with proper ETA display
  function formatCargoColumnLabel(
    cargoNo: string,
    period: string,
    eta?: number,
    cargoStatus?: string,
    cargoType?: string
  ): string {
    let label = "";

    // Add cargo type if available
    if (cargoType) {
      label += cargoType;
    }

    // Add cargo number in parentheses
    if (cargoNo) {
      // Add space if cargo type exists
      if (cargoType) {
        label += ` `;
      }
      label += `(${cargoNo})`;
    }

    // If neither cargo type nor number exists, return a fallback
    if (!cargoType && !cargoNo) {
      label = "No Cargo";
    }

    return label;
  }

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
        key: "company_list",
        name: "Company / List",
        width: 200,
        resizable: true,
        renderCell: (props: any) => {
          // Safely access contact person data with fallbacks
          const contactPersonName =
            props.row.contactPerson?.name || "Select Contact";
          const contactPersonId = props.row.contactPerson?.id || "";
          const listId = props.row.listId;

          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                p: 0,
              }}
            >
              {/* Top level - Company Name (black) */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: "black",
                  fontSize: "0.8rem",
                  lineHeight: 1.2,
                  mb: 0,
                }}
              >
                {props.row.companyName}
              </Typography>

              {/* Bottom level - List Name (grey) */}
              <Typography
                variant="body2"
                sx={{
                  color: "#64748B",
                  fontSize: "14px",
                  lineHeight: 1.2,
                  mb: 0,
                }}
              >
                {props.row.listName}
              </Typography>

              {/* Contact Person Select */}
              <Select
                size="small"
                value={contactPersonId}
                onChange={async (e) => {
                  if (listId && e.target.value) {
                    await updateListContact(listId, e.target.value);
                  }
                }}
                displayEmpty
                sx={{
                  height: 28,
                  fontSize: "0.75rem",
                  "& .MuiSelect-select": {
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                  },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "0.75rem" }}>
                  <em>Select Contact</em>
                </MenuItem>
                {contactPersons.map((cp) => (
                  <MenuItem
                    key={cp.id}
                    sx={{ fontSize: "0.75rem" }}
                    value={cp.id}
                  >
                    {cp.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          );
        },
        renderHeaderCell: () => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "4px 8px",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 500,
                color: "black",
                fontSize: "0.8rem",
                lineHeight: 1.2,
              }}
            >
              Company
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                lineHeight: 1.2,
                mt: 0.5,
              }}
            >
              List
            </Typography>
          </Box>
        ),
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
      // MERGED COLUMN - Item No. DE + Article Name
      {
        key: "item_info",
        name: "Item",
        width: 300,
        resizable: true,
        renderCell: (props: any) => {
          const hasItemNoChanges =
            props.row.unacknowledgedFields?.includes("item_no_de");
          const hasArticleNameChanges =
            props.row.unacknowledgedFields?.includes("articleName");

          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                p: 1,
              }}
            >
              {/* Top level - Item No. DE (black) */}
              <FieldHighlight
                hasChanges={hasItemNoChanges}
                fieldName="Item No."
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "black",
                    fontSize: "0.8rem",
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                >
                  {props.row.item_no_de || "-"}
                </Typography>
              </FieldHighlight>

              {/* Bottom level - Article Name (grey) */}
              <FieldHighlight
                hasChanges={hasArticleNameChanges}
                fieldName="Article Name"
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748B",
                    fontSize: "14px",
                    lineHeight: 1.2,
                    fontStyle: props.row.articleName ? "normal" : "italic",
                  }}
                >
                  {props.row.articleName || "No article name"}
                </Typography>
              </FieldHighlight>
            </Box>
          );
        },
        renderHeaderCell: () => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "4px 8px",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: "black",
                fontSize: "0.8rem",
                lineHeight: 1.2,
              }}
            >
              ItemNo
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                lineHeight: 1.2,
                mt: 0.5,
              }}
            >
              ItemName
            </Typography>
          </Box>
        ),
      },
      {
        key: "interval_quantity",
        name: "Interval / Qty",
        width: 130,
        resizable: true,
        renderCell: (props: any) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              cursor: "pointer",
            }}
          >
            <EditableIntervalCell
              row={props.row}
              onUpdateItem={handleUpdateItem}
              onAcknowledgeField={handleAcknowledgeField}
              compact={true}
            />

            <EditableQuantityCell
              row={props.row}
              onUpdateItem={handleUpdateItem}
              onAcknowledgeField={handleAcknowledgeField}
              compact={true}
            />
          </Box>
        ),
        renderHeaderCell: () => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "4px 8px",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: "black",
                fontSize: "0.8rem",
                lineHeight: 1.2,
              }}
            >
              Interval
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                lineHeight: 1.2,
                mt: 0.5,
              }}
            >
              Qty
            </Typography>
          </Box>
        ),
      },
    ];

    // Generate delivery columns based on unique cargo numbers - now properly sorted by ETA
    const deliveryColumns = deliveryColumnsData.sortedCargos.map((cargoNo) => {
      const cargoData = deliveryColumnsData.cargoDataMap.get(cargoNo);
      console.log(cargoData);
      const statusDescriptions: Record<string, string> = {
        open: "Fracht geplant - Die Sendung befindet sich in der Planungsphase",
        packed:
          "Ware ist verpackt - Artikel wurden für den Versand vorbereitet und verpackt",
        shipped:
          "Fracht wurde versendet - Die Sendung hat das Ursprungszentrum verlassen",
        arrived:
          "In Deutschland angekommen - Die Sendung hat ihr Ziel in Deutschland erreicht",
      };

      const renderTooltipContent = () => (
        <Box sx={{ p: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
            {cargoData?.cargoStatus
              ? `${cargoData.cargoStatus.toUpperCase()}`
              : "No Status"}
          </Typography>
          <Typography variant="body2">
            {cargoData?.cargoStatus
              ? statusDescriptions[cargoData.cargoStatus.toLowerCase()]
              : "No status information available"}
          </Typography>
          {cargoData?.eta && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
              Estimated arrival: {formatEta(cargoData.eta)}
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
        key: `cargo_${cargoNo}`,
        name: formatCargoColumnLabel(
          cargoNo,
          cargoData?.period || "",
          cargoData?.eta,
          cargoData?.cargoStatus
        ),
        width: 250,
        resizable: false,
        renderCell: (props: any) => (
          <Tooltip {...tooltipProps}>
            <span className=" w-full">
              <DeliveryCell
                row={props.row}
                cargoNo={cargoNo}
                onUpdateDelivery={handleUpdateDelivery}
                onAcknowledgeField={handleAcknowledgeField}
              />
            </span>
          </Tooltip>
        ),
        renderHeaderCell: () => (
          <Tooltip {...tooltipProps}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "8px 4px",
                textWrap: "wrap",
                cursor: "help",
              }}
            >
              <div className="flex gap-0 text-sm flex-col items-center">
                <span>
                  {formatCargoColumnLabel(
                    cargoNo,
                    cargoData?.period || "",
                    cargoData?.eta,
                    cargoData?.cargoStatus,
                    cargoData?.cargoType
                  )}
                </span>
                {cargoData?.cargoStatus && (
                  <span className="w-max h-max p-1 px-3 text-xs bg-yellow-500 text-white rounded-full mt-1">
                    {cargoData.cargoStatus}
                  </span>
                )}
                {cargoData?.eta && (
                  <span className="text-xs text-gray-600 mt-1">
                    ETA:{" "}
                    <span className="font-medium">
                      {formatEta(cargoData.eta)}
                    </span>
                  </span>
                )}
              </div>
            </Box>
          </Tooltip>
        ),
      };
    });

    const endColumns = [
      {
        key: "comment",
        name: "Comment",
        width: 200,
        resizable: true,
        renderCell: (props: any) => (
          <EditableCommentCell
            row={props.row}
            onUpdateItem={handleUpdateItem}
            onAcknowledgeField={handleAcknowledgeField}
          />
        ),
      },
      {
        key: "activity_logs",
        name: "Activity Logs",
        width: 120,
        resizable: false,
        renderCell: (props: any) => (
          <CustomButton
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => handleOpenItemActivityLogs(props.row)}
            startIcon={<History />}
            sx={{
              minWidth: "auto",
              px: 2,
              py: 0.5,
              fontSize: "0.75rem",
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            Logs
          </CustomButton>
        ),
      },
      {
        key: "acknowledge",
        name: "Acknowledge",
        width: 140,
        resizable: false,
        renderCell: (props: any) => {
          const hasUnacknowledged =
            props.row.hasUnacknowledgedChanges ||
            props.row.unacknowledgedFields?.length > 0;

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {hasUnacknowledged && (
                <Badge
                  badgeContent={props.row.unacknowledgedFields?.length || 0}
                  color="error"
                >
                  <CustomButton
                    variant="contained"
                    color="warning"
                    size="small"
                    onClick={async () => {
                      try {
                        // Call API to acknowledge all changes for this item
                        const result = await acknowledgeItemChanges(
                          props.row.listId,
                          props.row.id
                        );

                        if (result?.success) {
                          toast.success(
                            `Acknowledged ${result.data?.acknowledgedCount || 0
                            } changes`,
                            successStyles
                          );

                          // Optimistically update the state
                          setAllItems((prev) =>
                            prev.map((item) =>
                              item.id === props.row.id
                                ? {
                                  ...item,
                                  hasUnacknowledgedChanges: false,
                                  unacknowledgedFields: [],
                                  changedFields: [],
                                }
                                : item
                            )
                          );
                        }
                      } catch (error) {
                        console.error("Failed to acknowledge changes:", error);
                        toast.error("Failed to acknowledge changes");
                      }
                    }}
                    startIcon={<DoneAll />}
                    sx={{
                      minWidth: "auto",
                      px: 2,
                      py: 0.5,
                      fontSize: "0.75rem",
                      textTransform: "none",
                      borderRadius: 2,
                      backgroundColor: "#ff9800",
                      "&:hover": {
                        backgroundColor: "#f57c00",
                      },
                    }}
                  >
                    Acknowledge All
                  </CustomButton>
                </Badge>
              )}
              {!hasUnacknowledged && (
                <Chip
                  label="Acknowledged"
                  size="small"
                  color="success"
                  icon={<CheckCircle fontSize="small" />}
                  sx={{ fontSize: "0.7rem" }}
                />
              )}
            </Box>
          );
        },
      },
    ];

    return [...baseColumns, ...deliveryColumns, ...endColumns];
  }, [
    deliveryColumnsData,
    selectedRows,
    handleUpdateDelivery,
    handleUpdateItem,
    handleAcknowledgeField,
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
      <Box sx={{ width: "100%", mx: "auto" }}>
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
            <PageHeader title="Scheduled Items" icon={Calendar} />

            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>
          <CardContent sx={{ paddingLeft: 4, paddingRight: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
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
                        {customer.companyName || customer.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <FormControl fullWidth size="small">
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

              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Show Items</InputLabel>
                  <Select
                    value={showOnlyChanges ? "changes" : "all"}
                    onChange={(e) =>
                      setShowOnlyChanges(e.target.value === "changes")
                    }
                    label="Show Items"
                  >
                    <MenuItem value="all">All Items</MenuItem>
                    <MenuItem value="changes">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Warning
                          fontSize="small"
                          sx={{ color: "warning.main" }}
                        />
                        Items with Changes
                        {itemsWithChanges.length > 0 && (
                          <Chip
                            label={itemsWithChanges.length}
                            size="small"
                            color="warning"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={() => {
                    setSelectedCustomer("");
                    setSelectedList("");
                    setSearchTerm("");
                    setShowOnlyChanges(false);
                  }}
                  size="small"
                  sx={{ height: "40px" }}
                >
                  Clear Filters
                </Button>
              </Grid>

              <Grid size={{ xs: 12, sm: 12, md: 2 }}>
                <Box
                  sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                >
                  <CustomButton
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateListDialog(true)}
                    fullWidth
                  >
                    Create List
                  </CustomButton>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Box>

        {/* Tabs Section */}
        <Card
          sx={{
            mb: 2,
            borderRadius: 1,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid",
            borderColor: alpha("#E2E8F0", 0.8),
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={currentTab}
              onChange={(_, newValue) => setCurrentTab(newValue)}
              sx={{
                px: 2,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  minHeight: 56,
                  "&.Mui-selected": {
                    color: "primary.main",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "primary.main",
                  height: 3,
                  borderRadius: "2px 2px 0 0",
                },
              }}
            >
              <Tab
                icon={<Inventory />}
                iconPosition="start"
                label={`Items Management (${filteredItems.length})`}
                sx={{ gap: 1 }}
              />
              <Tab
                icon={<History />}
                iconPosition="start"
                label={`Activity Logs (${filteredActivityLogs.length})`}
                sx={{ gap: 1 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panel 0: Items Management */}
          <TabPanel value={currentTab} index={0}>
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

                  {user?.role === UserRole.ADMIN && selectedRows.size > 0 && (
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
                  <CustomButton
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialog(true)}
                  >
                    Add Item
                  </CustomButton>
                </Box>

                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <CustomButton
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={async () => await handleRefetchItemData()}
                  >
                    Refetch Item Data
                  </CustomButton>
                  <CustomButton
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => loadAllItems()}
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
                      style={{
                        color: "#ccc",
                        marginBottom: 24,
                        margin: "0 auto",
                      }}
                    />

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
          </TabPanel>

          {/* Tab Panel 1: Activity Logs */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              {/* Activity Logs Action Bar */}
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <TextField
                    placeholder="Search activity logs..."
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

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <History sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Activity Timeline
                    </Typography>
                  </Box>
                </Box>

                <CustomButton
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => loadAllItems()}
                >
                  Refresh Logs
                </CustomButton>
              </Box>

              {/* Activity Logs Content */}
              <Box
                sx={{
                  height: "600px",
                  overflowY: "auto",
                  border: "1px solid #e8f0fe",
                  borderRadius: 2,
                  bgcolor: "#fafafa",
                  p: 2,
                  "& ::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "& ::-webkit-scrollbar-track": {
                    backgroundColor: "rgba(0,0,0,0.05)",
                    borderRadius: "4px",
                  },
                  "& ::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(140, 194, 27, 0.3)",
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: "rgba(140, 194, 27, 0.5)",
                    },
                  },
                }}
              >
                {filteredActivityLogs.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
                    <History style={{ color: "#ccc", marginBottom: 24 }} />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      No activity logs found
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {searchTerm || selectedCustomer || selectedList
                        ? "Try adjusting your filters or search terms"
                        : "No activity logs available"}
                    </Typography>
                  </Box>
                ) : (
                  filteredActivityLogs.map((log) => (
                    <ActivityLogCard
                      key={log.id}
                      log={log}
                      customerName={log.customerName}
                      listName={log.listName}
                    />
                  ))
                )}
              </Box>
            </Box>
          </TabPanel>
        </Card>
      </Box>

      {/* Dialogs */}
      <CreateListDialog
        setSelectedCustomerId={setSelectedCustomer}
        selectedCustomerId={selectedCustomer}
        open={createListDialog}
        onClose={() => setCreateListDialog(false)}
        customers={customers}
        onRefresh={loadAllItems}
      />

      <AddItemDialog
        selectedCustomerId={selectedCustomer}
        selectedListId={selectedList}
        setSelectedCustomerId={setSelectedCustomer}
        setSelectedListId={setSelectedList}
        open={addItemDialog}
        onClose={() => setAddItemDialog(false)}
        onAddItem={handleAddItemOptimistic}
        customers={customers}
        lists={lists}
        onRefresh={null}
      />

      <ItemActivityLogsDialog
        open={activityLogsDialog}
        onClose={() => setActivityLogsDialog(false)}
        item={selectedItemForLogs}
        activityLogs={allActivityLogs}
        onSwitchToMainActivityTab={handleSwitchToMainActivityTab}
      />
    </Box>
  );
};

export default AdminAllItemsPage;
