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
  Filter,
  Mail,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import CustomButton from "@/components/UI/CustomButton";
import CustomTable from "@/components/UI/CustomTable";
import theme from "@/styles/theme";
import { getAllCustomers, updateCustomerStatus } from "@/api/customers";

export enum CustomerVerificationStatus {
  PENDING = "pending",
  APPROVED = "verified",
  REJECTED = "rejected",
}

// Main customer page component
const CustomersPage = () => {
  const muiTheme = useTheme();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<any>({
    status: [],
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

  const handleActionClick = (event: any, customerId: any) => {
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
    } catch (error) {
      console.error("Error approving customer:", error);
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
    } catch (error) {
      console.error("Error rejecting customer:", error);
    }
  };

  const handleChangeStatus = async () => {
    try {
      await updateCustomerStatus(selectedCustomer.id, newStatus);
      setChangeStatusDialogOpen(false);
      handleRefresh();
      toast.success(`Customer status updated to ${formatStatus(newStatus)}`);
    } catch (error) {
      console.error("Error changing customer status:", error);
      toast.error("Failed to update customer status");
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
      toast.success(
        `Customer ${selectedCustomer.companyName} would be deleted`
      );
      setDeleteDialogOpen(false);
      handleActionClose();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  // Helper function to format dates in a more compact way
  const formatDate = (dateString: any) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear().toString().substr(2, 2);

    // Add ordinal suffix to day
    const getOrdinalSuffix = (d: number) => {
      if (d > 3 && d < 21) return `${d}th`;
      switch (d % 10) {
        case 1:
          return `${d}st`;
        case 2:
          return `${d}nd`;
        case 3:
          return `${d}rd`;
        default:
          return `${d}th`;
      }
    };

    return `${getOrdinalSuffix(day)} ${month} '${year}`;
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

  // Define table columns
  const columns = [
    {
      key: "company",
      label: "Company",
      render: (value: any, row: any) => (
        <div className="flex items-center gap-4">
          <Avatar
            src={
              row.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                row.companyName
              )}&background=8CC21B&color=fff`
            }
            variant="rounded"
            className="w-10 h-10"
            alt={`${row.companyName}'s logo`}
          >
            <Building2 size={20} />
          </Avatar>
          <div>
            <div className="text-gray-800 font-medium">{row.companyName}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (value: any, row: any) => (
        <div className="flex items-center text-gray-700">
          <MapPin className="w-4 h-4 mr-1.5 text-gray-500" />
          <span>
            {row.city}, {row.country}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Registered On",
      render: (value: any) => {
        return (
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 mr-1.5 text-gray-500" />
            <span>{formatDate(value)}</span>
          </div>
        );
      },
    },
    {
      key: "accountVerificationStatus",
      label: "Status",
      render: (value: any) => {
        let color, bgColor, text;

        switch (value) {
          case CustomerVerificationStatus.APPROVED:
            color = "text-green-700";
            bgColor = "bg-green-100";
            text = "Approved";
            break;
          case CustomerVerificationStatus.REJECTED:
            color = "text-red-700";
            bgColor = "bg-red-100";
            text = "Rejected";
            break;
          case CustomerVerificationStatus.PENDING:
            color = "text-amber-700";
            bgColor = "bg-amber-100";
            text = "Pending";
            break;
          default:
            color = "text-gray-700";
            bgColor = "bg-gray-100";
            text = value || "Unknown";
        }

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${color} ${bgColor}`}
          >
            {text}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (value: any, row: any) => (
        <div className="flex space-x-1">
          {row.accountVerificationStatus ===
            CustomerVerificationStatus.PENDING && (
            <>
              <Tooltip title="Approve">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(row);
                    setApproveDialogOpen(true);
                  }}
                  size="small"
                  sx={{
                    color: theme.palette.success.main,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                    },
                  }}
                >
                  <LucideCheck size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(row);
                    setRejectDialogOpen(true);
                  }}
                  size="small"
                  sx={{
                    color: theme.palette.error.main,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  <LucideX size={18} />
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
          >
            <LucideMoreVertical size={18} />
          </IconButton>
        </div>
      ),
    },
  ];

  // Filter customers based on search and status filters
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

  // Sort customers to put pending requests at the top
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

  // Count pending customers
  const pendingCount = customers.filter(
    (customer: any) =>
      customer.accountVerificationStatus === CustomerVerificationStatus.PENDING
  ).length;

  return (
    <div className="w-full max-w-[75vw]     mx-auto px-0">
      <div
        className="bg-white rounded-lg  shadow-sm pb-[7rem] p-8 px-9"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {/* Header with pending count */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Typography
              variant="h4"
              sx={{ color: "secondary.main", fontSize: "30px" }}
            >
              Customers Management
            </Typography>
            <div className="flex items-center mt-1">
              <Typography variant="body2" color="text.secondary">
                Manage customer accounts and registration requests
              </Typography>
              {pendingCount > 0 && (
                <Chip
                  label={`${pendingCount} pending approval`}
                  size="small"
                  color="warning"
                  sx={{ ml: 2, fontWeight: 500 }}
                />
              )}
            </div>
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
              <LucideSearch className="text-gray-400 mr-2" size={20} />
              <InputBase
                placeholder="Search customers..."
                className="flex-1"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{
                  "& input": {
                    padding: "4px",
                  },
                }}
              />
            </Paper>

            <Button
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={handleRefresh}
              sx={{
                borderRadius: "8px",
                borderColor: theme.palette.primary.light,
                color: theme.palette.primary.main,
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel sx={{ color: "text.secondary" }}>Status</InputLabel>
            <Select
              multiple
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value,
                })
              }
              renderValue={(selected) => selected.join(", ")}
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
              startAdornment={
                <Filter size={16} className="mr-2 text-gray-500" />
              }
            >
              {Object.values(CustomerVerificationStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  <Checkbox checked={filters.status.includes(status)} />
                  <ListItemText
                    primary={status.charAt(0).toUpperCase() + status.slice(1)}
                  />
                </MenuItem>
              ))}
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

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Pending Requests Alert */}
        {pendingCount > 0 && (
          <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
            You have {pendingCount} customer registration{" "}
            {pendingCount === 1 ? "request" : "requests"} pending approval.
            Please review them as soon as possible.
          </Alert>
        )}

        {/* Customers Table */}
        {loading ? (
          <div className="flex justify-center items-center p-20">
            <CircularProgress
              size={40}
              sx={{ color: theme.palette.primary.main }}
            />
          </div>
        ) : (
          <CustomTable
            columns={columns}
            data={sortedCustomers}
            title=""
            searchable={false}
            pagination={true}
            onRowClick={(row) => router.push(`/customers/${row.id}`)}
          />
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleActionClose}
          PaperProps={{
            elevation: 4,
            sx: {
              borderRadius: "8px",
              minWidth: 200,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              "& .MuiMenuItem-root": {
                fontSize: "0.875rem",
                padding: "8px 16px",
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
            <LucideEye className="mr-2" size={18} color="#666" />
            <Typography variant="body2">View Details</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              router.push(`/customers/${selectedCustomerId}/edit`);
              handleActionClose();
            }}
          >
            <LucidePencil className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Edit Customer</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              toast.success("Email sent to customer");
              handleActionClose();
            }}
          >
            <LucideMail className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Send Email</Typography>
          </MenuItem>

          {/* Change Status MenuItem - Added as requested */}
          <MenuItem
            onClick={() => {
              handleOpenChangeStatus(selectedCustomer);
            }}
          >
            <Settings className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Change Status</Typography>
          </MenuItem>

          {selectedCustomer &&
            selectedCustomer.accountVerificationStatus ===
              CustomerVerificationStatus.PENDING && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  onClick={() => {
                    setApproveDialogOpen(true);
                    handleActionClose();
                  }}
                  sx={{ color: "#4CAF50" }}
                >
                  <LucideCheck className="mr-2" size={18} />
                  <Typography variant="body2">Approve Request</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setRejectDialogOpen(true);
                    handleActionClose();
                  }}
                  sx={{ color: "#F44336" }}
                >
                  <LucideX className="mr-2" size={18} />
                  <Typography variant="body2">Reject Request</Typography>
                </MenuItem>
              </>
            )}

          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => {
              setDeleteDialogOpen(true);
              handleActionClose();
            }}
            sx={{ color: "#F44336", "&:hover": { backgroundColor: "#ffeeee" } }}
          >
            <LucideTrash2 className="mr-2" size={18} />
            <Typography variant="body2">Delete Customer</Typography>
          </MenuItem>
        </Menu>

        {/* Approve Dialog */}
        <Dialog
          open={approveDialogOpen}
          onClose={() => setApproveDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              width: "100%",
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>Approve Customer Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to approve the account for{" "}
              <strong>{selectedCustomer?.companyName}</strong>? This will grant
              them access to the platform and all customer features.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setApproveDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              variant="contained"
              startIcon={<LucideCheck size={16} />}
              sx={{
                borderRadius: 1,
                bgcolor: theme.palette.success.main,
                "&:hover": {
                  bgcolor: theme.palette.success.dark,
                },
              }}
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              width: "100%",
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>Reject Customer Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to reject the account for{" "}
              <strong>{selectedCustomer?.companyName}</strong>? They will not be
              able to access the platform and will need to contact support for
              further assistance.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="contained"
              startIcon={<LucideX size={16} />}
              sx={{
                borderRadius: 1,
                bgcolor: theme.palette.error.main,
                "&:hover": {
                  bgcolor: theme.palette.error.dark,
                },
              }}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              width: "100%",
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>Delete Customer Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete the account for{" "}
              <strong>{selectedCustomer?.companyName}</strong>? This action
              cannot be undone, and all customer data will be lost.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="contained"
              startIcon={<LucideTrash2 size={16} />}
              sx={{
                borderRadius: 1,
                bgcolor: theme.palette.error.main,
                "&:hover": {
                  bgcolor: theme.palette.error.dark,
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Change Status Dialog */}
        <Dialog
          open={changeStatusDialogOpen}
          onClose={() => setChangeStatusDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              width: "100%",
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>Change Customer Status</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              Change the status for customer{" "}
              <strong>{selectedCustomer?.companyName}</strong>:
            </DialogContentText>
            <FormControl fullWidth>
              <InputLabel id="status-select-label">Status</InputLabel>
              <Select
                labelId="status-select-label"
                id="status-select"
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value)}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value={CustomerVerificationStatus.PENDING}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        bgcolor: theme.palette.warning.main,
                        mr: 1,
                      }}
                    />
                    Pending
                  </Box>
                </MenuItem>
                <MenuItem value={CustomerVerificationStatus.APPROVED}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        bgcolor: theme.palette.success.main,
                        mr: 1,
                      }}
                    />
                    Approved
                  </Box>
                </MenuItem>
                <MenuItem value={CustomerVerificationStatus.REJECTED}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        bgcolor: theme.palette.error.main,
                        mr: 1,
                      }}
                    />
                    Rejected
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {newStatus === CustomerVerificationStatus.APPROVED
                  ? "Approving will grant the customer access to the platform."
                  : newStatus === CustomerVerificationStatus.REJECTED
                  ? "Rejecting will block the customer from accessing the platform."
                  : "Setting to pending will put the customer in the approval queue."}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setChangeStatusDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeStatus}
              variant="contained"
              startIcon={<Settings size={16} />}
              sx={{
                borderRadius: 1,
                bgcolor: theme.palette.primary.main,
                "&:hover": {
                  bgcolor: theme.palette.primary.dark,
                },
              }}
            >
              Update Status
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default CustomersPage;
