import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Bell,
  HelpCircle,
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronDown,
  FileText,
  Package,
  ShoppingCart,
  Settings,
  Home,
  Calendar,
  UserCircle,
  BookOpen,
  CreditCard,
  MessageSquare,
  Activity,
  Clock,
  Zap,
  Timer,
} from "lucide-react";
import { alpha } from "@mui/material";
import theme from "@/styles/theme";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import CustomButton from "@/components/UI/CustomButton";
import { Badge, Tooltip, Avatar } from "@mui/material";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { customer } = useSelector((state: RootState) => state.customer);
  const profileRef = useRef<any>(null);
  const notificationRef = useRef<any>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    if (isNotificationOpen) setIsNotificationOpen(false);
  };

  const toggleNotificationMenu = () => {
    setIsNotificationOpen(!isNotificationOpen);
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sample notifications
  const notifications = [
    {
      id: 1,
      type: "order",
      message: "New order placed #ORD-123",
      time: "15 min ago",
    },
    {
      id: 2,
      type: "system",
      message: "System maintenance scheduled",
      time: "2 hours ago",
    },
    {
      id: 3,
      type: "alert",
      message: "Low inventory alert for SKU-789",
      time: "Yesterday",
    },
  ];

  return (
    <div
      className="relative font-sans"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Main Header */}
      <header
        className="bg-white border-b shadow-sm"
        style={{ borderColor: alpha("#ADB5BD", 0.15) }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center">
                  <Image
                    src={"/logo.png"}
                    width={150}
                    height={130}
                    alt="Gtech"
                    style={{
                      filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.05))",
                      transition: "transform 0.3s ease",
                    }}
                    className="hover:scale-105"
                  />
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                <a
                  href="#"
                  className="inline-flex items-center px-2 pt-1 text-sm font-medium border-b-2 transition-all duration-200 transform hover:translate-y-[-2px]"
                  style={{
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.text.primary,
                    borderBottomWidth: "3px",
                  }}
                >
                  <Home size={18} className="mr-1.5" />
                  Dashboard
                </a>
                <a
                  href="/scheduled-items/lists"
                  className="inline-flex items-center px-2 pt-1 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 transition-all duration-200 transform hover:translate-y-[-2px]"
                >
                  <Timer size={18} className="mr-1.5" />
                  Scheduled Lists
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-2 pt-1 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 transition-all duration-200 transform hover:translate-y-[-2px]"
                >
                  <ShoppingCart size={18} className="mr-1.5" />
                  Orders
                </a>
                <a
                  href="/settings"
                  className="inline-flex items-center px-2 pt-1 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 transition-all duration-200 transform hover:translate-y-[-2px]"
                >
                  <Settings size={18} className="mr-1.5" />
                  Settings{" "}
                </a>
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center">
              {/* Help button */}
              <Tooltip title="Help Center" arrow>
                <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-primary transition-all duration-200">
                  <span className="sr-only">Help</span>
                  <HelpCircle size={20} />
                </button>
              </Tooltip>

              {/* Notifications button */}
              <div className="ml-4 relative" ref={notificationRef}>
                <Tooltip title="Notifications" arrow>
                  <button
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-primary transition-all duration-200"
                    onClick={toggleNotificationMenu}
                  >
                    <span className="sr-only">Notifications</span>
                    <div className="relative">
                      <Bell size={20} />
                      <span
                        className="absolute top-[-2px] right-[-2px] block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: theme.palette.primary.main }}
                      ></span>
                    </div>
                  </button>
                </Tooltip>

                {/* Notification dropdown */}
                {isNotificationOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-80 rounded-lg shadow-lg py-0 bg-white ring-1 ring-black ring-opacity-5 z-10 overflow-hidden"
                    style={{
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      border: "1px solid",
                      borderColor: alpha("#ADB5BD", 0.15),
                      animation: "fadeIn 0.2s ease-out",
                    }}
                  >
                    <div
                      className="px-4 py-3 border-b"
                      style={{
                        borderColor: alpha("#ADB5BD", 0.15),
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.03
                        ),
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Notifications
                        </h3>
                        <span
                          className="px-2 py-1 text-xs rounded-full"
                          style={{
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              0.1
                            ),
                            color: theme.palette.primary.main,
                          }}
                        >
                          3 new
                        </span>
                      </div>
                    </div>

                    <div
                      className="max-h-72 overflow-y-auto"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      {notifications.map((notification) => (
                        <a
                          key={notification.id}
                          href="#"
                          className="block px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors duration-150"
                          style={{ borderColor: alpha("#ADB5BD", 0.15) }}
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <div
                                className="h-8 w-8 rounded-full flex items-center justify-center"
                                style={{
                                  backgroundColor:
                                    notification.type === "order"
                                      ? alpha(theme.palette.success.main, 0.1)
                                      : notification.type === "system"
                                      ? alpha(theme.palette.info.main, 0.1)
                                      : alpha(theme.palette.warning.main, 0.1),
                                }}
                              >
                                {notification.type === "order" ? (
                                  <ShoppingCart
                                    size={16}
                                    style={{
                                      color: theme.palette.success.main,
                                    }}
                                  />
                                ) : notification.type === "system" ? (
                                  <Settings
                                    size={16}
                                    style={{ color: theme.palette.info.main }}
                                  />
                                ) : (
                                  <Activity
                                    size={16}
                                    style={{
                                      color: theme.palette.warning.main,
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <Clock size={12} className="mr-1" />
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>

                    <div
                      className="px-4 py-2 text-center border-t"
                      style={{
                        borderColor: alpha("#ADB5BD", 0.15),
                        backgroundColor: alpha("#F8F9FA", 0.5),
                      }}
                    >
                      <a
                        href="#"
                        className="text-sm font-medium"
                        style={{ color: theme.palette.primary.main }}
                      >
                        View all notifications
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="ml-4 relative flex-shrink-0" ref={profileRef}>
                <div>
                  <button
                    type="button"
                    className="flex items-center p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
                    style={{
                      borderRadius: "30px",
                      padding: "4px",
                      paddingRight: "12px",
                      backgroundColor: isProfileMenuOpen
                        ? alpha(theme.palette.primary.main, 0.08)
                        : "transparent",
                    }}
                    onClick={toggleProfileMenu}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center mr-2 shadow-sm border"
                      style={{
                        backgroundColor: theme.palette.secondary.main,
                        borderColor: alpha("#fff", 0.8),
                        transition: "transform 0.2s ease",
                        transform: isProfileMenuOpen
                          ? "scale(1.05)"
                          : "scale(1)",
                      }}
                    >
                      <User
                        size={18}
                        color={theme.palette.secondary.contrastText}
                      />
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {customer?.companyName || "User Account"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`ml-1 text-gray-400 transition-transform duration-200 ${
                        isProfileMenuOpen ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Profile dropdown menu - Enhanced */}
                {isProfileMenuOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 overflow-hidden"
                    style={{
                      boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                      border: "1px solid",
                      borderColor: alpha("#ADB5BD", 0.15),
                      animation: "fadeIn 0.2s ease-out",
                    }}
                  >
                    <div
                      className="px-4 py-3 border-b"
                      style={{
                        borderColor: alpha("#ADB5BD", 0.15),
                        backgroundColor: alpha("#F8F9FA", 0.7),
                      }}
                    >
                      <div className="flex items-center">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center mr-3 shadow-sm border-2"
                          style={{
                            backgroundColor: theme.palette.secondary.main,
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                          }}
                        >
                          <User
                            size={20}
                            color={theme.palette.secondary.contrastText}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 leading-tight">
                            {customer?.companyName || "User Account"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer?.email || "user@example.com"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <a
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <Settings className="mr-3 text-gray-400" size={18} />
                        Account Settings
                      </a>
                      <a
                        href="#"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <MessageSquare
                          className="mr-3 text-gray-400"
                          size={18}
                        />
                        Support
                      </a>
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${alpha("#ADB5BD", 0.15)}`,
                      }}
                    >
                      <a
                        href="#"
                        className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                        <LogOut className="mr-3 text-red-400" size={18} />
                        Sign out
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule button */}
              <div className="ml-4 hidden md:flex">
                <CustomButton
                  variant="contained"
                  color="primary"
                  startIcon={<Calendar size={18} />}
                  size="small"
                  gradient={true}
                  hoverEffect="scale"
                >
                  Schedule Items
                </CustomButton>
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden ml-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={toggleMenu}
                >
                  <span className="sr-only">Open main menu</span>
                  {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu - Enhanced */}
        {isMenuOpen && (
          <div
            className="sm:hidden border-t"
            style={{
              borderColor: alpha("#ADB5BD", 0.15),
              animation: "slideDown 0.3s ease-out",
            }}
          >
            <div className="pt-2 pb-3 space-y-1">
              <a
                href="#"
                className="block pl-3 pr-4 py-2 text-base font-medium rounded-md hover:bg-gray-50 transition-all duration-150"
                style={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  borderLeftWidth: "4px",
                  borderLeftColor: theme.palette.primary.main,
                }}
              >
                <div className="flex items-center">
                  <Home size={18} className="mr-3" />
                  Dashboard
                </div>
              </a>
              <a
                href="#"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-l-4 border-transparent transition-all duration-150"
              >
                <div className="flex items-center">
                  <Timer size={18} className="mr-3" />
                  Scheduled Lists
                </div>
              </a>

              <a
                href="/settings"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-l-4 border-transparent transition-all duration-150"
              >
                <div className="flex items-center">
                  <Settings size={18} className="mr-3" />
                  Settings
                </div>
              </a>
              <div
                className="pt-3 border-t"
                style={{ borderColor: alpha("#ADB5BD", 0.15) }}
              >
                <div className="px-3 py-2">
                  <CustomButton
                    variant="contained"
                    color="primary"
                    startIcon={<Calendar size={18} />}
                    size="small"
                    rounded="medium"
                    gradient={true}
                    hoverEffect="scale"
                    fullWidth
                  >
                    Schedule Items
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 500px;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Header;
