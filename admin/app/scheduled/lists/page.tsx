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
  Alert,
  Autocomplete,
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
  Email,
  Phone,
  Business,
  LocationOn,
} from "@mui/icons-material";
import {
  X,
  List,
  Grid2X2,
  FileText,
  FolderPlus,
  ClipboardList,
  PlusIcon,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { api, handleApiError } from "@/utils/api";
import { getAllCustomers } from "@/api/customers";

// Customer view item component
const CustomerViewItem = ({ customer, onViewLists, router }: any) => {
  // State for more menu

  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const menuOpen = Boolean(menuAnchor);

  // Format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
      <TableCell sx={{ pl: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={customer.avatar}
            sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.main }}
          >
            {customer.companyName?.charAt(0) || "C"}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" component="div" fontWeight={600}>
              {customer.companyName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {customer.companyName || "No legal name"}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Email fontSize="small" color="action" />
          <Typography variant="body2">{customer.email}</Typography>
        </Box>
      </TableCell>

      <TableCell align="right" sx={{ pr: 3 }}>
        <Box>
          <CustomButton
            onClick={() => {
              router.push(`/scheduled/lists/${customer.id}`);
            }}
            gradient={true}
          >
            View Lists
          </CustomButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

// Empty state component
const EmptyState = () => {
  return (
    <Box
      sx={{
        textAlign: "center",
        maxWidth: 500,
        mx: "auto",
        mt: 4,
        mb: 8,
        px: 3,
        py: 5,
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontWeight: 700,
          mb: 2,
          background: "linear-gradient(45deg, #8CC21B 30%, #4CAF50 90%)",
          backgroundClip: "text",
          textFillColor: "transparent",
        }}
      >
        No Customers Found
      </Typography>

      <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
        It looks like there are no customers in the system yet. Customers will
        appear here once they register.
      </Typography>
    </Box>
  );
};

// Main Page Component
const AdminCustomersPage = () => {
  // State for customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [viewListsDialogOpen, setViewListsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const router = useRouter();

  // Fetch customers from backend
  const fetchCustomers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const response = await getAllCustomers();
      setCustomers(response?.data || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      setError("Failed to load customers. Please try again.");
      handleApiError(error, "Failed to load customers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (customer: any) =>
      customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.legalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated customers
  const paginatedCustomers = filteredCustomers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Event handlers
  const handleViewLists = (customer: any) => {
    setSelectedCustomer(customer);
    setViewListsDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchCustomers(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full mx-auto px-0">
        <div
          className="bg-white rounded-lg shadow-sm pb-[7rem] p-8 px-9"
          style={{
            border: "1px solid #e0e0e0",
            background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
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
        </div>
      </div>
    );
  }

  // Render page
  return (
    <div className="w-full mx-auto px-0">
      <div
        className="bg-white rounded-lg shadow-sm pb-[7rem] p-8 px-9"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Typography
              variant="h4"
              sx={{ color: "secondary.main", fontSize: "30px" }}
            >
              List Management
            </Typography>
            <h3 className="font-roboto mt-1">
              View and manage all registered customers
            </h3>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <Paper
              className="flex items-center px-4 py-2 flex-1 max-w-md"
              sx={{
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                border: "1px solid #e0e0e0",
              }}
            >
              <Search className="text-gray-400 mr-2" />
              <InputBase
                placeholder="Search customers, companies..."
                className="flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  "& input": {
                    padding: "4px",
                  },
                }}
              />
            </Paper>

            <CustomButton
              startIcon={<RefreshCw color="white" size={18} />}
              gradient
              shadow="large"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </CustomButton>
          </div>
        </div>

        {/* Filters and Stats */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel sx={{ color: "text.secondary" }}>Status</InputLabel>
            <Select
              value=""
              sx={{
                borderRadius: "8px",
                "& .MuiSelect-select": {
                  py: 1.2,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: "8px",
                    mt: 1,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                },
              }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          {/* Total Customers Count */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              ml: "auto",
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              px: 2,
              py: 1,
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            Total Customers: {customers.length}
          </Typography>
        </div>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Customers Table */}
        {customers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
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
                      Company
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell align="right" sx={{ pr: 3, fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedCustomers.map((customer: any) => (
                    <CustomerViewItem
                      key={customer.id}
                      customer={customer}
                      router={router}
                      onViewLists={handleViewLists}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing{" "}
                {Math.min(filteredCustomers.length, page * rowsPerPage + 1)} to{" "}
                {Math.min(filteredCustomers.length, (page + 1) * rowsPerPage)}{" "}
                of {filteredCustomers.length} customers
              </Typography>

              <TablePagination
                component="div"
                count={filteredCustomers.length}
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
                }}
              />
            </Box>
          </>
        )}

        {/* View Lists Dialog */}
        <Dialog
          open={viewListsDialogOpen}
          onClose={() => setViewListsDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
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
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Business
                style={{ marginRight: 10, color: theme.palette.primary.main }}
              />
              {selectedCustomer?.companyName}'s Lists
            </Box>
            <IconButton
              onClick={() => setViewListsDialogOpen(false)}
              size="small"
            >
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ py: 3 }}>
            {selectedCustomer?.lists && selectedCustomer.lists.length > 0 ? (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  This customer has {selectedCustomer.lists.length} list(s).
                </Typography>
                {/* You can add more detailed list information here if needed */}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <FolderOpen
                  sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No Lists Found
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This customer hasn't created any lists yet.
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              pb: 3,
              borderTop: "1px solid",
              borderColor: alpha("#ADB5BD", 0.15),
            }}
          >
            <CustomButton
              variant="outlined"
              onClick={() => setViewListsDialogOpen(false)}
              rounded="medium"
            >
              Close
            </CustomButton>
            <CustomButton
              variant="contained"
              onClick={() => {
                setViewListsDialogOpen(false);
                router.push(
                  `/scheduled/lists?customerId=${selectedCustomer?.id}`
                );
              }}
              rounded="medium"
              hoverEffect="scale"
            >
              View All Lists
            </CustomButton>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminCustomersPage;
