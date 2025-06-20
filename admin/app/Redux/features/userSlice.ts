// userSlice.ts
import { UserRole } from "@/utils/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
}

export interface UserState {
  id: string;
  name: string;
  email: string;
  password?: string;
  country?: string;
  role: UserRole;
  assignedResources: string[];
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: Date;
  address?: string;
  avatar?: string;
  isEmailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExp?: Date | null;
  isPhoneVerified: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExp?: Date | null;
  resetPasswordToken?: string;
  resetPasswordExp?: Date;
  permissions: Permission[];
}

export interface InitialState {
  user: UserState | null;
  loading: boolean;
  error?: string | null;
}

const initialState: InitialState = {
  user: null,
  loading: true,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    updateUser(state, action: PayloadAction<Partial<UserState>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    resetUser(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    login(state, action: PayloadAction<UserState>) {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    signup(state, action: PayloadAction<UserState>) {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    updatePermissions(state, action: PayloadAction<Permission[]>) {
      if (state.user) {
        state.user.permissions = action.payload;
      }
    },
    updateAssignedResources(state, action: PayloadAction<string[]>) {
      if (state.user) {
        state.user.assignedResources = action.payload;
      }
    },
    updateRole(state, action: PayloadAction<UserRole>) {
      if (state.user) {
        state.user.role = action.payload;
      }
    },
    updateVerificationStatus(
      state,
      action: PayloadAction<{
        isEmailVerified?: boolean;
        isPhoneVerified?: boolean;
      }>
    ) {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      }
    },
  },
});

export const {
  setLoading,
  setError,
  updateUser,
  resetUser,
  login,
  logout,
  signup,
  updatePermissions,
  updateAssignedResources,
  updateRole,
  updateVerificationStatus,
} = userSlice.actions;

export default userSlice.reducer;
