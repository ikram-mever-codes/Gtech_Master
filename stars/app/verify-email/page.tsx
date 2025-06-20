"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Mail,
  Clock,
  Shield,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { verifyCustomerEmail } from "@/api/customer";

const VerificationStatus = ({ status, message, subMessage }: any) => {
  const [iconVisible, setIconVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const iconTimer = setTimeout(() => setIconVisible(true), 300);
    const textTimer = setTimeout(() => setTextVisible(true), 800);

    return () => {
      clearTimeout(iconTimer);
      clearTimeout(textTimer);
    };
  }, []);

  // Icon based on status
  const StatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle size={64} className="text-[#8CC21B]" />;
      case "error":
        return <XCircle size={64} className="text-[#F44336]" />;
      case "pending":
        return <Loader2 size={64} className="text-[#2196F3] animate-spin" />;
      case "warning":
        return <AlertTriangle size={64} className="text-[#FF9800]" />;
      default:
        return <AlertTriangle size={64} className="text-[#FF9800]" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`transform transition-all duration-700 ease-out ${
          iconVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <StatusIcon />
      </div>

      <h2
        className={`mt-6 text-2xl font-bold text-[#212529] font-syne transform transition-all duration-500 ease-out ${
          textVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {message}
      </h2>

      {subMessage && (
        <p
          className={`mt-2 text-[#495057] transform transition-all duration-500 delay-200 ease-out ${
            textVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          {subMessage}
        </p>
      )}
    </div>
  );
};

// Main verification page component
const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationCode = searchParams.get("code");

  // Verification states
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [statusMessage, setStatusMessage] = useState("Verifying your email...");
  const [statusSubMessage, setStatusSubMessage] = useState(
    "Please wait while we process your request"
  );
  const [isProcessing, setIsProcessing] = useState(true);

  // Process verification on component mount
  useEffect(() => {
    const verifyEmail = async () => {
      if (!verificationCode) {
        setVerificationStatus("error");
        setStatusMessage("Invalid verification link");
        setStatusSubMessage(
          "The verification code is missing or invalid. Please check your email for the correct link."
        );
        setIsProcessing(false);
        return;
      }

      try {
        await verifyCustomerEmail(verificationCode);
        setVerificationStatus("success");
        setStatusMessage("Email Verified Successfully!");
        setStatusSubMessage(
          "Your account is now pending administrator approval. We'll notify you once it's approved."
        );
        setIsProcessing(false);
      } catch (error: any) {
        // Check for specific error types
        if (error.message.includes("expired")) {
          setVerificationStatus("warning");
          setStatusMessage("Verification Link Expired");
          setStatusSubMessage(
            "This verification link has expired. Please request a new one."
          );
        } else if (error.message.includes("already verified")) {
          setVerificationStatus("success");
          setStatusMessage("Email Already Verified");
          setStatusSubMessage(
            "Your email has already been verified. Your account is pending administrator approval."
          );
        } else {
          setVerificationStatus("error");
          setStatusMessage("Verification Failed");
          setStatusSubMessage(
            error.message ||
              "An error occurred during email verification. Please try again later."
          );
        }
        setIsProcessing(false);
      }
    };

    // Add a small delay to show the loading state
    const timer = setTimeout(() => {
      verifyEmail();
    }, 1500);

    return () => clearTimeout(timer);
  }, [verificationCode]);

  // Features or benefits section
  const features = [
    {
      icon: <Shield className="text-[#8CC21B] w-10 h-10 mb-2" />,
      title: "Secure Access",
      description:
        "Get secure access to our platform and all premium features.",
    },
    {
      icon: <Mail className="text-[#8CC21B] w-10 h-10 mb-2" />,
      title: "Account Updates",
      description:
        "Receive important notifications and account updates via email.",
    },
    {
      icon: <Clock className="text-[#8CC21B] w-10 h-10 mb-2" />,
      title: "24/7 Support",
      description: "Access our support team anytime you need assistance.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col py-12 pt-0 px-4 sm:px-6 lg:px-8 font-poppins">
      {/* Header with logo */}
      <div className="mx-auto w-full max-w-md mb-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            {/* Logo placeholder - replace with your actual logo */}
            <div className="h-12 w-12 rounded-full bg-[#8CC21B] flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#212529] font-syne mb-1">
            Email Verification
          </h1>
          <div className="w-12 h-1 bg-[#8CC21B] mx-auto mb-4 rounded-full"></div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 transition-all duration-300">
          <div className="px-6 py-8 sm:p-10">
            <VerificationStatus
              status={verificationStatus}
              message={statusMessage}
              subMessage={statusSubMessage}
            />

            {/* Additional information and actions */}
            <div
              className={`mt-8 transition-opacity duration-500 ${
                isProcessing ? "opacity-0" : "opacity-100"
              }`}
            >
              {verificationStatus === "success" && (
                <div className="bg-[#f0f7e6] p-4 rounded-lg border border-[#e6f0d4] text-[#212529]">
                  <p className="font-medium">What happens next?</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="text-[#8CC21B] h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        Our administrators will review your account details
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-[#8CC21B] h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        You'll receive an email once your account is approved
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="text-[#8CC21B] h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        After approval, you can log in and use our services
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {(verificationStatus === "error" ||
                verificationStatus === "warning") && (
                <div className="bg-[#FFF3E0] p-4 rounded-lg border border-[#FFE0B2] text-[#212529]">
                  <p className="font-medium">Need help?</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex items-start">
                      <AlertTriangle className="text-[#FF9800] h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        Check if you've clicked the correct link from your email
                      </span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="text-[#FF9800] h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Verification links expire after 24 hours</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="text-[#FF9800] h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        Contact our support team if you continue to have issues
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="mt-8 flex flex-col space-y-3">
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#8CC21B] hover:bg-[#7bab17] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC21B] transition-all duration-200 hover:translate-y-[-2px]"
                >
                  Return to Homepage
                </button>

                {(verificationStatus === "error" ||
                  verificationStatus === "warning") && (
                  <button
                    onClick={() => router.push("/support")}
                    className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-[#212529] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC21B] transition-all duration-200"
                  >
                    Contact Support
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features section */}
        {!isProcessing && (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center transform transition-all duration-300 hover:shadow-md hover:translate-y-[-4px]"
              >
                <div className="flex justify-center">{feature.icon}</div>
                <h3 className="font-semibold text-[#212529] mt-2 font-syne">
                  {feature.title}
                </h3>
                <p className="text-[#495057] text-sm mt-1">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-lg mx-auto mt-12 text-center text-[#6C757D] text-sm">
        <p>
          Need assistance?{" "}
          <a
            href="#"
            className="text-[#8CC21B] hover:text-[#7bab17] hover:underline"
          >
            Contact our support team
          </a>
        </p>
        <div className="mt-4 flex justify-center space-x-4">
          <a href="#" className="text-[#6C757D] hover:text-[#212529]">
            Privacy Policy
          </a>
          <span>|</span>
          <a href="#" className="text-[#6C757D] hover:text-[#212529]">
            Terms of Service
          </a>
          <span>|</span>
          <a href="#" className="text-[#6C757D] hover:text-[#212529]">
            Help Center
          </a>
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
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;
