"use client";
import React, { useState, useEffect } from "react";
import { FormikValues, useFormik } from "formik";
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
  LucideChartArea,
  LucideChartBar,
  LucideMessageCircle,
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
import {
  createOrder,
  // createNewOrder,
  // updateOrderFunction,
  getOrderById,
  updateOrder,
} from "@/api/orders";
import CustomButton from "@/components/UI/CustomButton";
export interface Order {
  id: number; // Order ID
  order_no: string; // Order number
  category_id: number | string; // Category ID (your API returns string sometimes)
  status: number | string; // Numeric status code (20, 10, etc.)
  comment: string; // Comment text
}

const validationSchema = Yup.object({
  order_no: Yup.string().required("Order number is required"),

  category_id: Yup.number()
    .typeError("Category ID must be a number")
    .required("Category ID is required"),

  status: Yup.number()
    .oneOf([0, 5, 10, 20], "Invalid status code")
    .required("Status is required"),

  comment: Yup.string()
    .max(255, "Comment cannot exceed 255 characters")
    .nullable(),
});

const OrderCreatePage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const OrderId = searchParams.get("id");
  const isEditMode = Boolean(OrderId);

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

  const formik = useFormik<FormikValues>({
    initialValues: {
      order_no: "",
      category_id: "",
      status: "",
      comment: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);

        const payload: any = {
          order_no: values.order_no,
          category_id: Number(values.category_id),
          status: Number(values.status),
          comment: values.comment || "",
        };

        let data;

        if (isEditMode && OrderId) {
          // Update existing order
          data = await updateOrder(OrderId, { ...payload });
        } else {
          // Create new order
          data = await createOrder(payload);
        }

        if (data?.success) {
          setAlertInfo({
            show: true,
            message: isEditMode
              ? "Order updated successfully!"
              : "Order created successfully!",
            severity: "success",
          });

          router.push("/orders");
        }
      } catch (error) {
        setAlertInfo({
          show: true,
          message: isEditMode
            ? "Error updating order. Please try again."
            : "Error creating order. Please try again.",
          severity: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Fetch Order data if in edit mode
  useEffect(() => {
    const fetchOrderData = async () => {
      if (isEditMode && OrderId) {
        try {
          setIsLoading(true);

          const data: any = await getOrderById(OrderId);

          if (data?.success) {
            const order = data.data;

            // Pre-fill form with order data
            formik.setValues({
              order_no: order.order_no || "",
              category_id: order.category_id || "",
              status: order.status || "",
              comment: order.comment || "",
            });
          }
        } catch (error) {
          setAlertInfo({
            show: true,
            message: "Error loading order data. Please try again.",
            severity: "error",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOrderData();
  }, [isEditMode, OrderId]);

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
            href="/orders"
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
              {isEditMode ? "Edit Order" : "Create New Order"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode ? "Update order information" : "Add a new order"}
            </Typography>
          </Box>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ p: 3 }}>
          {/* Order Details Section */}
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
                <LucideFileText size={20} />
                Order Details
              </Typography>
            </div>

            {/* Order Number */}
            <div>
              <FormInput
                name="order_no"
                label="Order Number"
                icon={<LucideFileText size={20} />}
                formik={formik}
                placeholder="DE3068"
              />
            </div>

            {/* Category ID */}
            <div>
              <FormInput
                name="category_id"
                label="Category ID"
                icon={<LucidePlus size={20} />}
                formik={formik}
                placeholder="26"
              />
            </div>

            {/* Status */}
            <div>
              <FormSelect
                name="status"
                label="Status"
                icon={<LucideChartBar size={20} />}
                formik={formik}
                options={[
                  { value: 20, label: "Completed" },
                  { value: 10, label: "Processing" },
                  { value: 5, label: "Pending" },
                  { value: 0, label: "Cancelled" },
                ]}
              />
            </div>

            {/* Comment */}
            <div className="md:col-span-2">
              <FormInput
                name="comment"
                label="Comment"
                icon={<LucideMessageCircle size={20} />}
                formik={formik}
                placeholder="Optional comment..."
              />
            </div>
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
                  ? "Update Order"
                  : "Create Order"}
            </CustomButton>
          </div>
        </Box>
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
  options: Array<{ value: any; label: string }>;
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
              (opt) => opt.value === selected,
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

export default OrderCreatePage;
