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
} from "@mui/icons-material";
import { Formik, Form, Field } from "formik";
import { DataGrid, renderHeaderCell } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import { ImageIcon, X } from "lucide-react";
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
  Item,
  updateList,
} from "@/api/lists";
import { DELIVERY_STATUS, INTERVAL_OPTIONS } from "@/utils/interfaces";
import { errorStyles, successStyles } from "@/utils/constants";

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

function DeliveryCell({ row, period, onUpdateDelivery }: any) {
  const delivery = row.deliveries?.[period];
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(delivery?.quantity || 0);
  const [status, setStatus] = useState(
    delivery?.status || DELIVERY_STATUS.PENDING
  );

  const handleSave = () => {
    onUpdateDelivery(row.id, period, {
      quantity: Number(quantity),
      status,
      deliveredAt:
        status === DELIVERY_STATUS.DELIVERED ? new Date() : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setQuantity(delivery?.quantity || 0);
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
        <TextField
          size="small"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
          sx={{
            "& .MuiOutlinedInput-root": {
              height: 32,
              fontSize: "0.75rem",
            },
          }}
        />
        <FormControl size="small">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as DELIVERY_STATUS)}
            sx={{
              height: 32,
              fontSize: "0.75rem",
            }}
          >
            {Object.values(DELIVERY_STATUS).map((statusOption) => (
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
            {INTERVAL_OPTIONS.map((option) => (
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

// Types
// Styled components
const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 16,
    backgroundColor: alpha(theme.palette.background.paper, 0.9),
    transition: "all 0.3s ease",
    border: "2px solid transparent",
    "&:hover": {
      backgroundColor: alpha(theme.palette.background.paper, 1),
      boxShadow: "0 8px 25px rgba(140, 194, 27, 0.15)",
      border: "2px solid rgba(140, 194, 27, 0.2)",
    },
    "&.Mui-focused": {
      backgroundColor: alpha(theme.palette.background.paper, 1),
      boxShadow: "0 8px 30px rgba(140, 194, 27, 0.25)",
      border: "2px solid rgba(140, 194, 27, 0.5)",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "transparent",
      },
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "transparent",
  },
}));

const SearchField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 25,
    backgroundColor: alpha(theme.palette.background.paper, 0.7),
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
    transition: "all 0.3s",
    "&:hover": {
      backgroundColor: alpha(theme.palette.background.paper, 0.9),
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.07)",
    },
    "&.Mui-focused": {
      boxShadow: "0 4px 15px rgba(140, 194, 27, 0.15)",
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: alpha(theme.palette.divider, 0.5),
  },
}));

const ItemOptionCard = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: 12,
  borderRadius: 12,
  transition: "all 0.2s ease",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    transform: "translateX(4px)",
  },
}));

const ImageContainer = styled(Box)(({ theme }) => ({
  width: 60,
  height: 60,
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: alpha(theme.palette.grey[200], 0.5),
  border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  position: "relative",
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s ease",
  },
  "&:hover img": {
    transform: "scale(1.1)",
  },
}));

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
      toast.error("Please select an item", errorStyles);
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
          href="/"
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
          <Home fontSize="small" sx={{ mr: 0.5 }} />
          Dashboard
        </Link>
        <Link
          underline="none"
          color="inherit"
          href="/scheduled-items/lists"
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
          Lists
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

const ListManagementPage = () => {
  const router = useRouter();
  const params = useParams();
  const listId = params?.id as string;

  // State management

  const [listData, setListData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(true);
  const [addItemDialog, setAddItemDialog] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(listData?.name || "");

  const handleUpdateTitle = async () => {
    if (!editedTitle.trim()) {
      toast.error("Title cannot be empty", errorStyles);
      return;
    }

    try {
      setSaving(true);
      // Call your API to update the list title
      const response = await updateList(listData.id, { name: editedTitle });
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

  const deliveryPeriodsData = useMemo(() => {
    if (!listData?.items) return { sortedPeriods: [], cargoNumbers: [] };
    return extractDeliveryPeriods(listData.items);
  }, [listData?.items]);

  // Load list data
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
        name: "Artikel-Nr.",
        width: 100,
        resizable: true,
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
        width: 300,
        resizable: true,
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

    // Add delivery columns dynamically
    const deliveryColumns = deliveryPeriodsData.sortedPeriods.map((period) => {
      const cargoNo = listData?.items
        .map((item: any) => item.deliveries?.[period]?.cargoNo)
        .find((cn: string) => cn);

      return {
        key: `delivery_${period}`,
        name: formatPeriodLabel(period, cargoNo),
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
            <div>{formatPeriodLabel(period, cargoNo)}</div>
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
        name: "Kommentar",
        width: 200,
        resizable: true,
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

  // Show loading state
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
    <Box sx={{ width: "100%", py: 3, px: 2, pt: 0 }}>
      <Box sx={{ maxWidth: "95vw", mx: "auto" }}>
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

            {isEditingTitle ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      height: 40,
                      backgroundColor: "background.paper",
                      borderRadius: 1,
                    },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={async () => {
                    await handleUpdateTitle();
                  }}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : <CheckCircle />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditedTitle(listData.name);
                  }}
                  disabled={saving}
                >
                  <Cancel />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
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
                  sx={{ color: "primary.main" }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Box>
            )}

            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>

          <EnhancedBreadcrumbs listTitle={listData.name} />
        </Box>
        {/* Main Content */}
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
          <Box sx={{ p: 3 }}>
            {/* List Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Customer: </strong>{" "}
                {" " + listData.customer?.email || "N/A"}
              </Typography>
            </Box>

            {/* Action Bar */}
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
            >
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <SearchField
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
                  sx={{ width: 300 }}
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
                  onClick={() => toast.success("Changes saved!", successStyles)}
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
                  backgroundColor: alpha(theme.palette.background.default, 0.6),
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
                          !item.changeStatus || item.changeStatus === "pending"
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
        </Card>

        {/* Add Item Dialog */}
        <AddItemDialog
          open={addItemDialog}
          onClose={() => setAddItemDialog(false)}
          onAddItem={handleAddItem}
          listId={listId}
        />
      </Box>
    </Box>
  );
};

export default ListManagementPage;
