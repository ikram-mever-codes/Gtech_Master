import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Customer } from "../models/customers";
import ErrorHandler from "../utils/errorHandler";
import sendEmail from "../services/emailService";
import { AppDataSource } from "../config/database";
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { AuthorizedCustomerRequest } from "../middlewares/authenticateCustomer";

// 1. Request Customer Account
export const requestCustomerAccount = async (
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
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
      password,
    } = req.body;

    // Validation
    if (
      !companyName ||
      !email ||
      !contactEmail ||
      !contactPhoneNumber ||
      !addressLine1 ||
      !postalCode ||
      !city ||
      !country ||
      !password
    ) {
      return next(
        new ErrorHandler("All required fields must be provided", 400)
      );
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const existingCustomer = await customerRepository.findOne({
      where: [{ email }, { contactEmail }, { contactPhoneNumber }],
    });

    if (existingCustomer) {
      if (existingCustomer.email === email) {
        return next(new ErrorHandler("Email already exists", 400));
      }
      if (existingCustomer.contactEmail === contactEmail) {
        return next(new ErrorHandler("Contact email already exists", 400));
      }
      return next(new ErrorHandler("Phone number already exists", 400));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification code
    const emailVerificationCode = crypto.randomBytes(20).toString("hex");
    const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create customer
    const customer = customerRepository.create({
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
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
      password: hashedPassword,
      emailVerificationCode,
      emailVerificationExp,
      accountVerificationStatus: "pending",
    });

    await customerRepository.save(customer);

    // Send verification email
    const verificationUrl = `${process.env.STAR_URL}/verify-email?code=${emailVerificationCode}`;
    const message = `
      <h2>Welcome to Our Platform</h2>
      <p>Thank you for registering your company ${companyName}.</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      html: message,
    });

    return res.status(201).json({
      success: true,
      message:
        "Customer account requested successfully. Please verify your email.",
      data: {
        id: customer.id,
        companyName: customer.companyName,
        email: customer.email,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 9. Verify Email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code } = req.params;

    if (!code) {
      return next(new ErrorHandler("Verification code is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { emailVerificationCode: code },
    });

    if (!customer) {
      return next(new ErrorHandler("Invalid verification code", 400));
    }

    if (
      customer.emailVerificationExp &&
      customer.emailVerificationExp < new Date()
    ) {
      return next(new ErrorHandler("Verification code has expired", 400));
    }

    if (customer.isEmailVerified) {
      return next(new ErrorHandler("Email is already verified", 400));
    }

    // Update customer
    customer.isEmailVerified = true;
    customer.emailVerificationCode = undefined;
    customer.emailVerificationExp = undefined;
    await customerRepository.save(customer);

    // Notify admin about new customer request (implementation depends on your notification system)
    // ...

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. Your account is pending admin approval.",
    });
  } catch (error) {
    return next(error);
  }
};

// 2. Login Controller
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

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({ where: { email } });

    if (!customer) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    if (!customer.isEmailVerified) {
      return next(new ErrorHandler("Please verify your email first", 401));
    }

    if (customer.accountVerificationStatus !== "verified") {
      return next(new ErrorHandler("Your account is pending approval", 401));
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    const token = jwt.sign(
      { id: customer.id, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    // Filter sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      avatar: customer.avatar,
      accountVerificationStatus: customer.accountVerificationStatus,
    };

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.COOKIE_DOMAIN,
      })
      .json({
        success: true,
        message: "Logged in successfully",
        data: customerData,
      });
  } catch (error) {
    return next(error);
  }
};

// 3. Logout
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    return res
      .clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
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

// 4. Edit Customer Profile
export const editCustomerProfile = async (
  req: AuthorizedCustomerRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = (req as any).customer.id;
    const {
      companyName,
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
    } = req.body;

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

    // Update fields
    if (companyName) customer.companyName = companyName;
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

// 5. Refresh Token
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

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: decoded.id },
    });
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const newToken = jwt.sign(
      { id: customer.id, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    // Filter sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      avatar: customer.avatar,
      accountVerificationStatus: customer.accountVerificationStatus,
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
        data: customerData,
      });
  } catch (error) {
    return next(new ErrorHandler("Invalid token", 401));
  }
};

// 6. Change Password
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const customerId = (req as any).user.id;

    if (!currentPassword || !newPassword) {
      return next(new ErrorHandler("Both passwords are required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const isMatch = await bcrypt.compare(currentPassword, customer.password);
    if (!isMatch) {
      return next(new ErrorHandler("Current password is incorrect", 401));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPassword;
    await customerRepository.save(customer);

    // Send email notification
    const message = `
      <h2>Password Changed</h2>
      <p>Your password was successfully changed.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;

    await sendEmail({
      to: customer.email,
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

// 7. Forgot Password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({ where: { email } });

    if (!customer) {
      return next(
        new ErrorHandler("Customer with this email does not exist", 404)
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExp = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    customer.resetPasswordToken = resetToken;
    customer.resetPasswordExp = resetPasswordExp;
    await customerRepository.save(customer);

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const message = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 30 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    return next(error);
  }
};

// 8. Reset Password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return next(new ErrorHandler("Token and new password are required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!customer) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }

    if (!customer.resetPasswordExp || customer.resetPasswordExp < new Date()) {
      return next(new ErrorHandler("Token has expired", 400));
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    customer.password = hashedPassword;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExp = undefined;
    await customerRepository.save(customer);

    const message = `
      <h2>Password Reset Successful</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;

    await sendEmail({
      to: customer.email,
      subject: "Password Reset Confirmation",
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

export const updateCustomerStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatuses = ["pending", "verified", "suspended"];
    if (!allowedStatuses.includes(status)) {
      return next(new ErrorHandler("Invalid status value", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // Update status
    customer.accountVerificationStatus = status;
    await customerRepository.save(customer);

    // Send status update notification
    const message = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #1a365d;">Account Status Update</h2>
    
    <p>Dear Valued Customer,</p>

    <p>We're writing to inform you that your account status for <strong>${
      customer.companyName
    }</strong> has been updated to: 
    <span style="color: ${
      status === "verified" ? "#2d7a45" : "#b21a17"
    }; font-weight: bold;">
      ${status.toUpperCase()}
    </span></p>

    ${
      status === "verified"
        ? `
      <div style="background: #f0faf4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #2d7a45; margin-top: 0;">Welcome Aboard!</h3>
        <p>Your account is now fully activated. You can access our platform using the button below:</p>
        <p style="margin: 25px 0;">
          <a href="${process.env.STAR_URL}/login" 
             style="background: #2d7a45; color: white; padding: 12px 25px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Login to Your Account
          </a>
        </p>
        <p><strong>First-time login instructions:</strong></p>
        <ol>
          <li>Use your registered email: ${customer.email}</li>
          <li>Click "Forgot Password" if you need to set/reset your credentials</li>
          <li>Contact support if you experience any issues</li>
        </ol>
      </div>
    `
        : ""
    }

    ${
      status === "suspended"
        ? `
      <div style="background: #fdf0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #b21a17; margin-top: 0;">Account Access Temporarily Restricted</h3>
        <p>Your account has been suspended due to:</p>
        <ul>
          <li>Unusual activity detected</li>
          <li>Outstanding documentation requirements</li>
          <li>Policy violation concerns</li>
        </ul>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Contact our support team immediately at 
            <a href="mailto:support@accez.cloud">support@accez.cloud</a>
          </li>
          <li>Provide any requested documentation</li>
          <li>Allow 24-48 hours for reinstatement review</li>
        </ol>
      </div>
    `
        : ""
    }

    ${
      status === "pending"
        ? `
      <div style="background: #fff8e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #8a6d3b; margin-top: 0;">Verification in Progress</h3>
        <p>We're currently reviewing your submitted documents. You can:</p>
        <ul>
          <li>Check your verification status at 
            <a href="${process.env.APP_URL}/dashboard">${process.env.APP_URL}/dashboard</a>
          </li>
          <li>Upload additional documents through our portal</li>
          <li>Expect resolution within 3-5 business days</li>
        </ul>
      </div>
    `
        : ""
    }

    <p style="margin-top: 25px;"><strong>Security Note:</strong> Never share your login credentials. Our team will never ask for your password.</p>

    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
      <p>Best regards,<br>
      The Accez Platform Team</p>
      
      <p style="font-size: 0.9em; color: #666;">
        Contact Support:<br>
        📞 +1 (800) 123-4567<br>
        📧 <a href="mailto:support@accez.cloud">support@accez.cloud</a><br>
        🏢 123 Business Street, Tech City, TX 75001
      </p>
    </div>
  </div>
`;

    await sendEmail({
      to: customer.email,
      subject: "Account Status Update",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Customer status updated successfully",
      data: {
        id: customer.id,
        status: customer.accountVerificationStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const { status } = req.query;
    const sortBy = req.query.sortBy?.toString() || "createdAt";
    const order = req.query.order?.toString().toUpperCase() || "DESC";

    const allowedSortColumns = [
      "createdAt",
      "companyName",
      "email",
      "contactEmail",
      "contactPhoneNumber",
      "taxNumber",
      "city",
      "country",
      "accountVerificationStatus",
    ];

    const validatedSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "createdAt";

    const validatedOrder = order === "ASC" ? "ASC" : "DESC";

    const queryBuilder = customerRepository
      .createQueryBuilder("customer")
      .where("customer.isEmailVerified = :verified", { verified: true });

    if (status) {
      queryBuilder.andWhere("customer.accountVerificationStatus = :status", {
        status: status.toString(),
      });
    }

    queryBuilder.orderBy(`customer.${validatedSortBy}`, validatedOrder);

    const customers = await queryBuilder.getMany();

    const customersData = customers.map((customer) => ({
      id: customer.id,
      companyName: customer.companyName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      taxNumber: customer.taxNumber,
      addressLine1: customer.addressLine1,
      city: customer.city,
      country: customer.country,
      createdAt: customer.createdAt,
      accountVerificationStatus: customer.accountVerificationStatus,
      avatar: customer.avatar,
    }));

    return res.status(200).json({
      success: true,
      count: customersData.length,
      data: customersData,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSingleUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    const customerRepo = AppDataSource.getRepository(Customer);
    const customer = await customerRepo.find({ where: { id: customerId } });

    if (!customer) {
      return next(new ErrorHandler("Customer Not Found!", 404));
    }
    return res.status(200).json({ data: customer, success: true });
  } catch (error) {
    return next(error);
  }
};
