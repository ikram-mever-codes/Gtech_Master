"use client";
import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Building2,
  Mail,
  Phone,
  FileText,
  MapPin,
  Globe,
  Truck,
  Lock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Info,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { requestCustomerAccount } from "@/api/customer";

const themeColors = {
  primary: {
    main: "#8CC21B",
    light: "#a6d34d",
    dark: "#6e9a15",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#262A2E",
    light: "#464a4f",
    dark: "#1a1d20",
    contrastText: "#FFFFFF",
  },
  background: {
    default: "#F8F9FA",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#212529",
    secondary: "#495057",
    disabled: "#ADB5BD",
  },
  success: {
    main: "#4CAF50",
    light: "#80c683",
    dark: "#3b873e",
  },
  warning: {
    main: "#FF9800",
    light: "#ffb74d",
    dark: "#f57c00",
  },
  error: {
    main: "#F44336",
    light: "#e57373",
    dark: "#d32f2f",
  },
};

// Interface for customer signup payload
interface CustomerSignupPayload {
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber: string;
  addressLine1: string;
  legalName: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  password: string;
}

// Form validation schema
const validationSchema = Yup.object({
  companyName: Yup.string()
    .required("Company name is required")
    .min(2, "Company name must be at least 2 characters"),
  legalName: Yup.string()
    .required("Company Legal name is required")
    .min(2, "Company name must be at least 2 characters"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  contactEmail: Yup.string()
    .email("Invalid contact email address")
    .required("Contact email is required"),
  contactPhoneNumber: Yup.string()
    .required("Contact phone number is required")
    .matches(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      "Invalid phone number format"
    ),
  addressLine1: Yup.string().required("Address line 1 is required"),
  postalCode: Yup.string().required("Postal code is required"),
  city: Yup.string().required("City is required"),
  country: Yup.string().required("Country is required"),
  password: Yup.string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
  agreeToTerms: Yup.boolean().oneOf(
    [true],
    "You must agree to the terms and conditions"
  ),
});

// Custom form input component
const FormInput = ({
  icon,
  label,
  name,
  type = "text",
  placeholder,
  as = "input",
  tooltip,
}: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="mb-4 relative">
      <div className="flex items-center justify-between mb-1">
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 tracking-wide font-poppins"
        >
          {label}
        </label>
        {tooltip && (
          <div className="group relative">
            <Info size={16} className="text-gray-400 cursor-help" />
            <div className="absolute bottom-full mb-2 right-0 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div
        className={`relative rounded-lg transition-all duration-200 ${
          isFocused
            ? `ring-2 ring-${themeColors.primary.main} border-${themeColors.primary.main}`
            : "ring-0 border-gray-300"
        }`}
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          {icon}
        </div>
        <Field
          as={as}
          type={inputType}
          name={name}
          id={name}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-inherit rounded-lg shadow-sm focus:outline-none sm:text-sm bg-white font-poppins"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      <ErrorMessage
        name={name}
        component="div"
        className="mt-1 text-sm text-red-600 font-medium font-poppins"
      />
    </div>
  );
};

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }: any) => {
  const [strength, setStrength] = useState({
    score: 0,
    message: "Password not entered",
    color: "bg-gray-200",
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        message: "Password not entered",
        color: "bg-gray-200",
      });
      return;
    }

    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Variety check
    const uniqueChars = new Set(password).size;
    if (uniqueChars > 5) score += 1;
    if (uniqueChars > 10) score += 1;

    // Set appropriate messaging based on score
    let message = "";
    let color = "";

    if (score < 4) {
      message = "Weak";
      color = `bg-${themeColors.error.main}`;
    } else if (score < 7) {
      message = "Moderate";
      color = `bg-${themeColors.warning.main}`;
    } else if (score < 10) {
      message = "Strong";
      color = `bg-${themeColors.success.main}`;
    } else {
      message = "Very Strong";
      color = `bg-${themeColors.primary.main}`;
    }

    setStrength({ score: Math.min(score, 10), message, color });
  }, [password]);

  return (
    <div className="mt-1 mb-4 font-poppins">
      <div className="flex items-center justify-between mb-1">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              strength.color === "bg-#8CC21B"
                ? "bg-[#8CC21B]"
                : strength.color === "bg-#F44336"
                ? "bg-[#F44336]"
                : strength.color === "bg-#FF9800"
                ? "bg-[#FF9800]"
                : strength.color === "bg-#4CAF50"
                ? "bg-[#4CAF50]"
                : "bg-gray-200"
            } 
                        transition-all duration-300 ease-in-out`}
            style={{ width: `${(strength.score / 10) * 100}%` }}
          ></div>
        </div>
        <span className="ml-2 text-xs font-medium text-gray-700 min-w-20 text-right">
          {strength.message}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 gap-x-2">
        <div className="flex items-center text-xs text-gray-600">
          {/^.{8,}$/.test(password) ? (
            <Check size={14} className="text-[#8CC21B] mr-1" />
          ) : (
            <X size={14} className="text-gray-400 mr-1" />
          )}
          At least 8 characters
        </div>
        <div className="flex items-center text-xs text-gray-600">
          {/[A-Z]/.test(password) ? (
            <Check size={14} className="text-[#8CC21B] mr-1" />
          ) : (
            <X size={14} className="text-gray-400 mr-1" />
          )}
          Uppercase letter
        </div>
        <div className="flex items-center text-xs text-gray-600">
          {/[a-z]/.test(password) ? (
            <Check size={14} className="text-[#8CC21B] mr-1" />
          ) : (
            <X size={14} className="text-gray-400 mr-1" />
          )}
          Lowercase letter
        </div>
        <div className="flex items-center text-xs text-gray-600">
          {/[0-9]/.test(password) ? (
            <Check size={14} className="text-[#8CC21B] mr-1" />
          ) : (
            <X size={14} className="text-gray-400 mr-1" />
          )}
          Number
        </div>
        <div className="flex items-center text-xs text-gray-600">
          {/[^A-Za-z0-9]/.test(password) ? (
            <Check size={14} className="text-[#8CC21B] mr-1" />
          ) : (
            <X size={14} className="text-gray-400 mr-1" />
          )}
          Special character
        </div>
      </div>
    </div>
  );
};

// Main registration component
const RegistrationPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sameAsAddress, setSameAsAddress] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Initial form values
  const initialValues = {
    companyName: "",
    email: "",
    contactEmail: "",
    contactPhoneNumber: "",
    taxNumber: "",
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
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  };

  // Handle form submission
  const handleSubmit = async (
    values: any,
    { setSubmitting, resetForm }: any
  ) => {
    try {
      // Extract confirmPassword and agreeToTerms from values
      const { confirmPassword, agreeToTerms, ...signupData } = values;

      // Send request to API
      await requestCustomerAccount(signupData);

      // On success
      setIsSubmitted(true);
      resetForm();
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "Same as billing address" checkbox
  const handleSameAddressChange = (e: any, setFieldValue: any, values: any) => {
    const checked = e.target.checked;
    setSameAsAddress(checked);

    if (checked) {
      setFieldValue("deliveryAddressLine1", values.addressLine1);
      setFieldValue("deliveryAddressLine2", values.addressLine2);
      setFieldValue("deliveryPostalCode", values.postalCode);
      setFieldValue("deliveryCity", values.city);
      setFieldValue("deliveryCountry", values.country);
    }
  };

  // Multi-step form navigation
  const nextStep = () => {
    setCurrentStep(Math.min(currentStep + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  // Success message component
  const SuccessMessage = ({ setIsSubmitted }: any) => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md mx-auto text-center transform transition-all duration-500 animate-fade-in-up border border-gray-100">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-[#f0f7e6] mb-6">
          <CheckCircle className="h-10 w-10 text-[#8CC21B]" />
        </div>
        <h2 className="text-3xl font-bold text-[#212529] mb-3 font-syne">
          Registration Successful!
        </h2>
        <div className="w-16 h-1 bg-[#8CC21B] mx-auto mb-6 rounded-full"></div>
        <p className="text-[#495057] mb-8 text-lg font-poppins">
          We've sent a verification email to your inbox. Please verify your
          account to continue.
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#8CC21B] hover:bg-[#7bab17] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC21B] transition-all duration-200"
        >
          Register Another Account
        </button>
      </div>
    </div>
  );

  if (isSubmitted) {
    return <SuccessMessage />;
  }

  // Progress bar component
  const ProgressBar = ({ currentStep, totalSteps }: any) => {
    const progress = (currentStep / totalSteps) * 100;

    return (
      <div className="mb-8 px-4">
        <div className="relative pt-4">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#262A2E] bg-[#f0f7e6] font-poppins">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-[#262A2E] font-poppins">
                {Math.round(progress)}% Complete
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-200">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#8CC21B] transition-all duration-300 ease-in-out"
            ></div>
          </div>
        </div>
        <div className="hidden md:flex justify-between">
          <div
            className={`text-xs font-poppins ${
              currentStep >= 1 ? "text-[#8CC21B] font-medium" : "text-gray-500"
            }`}
          >
            Company Information
          </div>
          <div
            className={`text-xs font-poppins ${
              currentStep >= 2 ? "text-[#8CC21B] font-medium" : "text-gray-500"
            }`}
          >
            Billing Address
          </div>
          <div
            className={`text-xs font-poppins ${
              currentStep >= 3 ? "text-[#8CC21B] font-medium" : "text-gray-500"
            }`}
          >
            Delivery Address
          </div>
          <div
            className={`text-xs font-poppins ${
              currentStep >= 4 ? "text-[#8CC21B] font-medium" : "text-gray-500"
            }`}
          >
            Account Security
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 shadow-2xl rounded-xl border border-gray-300/50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 font-syne mb-4">
            Customer Registration
          </h1>
          <div className="w-16 h-1 bg-[#8CC21B] mx-auto my-4 rounded-full"></div>
          <p className="mt-2 text-lg text-gray-600">
            Create your business account to access our premium services
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden">
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

          <div className="px-6 py-6 sm:p-8">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values, setFieldValue, errors, touched }) => (
                <Form className="space-y-8">
                  {/* Company Information - Step 1 */}
                  {currentStep === 1 && (
                    <div className="animate-fade-in">
                      <div className="flex items-center mb-6">
                        <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                          <Building2 size={24} className="text-[#8CC21B]" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Company Information
                        </h3>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
                        <div className="flex items-start">
                          <Info
                            size={20}
                            className="text-[#8CC21B] mt-0.5 mr-3 flex-shrink-0"
                          />
                          <p className="text-sm text-gray-700">
                            Please provide your company details. This
                            information will be used for billing and
                            communication purposes.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                          icon={<Building2 size={18} />}
                          label="Company Name"
                          name="companyName"
                          placeholder="Enter your company name"
                          tooltip="Your company display Name"
                        />
                        <FormInput
                          icon={<Building2 size={18} />}
                          label="Company Legal Name"
                          name="legalName"
                          placeholder="Enter your company Legal name"
                          tooltip="Your registered company name as it appears on official documents"
                        />
                        <FormInput
                          icon={<Mail size={18} />}
                          label="Company Email"
                          name="email"
                          type="email"
                          placeholder="company@example.com"
                          tooltip="Official company email for account notifications"
                        />
                        <FormInput
                          icon={<Mail size={18} />}
                          label="Contact Email"
                          name="contactEmail"
                          type="email"
                          placeholder="contact@example.com"
                          tooltip="Email address for the primary contact person"
                        />
                        <FormInput
                          icon={<Phone size={18} />}
                          label="Contact Phone Number"
                          name="contactPhoneNumber"
                          placeholder="+1 (123) 456-7890"
                          tooltip="Phone number with country code"
                        />
                        <FormInput
                          icon={<FileText size={18} />}
                          label="Tax Number"
                          name="taxNumber"
                          placeholder="Enter your tax/VAT number"
                          tooltip="Your company's tax identification number"
                        />
                      </div>
                    </div>
                  )}

                  {/* Billing Address - Step 2 */}
                  {currentStep === 2 && (
                    <div className="animate-fade-in">
                      <div className="flex items-center mb-6">
                        <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                          <MapPin size={24} className="text-[#8CC21B]" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Billing Address
                        </h3>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
                        <div className="flex items-start">
                          <Info
                            size={20}
                            className="text-[#8CC21B] mt-0.5 mr-3 flex-shrink-0"
                          />
                          <p className="text-sm text-gray-700">
                            Please provide your billing address. This address
                            will be used for invoicing purposes.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                          icon={<MapPin size={18} />}
                          label="Address Line 1"
                          name="addressLine1"
                          placeholder="Street address or P.O. Box"
                        />
                        <FormInput
                          icon={<MapPin size={18} />}
                          label="Address Line 2 (Optional)"
                          name="addressLine2"
                          placeholder="Apartment, suite, unit, building, floor, etc."
                        />
                        <FormInput
                          icon={<MapPin size={18} />}
                          label="Postal Code"
                          name="postalCode"
                          placeholder="Enter postal/ZIP code"
                        />
                        <FormInput
                          icon={<Building2 size={18} />}
                          label="City"
                          name="city"
                          placeholder="Enter city"
                        />
                        <FormInput
                          icon={<Globe size={18} />}
                          label="Country"
                          name="country"
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  )}

                  {/* Delivery Address - Step 3 */}
                  {currentStep === 3 && (
                    <div className="animate-fade-in">
                      <div className="flex items-center mb-6">
                        <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                          <Truck size={24} className="text-[#8CC21B]" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Delivery Address
                        </h3>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                        <div className="flex flex-row items-center">
                          <input
                            type="checkbox"
                            id="sameAsBilling"
                            className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={sameAsAddress}
                            onChange={(e) =>
                              handleSameAddressChange(e, setFieldValue, values)
                            }
                          />
                          <label
                            htmlFor="sameAsBilling"
                            className="text-sm font-medium text-gray-700"
                          >
                            Same as billing address
                          </label>
                        </div>
                      </div>

                      <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${
                          sameAsAddress ? "opacity-60" : "opacity-100"
                        }`}
                      >
                        <FormInput
                          icon={<Truck size={18} />}
                          label="Delivery Address Line 1"
                          name="deliveryAddressLine1"
                          placeholder="Street address or P.O. Box"
                        />
                        <FormInput
                          icon={<Truck size={18} />}
                          label="Delivery Address Line 2 (Optional)"
                          name="deliveryAddressLine2"
                          placeholder="Apartment, suite, unit, building, floor, etc."
                        />
                        <FormInput
                          icon={<MapPin size={18} />}
                          label="Delivery Postal Code"
                          name="deliveryPostalCode"
                          placeholder="Enter postal/ZIP code"
                        />
                        <FormInput
                          icon={<Building2 size={18} />}
                          label="Delivery City"
                          name="deliveryCity"
                          placeholder="Enter city"
                        />
                        <FormInput
                          icon={<Globe size={18} />}
                          label="Delivery Country"
                          name="deliveryCountry"
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  )}

                  {/* Account Security - Step 4 */}
                  {currentStep === 4 && (
                    <div className="animate-fade-in">
                      <div className="flex items-center mb-6">
                        <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                          <Lock size={24} className="text-[#8CC21B]" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Account Security
                        </h3>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
                        <div className="flex items-start">
                          <Info
                            size={20}
                            className="text-[#8CC21B] mt-0.5 mr-3 flex-shrink-0"
                          />
                          <p className="text-sm text-gray-700">
                            Create a strong password to secure your account.
                            Your password should include a mix of letters,
                            numbers, and special characters.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        <FormInput
                          icon={<Lock size={18} />}
                          label="Password"
                          name="password"
                          type="password"
                          placeholder="Create a strong password"
                        />
                        <PasswordStrengthIndicator password={values.password} />
                        <FormInput
                          icon={<Lock size={18} />}
                          label="Confirm Password"
                          name="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                        />

                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <Field
                                type="checkbox"
                                name="agreeToTerms"
                                id="agreeToTerms"
                                className="focus:ring-[#82b21a] h-5 w-5 text-[#8CC21B] border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label
                                htmlFor="agreeToTerms"
                                className="font-medium text-gray-700"
                              >
                                I agree to the{" "}
                                <a
                                  href="#"
                                  className="text-[#8CC21B] hover:text-[#82b21a] underline"
                                >
                                  Terms of Service
                                </a>{" "}
                                and{" "}
                                <a
                                  href="#"
                                  className="text-[#8CC21B] hover:text-[#82b21a] underline"
                                >
                                  Privacy Policy
                                </a>
                              </label>
                              <ErrorMessage
                                name="agreeToTerms"
                                component="p"
                                className="mt-1 text-sm text-red-600 font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#82b21a] transition-colors duration-200"
                      >
                        Back
                      </button>
                    ) : (
                      <div></div>
                    )}

                    {currentStep < totalSteps ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#8CC21B] hover:bg-[#82b21a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#82b21a] transition-colors duration-200"
                      >
                        Next
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#8CC21B] hover:bg-[#82b21a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#82b21a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            Complete Registration
                            <CheckCircle size={16} className="ml-2" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>

        {/* Help Information */}
        <div className="mt-8 bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 text-blue-600 mb-4 md:mb-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="md:ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Need help with your registration?
                </h3>
                <p className="mt-2 text-base text-gray-600">
                  Our support team is available Monday through Friday, 9am-5pm
                  ET. Contact us at{" "}
                  <a
                    href="mailto:support@example.com"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    support@example.com
                  </a>{" "}
                  or call{" "}
                  <a
                    href="tel:+1234567890"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    +1 (234) 567-890
                  </a>
                </p>
                <div className="mt-3 flex space-x-2">
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    FAQs
                  </a>
                  <span className="text-gray-400">|</span>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    Registration Guide
                  </a>
                  <span className="text-gray-400">|</span>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700&display=swap");

        body {
          font-family: "Inter", sans-serif;
        }

        .font-syne {
          font-family: "Syne", sans-serif;
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 20px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default RegistrationPage;
