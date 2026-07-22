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
  RefreshCw,
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
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";
import { getAllContactPersons } from "@/api/contacts";
import { json } from "stream/consumers";
import { formatDate } from "@/utils/date";

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
  const fallbackSearch = async (query: string) => {
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
                {formatDate(delivery.deliveredAt)}
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

function ImageCellRenderer({ row }: { row: any }) {
  const [imageOpen, setImageOpen] = useState(false);

  if (!row.imageUrl) {
    return (
      <div className="flex items-center justify-center text-gray-300 w-12 h-12 bg-gray-50 rounded-lg border border-gray-100 mx-auto">
        <Image fontSize="small" />
      </div>
    );
  }

  return (
    <>
      <div
        className="flex items-center justify-center cursor-pointer w-12 h-12 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:scale-105 transition-all mx-auto"
        onClick={() => setImageOpen(true)}
      >
        <img
          src={`https://system.gtech.de/storage/${row.imageUrl}`}
          alt={row.articleName || "Product"}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

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
          <div className="flex justify-between items-center">
            <Typography variant="h6" fontWeight={600}>
              {row.articleName || "Product Image"}
            </Typography>
            <IconButton onClick={() => setImageOpen(false)} size="small">
              <X size={18} />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <img
            src={`https://system.gtech.de/storage/${row.imageUrl}`}
            alt={row.articleName || "Product"}
            className="w-full max-h-[70vh] object-contain block"
          />
        </DialogContent>
      </Dialog>
    </>
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

        try {
          const allCustomersResponse = await getAllCustomers({ limit: 1000 });
          if (allCustomersResponse && allCustomersResponse.data) {
            const allCustomers = Array.isArray(allCustomersResponse.data) ? allCustomersResponse.data : allCustomersResponse.data?.customers || [];

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
        try {
          const allCustomersResponse = await getAllCustomers({ limit: 1000 });
          if (allCustomersResponse && allCustomersResponse.data) {
            const allCustomersArr = Array.isArray(allCustomersResponse.data) ? allCustomersResponse.data : allCustomersResponse.data?.customers || [];
            const formattedCustomers = allCustomersArr.map((customer: any) => ({
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

        await updateListItemDeliveryInfo(itemId, { ...deliveryData, period });
      } catch (error) {
        console.error("Failed to update delivery:", error);
        toast.error("Failed to update delivery");
      }
    },
    []
  );

  const handleAcknowledgeField = async (
    listId: string,
    itemId: string,
    fields: string[]
  ) => {
    try {
      await acknowledgeItemFieldChanges(listId, itemId, fields);

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
      await loadAllItems();
    }
  };

  const handleAcknowledgeItem = async (row: any) => {
    try {
      setSaving(true);
      const result = await acknowledgeItemChanges(row.listId, row.id);
      if (result?.success) {
        toast.success(
          `Acknowledged ${result.data?.acknowledgedCount || 0} changes`,
          successStyles
        );

        // Optimistically update the state
        setAllItems((prev) =>
          prev.map((item) =>
            item.id === row.id
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
    } finally {
      setSaving(false);
    }
  };

  const handleOpenItemActivityLogs = (item: any) => {
    setSelectedItemForLogs(item);
    setActivityLogsDialog(true);
  };

  const handleSwitchToMainActivityTab = () => {
    setActivityLogsDialog(false);
    setCurrentTab(1);
  };
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    filtered = [...filtered].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (searchTerm && currentTab === 0) {
      filtered = filtered.filter(
        (item: any) =>
          item?.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCustomer) {
      filtered = filtered.filter(
        (item: any) => item.customerId === selectedCustomer
      );
    }

    if (selectedList) {
      filtered = filtered.filter((item: any) => item.listId === selectedList);
    }
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

  const availableLists = useMemo(() => {
    if (!selectedCustomer) return lists;
    return lists.filter((list) => list.customerId === selectedCustomer);
  }, [lists, selectedCustomer]);
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

    function parseEtaForSorting(etaDate: any): number {
      if (!etaDate) return Number.MAX_SAFE_INTEGER;

      try {
        if (typeof etaDate === "string") {
          const isoDate = new Date(etaDate);
          if (!isNaN(isoDate.getTime())) {
            return isoDate.getTime();
          }

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

          const date = new Date(etaDate);
          if (!isNaN(date.getTime())) {
            return date.getTime();
          }
        } else if (typeof etaDate === "number") {
          return etaDate;
        }

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

              if (
                !cargoNo ||
                cargoNo === "null" ||
                cargoNo === "undefined" ||
                cargoNo === ""
              ) {
                return;
              }

              const parsedEta = parseEtaForSorting(deliveryDetails.eta);

              if (!cargoMap.has(cargoNo)) {
                cargoMap.set(cargoNo, {
                  period: period,
                  eta: deliveryDetails.eta,
                  cargoStatus: deliveryDetails.cargoStatus,
                  cargoType: deliveryDetails.cargoType,
                  parsedEta: parsedEta,
                });
              } else {
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

    const sortedCargos = Array.from(cargoMap.keys()).sort((a, b) => {
      const dataA = cargoMap.get(a)!;
      const dataB = cargoMap.get(b)!;
      const etaComparison = dataA.parsedEta - dataB.parsedEta;
      if (etaComparison !== 0) {
        return etaComparison;
      }

      return a.localeCompare(b);
    });

    return {
      sortedCargos,
      cargoDataMap: cargoMap,
    };
  }

  function formatEta(etaDate: any) {
    if (!etaDate) return null;
    const formatted = formatDate(etaDate);
    return formatted === "-" ? etaDate : formatted;
  }

  function formatCargoColumnLabel(
    cargoNo: string,
    period: string,
    eta?: number,
    cargoStatus?: string,
    cargoType?: string
  ): string {
    let label = "";

    if (cargoType) {
      label += cargoType;
    }
    if (cargoNo) {
      if (cargoType) {
        label += ` `;
      }
      label += `(${cargoNo})`;
    }

    if (!cargoType && !cargoNo) {
      label = "No Cargo";
    }

    return label;
  }



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
    <div className="min-h-screen bg-transparent font-poppins px-0 py-0">
      <div className="w-full mx-auto p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <PageHeader title="Scheduled Items" icon={Calendar} />
            {saving && <CircularProgress size={20} className="ml-2 inline-block" />}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateListDialog(true)}
              className="px-4 py-2 bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-[4px] flex items-center gap-2 font-bold shadow-md transition-all text-xs"
            >
              <Add className="w-4 h-4" />
              Create List
            </button>
            <button
              onClick={() => setAddItemDialog(true)}
              className="px-4 py-2 bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-[4px] flex items-center gap-2 font-bold shadow-md transition-all text-xs"
            >
              <Add className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-2 border border-gray-100 rounded-2xl shadow-sm">
          <button
            onClick={() => {
              setCurrentTab(0);
              setSearchTerm("");
            }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${currentTab === 0
              ? "bg-[#8CC21B] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <Inventory className="w-4 h-4" />
            Items Management ({filteredItems.length})
          </button>
          <button
            onClick={() => {
              setCurrentTab(1);
              setSearchTerm("");
            }}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${currentTab === 1
              ? "bg-[#8CC21B] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <History className="w-4 h-4" />
            Activity Logs ({filteredActivityLogs.length})
          </button>
        </div>

        {/* One-line Filter Container */}
        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6 flex flex-wrap items-center gap-4">
          {/* Search Field */}
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder={
                currentTab === 0
                  ? "Search items, companies, lists..."
                  : "Search activity logs..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white text-black"
            />
          </div>

          {/* Customer Filter */}
          <div className="w-[180px]">
            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setSelectedList("");
              }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 bg-white text-gray-700"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* List Filter */}
          <div className="w-[160px]">
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              disabled={!selectedCustomer}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 bg-white text-gray-700 disabled:opacity-50"
            >
              <option value="">All Lists</option>
              {availableLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show Items (All vs Changes) */}
          <div className="w-[180px]">
            <select
              value={showOnlyChanges ? "changes" : "all"}
              onChange={(e) => setShowOnlyChanges(e.target.value === "changes")}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 bg-white text-gray-700"
            >
              <option value="all">All Items</option>
              <option value="changes">Items with Changes ({itemsWithChanges.length})</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {currentTab === 0 && user?.role === UserRole.ADMIN && selectedRows.size > 0 && (
              <button
                onClick={handleDeleteSelectedItems}
                disabled={saving}
                className="px-3 py-2 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-all font-semibold flex items-center gap-1.5"
              >
                <Delete className="w-3.5 h-3.5" />
                Delete ({selectedRows.size})
              </button>
            )}

            {currentTab === 0 && (
              <button
                onClick={async () => await handleRefetchItemData()}
                className="px-3 py-2 text-xs bg-white text-[#8CC21B] border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refetch WaWi
              </button>
            )}

            {(selectedCustomer || selectedList || searchTerm || showOnlyChanges) && (
              <button
                onClick={() => {
                  setSelectedCustomer("");
                  setSelectedList("");
                  setSearchTerm("");
                  setShowOnlyChanges(false);
                }}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all"
                title="Clear Filters"
              >
                <Clear className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Panel 0: Items Management */}
        {currentTab === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-700">
                <thead style={{ backgroundColor: "#F8F9FA" }}>
                  <tr className="border-b border-gray-200 text-[#495057]">
                    <th className="p-4 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredItems.length && filteredItems.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(new Set(filteredItems.map(row => row.id)));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                        className="rounded border-gray-300 text-[#8CC21B] focus:ring-[#8CC21B] w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider w-20">
                      Image
                    </th>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">
                      <div className="flex flex-col items-start">
                        <span>Company</span>
                        <span className="text-[10px] text-gray-400 normal-case font-normal mt-0.5">List</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">
                      <div className="flex flex-col items-start">
                        <span>ItemNo</span>
                        <span className="text-[10px] text-gray-400 normal-case font-normal mt-0.5">ItemName</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">
                      <div className="flex flex-col items-start">
                        <span>Interval</span>
                        <span className="text-[10px] text-gray-400 normal-case font-normal mt-0.5">Qty</span>
                      </div>
                    </th>
                    {deliveryColumnsData.sortedCargos.map((cargoNo) => {
                      const cargoData = deliveryColumnsData.cargoDataMap.get(cargoNo);
                      return (
                        <th key={cargoNo} className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider min-w-[200px]">
                          <div className="flex flex-col items-center">
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
                              <span className="w-max h-max px-2.5 py-0.5 text-[9px] bg-yellow-500 text-white rounded-full mt-1 font-semibold uppercase">
                                {cargoData.cargoStatus}
                              </span>
                            )}
                            {cargoData?.eta && (
                              <span className="text-[10px] text-gray-500 mt-1 font-medium">
                                ETA: {formatEta(cargoData.eta)}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">
                      Comment
                    </th>
                    <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider w-28">
                      Activity Logs
                    </th>
                    <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider w-36">
                      Acknowledge
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5] bg-white">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8 + deliveryColumnsData.sortedCargos.length} className="py-16 text-center text-sm text-gray-500">
                        No items found
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((row) => {
                      const contactPersonName = row.contactPerson?.name || "Select Contact";
                      const contactPersonId = row.contactPerson?.id || "";
                      const listId = row.listId;
                      const hasItemNoChanges = row.unacknowledgedFields?.includes("item_no_de");
                      const hasArticleNameChanges = row.unacknowledgedFields?.includes("articleName");
                      const hasUnacknowledged = row.hasUnacknowledgedChanges || row.unacknowledgedFields?.length > 0;

                      return (
                        <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              onChange={() => {
                                const newSelectedRows = new Set(selectedRows);
                                if (newSelectedRows.has(row.id)) {
                                  newSelectedRows.delete(row.id);
                                } else {
                                  newSelectedRows.add(row.id);
                                }
                                setSelectedRows(newSelectedRows);
                              }}
                              className="rounded border-gray-300 text-[#8CC21B] focus:ring-[#8CC21B] w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <ImageCellRenderer row={row} />
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-black">{row.companyName}</span>
                              <span className="text-xs text-gray-500 mt-0.5">{row.listName}</span>
                              <select
                                value={contactPersonId}
                                onChange={async (e) => {
                                  if (listId && e.target.value) {
                                    await updateListContact(listId, e.target.value);
                                  }
                                }}
                                className="mt-1.5 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#8CC21B] bg-white text-gray-700 font-medium w-full cursor-pointer"
                              >
                                <option value="">Select Contact</option>
                                {contactPersons.map((cp) => (
                                  <option key={cp.id} value={cp.id}>
                                    {cp.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex flex-col">
                              <FieldHighlight hasChanges={hasItemNoChanges} fieldName="Item No.">
                                <span className="font-semibold text-xs text-black">{row.item_no_de || "-"}</span>
                              </FieldHighlight>
                              <FieldHighlight hasChanges={hasArticleNameChanges} fieldName="Article Name">
                                <span className={`text-xs text-gray-500 mt-0.5 ${row.articleName ? "" : "italic"}`}>
                                  {row.articleName || "No article name"}
                                </span>
                              </FieldHighlight>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex flex-col gap-1 w-full min-w-[120px]">
                              <EditableIntervalCell
                                row={row}
                                onUpdateItem={handleUpdateItem}
                                onAcknowledgeField={handleAcknowledgeField}
                                compact={true}
                              />
                              <EditableQuantityCell
                                row={row}
                                onUpdateItem={handleUpdateItem}
                                onAcknowledgeField={handleAcknowledgeField}
                                compact={true}
                              />
                            </div>
                          </td>
                          {deliveryColumnsData.sortedCargos.map((cargoNo) => {
                            const cargoData = deliveryColumnsData.cargoDataMap.get(cargoNo);
                            const statusDescriptions: Record<string, string> = {
                              open: "Fracht geplant - Die Sendung befindet sich in der Planungsphase",
                              packed: "Ware ist verpackt - Artikel wurden für den Versand vorbereitet und verpackt",
                              shipped: "Fracht wurde versendet - Die Sendung hat das Ursprungszentrum verlassen",
                              arrived: "In Deutschland angekommen - Die Sendung hat ihr Ziel in Deutschland erreicht",
                            };

                            const tooltipContent = (
                              <div className="p-2 text-xs">
                                <div className="font-bold mb-1">
                                  {cargoData?.cargoStatus ? cargoData.cargoStatus.toUpperCase() : "No Status"}
                                </div>
                                <div>
                                  {cargoData?.cargoStatus
                                    ? statusDescriptions[cargoData.cargoStatus.toLowerCase()]
                                    : "No status information available"}
                                </div>
                                {cargoData?.eta && (
                                  <div className="mt-1 italic">
                                    Estimated arrival: {formatEta(cargoData.eta)}
                                  </div>
                                )}
                              </div>
                            );

                            return (
                              <td key={cargoNo} className="py-3 px-4 text-center">
                                <Tooltip title={tooltipContent} arrow placement="top">
                                  <span className="w-full inline-block">
                                    <DeliveryCell
                                      row={row}
                                      cargoNo={cargoNo}
                                      onUpdateDelivery={handleUpdateDelivery}
                                      onAcknowledgeField={handleAcknowledgeField}
                                    />
                                  </span>
                                </Tooltip>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-left min-w-[200px]">
                            <EditableCommentCell
                              row={row}
                              onUpdateItem={handleUpdateItem}
                              onAcknowledgeField={handleAcknowledgeField}
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleOpenItemActivityLogs(row)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-150 text-gray-600 transition-colors flex items-center justify-center gap-1 text-xs font-semibold mx-auto shadow-sm"
                            >
                              <History className="w-3.5 h-3.5 text-[#8CC21B]" />
                              Logs
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {hasUnacknowledged ? (
                              <button
                                onClick={() => handleAcknowledgeItem(row)}
                                className="px-3.5 py-1.5 bg-[#8CC21B] hover:bg-[#7ab318] text-white text-[10px] font-bold rounded-[4px] hover:bg-opacity-90 transition-all shadow-md mx-auto block"
                              >
                                ACKNOWLEDGE
                              </button>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 mx-auto">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                Acknowledged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Panel 1: Activity Logs */}
        {currentTab === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-[#8CC21B] w-5 h-5" />
              <h3 className="text-lg font-bold text-gray-800">Activity Timeline</h3>
            </div>
            <div
              className="h-[600px] overflow-y-auto border border-gray-100 rounded-xl p-4 bg-[#fafafa]"
              style={{
                scrollbarWidth: "thin",
              }}
            >
              {filteredActivityLogs.length === 0 ? (
                <div className="text-center py-16 px-3">
                  <History style={{ color: "#ccc", marginBottom: 24, margin: "0 auto" }} />
                  <p className="text-base font-bold text-gray-600 mb-2">
                    No activity logs found
                  </p>
                  <p className="text-sm text-gray-500">
                    {searchTerm || selectedCustomer || selectedList
                      ? "Try adjusting your filters or search terms"
                      : "No activity logs available"}
                  </p>
                </div>
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
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default AdminAllItemsPage;
