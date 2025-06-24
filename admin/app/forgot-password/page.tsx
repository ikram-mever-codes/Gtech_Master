"use client";

import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { requestPasswordReset } from "@/api/user";
import theme from "@/styles/theme";
import { useRouter } from "next/navigation";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const router = useRouter();
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (error) {
      setErrors({ submit: "Failed to send reset link. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const handleResendEmail = () => {
    setIsSubmitted(false);
    setEmail("");
  };

  if (isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ backgroundColor: theme.palette.background.default }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: theme.palette.background.paper,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid #E9ECEF",
            }}
          >
            <div className="w-16 h-16 bg-[#8CC21B]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#8CC21B]" />
            </div>

            <h1 className="text-2xl font-['Poppins'] font-semibold text-[#212529] mb-4">
              Check Your Email
            </h1>

            <p className="text-text-secondary mb-6 leading-relaxed">
              If an account with{" "}
              <span className="font-medium text-text-primary">{email}</span>{" "}
              exists, we've sent a password reset link to your email address.
            </p>

            <div className="space-y-4">
              <button
                onClick={handleBackToLogin}
                className="w-full bg-[#8CC21B] hover:bg-[#7CB319] text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Back to Login
              </button>

              <button
                onClick={handleResendEmail}
                className="w-full text-[#8CC21B] hover:text-[#7CB319] font-medium py-2 transition-colors duration-200"
              >
                Try Different Email
              </button>
            </div>

            <p className="text-sm text-[#495057] mt-6">
              Didn't receive the email? Check your spam folder or contact
              support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[#E9ECEF] p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#8CC21B]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-[#8CC21B]" />
            </div>

            <h1 className="text-2xl font-['Poppins'] font-semibold text-[#212529] mb-2">
              Forgot Password?
            </h1>

            <p className="text-[#495057]">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#212529] mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 ${
                    errors.email
                      ? "border-error bg-red-50 focus:ring-error focus:border-error"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
                <Mail
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    errors.email ? "text-error" : "text-text-secondary"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-[#F44336] flex items-center">
                  <span className="w-4 h-4 rounded-full bg-[#F44336] text-white text-xs flex items-center justify-center mr-2">
                    !
                  </span>
                  {errors.email}
                </p>
              )}
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-[#F44336]">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#8CC21B] hover:bg-[#7CB319] disabled:bg-[#ADB5BD] disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending Reset Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToLogin}
              className="inline-flex items-center text-[#495057] hover:text-[#8CC21B] transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
