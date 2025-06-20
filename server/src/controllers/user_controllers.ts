import { Request, Response, NextFunction } from "express";
import { Not } from "typeorm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, UserRole } from "../models/users";
import { Permission } from "../models/permissions";
import ErrorHandler from "../utils/errorHandler";
import sendEmail from "../services/emailService";
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { AppDataSource } from "../config/database";

// Create User with Permissions (Admin/Super Admin only)
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      email,
      role,
      assignedResources,
      permissions,
      phoneNumber,
      gender,
      dateOfBirth,
      address,
      country,
    } = req.body;

    // Validation
    if (!name || !email || !role) {
      return next(new ErrorHandler("Name, email and role are required", 400));
    }

    if (!Object.values(UserRole).includes(role)) {
      return next(new ErrorHandler("Invalid user role", 400));
    }

    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
      assignedResources: assignedResources || [],
      phoneNumber,
      country,
      gender,
      dateOfBirth,
      address,
    });

    await userRepository.save(user);

    if (permissions && permissions.length > 0) {
      const permissionRepository = AppDataSource.getRepository(Permission);
      const permissionEntities = permissions.map((perm: any) =>
        permissionRepository.create({
          resource: perm.resource,
          actions: perm.actions,
          user,
        })
      );
      await permissionRepository.save(permissionEntities);
    }

    const loginLink = `${process.env.FRONTEND_URL}/login`;
    const message = `
      <h2>Welcome to Our Platform</h2>
      <p>Your admin account has been created with the following credentials:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please login <a href="${loginLink}">here</a> and change your password.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Your Admin Account Credentials",
      html: message,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully. Credentials sent to email.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Email and password are required", 400));
    }

    // Initialize repository through the DataSource
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { email },
      relations: ["permissions"],
    });

    if (!user) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    if (!user.password) {
      return next(new ErrorHandler("Account not properly set up", 400));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    if (!user.isEmailVerified) {
      return next(new ErrorHandler("Please verify your email first", 401));
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!
    );

    // Filter sensitive data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      assignedResources: user.assignedResources,
      avatar: user.avatar,
    };

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        message: "Logged in successfully",
        data: userData,
      });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    return res
      .clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .status(200)
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return next(new ErrorHandler("Not authenticated", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.id },
      relations: ["permissions"],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const newToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!
    );

    // Filter sensitive data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      assignedResources: user.assignedResources,
      avatar: user.avatar,
    };

    return res
      .status(200)
      .cookie("token", newToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        data: userData,
      });
  } catch (error) {
    return next(new ErrorHandler("Invalid token", 401));
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    if (!currentPassword || !newPassword) {
      return next(new ErrorHandler("Both passwords are required", 400));
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!user.password) {
      return next(new ErrorHandler("Password not set for this user", 400));
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(new ErrorHandler("Current password is incorrect", 401));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepository.save(user);

    // Send email notification
    const message = `
      <h2>Password Changed</h2>
      <p>Your password was successfully changed.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Change Notification",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const editProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id;
    const { name, phoneNumber, gender, dateOfBirth, address } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Handle avatar upload
    if (req.file) {
      if (!fs.existsSync(req.file.path)) {
        return next(new ErrorHandler("File not found", 404));
      }

      try {
        // Delete old avatar if exists
        if (user.avatar) {
          const publicId = user.avatar.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "avatars",
          width: 150,
          crop: "scale",
        });
        fs.unlinkSync(req.file.path);
        user.avatar = result.secure_url;
      } catch (uploadError) {
        return next(new ErrorHandler("Error uploading avatar", 500));
      }
    }

    // Update fields
    if (name) user.name = name;
    if (phoneNumber) {
      const existingUser = await userRepository.findOne({
        where: { phoneNumber, id: Not(userId) },
      });
      if (existingUser) {
        return next(new ErrorHandler("Phone number already in use", 400));
      }
      user.phoneNumber = phoneNumber;
    }
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (address) user.address = address;

    await userRepository.save(user);

    // Filter sensitive data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: userData,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRepo = AppDataSource.getRepository(User);

    const users = await userRepo.find({});

    return res.status(200).json({ data: users.reverse(), success: true });
  } catch (error) {
    return next(error);
  }
};
