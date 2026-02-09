"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { UserRole } from "@/utils/interfaces";
import {
  LucideArrowLeft,
  LucideSave,
  LucidePlus,
  LucideTrash2,
  LucideShield,
  LucideUser,
  LucideCheck,
  LucideMail,
  LucideLock,
  LucideX,
  LucideCalendar,
  LucidePhone,
  LucideMapPin,
  PenTool,
  Globe,
  LucideChevronDown,
  LucideChevronUp,
} from "lucide-react";
import {
  Dialog,
  Typography,
  MenuItem,
  FormControl,
  Select,
  Button,
  Box,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  alpha,
  useTheme,
  Snackbar,
  Collapse,
} from "@mui/material";
import theme from "@/styles/theme";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createNewUser } from "@/api/user";
import CustomButton from "@/components/UI/CustomButton";
import { availableResources } from "@/utils/resources";

interface Permission {
  id: string;
  resource: string;
  actions: string[];
}

interface ResourceConfig {
  name: string;
  description: string;
  actions: string[];
}

interface FormValues {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  gender: string;
  role: UserRole;
  password: string;
  country: string;
  assignedResources: string[];
}

// Updated validation schema - only name, email, and role are required
const validationSchema = Yup.object({
  name: Yup.string().required("Full name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  role: Yup.string().required("Role is required"),
  // Optional fields - no validation required
  phoneNumber: Yup.string().matches(
    /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    "Invalid phone number"
  ),
  dateOfBirth: Yup.date(),
  address: Yup.string(),
  gender: Yup.string(),
  password: Yup.string().min(8, "Password must be at least 8 characters"),
  country: Yup.string(),
});

// Expanded resource configuration with descriptions
// Resource configuration moved to @/utils/resources


// Countries list for dropdown
const countries = [
  "Afghanistan",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "India",
  "Japan",
  "China",
  "Brazil",
  "South Africa",
  "Mexico",
  "Spain",
  "Italy",
  "Pakistan",
  "United Arab Emirates",
  "Russia",
  "Saudi Arabia",
  "Singapore",
];

const UserCreatePage: React.FC = () => {
  const router = useRouter();
  const muiTheme = useTheme();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showResourceDialog, setShowResourceDialog] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showOptionalFields, setShowOptionalFields] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{
    show: boolean;
    message: string;
    severity: "info" | "success" | "error";
  }>({
    show: false,
    message: "",
    severity: "info",
  });

  const formik = useFormik<FormValues>({
    initialValues: {
      name: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      address: "",
      gender: "",
      role: UserRole.STAFF,
      password: "",
      country: "",
      assignedResources: [],
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);

        const userData: any = {
          name: values.name,
          email: values.email,
          role: values.role,
          ...(values.phoneNumber && { phoneNumber: values.phoneNumber }),
          ...(values.dateOfBirth && { dateOfBirth: values.dateOfBirth }),
          ...(values.address && { address: values.address }),
          ...(values.gender && { gender: values.gender }),
          ...(values.password && { password: values.password }),
          ...(values.country && { country: values.country }),
          assignedResources: permissions.map((p) => p.resource),
          permissions: permissions.map((p) => ({
            resource: p.resource,
            actions: p.actions,
          })),
        };

        await createNewUser(userData);

        setTimeout(() => {
          router.push("/users");
        }, 1500);
      } catch (error) {
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleAddResource = (resourceName: string): void => {
    // Add to form's assignedResources
    if (!permissions.some((p) => p.resource === resourceName)) {
      setPermissions((prev) => [
        ...prev,
        { id: Math.random().toString(), resource: resourceName, actions: [] },
      ]);
    }
    setShowResourceDialog(false);
  };

  const handleRemoveResource = (resourceName: string): void => {
    setPermissions((prev) => prev.filter((p) => p.resource !== resourceName));
  };

  const handlePermissionChange = (resource: string, action: string): void => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.resource === resource
          ? {
            ...p,
            actions: p.actions.includes(action)
              ? p.actions.filter((a) => a !== action)
              : [...p.actions, action],
          }
          : p
      )
    );
  };

  // Generate a random password
  const generateRandomPassword = (): void => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    formik.setFieldValue("password", password);
  };

  // Handle alert close
  const handleAlertClose = (): void => {
    setAlertInfo({ ...alertInfo, show: false });
  };

  return (
    <div className="w-full mx-auto">
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          mx: "auto",
          maxWidth: 1200,
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: "background.paper",
          }}
        >
          <Link
            href="/users"
            style={{
              display: "flex",
              alignItems: "center",
              color: theme.palette.primary.main,
            }}
          >
            <IconButton
              sx={{
                color: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.15) },
              }}
            >
              <LucideArrowLeft size={20} />
            </IconButton>
          </Link>

          <Box>
            <Typography
              variant="h4"
              sx={{
                color: "secondary.main",
                fontSize: { xs: "1.5rem", md: "1.75rem" },
                fontWeight: 600,
              }}
            >
              Create New User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a new user account with custom permissions and role assignment
            </Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ p: 3 }}>
          {/* Required Fields Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-primary-main bg-primary-50 p-2 rounded-lg">
                <LucideUser size={20} />
              </div>
              <Typography
                variant="h6"
                fontWeight={600}
                fontSize="18px"
                sx={{ color: "secondary.main" }}
              >
                Required Information
              </Typography>
              <div className="ml-2 px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded">
                Required
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <FormInput
                  name="name"
                  label="Full Name"
                  icon={<LucideUser size={20} />}
                  formik={formik}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <FormInput
                  name="email"
                  label="Email Address"
                  icon={<LucideMail size={20} />}
                  formik={formik}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div>
                <FormSelect
                  name="role"
                  label="User Role"
                  options={Object.values(UserRole).map((role) => ({
                    value: role,
                    label: role.charAt(0) + role.slice(1).toLowerCase(),
                  }))}
                  formik={formik}
                  icon={<PenTool size={20} />}
                  helperText="Role determines base access level"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Fields Collapsible Section */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-main transition-colors mb-2"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <LucideUser size={20} />
                </div>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  fontSize="18px"
                  sx={{ color: "secondary.main" }}
                >
                  Additional Information
                </Typography>
                <div className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                  Optional
                </div>
              </div>
              <div className="text-gray-500">
                {showOptionalFields ? (
                  <LucideChevronUp size={20} />
                ) : (
                  <LucideChevronDown size={20} />
                )}
              </div>
            </button>

            <Collapse in={showOptionalFields}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <FormInput
                    name="phoneNumber"
                    label="Phone Number"
                    icon={<LucidePhone size={20} />}
                    formik={formik}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <FormInput
                    name="dateOfBirth"
                    label="Date of Birth"
                    type="date"
                    icon={<LucideCalendar size={20} />}
                    formik={formik}
                  />
                </div>

                <div>
                  <FormSelect
                    name="gender"
                    label="Gender"
                    options={[
                      { value: "MALE", label: "Male" },
                      { value: "FEMALE", label: "Female" },
                    ]}
                    formik={formik}
                    icon={<LucideUser size={20} />}
                  />
                </div>

                <div>
                  <FormSelect
                    name="country"
                    label="Country"
                    options={countries.map((country) => ({
                      value: country,
                      label: country,
                    }))}
                    formik={formik}
                    icon={<Globe size={20} />}
                  />
                </div>

                <div>
                  <Box position="relative">
                    <FormInput
                      name="password"
                      label="Temporary Password"
                      type="text"
                      icon={<LucideLock size={20} />}
                      formik={formik}
                      helperText="This password will be emailed to the user"
                      InputProps={{
                        endAdornment: (
                          <Button
                            size="small"
                            onClick={generateRandomPassword}
                            variant="outlined"
                            sx={{ position: "absolute", right: 8, top: 8 }}
                          >
                            Generate
                          </Button>
                        ),
                      }}
                    />
                  </Box>
                </div>

                <div className="md:col-span-2">
                  <FormInput
                    name="address"
                    label="Address"
                    icon={<LucideMapPin size={20} />}
                    formik={formik}
                    placeholder="123 Main St, City, State, Zip"
                    multiline
                    rows={2}
                  />
                </div>
              </div>
            </Collapse>
          </div>

          {/* Beautiful Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-indigo-100"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-500">
                Permissions
              </span>
            </div>
          </div>

          {/* Access Permissions Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-primary-main bg-primary-50 p-2 rounded-lg">
                <LucideShield size={20} />
              </div>
              <Typography
                variant="h6"
                fontWeight={600}
                fontSize="18px"
                sx={{ color: "secondary.main" }}
              >
                Access Permissions
              </Typography>
              <div className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                Optional
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowResourceDialog(true)}
              className="w-full py-3 min-h-[80px] border-2 border-dashed border-gray-200 rounded-lg hover:border-primary-main transition-colors text-gray-600 hover:text-primary-main flex items-center justify-center gap-2 mb-6"
            >
              <LucidePlus size={20} />
              Add Resource
            </button>

            {permissions.length === 0 ? (
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-100">
                <Typography variant="body1" color="text.secondary">
                  No resources assigned yet. Click "Add Resource" to assign
                  permissions.
                </Typography>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {permissions.map((permission) => {
                  const resourceConfig = availableResources.find(
                    (r) => r.name === permission.resource
                  );

                  return (
                    <div
                      key={permission.id}
                      className="border rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex justify-between items-center border-b border-indigo-100">
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            color: "secondary.main",
                          }}
                        >
                          {permission.resource}
                        </Typography>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveResource(permission.resource)
                          }
                          className="text-error-main hover:bg-error-50 p-1 rounded-lg"
                        >
                          <LucideTrash2 size={18} />
                        </button>
                      </div>

                      <div className="p-4">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {resourceConfig?.description ||
                            "Resource permissions"}
                        </Typography>

                        <div className="flex flex-wrap gap-2">
                          {resourceConfig?.actions.map((action) => {
                            const isActive =
                              permission.actions.includes(action);

                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() =>
                                  handlePermissionChange(
                                    permission.resource,
                                    action
                                  )
                                }
                                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${isActive
                                  ? `bg-[#8CC21B] text-white`
                                  : "bg-white border border-gray-200 text-gray-700 hover:border-primary-light"
                                  }`}
                              >
                                {isActive && <LucideCheck size={16} />}
                                <span>
                                  {action.charAt(0).toUpperCase() +
                                    action.slice(1)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="border-t border-indigo-100 pt-6 mt-6 flex justify-end">
            <CustomButton
              type="submit"
              disabled={isSubmitting}
              gradient={true}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={16} />
                ) : (
                  <LucideSave size={16} />
                )
              }
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </CustomButton>
          </div>
        </Box>

        <Dialog
          open={showResourceDialog}
          onClose={() => setShowResourceDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            elevation: 3,
            sx: {
              borderRadius: 2,
            },
          }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "secondary.main" }}
              >
                Select Resource
              </Typography>

              <button
                onClick={() => setShowResourceDialog(false)}
                className="text-gray-400 hover:bg-gray-100 p-1 rounded-lg"
              >
                <LucideX size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableResources
                .filter((resource) => !resource.adminOnly)
                .map((resource) => {
                  const isAssigned = permissions.some(
                    (p) => p.resource === resource.name
                  );

                  return (
                    <div
                      key={resource.name}
                      onClick={() =>
                        !isAssigned && handleAddResource(resource.name)
                      }
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${isAssigned
                        ? "bg-blue-50 border-indigo-200 opacity-70 cursor-not-allowed"
                        : "hover:border-indigo-300 hover:bg-blue-50"
                        }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{resource.name}</h3>
                        {isAssigned && (
                          <div className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <LucideCheck size={12} />
                            Added
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {resource.description}
                      </p>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="contained"
                onClick={() => setShowResourceDialog(false)}
                sx={{
                  background:
                    "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #4338ca 0%, #4f46e5 100%)",
                  },
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </Dialog>

        <Snackbar
          open={alertInfo.show}
          autoHideDuration={6000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleAlertClose}
            severity={alertInfo.severity}
            sx={{ width: "100%" }}
          >
            {alertInfo.message}
          </Alert>
        </Snackbar>
      </Paper>
    </div>
  );
};

interface FormInputProps {
  name: string;
  label: string;
  type?: string;
  icon: React.ReactNode;
  formik: any;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  InputProps?: any;
  required?: boolean;
  [x: string]: any;
}

const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  type = "text",
  icon,
  formik,
  placeholder,
  helperText,
  multiline = false,
  rows = 1,
  InputProps,
  required = false,
  ...props
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium font-roboto text-gray-700 block">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-3 text-gray-500">{icon}</div>
      <TextField
        fullWidth
        id={name}
        name={name}
        type={type}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched[name] && Boolean(formik.errors[name])}
        helperText={
          formik.touched[name] && formik.errors[name]
            ? formik.errors[name]
            : helperText
        }
        placeholder={placeholder}
        multiline={multiline}
        rows={rows}
        InputProps={{
          sx: { paddingLeft: "38px" },
          ...InputProps,
        }}
        sx={{
          fontFamily: "Roboto, sans-serif",
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "rgba(0, 0, 0, 0.15)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(0, 0, 0, 0.3)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#4f46e5",
            },
          },
        }}
        {...props}
      />
    </div>
  </div>
);

interface FormSelectProps {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  formik: any;
  icon: React.ReactNode;
  helperText?: string;
  required?: boolean;
  [x: string]: any;
}

const FormSelect: React.FC<FormSelectProps> = ({
  name,
  label,
  options,
  formik,
  icon,
  helperText,
  required = false,
  ...props
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-gray-700 block">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-3 z-10 text-gray-500">{icon}</div>
      <FormControl
        fullWidth
        error={formik.touched[name] && Boolean(formik.errors[name])}
      >
        <Select
          id={name}
          name={name}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          displayEmpty
          sx={{
            "& .MuiSelect-select": {
              paddingLeft: "38px",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(0, 0, 0, 0.15)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(0, 0, 0, 0.3)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#4f46e5",
            },
          }}
          renderValue={(selected) => {
            if (selected === "") {
              return <span className="text-gray-400">Select {label}</span>;
            }
            const selectedOption = options.find(
              (opt) => opt.value === selected
            );
            return selectedOption ? selectedOption.label : selected;
          }}
          {...props}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {((formik.touched[name] && formik.errors[name]) || helperText) && (
          <Typography
            variant="caption"
            color={
              formik.touched[name] && formik.errors[name]
                ? "error"
                : "text.secondary"
            }
            sx={{ mt: 0.5, ml: 0.5 }}
          >
            {formik.touched[name] && formik.errors[name]
              ? formik.errors[name]
              : helperText}
          </Typography>
        )}
      </FormControl>
    </div>
  </div>
);

export default UserCreatePage;
