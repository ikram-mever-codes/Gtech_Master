// customerSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CustomerState {
  id: string;
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber: string;
  avatar?: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  isEmailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExp?: Date | null;
  isPhoneVerified: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExp?: Date | null;
  accountVerificationStatus: "pending" | "verified" | "rejected";
  verificationRemark?: string;
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInitialState {
  customer: CustomerState | null;
  loading: boolean;
  error?: string | null;
}

const initialState: CustomerInitialState = {
  customer: null,
  loading: true,
  error: null,
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setCustomerLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setCustomerError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    updateCustomer(state, action: PayloadAction<Partial<CustomerState>>) {
      if (state.customer) {
        state.customer = { ...state.customer, ...action.payload };
      }
    },
    resetCustomer(state) {
      state.customer = null;
      state.loading = false;
      state.error = null;
    },
    customerLogin(state, action: PayloadAction<CustomerState>) {
      state.customer = action.payload;
      state.loading = false;
      state.error = null;
    },
    customerLogout(state) {
      state.customer = null;
      state.loading = false;
      state.error = null;
    },
    customerSignup(state, action: PayloadAction<CustomerState>) {
      state.customer = action.payload;
      state.loading = false;
      state.error = null;
    },
    updateVerificationStatus(
      state,
      action: PayloadAction<{
        isEmailVerified?: boolean;
        isPhoneVerified?: boolean;
        accountVerificationStatus?: "pending" | "verified" | "rejected";
      }>
    ) {
      if (state.customer) {
        state.customer = {
          ...state.customer,
          ...action.payload,
        };
      }
    },
    updateAddresses(
      state,
      action: PayloadAction<{
        addressLine1?: string;
        addressLine2?: string;
        postalCode?: string;
        city?: string;
        country?: string;
        deliveryAddressLine1?: string;
        deliveryAddressLine2?: string;
        deliveryPostalCode?: string;
        deliveryCity?: string;
        deliveryCountry?: string;
      }>
    ) {
      if (state.customer) {
        state.customer = {
          ...state.customer,
          ...action.payload,
        };
      }
    },
  },
});

export const {
  setCustomerLoading,
  setCustomerError,
  updateCustomer,
  resetCustomer,
  customerLogin,
  customerLogout,
  customerSignup,
  updateVerificationStatus,
  updateAddresses,
} = customerSlice.actions;

export default customerSlice.reducer;
