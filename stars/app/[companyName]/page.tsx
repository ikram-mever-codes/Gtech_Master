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
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
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
  History,
  Close,
  HourglassEmpty,
  AccessTime,
  LocalShippingOutlined,
  Inventory,
  CalendarToday,
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
  updateListItemComment,
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
  activityLogs?: any[];
}

interface ActivityLog {
  id: string;
  itemId?: string;
  listId: string;
  customerId: string;
  action: string;
  message: string;
  timestamp: string;
  userRole: "admin" | "customer";
  acknowledged: boolean;
  performedAt?: string;
  changes?: any;
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

// Complete DeliveryHistoryTab Component
const DeliveryHistoryTab = ({ items, isMobile }: any) => {
  const theme = useTheme();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<"eta" | "period" | "cargo">("eta");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Utility function to format ETA dates
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

  // Process and combine deliveries from all items - UPDATED to handle unique cargos
  const deliveryHistory = useMemo(() => {
    const deliveryMap = new Map();

    items.forEach((item: any) => {
      if (item.deliveries) {
        Object.entries(item.deliveries).forEach(
          ([period, delivery]: [string, any]) => {
            // Use cargo number as the primary key for uniqueness
            const cargoNo = delivery.cargoNo || "no-cargo";
            const key =
              cargoNo !== "no-cargo"
                ? cargoNo
                : `${period}_no-cargo_${item.id}`;

            if (!deliveryMap.has(key)) {
              deliveryMap.set(key, {
                period,
                cargoNo: cargoNo !== "no-cargo" ? cargoNo : "",
                cargoStatus: delivery.cargoStatus,
                eta: delivery.eta,
                totalQuantity: 0,
                itemCount: 0,
                items: [],
                // Add parsed ETA for sorting
                parsedEta: parseEtaForSorting(delivery.eta),
              });
            }

            const historyItem = deliveryMap.get(key)!;
            historyItem.totalQuantity += delivery.quantity || 0;
            historyItem.itemCount += 1;
            historyItem.items.push({
              id: item.id,
              articleName: item.articleName || "",
              articleNumber: item.articleNumber || "",
              item_no_de: item.item_no_de,
              quantity: delivery.quantity || 0,
              status: delivery.status || "pending",
            });
          }
        );
      }
    });

    // Convert map to array and sort
    let historyArray = Array.from(deliveryMap.values());

    // Apply search filter
    if (searchTerm) {
      historyArray = historyArray.filter(
        (delivery: any) =>
          delivery.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.cargoNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.cargoStatus
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          delivery.items.some(
            (item: any) =>
              item.articleName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              item.articleNumber
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          )
      );
    }

    // Sort the array with proper ETA handling
    historyArray.sort((a: any, b: any) => {
      let comparison = 0;

      switch (sortBy) {
        case "eta":
          // Use the pre-parsed ETA values for consistent sorting
          comparison = a.parsedEta - b.parsedEta;
          break;
        case "period":
          comparison = a.period.localeCompare(b.period);
          break;
        case "cargo":
          comparison = (a.cargoNo || "").localeCompare(b.cargoNo || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return historyArray;
  }, [items, sortBy, sortOrder, searchTerm]);

  const handleSort = (column: "eta" | "period" | "cargo") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return theme.palette.info.main;
      case "packed":
        return theme.palette.warning.main;
      case "shipped":
        return theme.palette.primary.main;
      case "arrived":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return <Schedule fontSize="small" />;
      case "packed":
        return <Inventory fontSize="small" />;
      case "shipped":
        return <LocalShipping fontSize="small" />;
      case "arrived":
        return <CheckCircle fontSize="small" />;
      default:
        return <HourglassEmpty fontSize="small" />;
    }
  };

  // Rest of the component remains the same...
  if (isMobile) {
    // Mobile view with accordions
    return (
      <Box sx={{ p: 2 }}>
        {/* Search and Sort Controls */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search deliveries..."
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
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label="Sort by ETA"
              onClick={() => handleSort("eta")}
              color={sortBy === "eta" ? "primary" : "default"}
              variant={sortBy === "eta" ? "filled" : "outlined"}
              size="small"
            />
            <Chip
              label="Sort by Period"
              onClick={() => handleSort("period")}
              color={sortBy === "period" ? "primary" : "default"}
              variant={sortBy === "period" ? "filled" : "outlined"}
              size="small"
            />
            <Chip
              label="Sort by Cargo"
              onClick={() => handleSort("cargo")}
              color={sortBy === "cargo" ? "primary" : "default"}
              variant={sortBy === "cargo" ? "filled" : "outlined"}
              size="small"
            />
          </Stack>
        </Box>

        {/* Delivery Cards */}
        {deliveryHistory.length === 0 ? (
          <Card sx={{ p: 3, textAlign: "center" }}>
            <LocalShipping
              sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Deliveries Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm
                ? "Try adjusting your search terms"
                : "No delivery information available"}
            </Typography>
          </Card>
        ) : (
          deliveryHistory.map((delivery: any, index: number) => (
            <Accordion
              key={`${delivery.period}_${delivery.cargoNo}_${index}`}
              expanded={
                expandedPeriod === `${delivery.period}_${delivery.cargoNo}`
              }
              onChange={() =>
                setExpandedPeriod(
                  expandedPeriod === `${delivery.period}_${delivery.cargoNo}`
                    ? null
                    : `${delivery.period}_${delivery.cargoNo}`
                )
              }
              sx={{
                mb: 2,
                borderRadius: 2,
                "&:before": { display: "none" },
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                }}
              >
                <Box sx={{ width: "100%", pr: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      {formatPeriodLabel(delivery.period, delivery.cargoNo)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {getStatusIcon(delivery.cargoStatus)}
                      <Chip
                        label={delivery.cargoStatus || "Pending"}
                        size="small"
                        sx={{
                          backgroundColor: alpha(
                            getStatusColor(delivery.cargoStatus),
                            0.1
                          ),
                          color: getStatusColor(delivery.cargoStatus),
                          fontWeight: 500,
                        }}
                      />
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      <strong>{delivery.itemCount}</strong> items
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Qty: <strong>{delivery.totalQuantity}</strong>
                    </Typography>
                    {delivery.eta && (
                      <Typography variant="body2" color="text.secondary">
                        ETA: <strong>{formatEta(delivery.eta)}</strong>
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Box sx={{ pt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    Items in this delivery:
                  </Typography>
                  {delivery.items.map((item: any, idx: number) => (
                    <Card
                      key={`${item.id}_${idx}`}
                      sx={{
                        p: 2,
                        mb: 1,
                        backgroundColor: alpha(
                          theme.palette.background.paper,
                          0.8
                        ),
                        border: `1px solid ${alpha("#E2E8F0", 0.8)}`,
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {item.articleName}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          label={`Art: ${item.articleNumber}`}
                          size="small"
                          variant="outlined"
                        />
                        {item.item_no_de && (
                          <Chip
                            label={`DE: ${item.item_no_de}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`Qty: ${item.quantity}`}
                          size="small"
                          color="primary"
                        />
                      </Stack>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    );
  }

  // Desktop table view (also needs the same ETA sorting fix)
  return (
    <Box sx={{ p: 3 }}>
      {/* Search and Info Bar */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <TextField
          placeholder="Search deliveries..."
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
          sx={{ width: 300 }}
        />

        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<LocalShipping fontSize="small" />}
            label={`${deliveryHistory.length} Deliveries`}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<Inventory fontSize="small" />}
            label={`${deliveryHistory.reduce(
              (acc: number, d: any) => acc + d.itemCount,
              0
            )} Total Items`}
            color="secondary"
            variant="outlined"
          />
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <TableCell>
                <TableSortLabel
                  active={sortBy === "period"}
                  direction={sortBy === "period" ? sortOrder : "asc"}
                  onClick={() => handleSort("period")}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Period
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "cargo"}
                  direction={sortBy === "cargo" ? sortOrder : "asc"}
                  onClick={() => handleSort("cargo")}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Cargo No
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Status
                </Typography>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "eta"}
                  direction={sortBy === "eta" ? sortOrder : "asc"}
                  onClick={() => handleSort("eta")}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    ETA
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight={600}>
                  Items
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight={600}>
                  Total Quantity
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Details
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveryHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <LocalShipping
                    sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Deliveries Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "No delivery information available"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              deliveryHistory.map((delivery: any, index: number) => (
                <React.Fragment
                  key={`${delivery.period}_${delivery.cargoNo}_${index}`}
                >
                  <TableRow
                    hover
                    onClick={() =>
                      setExpandedPeriod(
                        expandedPeriod ===
                          `${delivery.period}_${delivery.cargoNo}`
                          ? null
                          : `${delivery.period}_${delivery.cargoNo}`
                      )
                    }
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.02
                        ),
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {delivery.period}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {delivery.cargoNo || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {getStatusIcon(delivery.cargoStatus)}
                        <Chip
                          label={delivery.cargoStatus || "Pending"}
                          size="small"
                          sx={{
                            backgroundColor: alpha(
                              getStatusColor(delivery.cargoStatus),
                              0.1
                            ),
                            color: getStatusColor(delivery.cargoStatus),
                            fontWeight: 500,
                          }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">
                          {delivery.eta ? formatEta(delivery.eta) : "-"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={delivery.itemCount}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {delivery.totalQuantity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        {expandedPeriod ===
                        `${delivery.period}_${delivery.cargoNo}` ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                      <Collapse
                        in={
                          expandedPeriod ===
                          `${delivery.period}_${delivery.cargoNo}`
                        }
                      >
                        <Box
                          sx={{
                            p: 3,
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              0.02
                            ),
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            gutterBottom
                            sx={{ mb: 2, fontWeight: 600 }}
                          >
                            Items in this delivery:
                          </Typography>
                          <Grid container spacing={2}>
                            {delivery.items.map((item: any, idx: number) => (
                              <Grid
                                item
                                xs={12}
                                md={6}
                                lg={4}
                                key={`${item.id}_${idx}`}
                              >
                                <Card
                                  sx={{
                                    p: 2,
                                    border: `1px solid ${alpha(
                                      "#E2E8F0",
                                      0.8
                                    )}`,
                                    backgroundColor: "background.paper",
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    fontWeight={500}
                                    gutterBottom
                                  >
                                    {item.articleName}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    sx={{ gap: 0.5 }}
                                  >
                                    <Chip
                                      label={`Art: ${item.articleNumber}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: "0.7rem" }}
                                    />
                                    {item.item_no_de && (
                                      <Chip
                                        label={`DE: ${item.item_no_de}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: "0.7rem" }}
                                      />
                                    )}
                                    <Chip
                                      label={`Quantity: ${item.quantity}`}
                                      size="small"
                                      color="primary"
                                      sx={{ fontSize: "0.7rem" }}
                                    />
                                  </Stack>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const DELIVERY_STATUS_CONFIG: any = {
  [DELIVERY_STATUS.PENDING]: { color: "warning", label: "Pending" },
  [DELIVERY_STATUS.PARTIAL]: { color: "info", label: "Partial" },
  [DELIVERY_STATUS.DELIVERED]: { color: "success", label: "Delivered" },
  [DELIVERY_STATUS.CANCELLED]: { color: "error", label: "Cancelled" },
};

// Item Activity Logs Dialog Component
function ItemActivityLogsDialog({
  open,
  onClose,
  item,
  activityLogs,
}: {
  open: boolean;
  onClose: () => void;
  item: any;
  activityLogs: ActivityLog[];
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

  const formatLogDescription = (log: ActivityLog) => {
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
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: alpha(
                          log.userRole === "admin"
                            ? theme.palette.primary.main
                            : theme.palette.secondary.main,
                          0.1
                        ),
                        flexShrink: 0,
                      }}
                    >
                      {log.userRole === "admin" ? (
                        <CheckCircle
                          sx={{ color: "primary.main", fontSize: 18 }}
                        />
                      ) : (
                        <History
                          sx={{ color: "text.secondary", fontSize: 18 }}
                        />
                      )}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "14px", mb: 0.5 }}
                      >
                        {formatLogDescription(log)}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <AccessTime
                            sx={{ fontSize: 14, color: "text.secondary" }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          variant="filled"
                          color={
                            log.userRole === "admin" ? "primary" : "secondary"
                          }
                          label={
                            log.userRole === "admin" ? "Admin" : "Customer"
                          }
                          sx={{
                            fontSize: "0.65rem",
                            height: 20,
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                      </Box>
                      {!log.acknowledged && log.userRole === "customer" && (
                        <Typography
                          variant="caption"
                          color="warning.main"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          Pending acknowledgment
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <CustomButton variant="contained" onClick={onClose}>
          Close
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
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

// Enhanced function to extract unique cargo numbers with sorting
function extractUniqueCargos(items: any[]): {
  sortedCargos: string[];
  cargoDataMap: Map<
    string,
    { period: string; eta?: number; cargoStatus?: string }
  >;
} {
  const cargoMap = new Map<
    string,
    { period: string; eta?: number; cargoStatus?: string }
  >();

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

            // If cargo doesn't exist or current ETA is earlier, update it
            if (!cargoMap.has(cargoNo)) {
              cargoMap.set(cargoNo, {
                period: period,
                eta: deliveryDetails.eta,
                cargoStatus: deliveryDetails.cargoStatus,
              });
            } else {
              // Update if this instance has an earlier ETA
              const existing = cargoMap.get(cargoNo)!;
              if (
                deliveryDetails.eta &&
                (!existing.eta || deliveryDetails.eta < existing.eta)
              ) {
                cargoMap.set(cargoNo, {
                  period: period,
                  eta: deliveryDetails.eta,
                  cargoStatus: deliveryDetails.cargoStatus,
                });
              }
            }
          }
        }
      );
    }
  });

  // Sort cargo numbers by ETA, then alphabetically
  const sortedCargos = Array.from(cargoMap.keys()).sort((a, b) => {
    const dataA = cargoMap.get(a)!;
    const dataB = cargoMap.get(b)!;

    // Sort by ETA first if both have it
    if (dataA.eta && dataB.eta) {
      return dataA.eta - dataB.eta;
    }

    // Cargos with ETA come before those without
    if (dataA.eta && !dataB.eta) return -1;
    if (!dataA.eta && dataB.eta) return 1;

    // Finally sort alphabetically by cargo number
    return a.localeCompare(b);
  });

  return {
    sortedCargos,
    cargoDataMap: cargoMap,
  };
}

function formatCargoColumnLabel(
  cargoNo: string,
  period: string,
  eta?: number
): string {
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

  let label = "";

  // Format period first (like "September 2025")
  const periodMatch = period.match(/(\d{4})-(\d{1,2})/);
  if (periodMatch) {
    const year = periodMatch[1];
    const month = periodMatch[2].padStart(2, "0");
    const monthName = monthMap[month] || `Month ${month}`;
    label = `${monthName} ${year}`;
  } else if (period && period.startsWith("no-date-")) {
    const periodNum = period.replace("no-date-", "");
    label = `Period ${periodNum}`;
  } else if (period) {
    label = period;
  } else {
    label = "No Date";
  }

  // Add cargo number in parentheses
  if (cargoNo) {
    label += ` (${cargoNo})`;
  }

  return label;
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

// Enhanced Editable Comment Cell with dedicated comment update endpoint
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

      // Use the dedicated comment update endpoint
      await updateListItemComment(row.id, { comment: value });

      // Update local state
      if (onUpdateItem) {
        onUpdateItem(row.id, { comment: value });
      }

      setIsEditing(false);
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

        {isEditable && (
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
        )}
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
                setFormData((prev) => ({
                  ...prev,
                  item_no_de: e.target.value,
                }))
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
                  setFormData((prev) => ({
                    ...prev,
                    interval: e.target.value,
                  }))
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

// Enhanced Mobile Item Card Component (only comment editable) - with Activity Logs button
const MobileItemCard = ({
  item,
  onUpdateItem,
  onSelect,
  isSelected,
  isEditable,
  companyName,
  listId,
  router,
  onOpenActivityLogs,
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

            {/* Activity Logs Button */}
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<History />}
                onClick={() => onOpenActivityLogs(item)}
                sx={{
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                View Activity Logs
              </Button>
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
  const [activeTab, setActiveTab] = useState<"items" | "deliveries">("items");

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

  // Activity logs state
  const [allActivityLogs, setAllActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogsDialog, setActivityLogsDialog] = useState(false);
  const [selectedItemForLogs, setSelectedItemForLogs] = useState<any>(null);

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
            activityLogs: list.activityLogs || [],
          }));

          setAllLists(transformedLists);

          if (transformedLists[0]) {
            setCurrentListId(transformedLists[0].id);
            setCurrentList(transformedLists[0]);

            // Extract all activity logs
            const allLogs: ActivityLog[] = [];
            transformedLists.forEach((list: any) => {
              if (list.activityLogs && list.activityLogs.length > 0) {
                list.activityLogs.forEach((log: any) => {
                  allLogs.push({
                    ...log,
                    listId: list.id,
                    customerId: list.customerId || "",
                  });
                });
              }
            });
            setAllActivityLogs(allLogs);
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
    const selectedList: any = allLists.find((list) => list.id === listId);
    if (selectedList) {
      setCurrentListId(listId);
      setCurrentList(selectedList);
      setSelectedRows(new Set());

      // Update activity logs for the selected list
      if (selectedList.activityLogs) {
        const logs = selectedList.activityLogs.map((log: any) => ({
          ...log,
          listId: selectedList.id,
          customerId: selectedList.customer.id || "",
        }));
        setAllActivityLogs(logs);
      }
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

  // Handle opening activity logs for specific item
  const handleOpenItemActivityLogs = (item: any) => {
    setSelectedItemForLogs(item);
    setActivityLogsDialog(true);
  };

  const filteredItems = useMemo(() => {
    if (!currentList?.items) return [];

    const filtered = currentList.items.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.articleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_no_de?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort by createdAt in descending order to show the last added item at the top
    return filtered.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [currentList?.items, searchTerm]);

  const deliveryColumnsData = useMemo(() => {
    if (!currentList?.items)
      return { sortedCargos: [], cargoDataMap: new Map() };
    return extractUniqueCargos(currentList.items);
  }, [currentList?.items]);

  const dispatch = useDispatch();

  // Enhanced function to extract unique cargo numbers with proper ETA sorting
  function extractUniqueCargos(items: any[]): {
    sortedCargos: string[];
    cargoDataMap: Map<
      string,
      { period: string; eta?: number; cargoStatus?: string; parsedEta: number }
    >;
  } {
    const cargoMap = new Map<
      string,
      { period: string; eta?: number; cargoStatus?: string; parsedEta: number }
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
    eta?: number
  ): string {
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

    let label = "";

    // Format period first (like "September 2025")
    const periodMatch = period.match(/(\d{4})-(\d{1,2})/);
    if (periodMatch) {
      const year = periodMatch[1];
      const month = periodMatch[2].padStart(2, "0");
      const monthName = monthMap[month] || `Month ${month}`;
      label = `${monthName} ${year}`;
    } else if (period && period.startsWith("no-date-")) {
      const periodNum = period.replace("no-date-", "");
      label = `Period ${periodNum}`;
    } else if (period) {
      label = period;
    } else {
      label = "No Date";
    }

    // Add cargo number in parentheses
    if (cargoNo) {
      label += ` (${cargoNo})`;
    }

    return label;
  }

  // In your columns useMemo, update the deliveryColumns generation:
  const columns = useMemo(() => {
    // Extract unique cargos instead of periods
    const deliveryColumnsData = currentList?.items
      ? extractUniqueCargos(currentList.items)
      : { sortedCargos: [], cargoDataMap: new Map() };

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
        width: 450,
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

    // Generate delivery columns based on unique cargo numbers - now properly sorted by ETA
    const deliveryColumns = deliveryColumnsData.sortedCargos.map((cargoNo) => {
      const cargoData = deliveryColumnsData.cargoDataMap.get(cargoNo);

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

      // Updated DeliveryCell to accept cargoNo prop
      const DeliveryCellByCargo = ({ row, cargoNo }: any) => {
        const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

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

        const { period, delivery } = deliveryData;
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
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontSize: "14px" }}
              >
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
                    {formatCargoColumnLabel(cargoNo, period, delivery.eta)}
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
                      <strong>Cargo Number:</strong> {cargoNo}
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

      return {
        key: `cargo_${cargoNo}`,
        name: formatCargoColumnLabel(
          cargoNo,
          cargoData?.period || "",
          cargoData?.eta
        ),
        width: 250,
        resizable: false,
        renderCell: (props: any) => (
          <Tooltip {...tooltipProps}>
            <span>
              <DeliveryCellByCargo row={props.row} cargoNo={cargoNo} />
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
              }}
            >
              <div className="flex gap-0 text-sm flex-col">
                <span>
                  {formatCargoColumnLabel(
                    cargoNo,
                    cargoData?.period || "",
                    cargoData?.eta
                  )}
                </span>
                {cargoData?.cargoStatus && (
                  <span className="w-max h-max p-1 px-3 text-xs bg-yellow-500 text-white rounded-full">
                    {cargoData.cargoStatus}
                  </span>
                )}
                {cargoData?.eta && (
                  <span>
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
      {
        key: "activity_logs",
        name: "Activity",
        width: 100,
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
              px: 1.5,
              py: 0.5,
              fontSize: "0.75rem",
              textTransform: "none",
              borderRadius: 1,
            }}
          >
            Logs
          </CustomButton>
        ),
      },
    ];

    return [...baseColumns, ...deliveryColumns, ...endColumns];
  }, [
    currentList?.items,
    selectedRows,
    handleUpdateItem,
    isEditable,
    companyName,
    currentListId,
    router,
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
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 0.5,
                }}
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
            {currentList && (
              <Box
                sx={{
                  mb: 2,
                  borderBottom: `2px solid ${alpha("#E2E8F0", 0.8)}`,
                  backgroundColor: alpha("#F8FAFC", 0.6),
                }}
              >
                <Stack
                  direction="row"
                  spacing={0}
                  sx={{
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  <Button
                    onClick={() => setActiveTab("items")}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 0,
                      borderBottom:
                        activeTab === "items"
                          ? `3px solid ${theme.palette.primary.main}`
                          : "none",
                      color:
                        activeTab === "items"
                          ? "primary.main"
                          : "text.secondary",
                      fontWeight: activeTab === "items" ? 600 : 400,
                      backgroundColor:
                        activeTab === "items"
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "transparent",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.08
                        ),
                      },
                    }}
                    startIcon={<Package size={18} />}
                  >
                    List Items
                    {itemsWithChanges.length > 0 && (
                      <Badge
                        badgeContent={itemsWithChanges.length}
                        color="error"
                        sx={{ ml: 2 }}
                      />
                    )}
                  </Button>

                  <Button
                    onClick={() => setActiveTab("deliveries")}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 0,
                      borderBottom:
                        activeTab === "deliveries"
                          ? `3px solid ${theme.palette.primary.main}`
                          : "none",
                      color:
                        activeTab === "deliveries"
                          ? "primary.main"
                          : "text.secondary",
                      fontWeight: activeTab === "deliveries" ? 600 : 400,
                      backgroundColor:
                        activeTab === "deliveries"
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "transparent",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.08
                        ),
                      },
                    }}
                    startIcon={<LocalShippingOutlined />}
                  >
                    Delivery History
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Items Display */}
            {activeTab === "items" ? (
              // Items tab content
              isMobile ? (
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
                        {searchTerm
                          ? "No items found"
                          : "No items in this list"}
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
                          onOpenActivityLogs={handleOpenItemActivityLogs}
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
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 8,
                        px: 3,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column",
                      }}
                    >
                      <Package
                        size={64}
                        style={{ color: "#ccc", marginBottom: 24 }}
                      />
                      <Typography
                        variant="h6"
                        color="text.secondary"
                        gutterBottom
                      >
                        {searchTerm
                          ? "No items found"
                          : "No items in this list"}
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
                    </Box>
                  )}
                </Paper>
              )
            ) : (
              // Delivery History tab content
              <DeliveryHistoryTab
                items={currentList.items}
                isMobile={isMobile}
              />
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

      {/* Activity Logs Dialog */}
      <ItemActivityLogsDialog
        open={activityLogsDialog}
        onClose={() => setActivityLogsDialog(false)}
        item={selectedItemForLogs}
        activityLogs={allActivityLogs}
      />
    </Box>
  );
};

export default ListManagerPage;
