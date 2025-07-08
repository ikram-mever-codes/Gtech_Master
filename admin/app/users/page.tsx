"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  InputBase,
  Paper,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Button,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  CircularProgress,
  Alert,
  alpha,
} from "@mui/material";
import {
  LucideMoreVertical,
  LucideUserPlus,
  LucideSearch,
  LucideTrash2,
  LucidePencil,
  LucideEye,
  LucideShield,
  LucideMail,
  LucideBan,
  PlusIcon,
  RefreshCw,
} from "lucide-react";
import { User, UserRole, UserStatus } from "@/utils/interfaces";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import CustomTable from "@/components/UI/CustomTable";
import { useRouter } from "next/navigation";
import { getAllUsers } from "@/api/user";
import { toast } from "react-hot-toast";

const UsersPage = () => {
  const muiTheme = useTheme();
  const [searchText, setSearchText] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: [] as UserStatus[],
    role: [] as UserRole[],
  });

  // New state for users data and loading
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0); // For triggering refresh

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
    setRefreshKey((prev) => prev + 1); // Increment refreshKey to trigger a new fetch
  };

  const handleActionClick = (
    event: React.MouseEvent<HTMLElement>,
    userId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setSelectedUserId(null);
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

  // Handle user actions
  const handleViewUser = (userId: string) => {
    router.push(`/users/${userId}`);
    handleActionClose();
  };

  const handleEditUser = (userId: string) => {
    router.push(`/users/${userId}/edit`);
    handleActionClose();
  };

  const handleChangeRole = (userId: string) => {
    toast.success("Role change functionality will be implemented soon");
    handleActionClose();
  };

  const handleResendVerification = (userId: string) => {
    toast.success("Verification email has been sent");
    handleActionClose();
  };

  const handleBlockUser = (userId: string) => {
    toast.success("User has been blocked");
    handleActionClose();
  };

  const handleDeleteUser = (userId: string) => {
    toast.success("User has been deleted");
    handleActionClose();
  };

  return (
    <div className="w-full mx-auto px-0">
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
            onDelete={(row) => {
              toast.success(`User ${row.name} would be deleted`);
            }}
            onView={(row) => router.push(`/users/${row.id}`)}
          />
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleActionClose}
          PaperProps={{
            elevation: 4,
            sx: {
              borderRadius: "8px",
              minWidth: 200,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              "& .MuiMenuItem-root": {
                fontSize: "0.875rem",
                padding: "8px 16px",
              },
            },
          }}
        >
          <MenuItem
            onClick={() => selectedUserId && handleViewUser(selectedUserId)}
          >
            <LucideEye className="mr-2" size={18} color="#666" />
            <Typography variant="body2">View Profile</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => selectedUserId && handleEditUser(selectedUserId)}
          >
            <LucidePencil className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Edit User</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => selectedUserId && handleChangeRole(selectedUserId)}
          >
            <LucideShield className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Change Role</Typography>
          </MenuItem>
          <MenuItem
            onClick={() =>
              selectedUserId && handleResendVerification(selectedUserId)
            }
          >
            <LucideMail className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Resend Verification</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => selectedUserId && handleBlockUser(selectedUserId)}
          >
            <LucideBan className="mr-2" size={18} color="#666" />
            <Typography variant="body2">Block User</Typography>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => selectedUserId && handleDeleteUser(selectedUserId)}
            sx={{ color: "#F44336", "&:hover": { backgroundColor: "#ffeeee" } }}
          >
            <LucideTrash2 className="mr-2" size={18} />
            <Typography variant="body2">Delete User</Typography>
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
};

export default UsersPage;
