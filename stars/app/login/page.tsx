"use client";
import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { loginCustomer } from "@/api/customer";
import { useDispatch, useSelector } from "react-redux";
import { BASE_URL, loadingStyles, successStyles } from "@/utils/constants";
import { AppDispatch, RootState } from "../Redux/store";
import { customerLogin } from "../Redux/features/customerSlice";
import { handleApiError } from "@/utils/api";
import axios from "axios";
import { getAllListForACustomer } from "@/api/lists";

// Validation schema
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

// Custom Input Component with animated focus effects
const FormInput = ({ icon, name, type, placeholder }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="mb-5">
      <div className="relative group">
        <div
          className={`absolute inset-0 bg-gradient-to-r from-[#8CC21B] to-[#a6d45b] rounded-lg opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-300 ${
            isFocused ? "opacity-50" : ""
          }`}
        ></div>
        <div className="relative flex items-center">
          <div className="absolute left-3 text-[#495057]">{icon}</div>
          <Field
            type={inputType}
            name={name}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full pl-11 pr-12 py-4 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#8CC21B] focus:ring-2 focus:ring-[#e6f0d4] transition-all duration-300 text-[#212529] placeholder-[#ADB5BD] font-poppins ${
              isFocused ? "shadow-md" : ""
            }`}
          />
          {type === "password" && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
      </div>
      <ErrorMessage
        name={name}
        component="div"
        className="mt-1.5 text-[#F44336] text-sm font-medium pl-1"
      />
    </div>
  );
};

// Main Login Page Component
const LoginPage = () => {
  const router = useRouter();
  const [authError, setAuthError] = useState("");
  const dispatch = useDispatch();
  const { customer } = useSelector((state: RootState) => state.customer);
  const searchParams = useSearchParams();
  // Initial form values
  const initialValues = {
    email: "",
    password: "",
  };

  const loginCustomer = async (
    email: string,
    password: string,
    dispatch: AppDispatch
  ) => {
    try {
      toast.loading("Authenticating...", loadingStyles);
      const response = await axios.post(
        `${BASE_URL}/customers/login`,
        {
          email,
          password,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      dispatch(customerLogin(response.data.data));
      toast.dismiss();
      toast.success(
        `Welcome ${response.data.data.companyName}!`,
        successStyles
      );
      return response.data;
    } catch (error) {
      handleApiError(error, "Login failed");
      throw error;
    }
  };

  const handleSubmit = async (
    values: any,
    { setSubmitting, resetForm }: any
  ) => {
    try {
      setAuthError("");
      const response = await loginCustomer(
        values.email,
        values.password,
        dispatch
      );

      try {
        // const listsResponse = await getAllListForACustomer(response.data.id);
        // if (listsResponse && listsResponse.length > 0) {
        // Redirect to the first list page
        const queryString = searchParams.toString();
        router.push(
          `/${response.data.companyName}${queryString ? `?${queryString}` : ""}`
        );
      } catch (listError) {
        console.error("Error fetching lists:", listError);
        router.push("/");
      }
    } catch (error: any) {
      setAuthError(error.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const checkCus = async () => {
      if (customer !== null) {
        const listsResponse = await getAllListForACustomer(customer.id);
        if (listsResponse && listsResponse.length > 0) {
          router.push(`/scheduled-items/lists/${listsResponse[0].id}`);
        } else {
          router.push("/");
        }
      }
    };
    checkCus();
  }, []);
  // Benefits section items
  const benefits = [
    {
      icon: <CheckCircle className="h-5 w-5 text-[#8CC21B]" />,
      text: "Access your personalized dashboard",
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-[#8CC21B]" />,
      text: "Manage your orders and invoices",
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-[#8CC21B]" />,
      text: "Get exclusive offers and promotions",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 font-poppins">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row lg:items-stretch overflow-hidden bg-white rounded-2xl shadow-xl">
        {/* Left side - Login Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 xl:p-16">
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="h-10 w-10 rounded-lg bg-[#8CC21B] flex items-center justify-center mr-3">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-[#212529] font-syne">
                Welcome Back
              </h2>
            </div>
            <p className="text-[#495057]">
              Sign in to your account to access your dashboard, manage orders,
              and more.
            </p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <FormInput
                  icon={<Mail size={20} />}
                  name="email"
                  type="email"
                  placeholder="Email Address"
                />

                <FormInput
                  icon={<Lock size={20} />}
                  name="password"
                  type="password"
                  placeholder="Password"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-[#8CC21B] focus:ring-[#8CC21B] border-gray-300 rounded"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-[#495057]"
                    >
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-[#8CC21B] hover:text-[#7bab17] hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#8CC21B] hover:bg-[#7bab17] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC21B] transition-all duration-300 hover:translate-y-[-2px] shadow-sm hover:shadow-md disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Sign In
                        <ArrowRight
                          size={20}
                          className="ml-2 group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    )}
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-sm text-[#6C757D]">
                    Don't have an account?{" "}
                    <Link
                      href="/register"
                      className="font-medium text-[#8CC21B] hover:text-[#7bab17] hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </Form>
            )}
          </Formik>

          <div className="relative flex items-center justify-center mt-12">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-sm text-[#6C757D]">
              OR CONTINUE WITH
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="w-full py-3 px-4 inline-flex justify-center items-center gap-2 rounded-lg border font-medium bg-white text-[#212529] shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC21B] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>
        </div>

        {/* Right side - Banner Image and Benefits */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Decorative pattern */}
          <div className="absolute inset-0 bg-[#262A2E] z-0 pattern-dots-xl"></div>

          {/* Overlay with brand color */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8CC21B]/90 to-[#262A2E]/95 z-10"></div>

          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1616763355548-1b606f439f86?q=80&w=1470&auto=format&fit=crop')",
            }}
          ></div>

          {/* Content */}
          <div className="relative z-20 flex flex-col justify-center px-12 py-16">
            <div className="text-white mb-8">
              <h2 className="text-3xl font-bold mb-6 font-syne">
                Take Your Business to the Next Level
              </h2>
              <div className="w-16 h-1 bg-white mb-6 rounded-full"></div>
              <p className="text-white/90 mb-8">
                Log in to access your dashboard and manage your business
                operations efficiently. Get real-time insights, track orders,
                and more.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <div className="mr-3 mt-0.5 bg-white/20 p-1 rounded-full">
                      {benefit.icon}
                    </div>
                    <p className="text-white/90">{benefit.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto border-t border-white/20 pt-6">
              <div className="text-sm text-white/80">
                "We don't just supply parts. We supply support."
              </div>
              <div className="mt-4 flex items-center">
                <div className="h-10 w-10 rounded-full bg-white/30 flex items-center justify-center text-white font-bold font-syne">
                  JD
                </div>
                <div className="ml-3">
                  <div className="text-white font-medium">
                    Joschua Grenzheuser
                  </div>
                  <div className="text-white/70 text-sm">
                    CEO, Gtech Industries
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap");

        body {
          font-family: "Poppins", sans-serif;
        }

        .font-syne {
          font-family: "Syne", sans-serif;
        }

        .font-poppins {
          font-family: "Poppins", sans-serif;
        }

        .pattern-dots-xl {
          background-image: radial-gradient(
            rgba(255, 255, 255, 0.15) 2px,
            transparent 2px
          );
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
