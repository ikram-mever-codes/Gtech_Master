"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  TextField,
  Avatar,
  IconButton,
  Button,
  InputAdornment,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  Snackbar,
  Stack,
  LinearProgress,
} from "@mui/material";
import {
  Building,
  Mail,
  Phone,
  FileText,
  MapPin,
  Globe,
  Lock,
  Key,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Upload,
  LogOut,
  ShieldCheck,
  Bell,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/Redux/store";
import {
  updateCustomerProfile,
  prepareCustomerProfileFormData,
  changeCustomerPassword,
  logoutCustomer,
} from "@/api/customer";

// Validation Schemas
const profileSchema = Yup.object({
  companyName: Yup.string(),
  legalName: Yup.string(),
  contactEmail: Yup.string().email("Invalid email"),
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

const passwordSchema = Yup.object({
  currentPassword: Yup.string().required("Current password required"),
  newPassword: Yup.string()
    .min(8, "Min 8 characters")
    .required("New password required")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Must contain uppercase, lowercase, number & special character"
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords must match")
    .required("Confirm password required"),
});

// Custom Input Component
const FormInput = ({
  icon,
  label,
  name,
  type = "text",
  formik,
  placeholder,
  endAdornment,
  ...props
}: any) => {
  const theme = useTheme();

  return (
    <div className="mb-4">
      <Typography
        variant="body2"
        fontWeight={600}
        className="mb-2 flex items-center gap-2"
      >
        {React.cloneElement(icon, {
          size: 16,
          color: theme.palette.primary.main,
        })}
        {label}
      </Typography>
      <TextField
        fullWidth
        name={name}
        type={type}
        placeholder={placeholder}
        value={formik.values[name] || ""}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched[name] && Boolean(formik.errors[name])}
        helperText={formik.touched[name] && formik.errors[name]}
        InputProps={{ endAdornment }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 1,
            transition: "all 0.2s",
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          },
        }}
        {...props}
      />
    </div>
  );
};

// Password Strength Component
const PasswordStrength = ({ password }: any) => {
  const checks = [
    { test: /[A-Z]/, label: "Uppercase" },
    { test: /[a-z]/, label: "Lowercase" },
    { test: /\d/, label: "Number" },
    { test: /[@$!%*?&]/, label: "Special" },
    { test: /.{8,}/, label: "8+ chars" },
  ];

  const score = checks.filter((check) => check.test.test(password)).length;

  return (
    <Card sx={{ p: 3, mt: 3, bgcolor: "background.default", borderRadius: 1 }}>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <ShieldCheck size={16} />
        Password Strength
      </Typography>
      <LinearProgress
        variant="determinate"
        value={(score / checks.length) * 100}
        sx={{ mb: 2, height: 6, borderRadius: 1 }}
        color={score < 3 ? "error" : score < 5 ? "warning" : "success"}
      />
      <div className="grid grid-cols-5 gap-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                check.test.test(password) ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              {check.test.test(password) && (
                <CheckCircle size={12} color="white" />
              )}
            </div>
            <Typography
              variant="caption"
              className={
                check.test.test(password) ? "text-green-500" : "text-gray-500"
              }
            >
              {check.label}
            </Typography>
          </div>
        ))}
      </div>
    </Card>
  );
};

const SettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { customer } = useSelector((state: RootState) => state.customer);

  useEffect(() => {
    if (customer?.avatar) setAvatarPreview(customer.avatar);
  }, [customer]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setFieldValue: any
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be under 5MB" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please upload a valid image" });
      return;
    }

    setFieldValue("file", file);
    try {
      const base64 = await fileToBase64(file);
      setAvatarPreview(base64);
    } catch (error) {
      setMessage({ type: "error", text: "Error processing image" });
    }
  };

  const handleProfileSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const formData = prepareCustomerProfileFormData(values);
      await updateCustomerProfile(formData, dispatch);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (
    values: any,
    { setSubmitting, resetForm }: any
  ) => {
    try {
      setLoading(true);
      await changeCustomerPassword(values.currentPassword, values.newPassword);
      setMessage({ type: "success", text: "Password updated successfully!" });
      resetForm();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update password",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <Container maxWidth="lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <IconButton
              onClick={() => window.history.back()}
              sx={{ bgcolor: "background.paper" }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <div>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  background:
                    "linear-gradient(135deg, #8CC21B 0%, #4CAF50 100%)",
                  backgroundClip: "text",
                  textFillColor: "transparent",
                }}
              >
                Account Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your business profile and security settings
              </Typography>
            </div>
          </div>

          <Stack direction="row" spacing={1}>
            <IconButton sx={{ bgcolor: "background.paper" }}>
              <HelpCircle size={18} />
            </IconButton>

            <Button
              variant="outlined"
              startIcon={<LogOut size={16} />}
              onClick={() => logoutCustomer(dispatch)}
              color="error"
            >
              Sign Out
            </Button>
          </Stack>
        </div>

        {/* Success/Error Snackbar */}
        <Snackbar
          open={!!message.text}
          autoHideDuration={5000}
          onClose={() => setMessage({ type: "", text: "" })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity={message.type as any}
            onClose={() => setMessage({ type: "", text: "" })}
            variant="filled"
          >
            {message.text}
          </Alert>
        </Snackbar>

        {/* Main Card */}
        <Card sx={{ borderRadius: 1, overflow: "hidden" }}>
          {/* Tabs */}
          <Paper sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ px: 3 }}
            >
              <Tab
                label="Business Profile"
                icon={<Building size={18} />}
                iconPosition="start"
                sx={{ textTransform: "none", fontWeight: 600 }}
              />
              <Tab
                label="Security"
                icon={<ShieldCheck size={18} />}
                iconPosition="start"
                sx={{ textTransform: "none", fontWeight: 600 }}
              />
            </Tabs>
          </Paper>

          {/* Profile Tab */}
          {tabValue === 0 && (
            <div className="p-6">
              {customer ? (
                <Formik
                  initialValues={{
                    companyName: customer.companyName || "",
                    legalName: customer.legalName || "",
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
                  validationSchema={profileSchema}
                  onSubmit={handleProfileSubmit}
                >
                  {(formik) => (
                    <Form>
                      {/* Avatar Section */}
                      <Card className="p-4 mb-6 bg-gray-50 rounded">
                        <div className="flex items-center gap-4">
                          <Avatar
                            src={avatarPreview || "/placeholder-company.png"}
                            alt="Company Logo"
                            sx={{ width: 80, height: 80 }}
                          />
                          <div className="flex-1">
                            <Typography variant="h6" gutterBottom>
                              Company Logo
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Upload a professional logo (Square format, max
                              5MB)
                            </Typography>
                            <input
                              type="file"
                              accept="image/*"
                              id="avatar-upload"
                              onChange={(e) =>
                                handleAvatarChange(e, formik.setFieldValue)
                              }
                              style={{ display: "none" }}
                            />
                            <label htmlFor="avatar-upload">
                              <Button
                                component="span"
                                variant="outlined"
                                startIcon={<Upload size={16} />}
                              >
                                Upload Logo
                              </Button>
                            </label>
                          </div>
                        </div>
                      </Card>

                      {/* Business Information */}
                      <div className="mb-6">
                        <Typography
                          variant="h6"
                          gutterBottom
                          className="flex items-center gap-2 mb-4"
                        >
                          <Building
                            size={20}
                            color={theme.palette.primary.main}
                          />
                          Business Information
                        </Typography>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormInput
                            icon={<Building />}
                            label="Company Name"
                            name="companyName"
                            placeholder="Enter company name"
                            formik={formik}
                          />{" "}
                          <FormInput
                            icon={<Building />}
                            label="Company Legal Name"
                            name="legalName"
                            placeholder="Enter the legal name of your company"
                            formik={formik}
                          />
                          <FormInput
                            icon={<FileText />}
                            label="Tax Number"
                            name="taxNumber"
                            placeholder="Enter tax number"
                            formik={formik}
                          />
                          <FormInput
                            icon={<Mail />}
                            label="Business Email"
                            name="contactEmail"
                            type="email"
                            placeholder="business@company.com"
                            formik={formik}
                          />
                          <FormInput
                            icon={<Phone />}
                            label="Phone Number"
                            name="contactPhoneNumber"
                            placeholder="+1 (555) 123-4567"
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="Address Line 1"
                            name="addressLine1"
                            placeholder="123 Business Street"
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="Address Line 2"
                            name="addressLine2"
                            placeholder="Suite, floor, etc."
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="Postal Code"
                            name="postalCode"
                            placeholder="12345"
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="City"
                            name="city"
                            placeholder="City"
                            formik={formik}
                          />
                          <FormInput
                            icon={<Globe />}
                            label="Country"
                            name="country"
                            placeholder="Country"
                            formik={formik}
                          />
                        </div>
                      </div>

                      {/* Delivery Address Section */}
                      <div className="mb-6">
                        <Typography
                          variant="h6"
                          gutterBottom
                          className="flex items-center gap-2 mb-4"
                        >
                          <MapPin
                            size={20}
                            color={theme.palette.primary.main}
                          />
                          Delivery Address
                        </Typography>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormInput
                            icon={<MapPin />}
                            label="Delivery Address Line 1"
                            name="deliveryAddressLine1"
                            placeholder="123 Delivery Street"
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="Delivery Address Line 2"
                            name="deliveryAddressLine2"
                            placeholder="Suite, floor, etc."
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="Delivery Postal Code"
                            name="deliveryPostalCode"
                            placeholder="12345"
                            formik={formik}
                          />
                          <FormInput
                            icon={<MapPin />}
                            label="Delivery City"
                            name="deliveryCity"
                            placeholder="City"
                            formik={formik}
                          />
                          <FormInput
                            icon={<Globe />}
                            label="Delivery Country"
                            name="deliveryCountry"
                            placeholder="Country"
                            formik={formik}
                          />
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={
                            loading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Save size={16} />
                            )
                          }
                          disabled={loading}
                          sx={{ minWidth: 140 }}
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              ) : (
                <div className="flex justify-center py-12">
                  <CircularProgress />
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {tabValue === 1 && (
            <div className="p-6 flex justify-center">
              <div className="w-full max-w-md">
                <Formik
                  initialValues={{
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  }}
                  validationSchema={passwordSchema}
                  onSubmit={handlePasswordSubmit}
                >
                  {(formik) => (
                    <Form>
                      <Typography
                        variant="h6"
                        gutterBottom
                        className="flex items-center justify-center gap-2 mb-6 text-center"
                      >
                        <Lock size={20} color={theme.palette.primary.main} />
                        Change Password
                      </Typography>

                      <div className="space-y-4">
                        <FormInput
                          icon={<Key />}
                          label="Current Password"
                          name="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          placeholder="Enter current password"
                          formik={formik}
                          endAdornment={
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() =>
                                  togglePasswordVisibility("current")
                                }
                              >
                                {showPasswords.current ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          }
                        />
                        <FormInput
                          icon={<Lock />}
                          label="New Password"
                          name="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          placeholder="Enter new password"
                          formik={formik}
                          endAdornment={
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => togglePasswordVisibility("new")}
                              >
                                {showPasswords.new ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          }
                        />
                        <FormInput
                          icon={<Lock />}
                          label="Confirm Password"
                          name="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          placeholder="Confirm new password"
                          formik={formik}
                          endAdornment={
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() =>
                                  togglePasswordVisibility("confirm")
                                }
                              >
                                {showPasswords.confirm ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          }
                        />
                      </div>

                      {/* Password Strength */}
                      {formik.values.newPassword && (
                        <PasswordStrength
                          password={formik.values.newPassword}
                        />
                      )}

                      {/* Update Button */}
                      <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={
                            loading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Key size={16} />
                            )
                          }
                          disabled={!formik.dirty || loading}
                          sx={{ minWidth: 200 }}
                        >
                          {loading ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          )}
        </Card>
      </Container>
    </div>
  );
};

export default SettingsPage;
