"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  Grid,
  TextField,
  Divider,
  Avatar,
  IconButton,
  Button,
  InputAdornment,
  Paper,
  alpha,
  Alert,
  CircularProgress,
  useTheme,
  Snackbar,
  Tooltip,
  Badge,
  Stack,
  Chip,
} from "@mui/material";
import {
  Building,
  Mail,
  Phone,
  FileText,
  MapPin,
  Globe,
  Truck,
  Image,
  Lock,
  Key,
  Eye,
  EyeOff,
  User,
  Send,
  Save,
  AlertTriangle,
  Check,
  ArrowLeft,
  Copy,
  Upload,
  LogOut,
  ShieldCheck,
  Settings as SettingsIcon,
  Palette,
  Bell,
  HelpCircle,
  X,
  CheckCircle,
  Info,
} from "lucide-react";
import CustomButton from "@/components/UI/CustomButton";
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from "formik";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/Redux/store";
import {
  updateCustomerProfile,
  prepareCustomerProfileFormData,
  changeCustomerPassword,
  logoutCustomer,
} from "@/api/customer";

// Tab Panel Component
function TabPanel({ children, value, index, ...other }: any) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

// Create tab props for accessibility
function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  };
}

// Profile Tab Validation Schema (All fields optional)
const profileValidationSchema = Yup.object({
  companyName: Yup.string(),
  contactEmail: Yup.string().email("Invalid email address"),
  contactPhoneNumber: Yup.string(),
  taxNumber: Yup.string(),
  addressLine1: Yup.string(),
  addressLine2: Yup.string(),
  postalCode: Yup.string(),
  city: Yup.string(),
  country: Yup.string(),
  deliveryAddressLine1: Yup.string(),
  deliveryAddressLine2: Yup.string(),
  deliveryPostalCode: Yup.string(),
  deliveryCity: Yup.string(),
  deliveryCountry: Yup.string(),
});

// Password Tab Validation Schema
const passwordValidationSchema = Yup.object({
  currentPassword: Yup.string().required("Current password is required"),
  newPassword: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("New password is required")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords must match")
    .required("Please confirm your password"),
});

// Professional Form Input Component
const ProfessionalFormInput = ({
  icon,
  label,
  name,
  type = "text",
  formik,
  placeholder,
  disabled = false,
  multiline = false,
  rows = 1,
  helperText,
}: any) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="body2"
        component="label"
        htmlFor={name}
        fontWeight={600}
        sx={{
          mb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: theme.palette.text.primary,
          fontSize: "0.875rem",
        }}
      >
        {React.cloneElement(icon, {
          size: 18,
          color: theme.palette.primary.main,
        })}
        {label}
      </Typography>

      <TextField
        fullWidth
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        multiline={multiline}
        rows={rows}
        value={formik.values[name] || ""}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched[name] && Boolean(formik.errors[name])}
        helperText={(formik.touched[name] && formik.errors[name]) || helperText}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            transition: "all 0.2s ease-in-out",
            "&.Mui-focused": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
                boxShadow: `0 0 0 3px ${alpha(
                  theme.palette.primary.main,
                  0.1
                )}`,
              },
            },
            "&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(theme.palette.primary.main, 0.7),
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(theme.palette.divider, 0.3),
              borderWidth: 1.5,
            },
          },
          "& .MuiInputBase-input": {
            py: 1.5,
            px: 1.5,
            fontSize: "0.875rem",
            "&::placeholder": {
              color: alpha(theme.palette.text.secondary, 0.7),
              opacity: 1,
            },
          },
        }}
      />
    </Box>
  );
};

// Section Header Component
const SectionHeader = ({ title, subtitle, icon, children }: any) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {icon &&
            React.cloneElement(icon, {
              size: 24,
              color: theme.palette.primary.main,
            })}
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              color: theme.palette.text.primary,
              letterSpacing: "-0.025em",
            }}
          >
            {title}
          </Typography>
        </Box>
        {children}
      </Box>
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ ml: icon ? 4.5 : 0, fontSize: "0.8rem" }}
        >
          {subtitle}
        </Typography>
      )}
      <Divider sx={{ mt: 2, borderColor: alpha(theme.palette.divider, 0.1) }} />
    </Box>
  );
};

// Function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Main Settings Page Component
const SettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  // Access customer data from Redux store
  const { customer } = useSelector((state: RootState) => state.customer);

  // Set avatar preview if customer has one
  useEffect(() => {
    if (customer?.avatar) {
      setAvatarPreview(customer.avatar);
    }
  }, [customer]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle avatar upload
  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setFieldValue: any
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("File size should not exceed 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please upload a valid image file");
        return;
      }

      // Update form field
      setFieldValue("avatar", file);

      // Create preview
      try {
        const base64 = await fileToBase64(file);
        setAvatarPreview(base64);
      } catch (error) {
        console.error("Error creating preview:", error);
        setErrorMessage("Error processing image file");
      }
    }
  };

  // Handle profile form submission
  const handleProfileSubmit = async (
    values: any,
    { setSubmitting }: FormikHelpers<any>
  ) => {
    try {
      setLoading(true);
      setErrorMessage("");

      // Prepare FormData for API call
      const formData = prepareCustomerProfileFormData({
        companyName: values.companyName,
        contactEmail: values.contactEmail,
        contactPhoneNumber: values.contactPhoneNumber,
        taxNumber: values.taxNumber,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        postalCode: values.postalCode,
        city: values.city,
        country: values.country,
        deliveryAddressLine1: values.deliveryAddressLine1,
        deliveryAddressLine2: values.deliveryAddressLine2,
        deliveryPostalCode: values.deliveryPostalCode,
        deliveryCity: values.deliveryCity,
        deliveryCountry: values.deliveryCountry,
        avatar: values.avatar,
      });

      // Call API to update profile
      await updateCustomerProfile(formData, dispatch);

      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setErrorMessage(
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (
    values: any,
    { setSubmitting, resetForm }: FormikHelpers<any>
  ) => {
    try {
      setLoading(true);
      setErrorMessage("");

      // Call API to change password
      await changeCustomerPassword(values.currentPassword, values.newPassword);

      setSuccessMessage("Password changed successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
      resetForm();
    } catch (error: any) {
      console.error("Error changing password:", error);
      setErrorMessage(
        error.message || "Failed to change password. Please try again."
      );
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutCustomer(dispatch);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Copy billing address to delivery address
  const copyBillingAddress = (values: any, setValues: any) => {
    setValues({
      ...values,
      deliveryAddressLine1: values.addressLine1,
      deliveryAddressLine2: values.addressLine2,
      deliveryPostalCode: values.postalCode,
      deliveryCity: values.city,
      deliveryCountry: values.country,
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: alpha(theme.palette.background.default, 0.3),
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            px: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              sx={{
                mr: 3,
                bgcolor: "background.paper",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                "&:hover": {
                  bgcolor: "background.paper",
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                },
                transition: "all 0.2s ease-in-out",
              }}
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  background:
                    "linear-gradient(135deg, #8CC21B 0%, #4CAF50 100%)",
                  backgroundClip: "text",
                  textFillColor: "transparent",
                  letterSpacing: "-0.02em",
                  mb: 0.5,
                }}
              >
                Account Settings
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.875rem" }}
              >
                Manage your business profile, delivery preferences and account
                security
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Help & Support">
              <IconButton
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.9),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  "&:hover": {
                    bgcolor: theme.palette.background.paper,
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <HelpCircle size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.9),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  "&:hover": {
                    bgcolor: theme.palette.background.paper,
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <Badge badgeContent={2} color="error">
                  <Bell size={18} />
                </Badge>
              </IconButton>
            </Tooltip>
            <CustomButton
              variant="outlined"
              color="error"
              startIcon={<LogOut size={16} />}
              rounded="medium"
              hoverEffect="float"
              onClick={handleLogout}
              sx={{
                borderWidth: 1.5,
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Sign Out
            </CustomButton>
          </Stack>
        </Box>

        {/* Success/Error Messages */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage("")}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSuccessMessage("")}
            severity="success"
            variant="filled"
            sx={{ width: "100%", borderRadius: 2 }}
            icon={<CheckCircle size={20} />}
          >
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Main Content */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            backgroundColor: theme.palette.background.paper,
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Navigation Tabs */}
          <Paper
            elevation={0}
            square
            sx={{
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              backgroundColor: alpha(theme.palette.background.default, 0.3),
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                px: 4,
                py: 1,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  minWidth: 180,
                  py: 2,
                  mx: 1,
                  "&:first-of-type": { ml: 0 },
                },
                "& .Mui-selected": {
                  color: theme.palette.primary.main,
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: theme.palette.primary.main,
                  height: 3,
                  borderRadius: 1.5,
                },
              }}
            >
              <Tab
                label="Business Profile"
                icon={<Building size={18} />}
                iconPosition="start"
                {...a11yProps(0)}
              />
              <Tab
                label="Security Settings"
                icon={<ShieldCheck size={18} />}
                iconPosition="start"
                {...a11yProps(1)}
              />
            </Tabs>
          </Paper>

          {/* Error Alert */}
          {errorMessage && (
            <Alert
              severity="error"
              sx={{
                borderRadius: 0,
                borderTop: 0,
                borderLeft: 0,
                borderRight: 0,
                backgroundColor: alpha(theme.palette.error.main, 0.05),
              }}
              onClose={() => setErrorMessage("")}
              icon={<AlertTriangle size={20} />}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Profile Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 4 }}>
              {customer ? (
                <Formik
                  initialValues={{
                    companyName: customer.companyName || "",
                    contactEmail: customer.contactEmail || "",
                    contactPhoneNumber: customer.contactPhoneNumber || "",
                    taxNumber: customer.taxNumber || "",
                    addressLine1: customer.addressLine1 || "",
                    addressLine2: customer.addressLine2 || "",
                    postalCode: customer.postalCode || "",
                    city: customer.city || "",
                    country: customer.country || "",
                    deliveryAddressLine1: customer.deliveryAddressLine1 || "",
                    deliveryAddressLine2: customer.deliveryAddressLine2 || "",
                    deliveryPostalCode: customer.deliveryPostalCode || "",
                    deliveryCity: customer.deliveryCity || "",
                    deliveryCountry: customer.deliveryCountry || "",
                    avatar: null,
                  }}
                  validationSchema={profileValidationSchema}
                  onSubmit={handleProfileSubmit}
                >
                  {(formik) => (
                    <Form>
                      {/* Company Avatar Section */}
                      <SectionHeader
                        title="Company Branding"
                        subtitle="Upload your company logo and manage your business identity"
                        icon={<Image />}
                      >
                        <CustomButton
                          type="submit"
                          variant="contained"
                          startIcon={
                            loading ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <Save size={16} />
                            )
                          }
                          disabled={formik.isSubmitting || loading}
                          gradient={true}
                          rounded="medium"
                          hoverEffect="scale"
                          sx={{ fontWeight: 600 }}
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </CustomButton>
                      </SectionHeader>

                      <Card
                        sx={{
                          p: 3,
                          mb: 5,
                          backgroundColor: alpha(
                            theme.palette.background.default,
                            0.3
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.08
                          )}`,
                          borderRadius: 2,
                        }}
                      >
                        <Grid container spacing={3} alignItems="center">
                          <Grid item xs={12} sm="auto">
                            <Avatar
                              src={avatarPreview || "/placeholder-company.png"}
                              alt={customer.companyName || "Company Logo"}
                              sx={{
                                width: 100,
                                height: 100,
                                border: `4px solid ${theme.palette.background.paper}`,
                                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm>
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              gutterBottom
                              sx={{ fontSize: "1.1rem" }}
                            >
                              Company Logo
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                              sx={{ mb: 2, lineHeight: 1.5 }}
                            >
                              Upload a professional logo to represent your
                              business. <br />
                              <strong>Recommended:</strong> Square format,
                              400×400px, under 5MB
                            </Typography>

                            <input
                              type="file"
                              accept="image/*"
                              id="avatar-upload"
                              onChange={(event) =>
                                handleAvatarChange(event, formik.setFieldValue)
                              }
                              style={{ display: "none" }}
                            />
                            <label htmlFor="avatar-upload">
                              <CustomButton
                                component="span"
                                variant="outlined"
                                startIcon={<Upload size={16} />}
                                size="small"
                                rounded="medium"
                                hoverEffect="scale"
                                sx={{
                                  fontWeight: 600,
                                  borderWidth: 1.5,
                                }}
                              >
                                Choose New Logo
                              </CustomButton>
                            </label>
                          </Grid>
                        </Grid>
                      </Card>

                      {/* Company Information */}
                      <SectionHeader
                        title="Business Information"
                        subtitle="Your primary business details and contact information"
                        icon={<Building />}
                      />

                      <Grid container spacing={3} sx={{ mb: 5 }}>
                        <Grid item xs={12} md={6}>
                          <ProfessionalFormInput
                            icon={<Building />}
                            label="Company Name"
                            name="companyName"
                            placeholder="Enter your company name"
                            formik={formik}
                            helperText="The legal name of your business"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <ProfessionalFormInput
                            icon={<FileText />}
                            label="Tax Identification Number"
                            name="taxNumber"
                            placeholder="Enter tax number or business ID"
                            formik={formik}
                            helperText="Your business tax or registration number"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <ProfessionalFormInput
                            icon={<Mail />}
                            label="Business Email"
                            name="contactEmail"
                            type="email"
                            placeholder="business@company.com"
                            formik={formik}
                            helperText="Primary email for business communications"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <ProfessionalFormInput
                            icon={<Phone />}
                            label="Business Phone"
                            name="contactPhoneNumber"
                            placeholder="+1 (555) 123-4567"
                            formik={formik}
                            helperText="Main business contact number"
                          />
                        </Grid>
                      </Grid>

                      {/* Billing Address */}
                      <SectionHeader
                        title="Billing Address"
                        subtitle="Your company's registered business address for invoicing"
                        icon={<MapPin />}
                      />

                      <Grid container spacing={3} sx={{ mb: 5 }}>
                        <Grid item xs={12}>
                          <ProfessionalFormInput
                            icon={<MapPin />}
                            label="Street Address"
                            name="addressLine1"
                            placeholder="123 Business Street"
                            formik={formik}
                            helperText="Primary business address"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <ProfessionalFormInput
                            icon={<MapPin />}
                            label="Address Line 2"
                            name="addressLine2"
                            placeholder="Suite, floor, building details (optional)"
                            formik={formik}
                            helperText="Additional address information"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <ProfessionalFormInput
                            icon={<Globe />}
                            label="Delivery Country"
                            name="deliveryCountry"
                            placeholder="United States"
                            formik={formik}
                          />
                        </Grid>
                      </Grid>

                      {/* Save Button */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          pt: 3,
                          borderTop: `1px solid ${alpha(
                            theme.palette.divider,
                            0.08
                          )}`,
                        }}
                      >
                        <CustomButton
                          type="submit"
                          variant="contained"
                          startIcon={
                            loading ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <Save size={16} />
                            )
                          }
                          disabled={formik.isSubmitting || loading}
                          gradient={true}
                          rounded="medium"
                          hoverEffect="scale"
                          sx={{
                            fontWeight: 600,
                            minWidth: 140,
                            py: 1.2,
                          }}
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </CustomButton>
                      </Box>
                    </Form>
                  )}
                </Formik>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 8,
                  }}
                >
                  <Stack spacing={2} alignItems="center">
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary">
                      Loading profile information...
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Security/Password Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 4 }}>
              <Formik
                initialValues={{
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                }}
                validationSchema={passwordValidationSchema}
                onSubmit={handlePasswordSubmit}
              >
                {(formik) => (
                  <Form>
                    {/* Security Header */}
                    <SectionHeader
                      title="Password Management"
                      subtitle="Update your account password to keep your business data secure"
                      icon={<Lock />}
                    >
                      <CustomButton
                        type="submit"
                        variant="contained"
                        startIcon={
                          loading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Key size={16} />
                          )
                        }
                        disabled={
                          !formik.dirty || formik.isSubmitting || loading
                        }
                        gradient={true}
                        rounded="medium"
                        hoverEffect="scale"
                        sx={{ fontWeight: 600 }}
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </CustomButton>
                    </SectionHeader>

                    {/* Security Guidelines */}
                    <Card
                      sx={{
                        p: 3,
                        mb: 4,
                        backgroundColor: alpha(theme.palette.info.main, 0.05),
                        border: `1px solid ${alpha(
                          theme.palette.info.main,
                          0.2
                        )}`,
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
                      >
                        <Info size={24} color={theme.palette.info.main} />
                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            gutterBottom
                            color={theme.palette.info.main}
                            sx={{ fontSize: "1rem" }}
                          >
                            Password Security Requirements
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ lineHeight: 1.6, mb: 2 }}
                          >
                            To ensure the security of your business account,
                            your password must meet the following criteria:
                          </Typography>
                          <Stack spacing={1}>
                            <Chip
                              label="Minimum 8 characters"
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: alpha(
                                  theme.palette.info.main,
                                  0.3
                                ),
                                color: theme.palette.info.main,
                              }}
                            />
                            <Chip
                              label="At least one uppercase letter (A-Z)"
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: alpha(
                                  theme.palette.info.main,
                                  0.3
                                ),
                                color: theme.palette.info.main,
                              }}
                            />
                            <Chip
                              label="At least one lowercase letter (a-z)"
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: alpha(
                                  theme.palette.info.main,
                                  0.3
                                ),
                                color: theme.palette.info.main,
                              }}
                            />
                            <Chip
                              label="At least one number (0-9)"
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: alpha(
                                  theme.palette.info.main,
                                  0.3
                                ),
                                color: theme.palette.info.main,
                              }}
                            />
                            <Chip
                              label="At least one special character (@$!%*?&)"
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: alpha(
                                  theme.palette.info.main,
                                  0.3
                                ),
                                color: theme.palette.info.main,
                              }}
                            />
                          </Stack>
                        </Box>
                      </Box>
                    </Card>

                    {/* Password Form */}
                    <Grid container spacing={4}>
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          component="label"
                          htmlFor="currentPassword"
                          fontWeight={600}
                          sx={{
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            color: theme.palette.text.primary,
                            fontSize: "0.875rem",
                          }}
                        >
                          <Key size={18} color={theme.palette.primary.main} />
                          Current Password{" "}
                          <span style={{ color: theme.palette.error.main }}>
                            *
                          </span>
                        </Typography>
                        <TextField
                          fullWidth
                          id="currentPassword"
                          name="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter your current password"
                          value={formik.values.currentPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.currentPassword &&
                            Boolean(formik.errors.currentPassword)
                          }
                          helperText={
                            formik.touched.currentPassword &&
                            formik.errors.currentPassword
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowCurrentPassword(!showCurrentPassword)
                                  }
                                  edge="end"
                                  sx={{ mr: 0.5 }}
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              backgroundColor: alpha(
                                theme.palette.background.paper,
                                0.8
                              ),
                              transition: "all 0.2s ease-in-out",
                              "&.Mui-focused": {
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: theme.palette.primary.main,
                                  borderWidth: 2,
                                  boxShadow: `0 0 0 3px ${alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  )}`,
                                },
                              },
                              "&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline":
                                {
                                  borderColor: alpha(
                                    theme.palette.primary.main,
                                    0.7
                                  ),
                                },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: alpha(theme.palette.divider, 0.3),
                                borderWidth: 1.5,
                              },
                            },
                            "& .MuiInputBase-input": {
                              py: 1.5,
                              px: 1.5,
                              fontSize: "0.875rem",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="body2"
                          component="label"
                          htmlFor="newPassword"
                          fontWeight={600}
                          sx={{
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            color: theme.palette.text.primary,
                            fontSize: "0.875rem",
                          }}
                        >
                          <Lock size={18} color={theme.palette.primary.main} />
                          New Password{" "}
                          <span style={{ color: theme.palette.error.main }}>
                            *
                          </span>
                        </Typography>
                        <TextField
                          fullWidth
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new secure password"
                          value={formik.values.newPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.newPassword &&
                            Boolean(formik.errors.newPassword)
                          }
                          helperText={
                            formik.touched.newPassword &&
                            formik.errors.newPassword
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                  }
                                  edge="end"
                                  sx={{ mr: 0.5 }}
                                >
                                  {showNewPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              backgroundColor: alpha(
                                theme.palette.background.paper,
                                0.8
                              ),
                              transition: "all 0.2s ease-in-out",
                              "&.Mui-focused": {
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: theme.palette.primary.main,
                                  borderWidth: 2,
                                  boxShadow: `0 0 0 3px ${alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  )}`,
                                },
                              },
                              "&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline":
                                {
                                  borderColor: alpha(
                                    theme.palette.primary.main,
                                    0.7
                                  ),
                                },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: alpha(theme.palette.divider, 0.3),
                                borderWidth: 1.5,
                              },
                            },
                            "& .MuiInputBase-input": {
                              py: 1.5,
                              px: 1.5,
                              fontSize: "0.875rem",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="body2"
                          component="label"
                          htmlFor="confirmPassword"
                          fontWeight={600}
                          sx={{
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            color: theme.palette.text.primary,
                            fontSize: "0.875rem",
                          }}
                        >
                          <Lock size={18} color={theme.palette.primary.main} />
                          Confirm New Password{" "}
                          <span style={{ color: theme.palette.error.main }}>
                            *
                          </span>
                        </Typography>
                        <TextField
                          fullWidth
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your new password"
                          value={formik.values.confirmPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.confirmPassword &&
                            Boolean(formik.errors.confirmPassword)
                          }
                          helperText={
                            formik.touched.confirmPassword &&
                            formik.errors.confirmPassword
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  edge="end"
                                  sx={{ mr: 0.5 }}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              backgroundColor: alpha(
                                theme.palette.background.paper,
                                0.8
                              ),
                              transition: "all 0.2s ease-in-out",
                              "&.Mui-focused": {
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: theme.palette.primary.main,
                                  borderWidth: 2,
                                  boxShadow: `0 0 0 3px ${alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  )}`,
                                },
                              },
                              "&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline":
                                {
                                  borderColor: alpha(
                                    theme.palette.primary.main,
                                    0.7
                                  ),
                                },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: alpha(theme.palette.divider, 0.3),
                                borderWidth: 1.5,
                              },
                            },
                            "& .MuiInputBase-input": {
                              py: 1.5,
                              px: 1.5,
                              fontSize: "0.875rem",
                            },
                          }}
                        />
                      </Grid>
                    </Grid>

                    {/* Password Strength Indicators */}
                    {formik.values.newPassword && (
                      <Card
                        sx={{
                          p: 3,
                          mt: 4,
                          mb: 4,
                          backgroundColor: alpha(
                            theme.palette.background.default,
                            0.3
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.08
                          )}`,
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          gutterBottom
                          sx={{
                            mb: 2,
                            fontSize: "1rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <ShieldCheck
                            size={18}
                            color={theme.palette.primary.main}
                          />
                          Password Strength Check
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={3}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: /[A-Z]/.test(
                                  formik.values.newPassword
                                )
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.grey[400], 0.1),
                                border: `1px solid ${
                                  /[A-Z]/.test(formik.values.newPassword)
                                    ? alpha(theme.palette.success.main, 0.3)
                                    : alpha(theme.palette.grey[400], 0.3)
                                }`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: /[A-Z]/.test(
                                    formik.values.newPassword
                                  )
                                    ? theme.palette.success.main
                                    : theme.palette.grey[400],
                                  color: "white",
                                }}
                              >
                                {/[A-Z]/.test(formik.values.newPassword) ? (
                                  <Check size={12} />
                                ) : (
                                  <X size={12} />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Uppercase
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: /[a-z]/.test(
                                  formik.values.newPassword
                                )
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.grey[400], 0.1),
                                border: `1px solid ${
                                  /[a-z]/.test(formik.values.newPassword)
                                    ? alpha(theme.palette.success.main, 0.3)
                                    : alpha(theme.palette.grey[400], 0.3)
                                }`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: /[a-z]/.test(
                                    formik.values.newPassword
                                  )
                                    ? theme.palette.success.main
                                    : theme.palette.grey[400],
                                  color: "white",
                                }}
                              >
                                {/[a-z]/.test(formik.values.newPassword) ? (
                                  <Check size={12} />
                                ) : (
                                  <X size={12} />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Lowercase
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: /\d/.test(
                                  formik.values.newPassword
                                )
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.grey[400], 0.1),
                                border: `1px solid ${
                                  /\d/.test(formik.values.newPassword)
                                    ? alpha(theme.palette.success.main, 0.3)
                                    : alpha(theme.palette.grey[400], 0.3)
                                }`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: /\d/.test(formik.values.newPassword)
                                    ? theme.palette.success.main
                                    : theme.palette.grey[400],
                                  color: "white",
                                }}
                              >
                                {/\d/.test(formik.values.newPassword) ? (
                                  <Check size={12} />
                                ) : (
                                  <X size={12} />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Number
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: /[@$!%*?&]/.test(
                                  formik.values.newPassword
                                )
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.grey[400], 0.1),
                                border: `1px solid ${
                                  /[@$!%*?&]/.test(formik.values.newPassword)
                                    ? alpha(theme.palette.success.main, 0.3)
                                    : alpha(theme.palette.grey[400], 0.3)
                                }`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: /[@$!%*?&]/.test(
                                    formik.values.newPassword
                                  )
                                    ? theme.palette.success.main
                                    : theme.palette.grey[400],
                                  color: "white",
                                }}
                              >
                                {/[@$!%*?&]/.test(formik.values.newPassword) ? (
                                  <Check size={12} />
                                ) : (
                                  <X size={12} />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                sx={{ fontSize: "0.8rem" }}
                              >
                                Special
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor:
                                  formik.values.newPassword.length >= 8
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : alpha(theme.palette.grey[400], 0.1),
                                border: `1px solid ${
                                  formik.values.newPassword.length >= 8
                                    ? alpha(theme.palette.success.main, 0.3)
                                    : alpha(theme.palette.grey[400], 0.3)
                                }`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor:
                                    formik.values.newPassword.length >= 8
                                      ? theme.palette.success.main
                                      : theme.palette.grey[400],
                                  color: "white",
                                }}
                              >
                                {formik.values.newPassword.length >= 8 ? (
                                  <Check size={12} />
                                ) : (
                                  <X size={12} />
                                )}
                              </Box>
                              <Typography variant="body2" fontWeight={500}>
                                Minimum 8 characters (
                                {formik.values.newPassword.length}/8)
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    )}

                    {/* Submit Button */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        pt: 3,
                        borderTop: `1px solid ${alpha(
                          theme.palette.divider,
                          0.08
                        )}`,
                      }}
                    >
                      <CustomButton
                        type="submit"
                        variant="contained"
                        startIcon={
                          loading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Key size={16} />
                          )
                        }
                        disabled={
                          !formik.dirty || formik.isSubmitting || loading
                        }
                        gradient={true}
                        rounded="medium"
                        hoverEffect="scale"
                        sx={{
                          fontWeight: 600,
                          minWidth: 160,
                          py: 1.2,
                        }}
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </CustomButton>
                    </Box>
                  </Form>
                )}
              </Formik>
            </Box>
          </TabPanel>
        </Card>
      </Container>
    </Box>
  );
};

export default SettingsPage;
