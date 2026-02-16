"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { BASE_URL } from "@/utils/constants";
import { login, resetUser } from "@/app/Redux/features/userSlice";
import { AppDispatch, RootState } from "@/app/Redux/store";
import Loading from "@/app/loading";

export const fetchUser = async (dispatch: any, setLoading: any) => {
  try {
    const res = await axios.get(`${BASE_URL}/auth/refresh`, {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });
    const data = res.data;
    if (data.success) {
      dispatch(login(data.data));
    } else {
      dispatch(resetUser());
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    dispatch(resetUser());
  } finally {
    setLoading(false);
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSelector((state: RootState) => state.user);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const unprotectedRoutes = [
    "/login",
    "/sign-up",
    "/verify",
    "/setup/company",
    "/setup/contact",
    "/forgot-password",
    "/reset-password",
  ];

  const isUnprotectedRoute = unprotectedRoutes.some((route) =>
    pathname?.startsWith(route)
  );

  useEffect(() => {
    const initializeAuth = async () => {
      await fetchUser(dispatch, setLoading);
      setIsAuthenticated(!!user);
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isUnprotectedRoute && !user) {
        router.replace("/login");
        return;
      }
    }
  }, [loading, user, router, pathname, isUnprotectedRoute]);

  if (loading) {
    return <Loading type="full" text="Loading Page..." />;
  }

  if (!isUnprotectedRoute && !user) {
    return <Loading type="full" text="Loading Page..." />;
  }

  return <>{children}</>;
};

export default AuthProvider;
