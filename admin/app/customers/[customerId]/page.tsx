"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  InputBase,
  Paper,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Button,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  CircularProgress,
  Alert,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Stack,
  Badge,
  Card,
  CardContent,
  Grid,
  Snackbar,
} from "@mui/material";
import {
  LucideMoreVertical,
  LucideSearch,
  LucideTrash2,
  LucidePencil,
  LucideEye,
  LucideShield,
  LucideMail,
  LucideBan,
  LucideCheck,
  LucideX,
  RefreshCw,
  Building2,
  FileText,
  Calendar,
  Phone,
  MapPin,
  Mail,
  Settings,
  PlusIcon,
  Edit,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import CustomButton from "@/components/UI/CustomButton";
import CustomTable from "@/components/UI/CustomTable";
import PageHeader from "@/components/UI/PageHeader";
import theme from "@/styles/theme";
import {
  deleteCustomer,
  getAllCustomers,
  updateCustomerStatus,
} from "@/api/customers";
import { CustomerVerificationStatus } from "@/utils/interfaces";
import { successStyles } from "@/utils/constants";

// Main customer page component
const CustomersPage = () => {
  const muiTheme = useTheme();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<any>({
    status: [],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<any>("");

  // Function to fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllCustomers();
      if (response && response.data) {
        setCustomers(response.data);
      } else {
        setCustomers([]);
        setError("No data received from server");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      setError("Failed to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleActionClick = (
    event: React.MouseEvent<HTMLElement>,
    customerId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomerId(customerId);
    setSelectedCustomer(
      customers.find((customer: any) => customer.id === customerId)
    );
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setSelectedCustomerId(null);
  };

  const handleApprove = async () => {
    try {
      await updateCustomerStatus(
        selectedCustomer.id,
        CustomerVerificationStatus.APPROVED
      );
      setApproveDialogOpen(false);
      handleRefresh();
      setSnackbar({
        open: true,
        message: "Customer approved successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error approving customer:", error);
      setSnackbar({
        open: true,
        message: "Failed to approve customer",
        severity: "error",
      });
    }
  };

  const handleReject = async () => {
    try {
      await updateCustomerStatus(
        selectedCustomer.id,
        CustomerVerificationStatus.REJECTED
      );
      setRejectDialogOpen(false);
      handleRefresh();
      setSnackbar({
        open: true,
        message: "Customer rejected successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error rejecting customer:", error);
      setSnackbar({
        open: true,
        message: "Failed to reject customer",
        severity: "error",
      });
    }
  };

  const handleChangeStatus = async () => {
    try {
      const data = await updateCustomerStatus(selectedCustomer.id, newStatus);
      if (data?.success) {
        setChangeStatusDialogOpen(false);
        handleRefresh();
        setSnackbar({
          open: true,
          message: `Customer status updated to ${formatStatus(newStatus)}`,
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error changing customer status:", error);
      setSnackbar({
        open: true,
        message: "Failed to update customer status",
        severity: "error",
      });
    }
  };

  const handleOpenChangeStatus = (customer: any) => {
    setSelectedCustomer(customer);
    setNewStatus(customer.accountVerificationStatus);
    setChangeStatusDialogOpen(true);
    handleActionClose();
  };

  const handleDelete = async () => {
    try {
      const data = await deleteCustomer(selectedCustomer.id);
      if (data?.success) {
        setDeleteDialogOpen(false);
        await fetchCustomers();
        setSnackbar({
          open: true,
          message: "Customer deleted successfully",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete customer",
        severity: "error",
      });
    }
  };

  // Helper function to format dates
  const formatDate = (dateString: any) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  };

  // Helper function to format the status text
  const formatStatus = (status: string) => {
    switch (status) {
      case CustomerVerificationStatus.APPROVED:
        return "Approved";
      case CustomerVerificationStatus.REJECTED:
        return "Rejected";
      case CustomerVerificationStatus.PENDING:
        return "Pending";
      default:
        return status || "Unknown";
    }
  };

  // Get status chip configuration
  const getStatusChipConfig = (status: string) => {
    switch (status) {
      case CustomerVerificationStatus.APPROVED:
        return {
          bg: "#e8f5e8",
          color: "#2e7d32",
          border: "#c8e6c9",
          icon: CheckCircle,
        };
      case CustomerVerificationStatus.REJECTED:
        return {
          bg: "#ffebee",
          color: "#c62828",
          border: "#ffcdd2",
          icon: XCircle,
        };
      case CustomerVerificationStatus.PENDING:
        return {
          bg: "#fff3e0",
          color: "#f57c00",
          border: "#ffe0b2",
          icon: Clock,
        };
      default:
        return {
          bg: "#f5f5f5",
          color: "#757575",
          border: "#e0e0e0",
          icon: AlertCircle,
        };
    }
  };

  const renderStatusChip = (status: string) => {
    const config = getStatusChipConfig(status);
    const Icon = config.icon;
    return (
      <Chip
        icon={<Icon size={14} />}
        label={formatStatus(status)}
        size="small"
        sx={{
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
          fontWeight: 600,
          fontSize: "0.75rem",
          "& .MuiChip-icon": { color: config.color },
        }}
      />
    );
  };

  // Define table columns
  const columns = [
    {
      key: "company",
      label: "Company",
      render: (value: any, row: any) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              row.accountVerificationStatus ===
                CustomerVerificationStatus.APPROVED ? (
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: "#4caf50",
                    border: "2px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={10} color="white" />
                </Box>
              ) : null
            }
          >
            <Avatar
              src={
                row.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  row.companyName
                )}&background=1976d2&color=fff`
              }
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                border: "2px solid white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Building2 size={24} />
            </Avatar>
          </Badge>
          <Box>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, color: "#1a1a1a" }}
            >
              {row.companyName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#5f6368", fontWeight: 500 }}
            >
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "contact",
      label: "Contact Info",
      render: (value: any, row: any) => (
        <Stack spacing={0.5}>
          {row.contactPhoneNumber && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Phone size={14} style={{ marginRight: 6, color: "#5f6368" }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {row.contactPhoneNumber}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <MapPin size={14} style={{ marginRight: 6, color: "#5f6368" }} />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {row.city}, {row.country}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (value: any) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Calendar size={14} style={{ marginRight: 6, color: "#5f6368" }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {formatDate(value)}
          </Typography>
        </Box>
      ),
    },
    {
      key: "accountVerificationStatus",
      label: "Status",
      render: (value: any) => renderStatusChip(value),
    },
    {
      key: "actions",
      label: "Actions",
      render: (value: any, row: any) => (
        <Stack direction="row" spacing={0.5}>
          {row.accountVerificationStatus ===
            CustomerVerificationStatus.PENDING && (
              <>
                <Tooltip title="Approve" placement="top">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(row);
                      setApproveDialogOpen(true);
                    }}
                    size="small"
                    sx={{
                      backgroundColor: "#e8f5e8",
                      color: "#2e7d32",
                      "&:hover": { backgroundColor: "#c8e6c9" },
                    }}
                  >
                    <LucideCheck size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject" placement="top">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(row);
                      setRejectDialogOpen(true);
                    }}
                    size="small"
                    sx={{
                      backgroundColor: "#ffebee",
                      color: "#c62828",
                      "&:hover": { backgroundColor: "#ffcdd2" },
                    }}
                  >
                    <LucideX size={16} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(e, row.id);
            }}
            size="small"
            sx={{
              backgroundColor: "#f5f5f5",
              "&:hover": { backgroundColor: "#e0e0e0" },
            }}
          >
            <LucideMoreVertical size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  // Filter customers
  const filteredCustomers = customers.filter((customer: any) => {
    const matchesSearch =
      !searchText ||
      [
        customer.companyName,
        customer.email,
        customer.contactEmail,
        customer.contactPhoneNumber,
      ].some(
        (field) =>
          field && field.toLowerCase().includes(searchText.toLowerCase())
      );

    const matchesStatus =
      filters.status.length === 0 ||
      filters.status.includes(customer.accountVerificationStatus);

    return matchesSearch && matchesStatus;
  });

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a: any, b: any) => {
    if (
      a.accountVerificationStatus === CustomerVerificationStatus.PENDING &&
      b.accountVerificationStatus !== CustomerVerificationStatus.PENDING
    ) {
      return -1;
    }
    if (
      a.accountVerificationStatus !== CustomerVerificationStatus.PENDING &&
      b.accountVerificationStatus === CustomerVerificationStatus.PENDING
    ) {
      return 1;
    }
    return 0;
  });

  // Count stats
  const pendingCount = customers.filter(
    (customer: any) =>
      customer.accountVerificationStatus === CustomerVerificationStatus.PENDING
  ).length;
  const approvedCount = customers.filter(
    (customer: any) =>
      customer.accountVerificationStatus === CustomerVerificationStatus.APPROVED
  ).length;
  const rejectedCount = customers.filter(
    (customer: any) =>
      customer.accountVerificationStatus === CustomerVerificationStatus.REJECTED
  ).length;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        sx={{ backgroundColor: "#fafafa" }}
      >
        <Box textAlign="center">
          <CircularProgress size={48} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
            Loading customers...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "#fafafa", minHeight: "100vh", pb: 4 }}>
      <Box sx={{ maxWidth: "1400px", mx: "auto", px: 3, pt: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Box>
              <PageHeader title="Customer Management" icon={Users} />
            </Box>
            <CustomButton
              variant="contained"
              startIcon={<PlusIcon size={18} />}
              onClick={() => router.push("/customers/create")}
              sx={{
                borderRadius: 1,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(25, 118, 210, 0.5)",
                },
              }}
            >
              Create Company
            </CustomButton>
          </Stack>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#e3f2fd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Users size={24} color="#1565c0" />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: "#1a1a1a" }}
                      >
                        {customers.length}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Total Customers
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #fff8e8 100%)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#fff3e0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Clock size={24} color="#f57c00" />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: "#1a1a1a" }}
                      >
                        {pendingCount}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Pending
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #e8f5e8 100%)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#e8f5e8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle size={24} color="#2e7d32" />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: "#1a1a1a" }}
                      >
                        {approvedCount}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Approved
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #ffebee 100%)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#ffebee",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <XCircle size={24} color="#c62828" />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: "#1a1a1a" }}
                      >
                        {rejectedCount}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Rejected
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters and Search Section */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 1,
              border: "1px solid #e8eaed",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
              p: 3,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Paper
                elevation={0}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  flex: 1,
                  maxWidth: 400,
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  backgroundColor: "white",
                }}
              >
                <LucideSearch
                  size={20}
                  style={{ color: "#5f6368", marginRight: 12 }}
                />
                <InputBase
                  placeholder="Search customers..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  sx={{
                    flex: 1,
                    "& input": {
                      padding: "4px 0",
                    },
                  }}
                />
              </Paper>

              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel sx={{ color: "text.secondary" }}>Status</InputLabel>
                <Select
                  multiple
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      status: e.target.value as string[],
                    })
                  }
                  renderValue={(selected) => selected.join(", ")}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: "white",
                    "& .MuiSelect-select": {
                      py: 1.2,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        borderRadius: 1,
                        mt: 1,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      },
                    },
                  }}
                >
                  {Object.values(CustomerVerificationStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      <Checkbox checked={filters.status.includes(status)} />
                      <ListItemText primary={formatStatus(status)} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<RefreshCw size={16} />}
                onClick={handleRefresh}
                sx={{
                  borderRadius: 1,
                  borderColor: "#e8eaed",
                  color: "#5f6368",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Paper>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 1,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {pendingCount > 0 && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: 1,
              boxShadow: "0 4px 12px rgba(255, 152, 0, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <AlertCircle size={20} style={{ marginRight: 8 }} />
              You have {pendingCount} customer registration{" "}
              {pendingCount === 1 ? "request" : "requests"} pending approval.
              Please review them as soon as possible.
            </Box>
          </Alert>
        )}

        {/* Customers Table */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 1,
            border: "1px solid #e8eaed",
            overflow: "hidden",
            background: "white",
          }}
        >
          <CustomTable
            columns={columns}
            data={sortedCustomers}
            title=""
            searchable={false}
            pagination={true}
            onRowClick={(row) => router.push(`/customers/${row.id}`)}
          />
        </Card>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleActionClose}
          PaperProps={{
            elevation: 4,
            sx: {
              borderRadius: 1,
              minWidth: 200,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              "& .MuiMenuItem-root": {
                fontSize: "0.875rem",
                padding: "10px 16px",
                "&:hover": {
                  backgroundColor: "#f8f9ff",
                },
              },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              router.push(`/customers/${selectedCustomerId}`);
              handleActionClose();
            }}
          >
            <LucideEye className="mr-2" size={18} color="#5f6368" />
            <Typography variant="body2">View Details</Typography>
          </MenuItem>

          <MenuItem
            onClick={() => {
              router.push(`/customers/create?id=${selectedCustomerId}`);
              handleActionClose();
            }}
          >
            <Edit className="mr-2" size={18} color="#5f6368" />
            <Typography variant="body2">Edit Customer</Typography>
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleOpenChangeStatus(selectedCustomer);
            }}
          >
            <Settings className="mr-2" size={18} color="#5f6368" />
            <Typography variant="body2">Change Status</Typography>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              setDeleteDialogOpen(true);
              handleActionClose();
            }}
            sx={{ color: "#c62828", "&:hover": { backgroundColor: "#ffebee" } }}
          >
            <LucideTrash2 className="mr-2" size={18} />
            <Typography variant="body2">Delete Customer</Typography>
          </MenuItem>
        </Menu>

        {/* Dialogs */}
        <Dialog
          open={approveDialogOpen}
          onClose={() => setApproveDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 1,
              minWidth: 420,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Approve Customer
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mt: 1 }}>
              <AlertCircle
                color="#f57c00"
                size={24}
                style={{ marginRight: 12, marginTop: 2, flexShrink: 0 }}
              />
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Are you sure you want to approve{" "}
                <strong>{selectedCustomer?.companyName}</strong>? This will
                grant them access to the platform and all customer features.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setApproveDialogOpen(false)}
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              variant="contained"
              color="success"
              startIcon={<LucideCheck size={16} />}
              autoFocus
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
                ml: 2,
              }}
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 1,
              minWidth: 420,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Reject Customer
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mt: 1 }}>
              <AlertCircle
                color="#c62828"
                size={24}
                style={{ marginRight: 12, marginTop: 2, flexShrink: 0 }}
              />
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Are you sure you want to reject{" "}
                <strong>{selectedCustomer?.companyName}</strong>? They will not
                be able to access the platform.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="contained"
              color="error"
              startIcon={<LucideX size={16} />}
              autoFocus
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
                ml: 2,
              }}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 1,
              minWidth: 420,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Delete Customer
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mt: 1 }}>
              <AlertCircle
                color="#c62828"
                size={24}
                style={{ marginRight: 12, marginTop: 2, flexShrink: 0 }}
              />
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                Are you sure you want to permanently delete{" "}
                <strong>{selectedCustomer?.companyName}</strong>? This action
                cannot be undone and all customer data will be lost.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="contained"
              color="error"
              startIcon={<LucideTrash2 size={16} />}
              autoFocus
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
                ml: 2,
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={changeStatusDialogOpen}
          onClose={() => setChangeStatusDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 1,
              minWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Change Customer Status
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
              Update the status for{" "}
              <strong>{selectedCustomer?.companyName}</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value)}
                sx={{ borderRadius: 1 }}
              >
                {Object.values(CustomerVerificationStatus).map((status) => {
                  const config = getStatusChipConfig(status);
                  return (
                    <MenuItem key={status} value={status}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            bgcolor: config.color,
                            mr: 1.5,
                          }}
                        />
                        {formatStatus(status)}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Box sx={{ mt: 3, p: 2, bgcolor: "#f8f9ff", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {newStatus === CustomerVerificationStatus.APPROVED
                  ? "Approving will grant the customer access to the platform."
                  : newStatus === CustomerVerificationStatus.REJECTED
                    ? "Rejecting will block the customer from accessing the platform."
                    : "Setting to pending will put the customer in the approval queue."}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setChangeStatusDialogOpen(false)}
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeStatus}
              variant="contained"
              startIcon={<Settings size={16} />}
              autoFocus
              sx={{
                borderRadius: 1,
                px: 3,
                fontWeight: 600,
                textTransform: "none",
                ml: 2,
              }}
            >
              Update Status
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{
              width: "100%",
              borderRadius: 1,
              fontWeight: 600,
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default CustomersPage;
