"use client";
import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import theme from "@/styles/theme";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { getUserById, updateUserFunction as updateUserApi } from "@/api/user";
import CustomButton from "@/components/UI/CustomButton";
import { useParams } from "next/navigation";
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
  country: string;
  assignedResources: string[];
  partnerName: string;
  emergencyContact: string;
  joiningDate: string;
  isLoginEnabled: boolean;
}

const validationSchema = Yup.object({
  name: Yup.string().required("Full name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phoneNumber: Yup.string()
    .matches(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      "Invalid phone number"
    )
    .required("Phone number is required"),
  dateOfBirth: Yup.date().required("Date of birth is required"),
  address: Yup.string().required("Address is required"),
  gender: Yup.string().required("Gender is required"),
  role: Yup.string().required("Role is required"),
  country: Yup.string().required("Country is required"),
  partnerName: Yup.string(),
  emergencyContact: Yup.string()
    .matches(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      "Invalid emergency contact number"
    ),
  joiningDate: Yup.date(),
  isLoginEnabled: Yup.boolean(),
});



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

const UserUpdatePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const muiTheme = useTheme();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showResourceDialog, setShowResourceDialog] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alertInfo, setAlertInfo] = useState<{
    show: boolean;
    message: string;
    severity: "info" | "success" | "error";
  }>({
    show: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await getUserById(userId);
        const userData = response?.data;

        formik.setValues({
          name: userData.name,
          email: userData.email,
          phoneNumber: userData.phoneNumber || "",
          dateOfBirth: userData.dateOfBirth?.split("T")[0] || "",
          address: userData.address || "",
          gender: userData.gender || "",
          role: userData.role,
          country: userData.country || "",
          assignedResources: userData.assignedResources || [],
          partnerName: userData.partnerName || "",
          emergencyContact: userData.emergencyContact || "",
          joiningDate: userData.joiningDate?.split("T")[0] || "",
          isLoginEnabled: userData.isLoginEnabled !== undefined ? userData.isLoginEnabled : true,
        });

        const existingPermissions = userData.permissions || [];
        const assignedResourcesList = userData.assignedResources || [];

        const initialPermissions = [
          ...existingPermissions.map((perm: any) => ({
            id: Math.random().toString(),
            resource: perm.resource,
            actions: Array.isArray(perm.actions)
              ? perm.actions
              : typeof perm.actions === 'string' && (perm.actions as string).length > 0
                ? (perm.actions as string).split(',')
                : [],
          }))
        ];

        assignedResourcesList.forEach((res: string) => {
          if (!initialPermissions.some(p => p.resource === res)) {
            initialPermissions.push({
              id: Math.random().toString(),
              resource: res,
              actions: []
            });
          }
        });

        setPermissions(initialPermissions);
      } catch (error) {
        toast.error("Failed to load user data");
        router.push("/users");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const formik = useFormik<FormValues>({
    initialValues: {
      name: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      address: "",
      gender: "",
      role: UserRole.STAFF,
      country: "",
      assignedResources: [],
      partnerName: "",
      emergencyContact: "",
      joiningDate: "",
      isLoginEnabled: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);

        const userData = {
          ...values,
          assignedResources: permissions.map((p) => p.resource),
          permissions: permissions.map((p) => ({
            resource: p.resource,
            actions: p.actions,
          })),
        };

        await updateUserApi(userId, userData);

        setTimeout(() => {
          router.push("/users");
        }, 1500);
      } catch (error) {
        toast.error("Failed to update user");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleAddResource = (resourceName: string): void => {
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

  const handleAlertClose = (): void => {
    setAlertInfo({ ...alertInfo, show: false });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

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
              Update User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update user account information and permissions
            </Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ p: 3 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            <div>
              <FormInput
                name="name"
                label="Full Name"
                icon={<LucideUser size={20} />}
                formik={formik}
                placeholder="John Doe"
              />
            </div>

            <div>
              <FormInput
                name="email"
                label="Email Address"
                icon={<LucideMail size={20} />}
                formik={formik}
                placeholder="john.doe@example.com"
              />
            </div>

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
              />
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

            <div>
              <FormInput
                name="partnerName"
                label="Project Partner"
                icon={<LucideUser size={20} />}
                formik={formik}
                placeholder="Project Partner's name (optional)"
              />
            </div>

            <div>
              <FormInput
                name="emergencyContact"
                label="Emergency Contact"
                icon={<LucidePhone size={20} />}
                formik={formik}
                placeholder="+1 (555) 987-6543"
              />
            </div>

            <div>
              <FormInput
                name="joiningDate"
                label="Joining Date"
                type="date"
                icon={<LucideCalendar size={20} />}
                formik={formik}
              />
            </div>

            <div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 block">
                  Login Access
                </label>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                  <LucideLock size={20} className="text-gray-500" />
                  <div className="flex-1">
                    <Typography variant="body2" fontWeight={500}>
                      {formik.values.isLoginEnabled
                        ? "Login Enabled"
                        : "Login Disabled"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formik.values.isLoginEnabled
                        ? "User can access the system"
                        : "User cannot login to the system"}
                    </Typography>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      formik.setFieldValue(
                        "isLoginEnabled",
                        !formik.values.isLoginEnabled
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formik.values.isLoginEnabled
                      ? "bg-green-500"
                      : "bg-gray-300"
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formik.values.isLoginEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

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
              {isSubmitting ? "Updating..." : "Update User"}
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
  ...props
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium font-roboto text-gray-700 block">
      {label}
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
  [x: string]: any;
}

const FormSelect: React.FC<FormSelectProps> = ({
  name,
  label,
  options,
  formik,
  icon,
  helperText,
  ...props
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-gray-700 block">{label}</label>
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

export default UserUpdatePage;
