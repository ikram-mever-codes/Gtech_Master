import { configureStore } from "@reduxjs/toolkit";
import customerReducer from "./features/customerSlice";
const store = configureStore({
  reducer: {
    customer: customerReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

// Correctly infer RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
