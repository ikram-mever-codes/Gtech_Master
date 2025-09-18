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
import { CustomerCreator, List, LIST_STATUS, ListItem } from "../models/list";

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

    // Generate email verification code (6-digit code)
    const emailVerificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
      emailVerificationCode,
      emailVerificationExp,
      isEmailVerified: false,
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

    const verificationLink = `https://master.gtech.de/verify?email=${encodeURIComponent(
      email
    )}&verificationCode=${emailVerificationCode}`;
    const loginLink = `https://master.gtech.de/login`;

    const message = `
      <h2>Welcome to Our Platform</h2>
      <p>Your admin account has been created with the following credentials:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
      <p>Or copy and paste this link in your browser:</p>
      <p>${verificationLink}</p>
      <p>After verification, you can login <a href="${loginLink}">here</a> and change your password.</p>
      <p><strong>Note:</strong> This verification code will expire in 24 hours.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Your Admin Account Credentials - Verify Your Email",
      html: message,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully. Verification email sent.",
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

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, verificationCode } = req.query;

    if (!email || !verificationCode) {
      return next(
        new ErrorHandler("Email and verification code are required", 400)
      );
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: {
        email: email as string,
        emailVerificationCode: verificationCode as string,
      },
    });

    if (!user) {
      return next(new ErrorHandler("Invalid verification code or email", 400));
    }

    // Check if verification code has expired
    if (user.emailVerificationExp && user.emailVerificationExp < new Date()) {
      return next(new ErrorHandler("Verification code has expired", 400));
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExp = null;

    await userRepository.save(user);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
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
    const listRepository = AppDataSource.getRepository(List);
    const existingCustomer = await customerRepository.findOne({
      where: { email },
    });

    if (existingCustomer) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Use transaction to ensure both customer and list are created together
    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
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

        // Save customer
        const savedCustomer = await transactionalEntityManager.save(customer);

        // Create default list for the customer
        const defaultList = listRepository.create({
          name: `${companyName} - Default List`,
          description: `Default list for ${companyName}`,
          customer: savedCustomer,
          createdBy: {
            customer: savedCustomer,
          } as CustomerCreator,
          status: LIST_STATUS.ACTIVE,
        });

        // Save the default list
        const savedList = await transactionalEntityManager.save(defaultList);

        return { customer: savedCustomer, list: savedList };
      }
    );

    const { customer, list } = result;

    const loginLink = `${process.env.STAR_URL}/login`;
    const message = `
      <h2>Welcome to Our Gtech Customers Portal</h2>
      <p>Your company account has been created by the admin with the following credentials:</p>
      <p><strong>Company Name:</strong> ${companyName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please login <a href="${loginLink}">here</a> and change your password.</p>
      <p>You can now start using our platform with your company account.</p>
      <p>A default list "${list.name}" has been created for your company.</p>
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
      defaultList: {
        id: list.id,
        name: list.name,
        listNumber: list.listNumber,
      },
    };

    return res.status(201).json({
      success: true,
      message:
        "Company created successfully with default list. Credentials sent to email.",
      data: customerData,
    });
  } catch (error) {
    console.error("Error creating company:", error);
    return next(new ErrorHandler("Failed to create company account", 500));
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

export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new ErrorHandler("Customer ID is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

    // Check if customer exists
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // Check for any related entities that would prevent deletion
    const [
      listsWithItemsCount,
      invoiceCount,
      // Add other entity counts here as needed
    ] = await Promise.all([
      // Check for lists with items
      listRepository
        .createQueryBuilder("list")
        .innerJoin("list.items", "item")
        .where("list.customerId = :customerId", { customerId })
        .getCount(),

      // Check for invoices
      AppDataSource.getRepository("Invoice") // Replace "Invoice" with your actual invoice entity name
        .createQueryBuilder("invoice")
        .where("invoice.customerId = :customerId", { customerId })
        .getCount(),

      // Add checks for other related entities here
    ]);

    if (listsWithItemsCount > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete customer. Customer has lists with items. Please delete all items first.",
          400
        )
      );
    }

    if (invoiceCount > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete customer. Customer has associated invoices. Please delete all invoices first.",
          400
        )
      );
    }

    // Add other entity checks here

    // Use a transaction to ensure data consistency
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Delete all related entities in the correct order

      // 1. First delete list items (though we already checked there are none with items)
      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from(ListItem)
        .where(
          "listId IN (SELECT id FROM list WHERE customerId = :customerId)",
          { customerId }
        )
        .execute();

      // 2. Delete empty lists
      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from(List)
        .where("customerId = :customerId", { customerId })
        .execute();

      // 3. Delete any other related entities (invoices, etc.)
      // Example for invoices - you might want to handle this differently
      // await transactionalEntityManager
      //   .createQueryBuilder()
      //   .delete()
      //   .from(Invoice)
      //   .where("customerId = :customerId", { customerId })
      //   .execute();

      // 4. Finally delete the customer
      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from(Customer)
        .where("id = :customerId", { customerId })
        .execute();
    });

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return next(
      new ErrorHandler(
        "Failed to delete customer. Please check all associated data has been removed.",
        500
      )
    );
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return next(new ErrorHandler("User ID is required", 400));
    }

    const userRepository = AppDataSource.getRepository(User);
    const permissionRepository = AppDataSource.getRepository(Permission);

    // Check if user exists
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Prevent self-deletion (admin cannot delete themselves)
    const currentUserId = (req as any).user?.id;
    if (currentUserId && userId === currentUserId) {
      return next(new ErrorHandler("You cannot delete your own account", 400));
    }

    // Check if user is the last admin (optional safety check)
    if (user.role === UserRole.ADMIN) {
      const adminCount = await userRepository.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        return next(
          new ErrorHandler("Cannot delete the last admin account", 400)
        );
      }
    }

    await userRepository.delete(user.id);

    // Send notification email (optional)
    try {
      const message = `
        <h2>Account Deletion Notification</h2>
        <p>Your account (${user.email}) has been deleted by an administrator.</p>
        <p>If you believe this was a mistake, please contact support immediately.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: "Account Deletion Notification",
        html: message,
      });
    } catch (emailError) {
      console.error("Failed to send deletion notification email:", emailError);
      // Continue with the response even if email fails
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return next(
      new ErrorHandler("Failed to delete user. Please try again later.", 500)
    );
  }
};
