"use client";

import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
  alpha,
  Avatar,
  MenuItem,
  Button,
} from "@mui/material";
import { PlusIcon, RefreshCw, Users, Search, X } from "lucide-react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import FilterResetIcon from "@/components/UI/FilterResetIcon";
import PageHeader from "@/components/UI/PageHeader";
import { UserRole, UserStatus } from "@/utils/interfaces";
import theme from "@/styles/theme";
import CustomButton from "@/components/UI/CustomButton";
import CustomTable from "@/components/UI/CustomTable";
import { useRouter } from "next/navigation";
import { getAllUsers, resendVerificationEmail } from "@/api/user";
import MasterPageLayout from "@/components/General/MasterPageLayout";

export default function UsersPage() {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: [] as UserStatus[],
    role: [] as UserRole[],
  });

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

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
            src={row.avatar || ""}
            className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold font-poppins"
            alt={`${row.name}'s avatar`}
          >
            {row.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="text-gray-800 font-medium font-poppins">
              {row.name}
            </div>
            <div className="text-sm text-gray-500 font-poppins">
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "phoneNumber",
      label: "Phone",
      render: (value: string) => (
        <span className="text-gray-700 font-poppins">
          {value || "Not provided"}
        </span>
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
        <span className="text-gray-700 font-poppins">
          {value?.slice(0, 20) || "Not specified"}...
        </span>
      ),
    },
    {
      key: "isEmailVerified",
      label: "Verification",
      render: (value: boolean) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold font-poppins ${value === true
            ? "bg-green-100 text-green-700"
            : value === false
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
            }`}
        >
          {value === true ? "Verified" : "Unverified"}
        </span>
      ),
    },
    {
      key: "isLoginEnabled",
      label: "Login",
      render: (value: boolean) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold font-poppins ${value !== false
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-55 text-red-600"
            }`}
        >
          {value !== false ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (value: UserRole) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold font-poppins bg-blue-50 text-blue-800">
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
          field && field.toLowerCase().includes(searchText.toLowerCase()),
      );

    const matchesStatus =
      filters.status.length === 0 || filters.status.includes(user.status);
    const matchesRole =
      filters.role.length === 0 || filters.role.includes(user.role);

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleResendVerification = async (
    userId: string,
    userEmail: string,
  ) => {
    try {
      await resendVerificationEmail(userEmail);
    } catch (error) {
      // Error is already handled by the API function
    }
  };

  const actionButtons = (
    <CustomButton
      startIcon={<PlusIcon color="white" size={18} />}
      gradient
      shadow="large"
      onClick={() => router.push("/users/create")}
    >
      User
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap gap-3 items-center w-full">
      <div className="flex items-center gap-1 shrink-0 select-none px-0.5">
        <FilterResetIcon
          isActive={Boolean(
            searchText ||
              filters.status.length > 0 ||
              filters.role.length > 0,
          )}
          onReset={() => {
            setSearchText("");
            setFilters({ status: [], role: [] });
          }}
        />
      </div>
      <div className="relative w-72 shrink-0">
        <input
          type="text"
          placeholder="Search users..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={`w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${searchText
            ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
            : "text-gray-900 border-gray-300 bg-white"
            }`}
        />
        {searchText && (
          <button
            onClick={() => setSearchText("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <FormControl sx={{ minWidth: 140 }} size="small">
        <InputLabel sx={{ color: "text.secondary", fontSize: "0.8rem" }}>Status</InputLabel>
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
            borderRadius: "6px",
            height: "32px",
            fontSize: "0.75rem",
            "& .MuiSelect-select": {
              py: 0.5,
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
              <Checkbox checked={filters.status.includes(status)} size="small" />
              <ListItemText primary={status} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 140 }} size="small">
        <InputLabel sx={{ color: "text.secondary", fontSize: "0.8rem" }}>Role</InputLabel>
        <Select
          multiple
          value={filters.role}
          onChange={(e) =>
            setFilters({ ...filters, role: e.target.value as UserRole[] })
          }
          renderValue={(selected) => selected.join(", ")}
          sx={{
            borderRadius: "6px",
            height: "32px",
            fontSize: "0.75rem",
            "& .MuiSelect-select": {
              py: 0.5,
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
              <Checkbox checked={filters.role.includes(role)} size="small" />
              <ListItemText primary={role} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          ml: "auto",
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          px: 2,
          py: 0.5,
          borderRadius: 2,
          fontWeight: 600,
          fontSize: "0.75rem",
        }}
      >
        Total Users: {users.length}
      </Typography>
    </div>
  );

  const tableContent = (
    <>
      {error && (
        <Alert
          severity="error"
          sx={{ m: 4, borderRadius: 2 }}
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
          onView={(row) => router.push(`/users/${row.id}`)}
          onResendVerification={(row) => {
            handleResendVerification(row.id, row.email);
          }}
        />
      )}
    </>
  );

  return (
    <MasterPageLayout
      title="Users"
      icon={Users}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
    />
  );
}
