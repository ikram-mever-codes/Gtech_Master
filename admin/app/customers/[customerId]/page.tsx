"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography,
  useTheme,
  alpha,
  Alert,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputBase,
  IconButton,
  useMediaQuery,
  AlertTitle,
} from "@mui/material";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Pencil,
  Check,
  X,
  Settings,
  ShieldCheck,
  ExternalLink,
  History,
  RefreshCw,
  Users,
  BarChart2,
  ArrowLeft,
  Share2,
  Truck,
  DollarSign,
  Search,
  Package,
  Printer,
  Download,
  Eye,
  Edit2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  deleteCustomer,
  getSingleCustomer,
  updateCustomerStatus,
} from "@/api/customers";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import { CustomerVerificationStatus } from "@/utils/interfaces";
import { successStyles } from "@/utils/constants";

// Interface for customer data
interface CustomerDetails {
  id: string;
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  accountVerificationStatus: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  lastLogin?: string;
  totalOrders?: number;
  totalSpent?: number;
}

const Section = ({ title, icon, children, action }: any) => {
  return (
    <Card
      sx={{
        mb: 4,
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
        overflow: "visible",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          transform: "translateY(-4px)",
        },
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 3,
            pb: 2,
            borderBottom: "1px solid #f1f3f5",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 2,
                p: 1.2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 1,
              }}
            >
              {icon}
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
                color: theme.palette.secondary.main,
              }}
            >
              {title}
            </Typography>
          </Box>
          {action && <Box>{action}</Box>}
        </Box>
        <Box sx={{ p: 3, pt: 2 }}>{children}</Box>
      </CardContent>
    </Card>
  );
};

const InfoItem = ({
  icon,
  label,
  value,
  isLink = false,
  isPrimary = false,
  isEmail = false,
}: any) => {
  const primaryColor = "#8CC21B";
  const labelColor = isPrimary ? primaryColor : "#ADB5BD";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        mb: 2.5,
        "& svg": { color: labelColor },
      }}
    >
      <Box sx={{ mr: 2, mt: 0.2 }}>{icon}</Box>
      <Box>
        <Typography
          variant="caption"
          sx={{
            color: labelColor,
            fontWeight: 500,
            display: "block",
            mb: 0.3,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.7rem",
          }}
        >
          {label}
        </Typography>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.primary.main,
              textDecoration: "none",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
            }}
          >
            {value}
            <ExternalLink size={14} style={{ marginLeft: 4 }} />
          </a>
        ) : isEmail ? (
          <a
            href={`mailto:${value}`}
            style={{
              color: "#495057",
              textDecoration: "none",
            }}
          >
            {value}
          </a>
        ) : (
          <Typography sx={{ color: "#495057", fontWeight: 400 }}>
            {value || "Not provided"}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const formatDate = (dateInput: string | number | Date) => {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) throw new Error("Invalid date format");

    // Use UTC components to avoid timezone shifts
    const day = date.getUTCDate();
    const month = date.toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC", // Ensures month reflects UTC time
    });
    const year = String(date.getUTCFullYear()).slice(-2).padStart(2, "0"); // Ensures 2-digit format

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
  } catch (e) {
    console.error("Date formatting error:", e);
    return "Date unavailable";
  }
};

// Format currency
const formatCurrency = (amount: any) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

const CustomerProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down("md"));

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentTab, setCurrentTab] = useState(0);
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Table pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const customerId = params?.customerId;

  // Fetch customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        const response = await getSingleCustomer(customerId as string);
        if (response && response.data) {
          setCustomer({
            ...response.data,
            // Add mock statistics for demo purposes
            totalOrders: Math.floor(Math.random() * 50) + 10,
            totalSpent: Math.floor(Math.random() * 10000) + 1000,
          });
          setNewStatus(response.data.accountVerificationStatus);
        } else {
          setError("Failed to load customer data");
        }
      } catch (error: any) {
        setError(error?.message || "Error fetching customer data");
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  // Handle tab change
  const handleTabChange = (event: any, newValue: any) => {
    setCurrentTab(newValue);
  };

  // Handle status change
  const handleChangeStatus = async () => {
    try {
      await updateCustomerStatus(customerId as string, newStatus);

      // Update local state to reflect change without refetching
      if (customer) {
        setCustomer({
          ...customer,
          accountVerificationStatus: newStatus,
        });
      }

      setChangeStatusDialogOpen(false);
      toast.success(`Status updated to ${formatStatus(newStatus)}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const data = await deleteCustomer(customerId as string);
      if (data?.success) {
        setDeleteDialogOpen(false);
        toast.success("Customer deleted successfully", successStyles);
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  // Format status text
  const formatStatus = (status: any) => {
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

  // Get status chip props
  const getStatusChipProps = (status: any) => {
    switch (status) {
      case CustomerVerificationStatus.APPROVED:
        return {
          label: "Approved",
          color: "success",
          icon: <CheckCircle size={14} />,
        };
      case CustomerVerificationStatus.REJECTED:
        return {
          label: "Rejected",
          color: "error",
          icon: <X size={14} />,
        };
      case CustomerVerificationStatus.PENDING:
        return {
          label: "Pending Approval",
          color: "warning",
          icon: <Clock size={14} />,
        };
      default:
        return {
          label: status || "Unknown",
          color: "default",
          icon: <AlertCircle size={14} />,
        };
    }
  };

  // Handle pagination change
  const handleChangePage = (event: any, newPage: any) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // If loading, show loading spinner
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <CircularProgress
          size={60}
          sx={{ color: theme.palette.primary.main }}
        />
      </Box>
    );
  }

  // If error, show error message
  if (error || !customer) {
    return (
      <Box
        sx={{
          p: 3,
          maxWidth: "800px",
          mx: "auto",
          mt: 3,
        }}
      >
        <Alert
          severity="error"
          sx={{
            borderRadius: 1,
            mb: 2,
          }}
        >
          <AlertTitle>Error</AlertTitle>
          {error || "Failed to load customer data"}
        </Alert>
        <CustomButton
          startIcon={<ArrowLeft size={16} />}
          onClick={() => router.push("/customers")}
          variant="outlined"
          rounded="medium"
          hoverEffect="scale"
        >
          Back to Customers
        </CustomButton>
      </Box>
    );
  }

  const statusChipProps = getStatusChipProps(
    customer.accountVerificationStatus
  );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: "1300px",
        mx: "auto",
        background: "linear-gradient(to bottom, #ffffff, #f9fafb)",
      }}
    >
      {/* Header with back button and actions */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          mb: 4,
          gap: 2,
        }}
      >
        <Box>
          <CustomButton
            startIcon={<ArrowLeft size={16} />}
            onClick={() => router.push("/customers")}
            variant="outlined"
            rounded="medium"
            hoverEffect="scale"
            color="primary"
            size="small"
            sx={{ mb: 2 }}
          >
            Back to Customers
          </CustomButton>
          <Typography
            variant="h4"
            sx={{
              color: "secondary.main",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
            }}
          >
            {customer.companyName}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: 1,
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Chip
              icon={statusChipProps.icon}
              label={statusChipProps.label}
              color={statusChipProps.color as any}
              size="small"
              sx={{ fontWeight: 500 }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Calendar size={14} style={{ marginRight: 4 }} />
              Registered on {formatDate(customer.createdAt)}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            width: { xs: "100%", md: "auto" },
          }}
        >
          <CustomButton
            variant="outlined"
            startIcon={<Settings size={16} />}
            onClick={() => setChangeStatusDialogOpen(true)}
            color="secondary"
            rounded="medium"
            hoverEffect="scale"
            shadow="small"
          >
            Change Status
          </CustomButton>

          <CustomButton
            variant="outlined"
            color="primary"
            startIcon={<Pencil size={16} />}
            onClick={() => router.push(`/customers/create?id=${customerId}`)}
            rounded="medium"
            hoverEffect="scale"
            shadow="small"
          >
            Edit
          </CustomButton>

          <CustomButton
            variant="contained"
            color="error"
            startIcon={<Trash2 size={16} />}
            onClick={() => setDeleteDialogOpen(true)}
            rounded="medium"
            hoverEffect="scale"
            shadow="small"
          >
            Delete
          </CustomButton>
        </Box>
      </Box>

      {/* Main content with tabs */}
      {/* <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 3,
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          borderRadius: "10px 10px 0 0",
          p: 1,
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          sx={{
            "& .MuiTab-root": {
              minWidth: 0,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              color: theme.palette.text.secondary,
              textTransform: "none",
              py: 2,
              fontSize: { xs: "0.85rem", sm: "0.95rem" },
              "&.Mui-selected": {
                color: theme.palette.primary.main,
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: theme.palette.primary.main,
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab
            icon={<Building2 size={18} />}
            iconPosition="start"
            label="Profile"
          />
        </Tabs>
      </Box> */}

      {/* Profile Tab */}
      {currentTab === 0 && (
        <Box>
          <Grid container spacing={3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[4rem]">
              {/* Company Card */}
              <Section
                title="Company"
                icon={<Building2 size={20} className="text-[#8CC21B]" />}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Avatar
                    src={
                      customer.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        customer.companyName
                      )}&background=8CC21B&color=fff`
                    }
                    variant="rounded"
                    sx={{ width: 70, height: 70, mr: 2, borderRadius: 1 }}
                  >
                    <Building2 size={36} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {customer.companyName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        display: "flex",
                        alignItems: "center",
                        mt: 0.5,
                      }}
                    >
                      <Mail size={14} style={{ marginRight: 4 }} />
                      {customer.email}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <InfoItem
                  icon={<FileText size={16} />}
                  label="Tax Number"
                  value={customer.taxNumber}
                  isPrimary
                />

                <InfoItem
                  icon={<Calendar size={16} />}
                  label="Registration Date"
                  value={formatDate(customer.createdAt)}
                />

                <InfoItem
                  icon={<Clock size={16} />}
                  label="Last Updated"
                  value={formatDate(customer.updatedAt)}
                />

                <InfoItem
                  icon={<ShieldCheck size={16} />}
                  label="Email Verification"
                  value={customer.isEmailVerified ? "Verified" : "Not Verified"}
                />

                {customer.lastLogin && (
                  <InfoItem
                    icon={<History size={16} />}
                    label="Last Login"
                    value={formatDate(customer.lastLogin)}
                  />
                )}

                <Box
                  sx={{
                    mt: 3,
                    pt: 2,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      CUSTOMER ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {customer.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        textAlign: "right",
                        display: "block",
                      }}
                    >
                      VERIFICATION
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        customer.isEmailVerified ? "Verified" : "Unverified"
                      }
                      color={customer.isEmailVerified ? "success" : "default"}
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                </Box>
              </Section>

              {/* Contact Information */}
              <Section
                title="Contact Information"
                icon={<Phone size={20} className="text-[#8CC21B]" />}
              >
                <InfoItem
                  icon={<Mail size={16} />}
                  label="Contact Email"
                  value={customer.contactEmail}
                  isEmail
                  isPrimary
                />

                <InfoItem
                  icon={<Phone size={16} />}
                  label="Phone Number"
                  value={customer.contactPhoneNumber}
                />

                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <CustomButton
                        variant="outlined"
                        color="primary"
                        startIcon={<Mail size={16} />}
                        fullWidth
                        rounded="medium"
                        hoverEffect="scale"
                        onClick={() =>
                          (window.location.href = `mailto:${customer.contactEmail}`)
                        }
                      >
                        Email
                      </CustomButton>
                    </Grid>
                    <Grid item xs={6}>
                      <CustomButton
                        variant="outlined"
                        color="primary"
                        startIcon={<Phone size={16} />}
                        fullWidth
                        rounded="medium"
                        hoverEffect="scale"
                        onClick={() =>
                          (window.location.href = `tel:${customer.contactPhoneNumber}`)
                        }
                      >
                        Call
                      </CustomButton>
                    </Grid>
                  </Grid>
                </Box>
              </Section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[4rem]">
              {/* Billing Address */}
              <Section
                title="Billing Address"
                icon={<MapPin size={20} className="text-[#8CC21B]" />}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <InfoItem
                      icon={<MapPin size={16} />}
                      label="Address Line 1"
                      value={customer.addressLine1}
                      isPrimary
                    />

                    {customer.addressLine2 && (
                      <InfoItem
                        icon={<MapPin size={16} />}
                        label="Address Line 2"
                        value={customer.addressLine2}
                      />
                    )}

                    <InfoItem
                      icon={<MapPin size={16} />}
                      label="Postal Code"
                      value={customer.postalCode}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <InfoItem
                      icon={<Building2 size={16} />}
                      label="City"
                      value={customer.city}
                    />

                    <InfoItem
                      icon={<Globe size={16} />}
                      label="Country"
                      value={customer.country}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                        display: "flex",
                        alignItems: "flex-start",
                      }}
                    >
                      <MapPin
                        size={20}
                        className="text-[#8CC21B] mr-2 flex-shrink-0"
                        style={{ marginTop: 2 }}
                      />
                      <Typography variant="body2">
                        {customer.addressLine1}
                        {customer.addressLine2 && `, ${customer.addressLine2}`},
                        {customer.postalCode}, {customer.city},{" "}
                        {customer.country}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Section>

              {/* Delivery Address */}
              <Section
                title="Delivery Address"
                icon={<Truck size={20} className="text-[#8CC21B]" />}
                action={
                  customer.addressLine1 === customer.deliveryAddressLine1 &&
                  customer.city === customer.deliveryCity &&
                  customer.country === customer.deliveryCountry && (
                    <Chip
                      label="Same as Billing"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  )
                }
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <InfoItem
                      icon={<MapPin size={16} />}
                      label="Address Line 1"
                      value={customer.deliveryAddressLine1}
                      isPrimary
                    />

                    {customer.deliveryAddressLine2 && (
                      <InfoItem
                        icon={<MapPin size={16} />}
                        label="Address Line 2"
                        value={customer.deliveryAddressLine2}
                      />
                    )}

                    <InfoItem
                      icon={<MapPin size={16} />}
                      label="Postal Code"
                      value={customer.deliveryPostalCode}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <InfoItem
                      icon={<Building2 size={16} />}
                      label="City"
                      value={customer.deliveryCity}
                    />

                    <InfoItem
                      icon={<Globe size={16} />}
                      label="Country"
                      value={customer.deliveryCountry}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                        display: "flex",
                        alignItems: "flex-start",
                      }}
                    >
                      <Truck
                        size={20}
                        className="text-[#8CC21B] mr-2 flex-shrink-0"
                        style={{ marginTop: 2 }}
                      />
                      <Typography variant="body2">
                        {customer.deliveryAddressLine1}
                        {customer.deliveryAddressLine2 &&
                          `, ${customer.deliveryAddressLine2}`}
                        , {customer.deliveryPostalCode}, {customer.deliveryCity}
                        , {customer.deliveryCountry}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <CustomButton
                    variant="outlined"
                    color="primary"
                    startIcon={<MapPin size={16} />}
                    rounded="medium"
                    hoverEffect="scale"
                    fullWidth
                    onClick={() => {
                      const address = `${customer.deliveryAddressLine1}, ${customer.deliveryCity}, ${customer.deliveryCountry}`;
                      window.open(
                        `https://maps.google.com/?q=${encodeURIComponent(
                          address
                        )}`,
                        "_blank"
                      );
                    }}
                  >
                    View on Map
                  </CustomButton>
                </Box>
              </Section>
            </div>
          </Grid>
        </Box>
      )}

      {/* Change Status Dialog */}
      <Dialog
        open={changeStatusDialogOpen}
        onClose={() => setChangeStatusDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: "100%",
            maxWidth: "500px",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 600,
            pb: 1,
          }}
        >
          Change Customer Status
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Update the verification status for {customer.companyName}.
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Clock size={16} color={theme.palette.warning.main} />
                  Pending Approval
                </Box>
              </MenuItem>
              <MenuItem value={CustomerVerificationStatus.APPROVED}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircle size={16} color={theme.palette.success.main} />
                  Approved
                </Box>
              </MenuItem>
              <MenuItem value={CustomerVerificationStatus.REJECTED}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <X size={16} color={theme.palette.error.main} />
                  Rejected
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {newStatus === CustomerVerificationStatus.REJECTED && (
            <Alert
              severity="warning"
              icon={<AlertTriangle size={16} />}
              sx={{ mt: 2, borderRadius: 1 }}
            >
              Rejecting a customer will prevent them from placing new orders.
            </Alert>
          )}

          {newStatus === CustomerVerificationStatus.APPROVED && (
            <Alert
              severity="info"
              icon={<Info size={16} />}
              sx={{ mt: 2, borderRadius: 1 }}
            >
              The customer will be notified via email about their approval.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <CustomButton
            onClick={() => setChangeStatusDialogOpen(false)}
            variant="outlined"
            color="secondary"
            rounded="medium"
          >
            Cancel
          </CustomButton>
          <CustomButton
            onClick={handleChangeStatus}
            variant="contained"
            color="primary"
            rounded="medium"
            startIcon={<Check size={16} />}
          >
            Update Status
          </CustomButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: "100%",
            maxWidth: "500px",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 600,
            color: theme.palette.error.main,
            pb: 1,
          }}
        >
          Delete Customer
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {customer.companyName}? This action
            cannot be undone and all associated data will be permanently
            removed.
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
            <AlertTitle>Warning</AlertTitle>
            This will also remove all order history, billing information, and
            other customer data.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <CustomButton
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            color="secondary"
            rounded="medium"
          >
            Cancel
          </CustomButton>
          <CustomButton
            onClick={handleDelete}
            variant="contained"
            color="error"
            rounded="medium"
            startIcon={<Trash2 size={16} />}
          >
            Delete Customer
          </CustomButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerProfilePage;
