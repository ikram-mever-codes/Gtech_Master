"use client";
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  LucideArrowLeft,
  LucideSave,
  LucidePlus,
  LucideTrash2,
  LucideCheck,
  LucideMail,
  LucideX,
  LucidePhone,
  LucideMapPin,
  LucideBuilding,
  LucideFileText,
  LucideTruck,
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import theme from "@/styles/theme";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import { PlusCircle, Pencil } from "lucide-react";
import {
  createCompany,
  updateCustomerProfile,
  getSingleCustomer,
} from "@/api/customers";
import CustomButton from "@/components/UI/CustomButton";

interface FormValues {
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber: string;
  addressLine1?: string;
  addressLine2?: string;
  legalName: string;
  postalCode?: string;
  city?: string;
  country?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  sameAsBilling: boolean;
}

const validationSchema = Yup.object({
  companyName: Yup.string().required("Company name is required"),
  legalName: Yup.string().required("Legal name is required"),

  email: Yup.string().email("Invalid email").required("Email is required"),
  contactEmail: Yup.string()
    .email("Invalid contact email")
    .required("Contact email is required"),
  contactPhoneNumber: Yup.string()
    .matches(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      "Invalid phone number"
    )
    .required("Contact phone number is required"),
  taxNumber: Yup.string().required("Tax number is required"),
  addressLine1: Yup.string(),
  addressLine2: Yup.string(),
  postalCode: Yup.string(),
  city: Yup.string(),
  country: Yup.string(),
  deliveryAddressLine1: Yup.string().when("sameAsBilling", {
    is: false,
    then: (schema) => schema.required("Delivery address is required"),
  }),
  deliveryPostalCode: Yup.string().when("sameAsBilling", {
    is: false,
    then: (schema) => schema.required("Delivery postal code is required"),
  }),
  deliveryCity: Yup.string().when("sameAsBilling", {
    is: false,
    then: (schema) => schema.required("Delivery city is required"),
  }),
  deliveryCountry: Yup.string().when("sameAsBilling", {
    is: false,
    then: (schema) => schema.required("Delivery country is required"),
  }),
});

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

const CustomerCreatePage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");
  const isEditMode = Boolean(customerId);

  const muiTheme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(isEditMode);
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
      companyName: "",
      email: "",
      contactEmail: "",
      contactPhoneNumber: "",
      taxNumber: "",
      legalName: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      city: "",
      country: "",
      deliveryAddressLine1: "",
      deliveryAddressLine2: "",
      deliveryPostalCode: "",
      deliveryCity: "",
      deliveryCountry: "",
      sameAsBilling: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);

        // Prepare the payload
        const payload = {
          ...values,
          // Clear delivery address if same as billing
          ...(values.sameAsBilling
            ? {
              deliveryAddressLine1: values.addressLine1,
              deliveryAddressLine2: values.addressLine2,
              deliveryPostalCode: values.postalCode,
              deliveryCity: values.city,
              deliveryCountry: values.country,
            }
            : {}),
        };

        let data;
        if (isEditMode && customerId) {
          // Update existing customer
          data = await updateCustomerProfile({ ...payload, id: customerId });
        } else {
          // Create new customer
          data = await createCompany(payload);
        }

        if (data?.success) {
          // Show success message
          setAlertInfo({
            show: true,
            message: isEditMode
              ? "Company updated successfully!"
              : "Company created successfully!",
            severity: "success",
          });

          router.push("/customers");
        }
      } catch (error) {
        setAlertInfo({
          show: true,
          message: isEditMode
            ? "Error updating company. Please try again."
            : "Error creating company. Please try again.",
          severity: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Fetch customer data if in edit mode
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (isEditMode && customerId) {
        try {
          setIsLoading(true);
          const data = await getSingleCustomer(customerId);

          if (data?.success) {
            const customer = data.data;

            // Check if delivery address is same as billing
            const sameAsBilling =
              customer.deliveryAddressLine1 === customer.addressLine1 &&
              customer.deliveryPostalCode === customer.postalCode &&
              customer.deliveryCity === customer.city &&
              customer.deliveryCountry === customer.country;

            // Pre-fill form with customer data
            formik.setValues({
              companyName: customer.companyName || "",
              email: customer.email || "",
              contactEmail: customer.contactEmail || "",
              contactPhoneNumber: customer.contactPhoneNumber || "",
              taxNumber: customer.taxNumber || "",
              legalName: customer.legalName || "",
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
              sameAsBilling,
            });
          }
        } catch (error) {
          setAlertInfo({
            show: true,
            message: "Error loading customer data. Please try again.",
            severity: "error",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCustomerData();
  }, [isEditMode, customerId]);

  // Handle alert close
  const handleAlertClose = (): void => {
    setAlertInfo({ ...alertInfo, show: false });
  };

  // Handle same as billing address toggle
  const handleSameAsBillingChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    formik.setFieldValue("sameAsBilling", event.target.checked);
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
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
            href="/customers"
            style={{
              display: "flex",
              alignItems: "center",
              color: theme.palette.primary.main,
            }}
          >
            <IconButton
              sx={{
                color: "primary.main",
                bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
                "&:hover": { bgcolor: alpha(muiTheme.palette.primary.main, 0.15) },
              }}
            >
              <LucideArrowLeft size={20} />
            </IconButton>
          </Link>

          <PageHeader
            title={isEditMode ? "Edit Company" : "Create New Company"}
            icon={isEditMode ? Pencil : PlusCircle}
          />
        </Box>

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ p: 3 }}>
          {/* Company Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            <div className="md:col-span-2">
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "secondary.main",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <LucideBuilding size={20} />
                Company Information
              </Typography>
            </div>

            <div>
              <FormInput
                name="companyName"
                label="Company Name"
                icon={<LucideBuilding size={20} />}
                formik={formik}
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <FormInput
                name="legalName"
                label="Legal Name"
                icon={<LucideBuilding size={20} />}
                formik={formik}
                placeholder="Gtech Industries Gmbh"
              />
            </div>

            <div>
              <FormInput
                name="taxNumber"
                label="Tax Number"
                icon={<LucideFileText size={20} />}
                formik={formik}
                placeholder="123-456-789"
              />
            </div>

            <div>
              <FormInput
                name="email"
                label="Email"
                icon={<LucideMail size={20} />}
                formik={formik}
                placeholder="company@example.com"
              />
            </div>

            <div>
              <FormInput
                name="contactEmail"
                label="Contact Email"
                icon={<LucideMail size={20} />}
                formik={formik}
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <FormInput
                name="contactPhoneNumber"
                label="Contact Phone"
                icon={<LucidePhone size={20} />}
                formik={formik}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            <div className="md:col-span-2">
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "secondary.main",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <LucideMapPin size={20} />
                Billing Address
              </Typography>
            </div>

            <div className="md:col-span-2">
              <FormInput
                name="addressLine1"
                label="Address Line 1"
                icon={<LucideMapPin size={20} />}
                formik={formik}
                placeholder="123 Main St"
              />
            </div>

            <div className="md:col-span-2">
              <FormInput
                name="addressLine2"
                label="Address Line 2 (Optional)"
                icon={<LucideMapPin size={20} />}
                formik={formik}
                placeholder="Suite 100"
              />
            </div>

            <div>
              <FormInput
                name="postalCode"
                label="Postal Code"
                icon={<LucideMapPin size={20} />}
                formik={formik}
                placeholder="12345"
              />
            </div>

            <div>
              <FormInput
                name="city"
                label="City"
                icon={<LucideMapPin size={20} />}
                formik={formik}
                placeholder="New York"
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
                icon={<LucideMapPin size={20} />}
              />
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            <div className="md:col-span-2 flex items-center justify-between">
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "secondary.main",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <LucideTruck size={20} />
                Delivery Address
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formik.values.sameAsBilling}
                    onChange={handleSameAsBillingChange}
                    color="primary"
                  />
                }
                label="Same as billing address"
                sx={{ ml: 0 }}
              />
            </div>

            {!formik.values.sameAsBilling && (
              <>
                <div className="md:col-span-2">
                  <FormInput
                    name="deliveryAddressLine1"
                    label="Delivery Address Line 1"
                    icon={<LucideTruck size={20} />}
                    formik={formik}
                    placeholder="456 Delivery St"
                  />
                </div>

                <div className="md:col-span-2">
                  <FormInput
                    name="deliveryAddressLine2"
                    label="Delivery Address Line 2 (Optional)"
                    icon={<LucideTruck size={20} />}
                    formik={formik}
                    placeholder="Building 2"
                  />
                </div>

                <div>
                  <FormInput
                    name="deliveryPostalCode"
                    label="Delivery Postal Code"
                    icon={<LucideTruck size={20} />}
                    formik={formik}
                    placeholder="67890"
                  />
                </div>

                <div>
                  <FormInput
                    name="deliveryCity"
                    label="Delivery City"
                    icon={<LucideTruck size={20} />}
                    formik={formik}
                    placeholder="Los Angeles"
                  />
                </div>

                <div>
                  <FormSelect
                    name="deliveryCountry"
                    label="Delivery Country"
                    options={countries.map((country) => ({
                      value: country,
                      label: country,
                    }))}
                    formik={formik}
                    icon={<LucideTruck size={20} />}
                  />
                </div>
              </>
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
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Company"
                  : "Create Company"}
            </CustomButton>
          </div>
        </Box>

        {/* Alert Snackbar */}
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

export default CustomerCreatePage;

// import React from "react";

// const page = () => {
//   return <div>page</div>;
// };

// export default page;
