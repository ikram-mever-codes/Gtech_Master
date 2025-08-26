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
import { Customer } from "../models/customers";
import { AuthorizedRequest } from "../middlewares/authorized";

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

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const id = userId;
    if (!id) {
      return next(new ErrorHandler("User ID is required", 400));
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      assignedResources: user.assignedResources,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      country: user.country,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    return next(error);
  }
};
export const forgetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Generate reset token with expiration (1 hour)
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExp = new Date(Date.now() + 3600000);
    await userRepository.save(user);

    // Create reset link
    const resetLink = `${process.env.MASTER}/reset-password?token=${resetToken}`;

    const message = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password (expires in 1 hour):</p>
      <a href="${resetLink}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent",
    });
  } catch (error) {
    return next(error);
  }
};

// Reset Password Controller
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new ErrorHandler("Token and new password are required", 400));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    } catch (error) {
      return next(new ErrorHandler("Invalid or expired token", 401));
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: {
        id: decoded.id,
        resetPasswordToken: token,
      },
    });

    if (
      !user ||
      (user.resetPasswordExp && new Date() > user.resetPasswordExp)
    ) {
      return next(new ErrorHandler("Invalid or expired token", 401));
    }

    // Update password and clear reset token
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExp = undefined;
    await userRepository.save(user);

    // Send confirmation email
    const message = `
      <h2>Password Updated</h2>
      <p>Your password has been successfully updated.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Updated",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const createCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      companyName,
      email,
      contactEmail,
      contactPhoneNumber,
      taxNumber,
      addressLine1,
      addressLine2,
      postalCode,
      city,
      country,
      deliveryAddressLine1,
      deliveryAddressLine2,
      legalName,
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
    } = req.body;

    // Validations
    if (
      !companyName ||
      !legalName ||
      !email ||
      !contactEmail ||
      !contactPhoneNumber ||
      !taxNumber
    ) {
      return next(
        new ErrorHandler(
          "Company name, legal Name, email, contact email, contact phone number and tax number are required",
          400
        )
      );
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const existingCustomer = await customerRepository.findOne({
      where: { email },
    });

    if (existingCustomer) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create customer (company)
    const customer = customerRepository.create({
      companyName,
      email,
      contactEmail,
      contactPhoneNumber,
      taxNumber,
      legalName,
      addressLine1,
      addressLine2,
      postalCode,
      city,
      country,
      deliveryAddressLine1,
      deliveryAddressLine2,
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
      password: hashedPassword,
      accountVerificationStatus: "verified",
      isEmailVerified: true,
    });

    await customerRepository.save(customer);

    const loginLink = `${process.env.STAR_URL}/login`;
    const message = `
      <h2>Welcome to Our Gtech Customers Portal</h2>
      <p>Your company account has been created by the admin with the following credentials:</p>
      <p><strong>Company Name:</strong> ${companyName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please login <a href="${loginLink}">here</a> and change your password.</p>
      <p>You can now start using our platform with your company account.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Your Company Account Credentials",
      html: message,
    });

    // Also send to contact email if different
    if (contactEmail !== email) {
      await sendEmail({
        to: contactEmail,
        subject: "Your Company Account Credentials",
        html: message,
      });
    }

    // Return response without sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      createdAt: customer.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: "Company created successfully. Credentials sent to email.",
      data: customerData,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const id = userId;
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
    if (!id) {
      return next(new ErrorHandler("User ID is required", 400));
    }

    if (!name || !email || !role) {
      return next(new ErrorHandler("Name, email and role are required", 400));
    }

    if (!Object.values(UserRole).includes(role)) {
      return next(new ErrorHandler("Invalid user role", 400));
    }

    const userRepository = AppDataSource.getRepository(User);
    const permissionRepository = AppDataSource.getRepository(Permission);

    const user = await userRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (email !== user.email) {
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }
    }

    user.name = name;
    user.email = email;
    user.role = role;
    user.assignedResources = assignedResources || [];
    user.phoneNumber = phoneNumber;
    user.gender = gender;
    user.dateOfBirth = dateOfBirth;
    user.address = address;
    user.country = country;

    if (permissions) {
      await permissionRepository.delete({ user: { id: user.id } });

      if (permissions.length > 0) {
        const permissionEntities = permissions.map((perm: any) =>
          permissionRepository.create({
            resource: perm.resource,
            actions: perm.actions,
            user,
          })
        );
        await permissionRepository.save(permissionEntities);
      }
    }

    await userRepository.save(user);

    const updatedUser = await userRepository.findOne({
      where: { id: user.id },
      relations: ["permissions"],
    });

    if (!updatedUser) {
      return next(new ErrorHandler("Failed to fetch updated user", 500));
    }

    const userData = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      assignedResources: updatedUser.assignedResources,
      permissions: updatedUser.permissions,
      phoneNumber: updatedUser.phoneNumber,
      gender: updatedUser.gender,
      dateOfBirth: updatedUser.dateOfBirth,
      address: updatedUser.address,
      country: updatedUser.country,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userData,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCustomer = async (
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      companyName,
      legalName,
      contactEmail,
      contactPhoneNumber,
      taxNumber,
      addressLine1,
      addressLine2,
      postalCode,
      city,
      country,
      deliveryAddressLine1,
      deliveryAddressLine2,
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
      id,
    } = req.body;
    const customerId = id;

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // Handle avatar upload
    if (req.file) {
      if (!fs.existsSync(req.file.path)) {
        return next(new ErrorHandler("File not found", 404));
      }

      try {
        // Delete old avatar if exists
        if (customer.avatar) {
          const publicId = customer.avatar.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "customer_avatars",
          width: 150,
          crop: "scale",
        });
        fs.unlinkSync(req.file.path);
        customer.avatar = result.secure_url;
      } catch (uploadError) {
        return next(new ErrorHandler("Error uploading avatar", 500));
      }
    }
    console.log(legalName);
    // Update fields
    if (companyName) customer.companyName = companyName;
    if (legalName) customer.legalName = legalName;
    if (contactEmail) customer.contactEmail = contactEmail;
    if (contactPhoneNumber) customer.contactPhoneNumber = contactPhoneNumber;
    if (taxNumber) customer.taxNumber = taxNumber;
    if (addressLine1) customer.addressLine1 = addressLine1;
    if (addressLine2) customer.addressLine2 = addressLine2;
    if (postalCode) customer.postalCode = postalCode;
    if (city) customer.city = city;
    if (country) customer.country = country;
    if (deliveryAddressLine1)
      customer.deliveryAddressLine1 = deliveryAddressLine1;
    if (deliveryAddressLine2)
      customer.deliveryAddressLine2 = deliveryAddressLine2;
    if (deliveryPostalCode) customer.deliveryPostalCode = deliveryPostalCode;
    if (deliveryCity) customer.deliveryCity = deliveryCity;
    if (deliveryCountry) customer.deliveryCountry = deliveryCountry;

    await customerRepository.save(customer);

    // Filter sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      taxNumber: customer.taxNumber,
      avatar: customer.avatar,
      accountVerificationStatus: customer.accountVerificationStatus,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: customerData,
    });
  } catch (error) {
    return next(error);
  }
};
