"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  LucideMail,
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideArrowRight,
} from "lucide-react";
import { Button, TextField, Typography, Link, IconButton } from "@mui/material";
import Image from "next/image";
import theme from "@/styles/theme";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../Redux/store";
import { BASE_URL, loadingStyles, successStyles } from "@/utils/constants";
import toast from "react-hot-toast";
import { api, handleApiError } from "@/utils/api";
import { login } from "../Redux/features/userSlice";
import axios from "axios";
import { useRouter } from "next/navigation";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { user, loading } = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm();

  const dispatch = useDispatch<AppDispatch>();
  const onSubmit = async (data: any) => {
    try {
      toast.loading("Authenticating...", loadingStyles);
      const response = await axios.post(`${BASE_URL}/auth/login`, data, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });

      dispatch(login(response.data.data));
      toast.dismiss();
      toast.success(`Welcome ${response.data.data.name}!`, successStyles);

      router.push("/dashboard");
      window.location.reload();

      return response.data;
    } catch (error) {
      handleApiError(error, "Login failed");
    }
  };

  if (user && !loading) {
    return router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0]">
      <div className="min-w-[40vw] flex rounded-2xl shadow-xl bg-white overflow-hidden">
        {/* Form Section */}
        <div className="flex-1 p-12">
          <div className="max-w-md mx-auto">
            <div className="text-center flex-col  flex justify-center items-center mb-10">
              <Image
                src="/logo.png"
                alt="GTech Master System"
                width={200}
                height={180}
                className="mb-4  ml-[50px]"
              />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <TextField
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message?.toString()}
                  InputProps={{
                    startAdornment: (
                      <LucideMail className="mr-2 text-gray-400" size={20} />
                    ),
                  }}
                />
              </div>

              <div>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  error={!!errors.password}
                  helperText={errors.password?.message?.toString()}
                  InputProps={{
                    startAdornment: (
                      <LucideLock className="mr-2 text-gray-400" size={20} />
                    ),
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        className="text-gray-400 hover:text-primary-main"
                      >
                        {showPassword ? (
                          <LucideEyeOff size={20} />
                        ) : (
                          <LucideEye size={20} />
                        )}
                      </IconButton>
                    ),
                  }}
                />
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="!text-sm !text-gray-600 hover:!text-primary-main transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                type="submit"
                endIcon={<LucideArrowRight size={20} />}
                className="!py-3 text-white !rounded-lg !font-bold !transition-all hover:!scale-[1.02]"
              >
                Sign In
              </Button>

              <Typography
                variant="body2"
                className="!text-center !text-gray-600 !mt-8"
              >
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="!text-primary-main hover:!underline"
                >
                  Request Access
                </Link>
              </Typography>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
