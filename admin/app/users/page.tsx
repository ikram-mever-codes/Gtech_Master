"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  InputBase,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  alpha,
  Avatar,
  MenuItem,
} from "@mui/material";
import {
  LucideUserPlus,
  LucideSearch,
  PlusIcon,
  RefreshCw,
} from "lucide-react";
import { UserRole, UserStatus } from "@/utils/interfaces";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import CustomTable from "@/components/UI/CustomTable";
import { useRouter } from "next/navigation";
import { deleteUser, getAllUsers, resendVerificationEmail } from "@/api/user";
import { toast } from "react-hot-toast";

const UsersPage = () => {
  const muiTheme = useTheme();
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: [] as UserStatus[],
    role: [] as UserRole[],
  });

  // New state for users data and loading
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Function to fetch users from backend
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllUsers();
      if (response && response.data) {
        setUsers(response.data);
      } else {
        setUsers([]);
        setError("No data received from server");
      }
    } catch (error) {
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount and when refreshKey changes
  useEffect(() => {
    fetchUsers();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const calculateAge = (dateOfBirth: string): number => {
    const dob = new Date(dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const columns = [
    {
      key: "profile",
      label: "Profile",
      render: (value: any, row: any) => (
        <div className="flex items-center gap-4">
          <Avatar
            src={
              row.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                row.name
              )}&background=random`
            }
            className="w-10 h-10 rounded-full"
            alt={`${row.name}'s avatar`}
          />
          <div>
            <div className="text-gray-800 font-medium">{row.name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "phoneNumber",
      label: "Phone",
      render: (value: string) => (
        <span className="text-gray-700">{value || "Not provided"}</span>
      ),
    },
    {
      key: "dateOfBirth",
      label: "Age",
      render: (value: string) => {
        if (!value) return "N/A";
        try {
          return calculateAge(value);
        } catch (e) {
          return "Invalid DOB";
        }
      },
    },
    {
      key: "address",
      label: "Location",
      render: (value: string) => (
        <span className="text-gray-700">
          {value?.slice(0, 20) || "Not specified"}...
        </span>
      ),
    },
    {
      key: "isEmailVerified",
      label: "Status",
      render: (value: boolean) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value === true
              ? "bg-green-200/80 text-green-600"
              : value === false
              ? "bg-yellow-200/80 text-yellow-800"
              : "bg-red-200/80 text-red-800"
          }`}
        >
          {value === true ? "Verified" : "Unverified"}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (value: UserRole) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-200/80 text-blue-800">
          {value || "Unknown"}
        </span>
      ),
    },
  ];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchText ||
      [user.name, user.email, user.phoneNumber].some(
        (field) =>
          field && field.toLowerCase().includes(searchText.toLowerCase())
      );

    const matchesStatus =
      filters.status.length === 0 || filters.status.includes(user.status);
    const matchesRole =
      filters.role.length === 0 || filters.role.includes(user.role);

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleResendVerification = async (
    userId: string,
    userEmail: string
  ) => {
    try {
      await resendVerificationEmail(userEmail);
    } catch (error) {
      // Error is already handled by the API function
    }
  };

  return (
    <div className="w-full max-w-[80vw] mx-auto px-0">
      <div
        className="bg-white rounded-lg shadow-sm pb-[7rem] p-8 px-9"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Typography
              variant="h4"
              sx={{ color: "secondary.main", fontSize: "30px" }}
            >
              Users Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage all registered users and their permissions
            </Typography>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <Paper
              className="flex items-center px-4 py-2 flex-1 max-w-md"
              sx={{
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                border: "1px solid #e0e0e0",
              }}
            >
              <LucideSearch className="text-gray-400 mr-2" size={20} />
              <InputBase
                placeholder="Search users..."
                className="flex-1"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{
                  "& input": {
                    padding: "4px",
                  },
                }}
              />
            </Paper>

            <CustomButton
              startIcon={<PlusIcon color="white" size={18} />}
              gradient
              shadow="large"
              onClick={() => router.push("/users/create")}
            >
              Create User
            </CustomButton>
          </div>
        </div>

        {/* Filters and Refresh Button */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel sx={{ color: "text.secondary" }}>Status</InputLabel>
            <Select
              multiple
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as UserStatus[],
                })
              }
              renderValue={(selected) => selected.join(", ")}
              sx={{
                borderRadius: "8px",
                "& .MuiSelect-select": {
                  py: 1.2,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: "8px",
                    mt: 1,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                },
              }}
            >
              {Object.values(UserStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  <Checkbox checked={filters.status.includes(status)} />
                  <ListItemText primary={status} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel sx={{ color: "text.secondary" }}>Role</InputLabel>
            <Select
              multiple
              value={filters.role}
              onChange={(e) =>
                setFilters({ ...filters, role: e.target.value as UserRole[] })
              }
              renderValue={(selected) => selected.join(", ")}
              sx={{
                borderRadius: "8px",
                "& .MuiSelect-select": {
                  py: 1.2,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: "8px",
                    mt: 1,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                },
              }}
            >
              {Object.values(UserRole).map((role) => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={filters.role.includes(role)} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Refresh Button */}
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            sx={{
              borderRadius: "8px",
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.main,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            Refresh
          </Button>

          {/* Total Users Count */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              ml: "auto",
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              px: 2,
              py: 1,
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            Total Users: {users.length}
          </Typography>
        </div>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center p-20">
            <CircularProgress
              size={40}
              sx={{ color: theme.palette.primary.main }}
            />
          </div>
        ) : (
          <CustomTable
            columns={columns}
            data={filteredUsers}
            title=""
            searchable={false}
            pagination={true}
            onRowClick={(row) => router.push(`/users/${row.id}`)}
            onEdit={(row) => router.push(`/users/${row.id}/edit`)}
            onDelete={async (row) => {
              const confirmDelete = window.confirm(
                "Do you want to delete this User?"
              );
              if (!confirmDelete) return;
              const data = await deleteUser(row.id);
              if (data?.success) await fetchUsers();
            }}
            onView={(row) => router.push(`/users/${row.id}`)}
            onResendVerification={(row) => {
              handleResendVerification(row.id, row.email);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default UsersPage;
