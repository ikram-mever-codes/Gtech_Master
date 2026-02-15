"use client";
import React, { useState, useEffect } from "react";
import {
  Avatar,
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Badge,
  alpha,
} from "@mui/material";
import {
  ArrowLeft,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  UserCheck,
  AlertCircle,
  Edit,
  Trash2,
  Ban,
  RefreshCw,
  Key,
  CheckCircle,
  XCircle,
  Building,
  FileText,
  Clock,
  Lock,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  getUserById,
  updateUserFunction as updateUser,
  deleteUser,
  resetPassword,
} from "@/api/user";
import { UserRole } from "@/utils/interfaces";
import CustomButton from "@/components/UI/CustomButton";
import { availableResources } from "@/utils/resources";

// Interface for user data
interface UserData {
  id: string;
  name: string;
  email: string;
  country: string;
  role: UserRole;
  assignedResources: string[];
  createdAt: string;
  updatedAt: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  avatar: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isLoginEnabled: boolean;
  permissions: {
    id: string;
    resource: string;
    actions: string[];
  }[];
}

// Interface for activity log
interface ActivityLog {
  id: number;
  action: string;
  timestamp: string;
  details: string;
}

const UserProfile = () => {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [tabValue, setTabValue] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: "",
  });
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getUserById(userId);
        setUserData(response?.data);

        // In a real app, you would fetch activity logs from an API
        const mockLogs = [
          {
            id: 1,
            action: "User login",
            timestamp: new Date().toISOString(),
            details: "Login from 192.168.1.105",
          },
          {
            id: 2,
            action: "Updated profile",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            details: "Modified personal information",
          },
        ];
        setActivityLogs(mockLogs);
      } catch (err) {
        setError("Failed to load user data");
        setSnackbar({
          open: true,
          message: "Failed to load user data",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleConfirmAction = (action: string) => {
    setConfirmDialog({ open: true, action });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, action: "" });
  };

  const executeAction = async () => {
    try {
      switch (confirmDialog.action) {
        case "delete":
          await deleteUser(userId);
          setSnackbar({
            open: true,
            message: "User deleted successfully",
            severity: "success",
          });
          router.push("/users");
          break;
        case "block":
          // In a real app, you would call an API to block the user
          setSnackbar({
            open: true,
            message: "User blocked successfully",
            severity: "success",
          });
          break;
        case "resend":
          setSnackbar({
            open: true,
            message: "Verification email resent",
            severity: "success",
          });
          break;
        case "resetPassword":
          await resetPassword();
          setSnackbar({
            open: true,
            message: "Password reset instructions sent",
            severity: "success",
          });
          break;
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to perform action",
        severity: "error",
      });
    } finally {
      handleCloseDialog();
    }
  };

  const renderStatusChip = (verified: boolean) => {
    return verified ? (
      <Chip
        icon={<CheckCircle size={14} />}
        label="Verified"
        size="small"
        sx={{
          ml: 1,
          backgroundColor: "#e8f5e8",
          color: "#2e7d32",
          fontWeight: 600,
          "& .MuiChip-icon": { color: "#2e7d32" },
        }}
      />
    ) : (
      <Chip
        icon={<XCircle size={14} />}
        label="Unverified"
        size="small"
        sx={{
          ml: 1,
          backgroundColor: "#fff3e0",
          color: "#f57c00",
          fontWeight: 600,
          "& .MuiChip-icon": { color: "#f57c00" },
        }}
      />
    );
  };

  const getRoleChipColor = (role: UserRole) => {
    const colorMap = {
      [UserRole.ADMIN]: { bg: "#ffebee", color: "#c62828", border: "#ffcdd2" },
      [UserRole.MANAGER]: {
        bg: "#e3f2fd",
        color: "#1565c0",
        border: "#bbdefb",
      },
      [UserRole.STAFF]: { bg: "#e8f5e8", color: "#2e7d32", border: "#c8e6c9" },
      [UserRole.SUPPORT]: {
        bg: "#fff3e0",
        color: "#f57c00",
        border: "#ffe0b2",
      },
    };
    return (
      colorMap[role] || { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0" }
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        sx={{ backgroundColor: "#fafafa" }}
      >
        <Box textAlign="center">
          <CircularProgress size={48} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
            Loading user profile...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !userData) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        sx={{ backgroundColor: "#fafafa", p: 4 }}
      >
        <Alert
          severity="error"
          sx={{
            maxWidth: 500,
            borderRadius: 3,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="h6">{error || "User not found"}</Typography>
        </Alert>
      </Box>
    );
  }

  const roleColors = getRoleChipColor(userData.role);

  return (
    <Box sx={{ backgroundColor: "#fafafa", minHeight: "100vh", pb: 4 }}>
      <Box sx={{ maxWidth: "1400px", mx: "auto", px: 3, pt: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: "#1a1a1a",
                  letterSpacing: "-0.02em",
                }}
              >
                User Profile
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Manage user information and permissions
              </Typography>
            </Box>
            <CustomButton
              variant="contained"
              startIcon={<ArrowLeft size={18} />}
              onClick={() => router.push("/users")}
            >
              Back to Users
            </CustomButton>
          </Stack>

          {/* User Profile Header Card */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 1,
              border: "1px solid #e8eaed",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 4 }}>
              <Stack direction="row" spacing={4} alignItems="center">
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: "#4caf50",
                        border: "3px solid white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle size={12} color="white" />
                    </Box>
                  }
                >
                  <Avatar
                    src={userData.avatar}
                    alt={userData.name}
                    sx={{
                      width: 120,
                      height: 120,
                      border: "4px solid white",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    }}
                  />
                </Badge>

                <Box sx={{ flexGrow: 1 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {userData.name}
                    </Typography>
                    <Chip
                      label={userData.role}
                      sx={{
                        backgroundColor: roleColors.bg,
                        color: roleColors.color,
                        border: `1px solid ${roleColors.border}`,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: 28,
                      }}
                    />
                  </Stack>

                  <Stack spacing={1.5}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Mail
                        size={18}
                        style={{ marginRight: 12, color: "#5f6368" }}
                      />
                      <Typography
                        variant="body1"
                        color="text.primary"
                        sx={{ fontWeight: 500 }}
                      >
                        {userData.email}
                      </Typography>
                      {renderStatusChip(userData.isEmailVerified)}
                    </Box>

                    {userData.phoneNumber && (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Phone
                          size={18}
                          style={{ marginRight: 12, color: "#5f6368" }}
                        />
                        <Typography
                          variant="body1"
                          color="text.primary"
                          sx={{ fontWeight: 500 }}
                        >
                          {userData.phoneNumber}
                        </Typography>
                        {renderStatusChip(userData.isPhoneVerified)}
                      </Box>
                    )}
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Tooltip title="Edit User" placement="top">
                    <IconButton
                      onClick={() => router.push(`/users/${userData.id}/edit`)}
                      sx={{
                        backgroundColor: "#e3f2fd",
                        color: "#1565c0",
                        "&:hover": { backgroundColor: "#bbdefb" },
                      }}
                    >
                      <Edit size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete User" placement="top">
                    <IconButton
                      onClick={() => handleConfirmAction("delete")}
                      sx={{
                        backgroundColor: "#ffebee",
                        color: "#c62828",
                        "&:hover": { backgroundColor: "#ffcdd2" },
                      }}
                    >
                      <Trash2 size={20} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Box>

        {/* Navigation Tabs */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 1,
            border: "1px solid #e8eaed",
            mb: 3,
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                minHeight: 72,
                fontWeight: 600,
                fontSize: "0.95rem",
                textTransform: "none",
                color: "#5f6368",
                "&.Mui-selected": {
                  color: "#1976d2",
                },
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                backgroundColor: "#1976d2",
              },
            }}
          >
            <Tab
              icon={<User size={20} />}
              iconPosition="start"
              label="Profile Details"
              sx={{ px: 4 }}
            />
            <Tab
              icon={<Shield size={20} />}
              iconPosition="start"
              label="Permissions"
              sx={{ px: 4 }}
            />
            <Tab
              icon={<Clock size={20} />}
              iconPosition="start"
              label="Activity Log"
              sx={{ px: 4 }}
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#e3f2fd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                      }}
                    >
                      <User size={24} color="#1565c0" />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "#1a1a1a" }}
                    >
                      Personal Information
                    </Typography>
                  </Box>

                  <Stack spacing={3}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Full Name
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ mt: 0.5, fontWeight: 600 }}
                      >
                        {userData.name}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        User ID
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          mt: 0.5,
                          fontFamily: "monospace",
                          color: "#1976d2",
                        }}
                      >
                        {userData.id}
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#5f6368",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Gender
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ mt: 0.5, fontWeight: 500 }}
                        >
                          {userData.gender || "Not specified"}
                        </Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#5f6368",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Country
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ mt: 0.5, fontWeight: 500 }}
                        >
                          {userData.country || "Not specified"}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Date of Birth
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                      >
                        <Calendar
                          size={16}
                          style={{ marginRight: 8, color: "#5f6368" }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {userData.dateOfBirth
                            ? formatDate(userData.dateOfBirth)
                            : "Not specified"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Address
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                      >
                        <MapPin
                          size={16}
                          style={{ marginRight: 8, color: "#5f6368" }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {userData.address || "Not specified"}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Account Information */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#f3e5f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                      }}
                    >
                      <Lock size={24} color="#7b1fa2" />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "#1a1a1a" }}
                    >
                      Account Information
                    </Typography>
                  </Box>

                  <Stack spacing={3}>
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#5f6368",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Role
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={userData.role}
                            sx={{
                              backgroundColor: roleColors.bg,
                              color: roleColors.color,
                              border: `1px solid ${roleColors.border}`,
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          />
                        </Box>
                      </Grid>
                      <Grid size={6}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#5f6368",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            icon={userData.isLoginEnabled ? <CheckCircle size={14} /> : <Ban size={14} />}
                            label={userData.isLoginEnabled ? "Active" : "Disabled"}
                            sx={{
                              backgroundColor: userData.isLoginEnabled ? "#e8f5e8" : "#ffebee",
                              color: userData.isLoginEnabled ? "#2e7d32" : "#c62828",
                              fontWeight: 600,
                              "& .MuiChip-icon": { color: userData.isLoginEnabled ? "#2e7d32" : "#c62828" },
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#5f6368",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Email Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {renderStatusChip(userData.isEmailVerified)}
                        </Box>
                      </Grid>
                      {userData.phoneNumber && (
                        <Grid size={6}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#5f6368",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Phone Status
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {renderStatusChip(userData.isPhoneVerified)}
                          </Box>
                        </Grid>
                      )}
                    </Grid>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Created
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 0.5, fontWeight: 500 }}
                      >
                        {formatDateTime(userData.createdAt)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#5f6368",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Last Updated
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 0.5, fontWeight: 500 }}
                      >
                        {formatDateTime(userData.updatedAt)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Assigned Resources */}
            <Grid size={12}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: "1px solid #e8eaed",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: "#e8f5e8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                      }}
                    >
                      <Building size={24} color="#2e7d32" />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "#1a1a1a" }}
                    >
                      Assigned Resources
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                    {userData.role === UserRole.ADMIN ? (
                      <Chip
                        label="All Resources"
                        sx={{
                          backgroundColor: "#e8f5e8",
                          color: "#2e7d32",
                          border: "1px solid #c8e6c9",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          px: 1,
                        }}
                      />
                    ) : userData.assignedResources?.length > 0 ? (
                      userData.assignedResources.map((resource, index) => (
                        <Chip
                          key={index}
                          label={resource}
                          sx={{
                            backgroundColor: "#f0f4ff",
                            color: "#1565c0",
                            border: "1px solid #c5d9ff",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            px: 1,
                            "&:hover": {
                              backgroundColor: "#e3f2fd",
                            },
                          }}
                        />
                      ))
                    ) : (
                      <Typography
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        No resources assigned
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Permissions Tab */}
        {tabValue === 1 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 1,
              border: "1px solid #e8eaed",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 4,
                background: "linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)",
                borderBottom: "1px solid #e8eaed",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    backgroundColor: "#fff3e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 2,
                  }}
                >
                  <Shield size={24} color="#f57c00" />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#1a1a1a" }}
                  >
                    User Permissions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage user access and permissions
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<Edit size={16} />}
                onClick={() => router.push(`/users/${userData.id}/edit`)}
                sx={{
                  borderRadius: 1,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                  "&:hover": {
                    boxShadow: "0 6px 16px rgba(25, 118, 210, 0.5)",
                  },
                }}
              >
                Edit Permissions
              </Button>
            </Box>

            {userData.role === UserRole.ADMIN ? (
              <Box sx={{ p: 6, textAlign: "center", bgcolor: alpha("#1976d2", 0.02), borderTop: "1px solid #e8eaed" }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    bgcolor: alpha("#1976d2", 0.1),
                    color: "#1976d2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <Shield size={32} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#1976d2", mb: 1 }}>
                  Full Administrative Access
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
                  This user has the Administrator role, which grants unrestricted access to all system resources, modules, and administrative functions.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ backgroundColor: "white" }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#fafafa" }}>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#1a1a1a",
                          fontSize: "0.95rem",
                        }}
                      >
                        Resource
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: "#1a1a1a",
                          fontSize: "0.95rem",
                        }}
                      >
                        Permissions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const displayPermissions = [
                        ...(userData.permissions || []),
                        ...(userData.assignedResources || [])
                          .filter(res => {
                            const trimmedRes = res.trim();
                            return !userData.permissions?.some(p => p.resource.trim().toLowerCase() === trimmedRes.toLowerCase());
                          })
                          .map(res => ({
                            id: `derived-${res.trim()}`,
                            resource: res.trim(),
                            actions: []
                          }))
                      ];

                      return displayPermissions.length > 0 ? (
                        displayPermissions.map((permission) => (
                          <TableRow
                            key={permission.id}
                            sx={{ "&:hover": { backgroundColor: "#f8f9ff" } }}
                          >
                            <TableCell sx={{ py: 3 }}>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, color: "#1a1a1a" }}
                              >
                                {permission.resource}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 3 }}>
                              <Box
                                sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                              >
                                {(() => {
                                  const resourceConfig = availableResources.find(
                                    (r) => r.name.toLowerCase().trim() === permission.resource.toLowerCase().trim()
                                  );
                                  const allAvailableActions = resourceConfig?.actions || [];

                                  const actionsRaw = permission.actions;
                                  let actions: string[] = [];

                                  if (Array.isArray(actionsRaw)) {
                                    actions = actionsRaw.map(a => String(a).trim());
                                  } else if (typeof actionsRaw === 'string' && actionsRaw.length > 0) {
                                    actions = actionsRaw.split(',').map(a => a.trim());
                                  }

                                  const activeActions = allAvailableActions.filter(availableAction =>
                                    actions.some(userAction => userAction.toLowerCase() === availableAction.toLowerCase().trim())
                                  );

                                  if (activeActions.length > 0) {
                                    return (
                                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                        {activeActions.map((action, index) => (
                                          <Box
                                            key={index}
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 0.5,
                                              px: 1.5,
                                              py: 0.75,
                                              borderRadius: "6px",
                                              fontSize: "0.8rem",
                                              fontWeight: 600,
                                              backgroundColor: "#8CC21B",
                                              color: "#ffffff",
                                              border: "1px solid #8CC21B",
                                              boxShadow: "0 2px 4px rgba(140, 194, 27, 0.2)",
                                            }}
                                          >
                                            <Check size={14} />
                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                          </Box>
                                        ))}
                                      </Box>
                                    );
                                  }

                                  if (actions.length > 0) {
                                    return (
                                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                        {actions.map((action: string, index: number) => (
                                          <Box
                                            key={index}
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 0.5,
                                              px: 1.5,
                                              py: 0.75,
                                              borderRadius: "6px",
                                              fontSize: "0.8rem",
                                              fontWeight: 600,
                                              backgroundColor: "#8CC21B",
                                              color: "#ffffff",
                                              border: "1px solid #8CC21B",
                                            }}
                                          >
                                            <Check size={14} />
                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                          </Box>
                                        ))}
                                      </Box>
                                    );
                                  } else {
                                    return (
                                      <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                        No specific actions granted
                                      </Typography>
                                    );
                                  }
                                })()}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            sx={{ py: 6, textAlign: "center" }}
                          >
                            <Typography
                              color="text.secondary"
                              sx={{ fontStyle: "italic", fontSize: "1rem" }}
                            >
                              No permissions assigned
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        )}

        {/* Activity Log Tab */}
        {tabValue === 2 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 1,
              border: "1px solid #e8eaed",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 4,
                background: "linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)",
                borderBottom: "1px solid #e8eaed",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    backgroundColor: "#e8f5e8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 2,
                  }}
                >
                  <FileText size={24} color="#2e7d32" />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#1a1a1a" }}
                  >
                    Activity Log
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recent user activities and system events
                  </Typography>
                </Box>
              </Box>
            </Box>

            <TableContainer sx={{ backgroundColor: "white" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#fafafa" }}>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        fontSize: "0.95rem",
                      }}
                    >
                      Date & Time
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        fontSize: "0.95rem",
                      }}
                    >
                      Action
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        fontSize: "0.95rem",
                      }}
                    >
                      Details
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        sx={{ "&:hover": { backgroundColor: "#f8f9ff" } }}
                      >
                        <TableCell sx={{ py: 3 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#1a1a1a" }}
                          >
                            {formatDateTime(log.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 3 }}>
                          <Chip
                            label={log.action}
                            size="small"
                            sx={{
                              backgroundColor: "#e3f2fd",
                              color: "#1565c0",
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            {log.details}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        sx={{ py: 6, textAlign: "center" }}
                      >
                        <Typography
                          color="text.secondary"
                          sx={{ fontStyle: "italic", fontSize: "1rem" }}
                        >
                          No activity logs found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            borderRadius: 1,
            minWidth: 420,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Confirm{" "}
            {confirmDialog.action === "delete"
              ? "Deletion"
              : confirmDialog.action === "block"
                ? "Block"
                : confirmDialog.action === "resend"
                  ? "Resend Verification"
                  : "Reset Password"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", mt: 1 }}>
            <AlertCircle
              color="#F44336"
              size={24}
              style={{ marginRight: 12, marginTop: 2, flexShrink: 0 }}
            />
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {confirmDialog.action === "delete"
                ? "Are you sure you want to delete this user? This action cannot be undone and all user data will be permanently removed."
                : confirmDialog.action === "block"
                  ? "Are you sure you want to block this user? They will not be able to access the system until unblocked."
                  : confirmDialog.action === "resend"
                    ? "Resend verification email to this user? They will receive a new verification link."
                    : "Send password reset instructions to this user? They will receive an email with reset instructions."}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{
              borderRadius: 1,
              px: 3,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeAction}
            variant="contained"
            color={confirmDialog.action === "delete" ? "error" : "primary"}
            autoFocus
            sx={{
              borderRadius: 1,
              px: 3,
              fontWeight: 600,
              textTransform: "none",
              ml: 2,
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            borderRadius: 1,
            fontWeight: 600,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;