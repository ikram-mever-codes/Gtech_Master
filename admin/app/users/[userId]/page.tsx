"use client";
import React, { useState } from "react";
import {
  Avatar,
  Box,
  Typography,
  Paper,
  Breadcrumbs,
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
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

// Mock data based on the User entity schema
const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Sarah Johnson",
  email: "sarah.johnson@example.com",
  country: "United States",
  role: "MANAGER",
  assignedResources: ["Dashboard", "Analytics", "Customer Data", "Invoices"],
  createdAt: new Date("2023-04-15T09:30:00"),
  updatedAt: new Date("2024-03-28T14:45:00"),
  phoneNumber: "+1 (555) 123-4567",
  gender: "FEMALE",
  dateOfBirth: new Date("1988-07-22"),
  address: "123 Business Ave, Suite 500, New York, NY 10001",
  avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  isEmailVerified: true,
  isPhoneVerified: true,
  permissions: [
    {
      id: "abc123",
      resource: "Dashboard",
      actions: ["view", "edit"],
    },
    {
      id: "def456",
      resource: "Analytics",
      actions: ["view"],
    },
    {
      id: "ghi789",
      resource: "Customer Data",
      actions: ["view", "edit", "delete"],
    },
    {
      id: "jkl012",
      resource: "Invoices",
      actions: ["view", "create", "edit"],
    },
  ],
};

// Activity log mock data
const activityLogs = [
  {
    id: 1,
    action: "User login",
    timestamp: new Date("2024-05-10T08:32:00"),
    details: "Login from 192.168.1.105",
  },
  {
    id: 2,
    action: "Updated customer #143",
    timestamp: new Date("2024-05-09T15:47:00"),
    details: "Modified shipping address",
  },
  {
    id: 3,
    action: "Exported analytics report",
    timestamp: new Date("2024-05-09T11:23:00"),
    details: "Q1 2024 Sales Report",
  },
  {
    id: 4,
    action: "Created new invoice",
    timestamp: new Date("2024-05-08T16:15:00"),
    details: "Invoice #INV-2024-0568 for Client XYZ",
  },
  {
    id: 5,
    action: "User login",
    timestamp: new Date("2024-05-08T09:05:00"),
    details: "Login from 192.168.1.105",
  },
];

const UserProfile = () => {
  const [tabValue, setTabValue] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: "",
  });

  const handleTabChange = (event: any, newValue: any) => {
    setTabValue(newValue);
  };

  const handleConfirmAction = (action: any) => {
    setConfirmDialog({ open: true, action });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, action: "" });
  };

  const executeAction = () => {
    // In a real app, this would call an API endpoint
    console.log(`Executing action: ${confirmDialog.action}`);
    handleCloseDialog();
  };

  // Function to render appropriate status chips
  const renderStatusChip = (verified: any) => {
    return verified ? (
      <Chip
        icon={<CheckCircle size={14} />}
        label="Verified"
        size="small"
        color="success"
        sx={{ ml: 1 }}
      />
    ) : (
      <Chip
        icon={<XCircle size={14} />}
        label="Unverified"
        size="small"
        color="warning"
        sx={{ ml: 1 }}
      />
    );
  };

  // Function to render role chip with appropriate color
  const getRoleChipColor = (role: any) => {
    switch (role) {
      case "ADMIN":
        return "error";
      case "MANAGER":
        return "primary";
      case "STAFF":
        return "info";
      case "SUPPORT":
        return "warning";
      default:
        return "default";
    }
  };

  // Function to format date
  const formatDate = (date: Date) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy");
  };

  // Function to format date with time
  const formatDateTime = (date: any) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy 'at' h:mm a");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 ">
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: "8px",
          border: "1px solid #E9ECEF",
        }}
      >
        {/* Header with breadcrumbs and back button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h2" sx={{ mt: 1 }}>
              User Profile
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ArrowLeft size={18} />}
            // component={"a"}
            // to="/users"
          >
            Back to Users
          </Button>
        </Box>

        {/* User Profile Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
            p: 3,
            backgroundColor: "background.paper",
            borderRadius: 2,
            border: "1px solid #E9ECEF",
          }}
        >
          <Avatar
            src={mockUser.avatar}
            alt={mockUser.name}
            sx={{ width: 100, height: 100, mr: 3, border: "4px solid #F8F9FA" }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="h3" gutterBottom>
                {mockUser.name}
              </Typography>
              <Chip
                label={mockUser.role}
                color={getRoleChipColor(mockUser.role)}
                size="small"
                sx={{ ml: 2, fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              <Mail
                size={16}
                style={{ verticalAlign: "middle", marginRight: 8 }}
              />
              {mockUser.email} {renderStatusChip(mockUser.isEmailVerified)}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <Phone
                size={16}
                style={{ verticalAlign: "middle", marginRight: 8 }}
              />
              {mockUser.phoneNumber}{" "}
              {renderStatusChip(mockUser.isPhoneVerified)}
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Edit User">
              <IconButton
                color="primary"
                // component={"link"}
                // to={`/users/edit/${mockUser.id}`}
              >
                <Edit size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete User">
              <IconButton
                color="error"
                onClick={() => handleConfirmAction("delete")}
              >
                <Trash2 size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Block User">
              <IconButton
                color="warning"
                onClick={() => handleConfirmAction("block")}
              >
                <Ban size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Resend Verification">
              <IconButton
                color="info"
                onClick={() => handleConfirmAction("resend")}
              >
                <RefreshCw size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Password">
              <IconButton
                color="secondary"
                onClick={() => handleConfirmAction("resetPassword")}
              >
                <Key size={20} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tabs for different sections */}
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab
              icon={<User size={16} />}
              iconPosition="start"
              label="Profile Details"
              id="tab-0"
            />
            <Tab
              icon={<Shield size={16} />}
              iconPosition="start"
              label="Permissions"
              id="tab-1"
            />
            <Tab
              icon={<Clock size={16} />}
              iconPosition="start"
              label="Activity Log"
              id="tab-2"
            />
          </Tabs>
        </Box>

        {/* Profile Details Tab */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{ height: "100%", border: "1px solid #E9ECEF" }}
              >
                <CardContent>
                  <Typography
                    variant="h5"
                    sx={{ display: "flex", alignItems: "center", mb: 2 }}
                  >
                    <User size={20} style={{ marginRight: 8 }} />
                    Personal Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Full Name
                      </Typography>
                      <Typography variant="body1">{mockUser.name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        User ID
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {mockUser.id}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Gender
                      </Typography>
                      <Typography variant="body1">
                        {mockUser.gender || "Not specified"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Date of Birth
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        <Calendar size={16} style={{ marginRight: 8 }} />
                        {mockUser.dateOfBirth
                          ? formatDate(mockUser.dateOfBirth)
                          : "Not specified"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Address
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        <MapPin size={16} style={{ marginRight: 8 }} />
                        {mockUser.address || "Not specified"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Country
                      </Typography>
                      <Typography variant="body1">
                        {mockUser.country || "Not specified"}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Account Information */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{ height: "100%", border: "1px solid #E9ECEF" }}
              >
                <CardContent>
                  <Typography
                    variant="h5"
                    sx={{ display: "flex", alignItems: "center", mb: 2 }}
                  >
                    <Lock size={20} style={{ marginRight: 8 }} />
                    Account Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Role
                      </Typography>
                      <Chip
                        label={mockUser.role}
                        color={getRoleChipColor(mockUser.role)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Account Status
                      </Typography>
                      <Chip
                        icon={<CheckCircle size={14} />}
                        label="Active"
                        size="small"
                        color="success"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Email Verification
                      </Typography>
                      {renderStatusChip(mockUser.isEmailVerified)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Phone Verification
                      </Typography>
                      {renderStatusChip(mockUser.isPhoneVerified)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(mockUser.createdAt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(mockUser.updatedAt)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Assigned Resources */}
            <Grid item xs={12}>
              <Card elevation={0} sx={{ border: "1px solid #E9ECEF" }}>
                <CardContent>
                  <Typography
                    variant="h5"
                    sx={{ display: "flex", alignItems: "center", mb: 2 }}
                  >
                    <Building size={20} style={{ marginRight: 8 }} />
                    Assigned Resources
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {mockUser.assignedResources.map((resource, index) => (
                      <Chip
                        key={index}
                        label={resource}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Permissions Tab */}
        {tabValue === 1 && (
          <Card elevation={0} sx={{ border: "1px solid #E9ECEF" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Shield size={20} style={{ marginRight: 8 }} />
                  User Permissions
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<Edit size={16} />}
                >
                  Edit Permissions
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="30%">
                        <Typography variant="subtitle1">Resource</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle1">Permissions</Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockUser.permissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {permission.resource}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {permission.actions.map((action, index) => {
                              let color;
                              switch (action) {
                                case "view":
                                  color = "info";
                                  break;
                                case "create":
                                  color = "success";
                                  break;
                                case "edit":
                                  color = "warning";
                                  break;
                                case "delete":
                                  color = "error";
                                  break;
                                default:
                                  color = "default";
                              }
                              return (
                                <Chip
                                  key={index}
                                  label={action}
                                  size="small"
                                  color={color as any}
                                  sx={{ textTransform: "capitalize" }}
                                />
                              );
                            })}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Activity Log Tab */}
        {tabValue === 2 && (
          <Card elevation={0} sx={{ border: "1px solid #E9ECEF" }}>
            <CardContent>
              <Typography
                variant="h5"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
              >
                <FileText size={20} style={{ marginRight: 8 }} />
                Activity Log
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="20%">
                        <Typography variant="subtitle1">Date & Time</Typography>
                      </TableCell>
                      <TableCell width="25%">
                        <Typography variant="subtitle1">Action</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle1">Details</Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(log.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">{log.action}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {log.details}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={handleCloseDialog}>
        <DialogTitle>
          Confirm{" "}
          {confirmDialog.action === "delete"
            ? "Deletion"
            : confirmDialog.action === "block"
            ? "Block"
            : confirmDialog.action === "resend"
            ? "Resend Verification"
            : "Reset Password"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <AlertCircle
              color="#F44336"
              size={24}
              style={{ marginRight: 12 }}
            />
            <Typography variant="body1">
              {confirmDialog.action === "delete"
                ? "Are you sure you want to delete this user? This action cannot be undone."
                : confirmDialog.action === "block"
                ? "Are you sure you want to block this user? They will not be able to access the system."
                : confirmDialog.action === "resend"
                ? "Resend verification email to this user?"
                : "Send password reset instructions to this user?"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={executeAction}
            color={confirmDialog.action === "delete" ? "error" : "primary"}
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default UserProfile;
