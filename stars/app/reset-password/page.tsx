"use client";

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { resetCustomerPassword } from "@/api/customer";
import theme from "@/styles/theme";
import { useRouter } from "next/navigation";

const ResetPasswordPage = () => {
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const router = useRouter();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get("token") || "sample-token";

    if (!resetToken) {
      setTokenError("Invalid reset link. Please request a new password reset.");
    } else {
      setToken(resetToken);
    }
  }, []);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid:
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar,
    };
  };

  const handleInputChange = (field: string, value: string) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: "" }));
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrors({});

    const { newPassword, confirmPassword } = passwords;

    // Validation
    if (!newPassword.trim()) {
      setErrors({ newPassword: "Password is required" });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setErrors({ newPassword: "Password does not meet requirements" });
      return;
    }

    if (!confirmPassword.trim()) {
      setErrors({ confirmPassword: "Please confirm your password" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);

    try {
      await resetCustomerPassword(token, newPassword);
      setIsSuccess(true);
    } catch (error: any) {
      if (
        error.message.includes("Invalid") ||
        error.message.includes("expired")
      ) {
        setTokenError(
          "This reset link is invalid or has expired. Please request a new password reset."
        );
      } else {
        setErrors({ submit: "Failed to reset password. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const passwordValidation: any = validatePassword(passwords.newPassword);

  if (tokenError) {
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
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: "#ff000020" }}
            >
              <AlertCircle
                className="w-8 h-8"
                style={{ color: theme.palette.error.main }}
              />
            </div>

            <h1
              className="text-2xl font-semibold mb-4"
              style={{
                fontFamily: theme.typography.fontFamily,
                color: theme.palette.text.primary,
              }}
            >
              Invalid Reset Link
            </h1>

            <p
              className="mb-6 leading-relaxed"
              style={{ color: theme.palette.text.secondary }}
            >
              {tokenError}
            </p>

            <button
              onClick={handleBackToLogin}
              className="w-full text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              style={{
                backgroundColor: theme.palette.primary.main,
              }}
              onMouseEnter={(e: any) =>
                (e.target.style.backgroundColor = "#7CB319")
              }
              onMouseLeave={(e: any) =>
                (e.target.style.backgroundColor = theme.palette.primary.main)
              }
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
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
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${theme.palette.primary.main}1A` }}
            >
              <CheckCircle
                className="w-8 h-8"
                style={{ color: theme.palette.primary.main }}
              />
            </div>

            <h1
              className="text-2xl font-semibold mb-4"
              style={{
                fontFamily: theme.typography.fontFamily,
                color: theme.palette.text.primary,
              }}
            >
              Password Reset Successful
            </h1>

            <p
              className="mb-6 leading-relaxed"
              style={{ color: theme.palette.text.secondary }}
            >
              Your password has been successfully updated. You can now log in
              with your new password.
            </p>

            <button
              onClick={handleBackToLogin}
              className="w-full text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              style={{
                backgroundColor: theme.palette.primary.main,
              }}
              onMouseEnter={(e: any) =>
                (e.target.style.backgroundColor = "#7CB319")
              }
              onMouseLeave={(e: any) =>
                (e.target.style.backgroundColor = theme.palette.primary.main)
              }
            >
              Continue to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: theme.palette.background.default }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-xl p-8"
          style={{
            backgroundColor: theme.palette.background.paper,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            border: "1px solid #E9ECEF",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${theme.palette.primary.main}1A` }}
            >
              <Lock
                className="w-8 h-8"
                style={{ color: theme.palette.primary.main }}
              />
            </div>

            <h1
              className="text-2xl font-semibold mb-2"
              style={{
                fontFamily: theme.typography.fontFamily,
                color: theme.palette.text.primary,
              }}
            >
              Set New Password
            </h1>

            <p style={{ color: theme.palette.text.secondary }}>
              Create a strong password for your account.
            </p>
          </div>

          <div className="space-y-6">
            {/* New Password Field */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium mb-2"
                style={{ color: theme.palette.text.primary }}
              >
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPassword ? "text" : "password"}
                  id="newPassword"
                  value={passwords.newPassword}
                  onChange={(e: any) =>
                    handleInputChange("newPassword", e.target.value)
                  }
                  className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 transition-colors duration-200 ${
                    errors.newPassword ? "bg-red-50" : "bg-white"
                  }`}
                  style={{
                    borderColor: errors.newPassword
                      ? theme.palette.error.main
                      : "#E9ECEF",
                  }}
                  onFocus={(e: any) => {
                    e.target.style.borderColor = theme.palette.primary.main;
                    e.target.style.boxShadow = `0 0 0 2px ${theme.palette.primary.main}40`;
                  }}
                  onBlur={(e: any) => {
                    e.target.style.borderColor = errors.newPassword
                      ? theme.palette.error.main
                      : "#E9ECEF";
                    e.target.style.boxShadow = "none";
                  }}
                  onMouseEnter={(e: any) => {
                    if (!e.target.matches(":focus")) {
                      e.target.style.borderColor = "#CED4DA";
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (!e.target.matches(":focus")) {
                      e.target.style.borderColor = errors.newPassword
                        ? theme.palette.error.main
                        : "#E9ECEF";
                    }
                  }}
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <Lock
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  style={{
                    color: errors.newPassword
                      ? theme.palette.error.main
                      : theme.palette.text.secondary,
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("newPassword")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200"
                  style={{ color: theme.palette.text.secondary }}
                  onMouseEnter={(e: any) =>
                    (e.target.style.color = theme.palette.text.primary)
                  }
                  onMouseLeave={(e: any) =>
                    (e.target.style.color = theme.palette.text.secondary)
                  }
                  disabled={isLoading}
                >
                  {showPasswords.newPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p
                  className="mt-2 text-sm flex items-center"
                  style={{ color: theme.palette.error.main }}
                >
                  <span
                    className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center mr-2"
                    style={{ backgroundColor: theme.palette.error.main }}
                  >
                    !
                  </span>
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            {passwords.newPassword && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p
                  className="text-sm font-medium mb-3"
                  style={{ color: theme.palette.text.primary }}
                >
                  Password Requirements:
                </p>
                <div className="space-y-2">
                  {[
                    { key: "minLength", text: "At least 8 characters" },
                    { key: "hasUpperCase", text: "One uppercase letter" },
                    { key: "hasLowerCase", text: "One lowercase letter" },
                    { key: "hasNumbers", text: "One number" },
                    { key: "hasSpecialChar", text: "One special character" },
                  ].map((requirement) => (
                    <div key={requirement.key} className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2 flex items-center justify-center"
                        style={{
                          backgroundColor: passwordValidation[requirement.key]
                            ? theme.palette.primary.main
                            : "#ccc",
                        }}
                      >
                        {passwordValidation[requirement.key] && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span
                        className="text-sm"
                        style={{
                          color: passwordValidation[requirement.key]
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                          fontWeight: passwordValidation[requirement.key]
                            ? 500
                            : 400,
                        }}
                      >
                        {requirement.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
                style={{ color: theme.palette.text.primary }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={(e: any) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 transition-colors duration-200 ${
                    errors.confirmPassword ? "bg-red-50" : "bg-white"
                  }`}
                  style={{
                    borderColor: errors.confirmPassword
                      ? theme.palette.error.main
                      : "#E9ECEF",
                  }}
                  onFocus={(e: any) => {
                    e.target.style.borderColor = theme.palette.primary.main;
                    e.target.style.boxShadow = `0 0 0 2px ${theme.palette.primary.main}40`;
                  }}
                  onBlur={(e: any) => {
                    e.target.style.borderColor = errors.confirmPassword
                      ? theme.palette.error.main
                      : "#E9ECEF";
                    e.target.style.boxShadow = "none";
                  }}
                  onMouseEnter={(e: any) => {
                    if (!e.target.matches(":focus")) {
                      e.target.style.borderColor = "#CED4DA";
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (!e.target.matches(":focus")) {
                      e.target.style.borderColor = errors.confirmPassword
                        ? theme.palette.error.main
                        : "#E9ECEF";
                    }
                  }}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <Lock
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  style={{
                    color: errors.confirmPassword
                      ? theme.palette.error.main
                      : theme.palette.text.secondary,
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200"
                  style={{ color: theme.palette.text.secondary }}
                  onMouseEnter={(e: any) =>
                    (e.target.style.color = theme.palette.text.primary)
                  }
                  onMouseLeave={(e: any) =>
                    (e.target.style.color = theme.palette.text.secondary)
                  }
                  disabled={isLoading}
                >
                  {showPasswords.confirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p
                  className="mt-2 text-sm flex items-center"
                  style={{ color: theme.palette.error.main }}
                >
                  <span
                    className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center mr-2"
                    style={{ backgroundColor: theme.palette.error.main }}
                  >
                    !
                  </span>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p
                  className="text-sm"
                  style={{ color: theme.palette.error.main }}
                >
                  {errors.submit}
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || !passwordValidation.isValid}
              className="w-full text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  isLoading || !passwordValidation.isValid
                    ? theme.palette.text.disabled
                    : theme.palette.primary.main,
              }}
              onMouseEnter={(e: any) => {
                if (!isLoading && passwordValidation.isValid) {
                  e.target.style.backgroundColor = "#7CB319";
                }
              }}
              onMouseLeave={(e: any) => {
                if (!isLoading && passwordValidation.isValid) {
                  e.target.style.backgroundColor = theme.palette.primary.main;
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
