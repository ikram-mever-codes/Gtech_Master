import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Customer } from "../models/customers";
import { StarCustomerDetails } from "../models/star_customer_details";
import ErrorHandler from "../utils/errorHandler";
import sendEmail from "../services/emailService";
import { AppDataSource } from "../config/database";
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { AuthorizedCustomerRequest } from "../middlewares/authenticateCustomer";
import { List } from "../models/list";
import { BusinessDetails } from "../models/business_details";
import { Country } from "../models/country";
import { ContactPerson, Sex } from "../models/contact_person";
import { StarBusinessDetails } from "../models/star_business_details";
import path from "path";
// 1. Request Customer Account
export const requestCustomerAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      companyName,
      legalName,
      email,
      contactEmail,
      contactPhoneNumber,
      taxNumber,
      vatTaxId,
      deliveryAddressLine1,
      deliveryAddressLine2,
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
      password,
    } = req.body;

    // Validation - only company name is required
    if (!companyName) {
      return next(new ErrorHandler("Company name is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);

    // Check for existing customer - only match on fields that were actually provided
    const duplicateConditions: Record<string, string>[] = [{ companyName }];
    if (email) duplicateConditions.push({ email });
    if (contactEmail) duplicateConditions.push({ contactEmail });
    if (contactPhoneNumber) duplicateConditions.push({ contactPhoneNumber });

    const existingCustomer = await customerRepository.findOne({
      where: duplicateConditions,
    });

    if (existingCustomer) {
      if (existingCustomer.companyName === companyName) {
        return next(new ErrorHandler("Company name already exists", 400));
      }
      if (email && existingCustomer.email === email) {
        return next(new ErrorHandler("Email already exists", 400));
      }
      if (contactEmail && existingCustomer.contactEmail === contactEmail) {
        return next(new ErrorHandler("Contact email already exists", 400));
      }
      return next(new ErrorHandler("Phone number already exists", 400));
    }

    // Hash password only if provided
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    // Generate email verification code
    const emailVerificationCode = crypto.randomBytes(20).toString("hex");
    const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Use transaction to ensure both customer and star customer details are created together
    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        // Create customer
        const customer = customerRepository.create({
          companyName,
          legalName,
          email,
          contactEmail,
          contactPhoneNumber,
          vatTaxId,
          stage: "star_customer",
        });

        // Save customer first
        const savedCustomer = await transactionalEntityManager.save(customer);

        // Create star customer details
        const starCustomerDetails = starCustomerDetailsRepository.create({
          customer: savedCustomer,
          taxNumber,
          password: hashedPassword,
          emailVerificationCode,
          emailVerificationExp,
          accountVerificationStatus: "pending",
          deliveryAddressLine1,
          deliveryAddressLine2,
          deliveryPostalCode,
          deliveryCity,
          deliveryCountry,
        });

        // Save star customer details
        const savedStarCustomerDetails =
          await transactionalEntityManager.save(starCustomerDetails);

        // Update customer with star customer details relationship
        savedCustomer.starCustomerDetails = savedStarCustomerDetails;
        await transactionalEntityManager.save(savedCustomer);

        return {
          customer: savedCustomer,
          starCustomerDetails: savedStarCustomerDetails,
        };
      },
    );

    const { customer } = result;

    // Send verification email only if an email was provided
    if (email) {
      const verificationUrl = `${process.env.STAR_URL}/verify-email?code=${emailVerificationCode}`;
      const displayName = legalName || companyName;

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Verification</title>
</head>
<body>
    <h2>Welcome to Our Platform</h2>
    <p>Hello ${displayName},</p>
    
    <p>Thank you for registering your company <strong>${companyName}</strong>.</p>
    
    <p>Please verify your email by clicking the link below:</p>
    
    <p><a href="${verificationUrl}">Verify Email Address</a></p>
    
    <p>Or copy and paste this link into your browser:</p>
    <p>${verificationUrl}</p>
    
    <p>This link will expire in 24 hours for security reasons.</p>
    
    <hr>
    <p><small>This is an automated message. Please do not reply to this email.</small></p>
</body>
</html>
      `;

      const textMessage = `
Welcome to Our Platform

Hello ${displayName},

Thank you for registering your company ${companyName}.

Please verify your email by clicking this link:
${verificationUrl}

This link will expire in 24 hours for security reasons.

This is an automated message. Please do not reply to this email.
      `;

      await sendEmail({
        to: email,
        subject: "Verify Your Email Address",
        html: htmlMessage,
        text: textMessage,
        headers: {
          "X-Priority": "3",
          "X-Mailer": "Gtech Industries Gmbh",
        },
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Customer account requested successfully. Please verify your email.",
      data: {
        id: customer.id,
        companyName: customer.companyName,
        legalName: customer.legalName,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("Request customer account error:", error);
    return next(new ErrorHandler("Failed to create customer account", 500));
  }
};

// 9. Verify Email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code } = req.params;

    if (!code) {
      return next(new ErrorHandler("Verification code is required", 400));
    }

    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);
    const starCustomerDetails = await starCustomerDetailsRepository.findOne({
      where: { emailVerificationCode: code },
      relations: ["customer"],
    });

    if (!starCustomerDetails || !starCustomerDetails.customer) {
      return next(new ErrorHandler("Invalid verification code", 400));
    }

    if (
      starCustomerDetails.emailVerificationExp &&
      starCustomerDetails.emailVerificationExp < new Date()
    ) {
      return next(new ErrorHandler("Verification code has expired", 400));
    }

    if (starCustomerDetails.isEmailVerified) {
      return next(new ErrorHandler("Email is already verified", 400));
    }

    // Update star customer details
    starCustomerDetails.isEmailVerified = true;
    starCustomerDetails.emailVerificationCode = undefined;
    starCustomerDetails.emailVerificationExp = undefined;
    await starCustomerDetailsRepository.save(starCustomerDetails);

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. Your account is pending admin approval.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return next(new ErrorHandler("Failed to verify email", 500));
  }
};

// 2. Login Controller
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Email and password are required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { email },
      relations: ["starCustomerDetails"],
    });
    console.log(customer);
    if (!customer || !customer.starCustomerDetails) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    if (!customer.starCustomerDetails.isEmailVerified) {
      return next(new ErrorHandler("Please verify your email first", 401));
    }

    if (customer.starCustomerDetails.accountVerificationStatus !== "verified") {
      return next(new ErrorHandler("Your account is pending approval", 401));
    }

    const isMatch = await bcrypt.compare(
      password,
      customer.starCustomerDetails.password,
    );
    if (!isMatch) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    const token = jwt.sign(
      { id: customer.id, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    // Filter sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      avatar: customer.avatar,
      stage: customer.stage,
      accountVerificationStatus:
        customer.starCustomerDetails.accountVerificationStatus,
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
    console.error("Login error:", error);
    return next(new ErrorHandler("Failed to login", 500));
  }
};

// 3. Logout
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
  next: NextFunction,
) => {
  try {
    const customerId = (req as any).customer.id;
    const {
      companyName,
      legalName,
      contactEmail,
      contactPhoneNumber,
      taxNumber,
      vatTaxId,
      deliveryAddressLine1,
      deliveryAddressLine2,
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
    } = req.body;

    const customerRepository = AppDataSource.getRepository(Customer);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);

    const customer = await customerRepository.findOne({
      where: { id: customerId },
      relations: ["starCustomerDetails"],
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

    // Update customer fields
    if (companyName) customer.companyName = companyName;
    if (legalName) customer.legalName = legalName;
    if (contactEmail) customer.contactEmail = contactEmail;
    if (contactPhoneNumber) customer.contactPhoneNumber = contactPhoneNumber;
    if (vatTaxId) customer.vatTaxId = vatTaxId;

    // Save customer updates
    await customerRepository.save(customer);

    // Update star customer details if they exist
    if (customer.starCustomerDetails) {
      const starCustomerDetails = await starCustomerDetailsRepository.findOne({
        where: { id: customer.starCustomerDetails.id },
      });

      if (starCustomerDetails) {
        if (taxNumber) starCustomerDetails.taxNumber = taxNumber;
        if (deliveryAddressLine1)
          starCustomerDetails.deliveryAddressLine1 = deliveryAddressLine1;
        if (deliveryAddressLine2)
          starCustomerDetails.deliveryAddressLine2 = deliveryAddressLine2;
        if (deliveryPostalCode)
          starCustomerDetails.deliveryPostalCode = deliveryPostalCode;
        if (deliveryCity) starCustomerDetails.deliveryCity = deliveryCity;
        if (deliveryCountry)
          starCustomerDetails.deliveryCountry = deliveryCountry;

        await starCustomerDetailsRepository.save(starCustomerDetails);
      }
    }

    // Get updated customer with relations for response
    const updatedCustomer = await customerRepository.findOne({
      where: { id: customerId },
      relations: ["starCustomerDetails"],
    });

    if (!updatedCustomer || !updatedCustomer.starCustomerDetails) {
      return next(new ErrorHandler("Customer not found after update", 404));
    }

    // Filter sensitive data
    const customerData = {
      id: updatedCustomer.id,
      companyName: updatedCustomer.companyName,
      legalName: updatedCustomer.legalName,
      email: updatedCustomer.email,
      contactEmail: updatedCustomer.contactEmail,
      contactPhoneNumber: updatedCustomer.contactPhoneNumber,
      vatTaxId: updatedCustomer.vatTaxId,
      avatar: updatedCustomer.avatar,
      stage: updatedCustomer.stage,
      starCustomerDetails: {
        taxNumber: updatedCustomer.starCustomerDetails.taxNumber,
        accountVerificationStatus:
          updatedCustomer.starCustomerDetails.accountVerificationStatus,
        deliveryAddressLine1:
          updatedCustomer.starCustomerDetails.deliveryAddressLine1,
        deliveryAddressLine2:
          updatedCustomer.starCustomerDetails.deliveryAddressLine2,
        deliveryPostalCode:
          updatedCustomer.starCustomerDetails.deliveryPostalCode,
        deliveryCity: updatedCustomer.starCustomerDetails.deliveryCity,
        deliveryCountry: updatedCustomer.starCustomerDetails.deliveryCountry,
      },
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: customerData,
    });
  } catch (error) {
    console.error("Edit customer profile error:", error);
    return next(new ErrorHandler("Failed to update customer profile", 500));
  }
};

// 5. Refresh Token
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
      relations: ["starCustomerDetails"],
    });

    if (!customer || !customer.starCustomerDetails) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const newToken = jwt.sign(
      { id: customer.id, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    // Filter sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      avatar: customer.avatar,
      stage: customer.stage,
      accountVerificationStatus:
        customer.starCustomerDetails.accountVerificationStatus,
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
  req: AuthorizedCustomerRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const customerId = (req as any).customer.id;

    if (!currentPassword || !newPassword) {
      return next(new ErrorHandler("Both passwords are required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);

    const customer = await customerRepository.findOne({
      where: { id: customerId },
      relations: ["starCustomerDetails"],
    });

    if (!customer || !customer.starCustomerDetails) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      customer.starCustomerDetails.password,
    );
    if (!isMatch) {
      return next(new ErrorHandler("Current password is incorrect", 401));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    customer.starCustomerDetails.password = hashedPassword;
    await starCustomerDetailsRepository.save(customer.starCustomerDetails);

    // Send email notification
    const message = `
      <h2>Password Changed</h2>
      <p>Your password was successfully changed.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;

    await sendEmail({
      to: customer.email || "",
      subject: "Password Change Notification",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return next(new ErrorHandler("Failed to change password", 500));
  }
};

// 7. Forgot Password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);

    const customer = await customerRepository.findOne({
      where: { email },
      relations: ["starCustomerDetails"],
    });

    if (!customer || !customer.starCustomerDetails) {
      // Don't reveal that email doesn't exist for security
      return res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExp = new Date(Date.now() + 30 * 60 * 1000);

    customer.starCustomerDetails.resetPasswordToken = resetToken;
    customer.starCustomerDetails.resetPasswordExp = resetPasswordExp;
    await starCustomerDetailsRepository.save(customer.starCustomerDetails);

    // Send reset email with German content
    const resetUrl = `${process.env.STAR_URL}/reset-password?token=${resetToken}`;

    const message = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Passwort zurücksetzen</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Passwort zurücksetzen – GTech Star-Kundenportal</h2>
              <p>Hallo ${customer.companyName || "Nutzer"},</p>
              <p>Du hast eine Anfrage gestellt, Dein Passwort für das GTech Star-Kundenportal zurückzusetzen.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #007bff; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 4px; display: inline-block;
                            font-weight: bold;">
                      👉 Passwort jetzt zurücksetzen
                  </a>
              </div>
              
              <p>Falls Du den Link lieber kopieren möchtest, kannst Du ihn auch direkt in Deinen Browser einfügen:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              
              <p><strong>Aus Sicherheitsgründen ist dieser Link 30 Minuten gültig.</strong></p>
              
              <p>Wenn Du kein neues Passwort angefordert hast, kannst Du diese E-Mail einfach ignorieren.</p>
                 
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px;">
                  Viele Grüße<br>
                  Dein GTech Team
              </p>
          </div>
      </body>
      </html>
    `;

    const textVersion = `
Passwort zurücksetzen – GTech Star-Kundenportal

Hallo ${customer.companyName || "Nutzer"},

Du hast eine Anfrage gestellt, Dein Passwort für das GTech Star-Kundenportal zurückzusetzen.

Klicke auf den Link, um Dein neues Passwort festzulegen:
${resetUrl}

Falls Du den Link lieber kopieren möchtest, kannst Du ihn auch direkt in Deinen Browser einfügen:
${resetUrl}

Aus Sicherheitsgründen ist dieser Link 30 Minuten gültig.

Wenn Du kein neues Passwort angefordert hast, kannst Du diese E-Mail einfach ignorieren.

Viele Grüße
Dein GTech Team
    `;

    await sendEmail({
      to: email,
      subject: "Passwort zurücksetzen – GTech Star-Kundenportal",
      html: message,
      text: textVersion,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Gtech Industries Gmbh",
        "List-Unsubscribe": `<mailto:${
          process.env.SUPPORT_EMAIL || "contact@gtech.de"
        }>`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return next(
      new ErrorHandler("Failed to process password reset request", 500),
    );
  }
};

// 8. Reset Password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return next(new ErrorHandler("Token and new password are required", 400));
    }

    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);
    const starCustomerDetails = await starCustomerDetailsRepository.findOne({
      where: { resetPasswordToken: token },
      relations: ["customer"],
    });

    if (!starCustomerDetails || !starCustomerDetails.customer) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }

    if (
      !starCustomerDetails.resetPasswordExp ||
      starCustomerDetails.resetPasswordExp < new Date()
    ) {
      return next(new ErrorHandler("Token has expired", 400));
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    starCustomerDetails.password = hashedPassword;
    starCustomerDetails.resetPasswordToken = undefined;
    starCustomerDetails.resetPasswordExp = undefined;
    await starCustomerDetailsRepository.save(starCustomerDetails);

    const message = `
      <h2>Password Reset Successful</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;

    await sendEmail({
      to: starCustomerDetails.customer.email || "",
      subject: "Password Reset Confirmation",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return next(new ErrorHandler("Failed to reset password", 500));
  }
};

export const updateCustomerStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { customerId } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatuses = ["pending", "verified", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return next(new ErrorHandler("Invalid status value", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);

    const customer = await customerRepository.findOne({
      where: { id: customerId },
      relations: ["starCustomerDetails"],
    });

    if (!customer || !customer.starCustomerDetails) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // Update status in star customer details
    customer.starCustomerDetails.accountVerificationStatus = status;
    await starCustomerDetailsRepository.save(customer.starCustomerDetails);

    // Send status update notification
    const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Status Update</title>
</head>
<body>
    <h2>Account Status Update</h2>
    
    <p>Dear ${customer.companyName},</p>

    <p>We're writing to inform you that your account status has been updated to: <strong>${status.toUpperCase()}</strong></p>

    ${
      status === "verified"
        ? `
      <h3>Welcome Aboard!</h3>
      <p>Your account is now fully activated. You can access our platform using the link below:</p>
      <p><a href="${process.env.STAR_URL}/login">Login to Your Account</a></p>
      
      <p><strong>First-time login instructions:</strong></p>
      <ol>
        <li>Use your registered email: ${customer.email}</li>
        <li>Click "Forgot Password" if you need to set/reset your credentials</li>
        <li>Contact support if you experience any issues</li>
      </ol>
    `
        : ""
    }

    ${
      status === "rejected"
        ? `
      <h3>Account Verification Required</h3>
      <p>We were unable to verify your account. Please contact our support team for more information.</p>
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Contact our support team at support@accez.cloud</li>
        <li>Provide any requested documentation</li>
        <li>We'll assist you with the verification process</li>
      </ol>
    `
        : ""
    }

    ${
      status === "pending"
        ? `
      <h3>Verification in Progress</h3>
      <p>We're currently reviewing your submitted documents.</p>
      <p>You can check your verification status at: <a href="${process.env.STAR_URL}/dashboard">${process.env.STAR_URL}/dashboard</a></p>
      <p>Expect resolution within 3-5 business days.</p>
    `
        : ""
    }

    <p><strong>Security Note:</strong> Never share your login credentials. Our team will never ask for your password.</p>

    <hr>
    <p>Best regards,<br>
    The Platform Team</p>
    
    <p><small>Contact Support: support@accez.cloud</small></p>
</body>
</html>
    `;

    const textMessage = `
Account Status Update

Dear ${customer.companyName},

We're writing to inform you that your account status has been updated to: ${status.toUpperCase()}

${
  status === "verified"
    ? `
Welcome Aboard!

Your account is now fully activated. You can access our platform here:
${process.env.STAR_URL}/login

First-time login instructions:
1. Use your registered email: ${customer.email}
2. Click "Forgot Password" if you need to set/reset your credentials
3. Contact support if you experience any issues
`
    : ""
}

${
  status === "rejected"
    ? `
Account Verification Required

We were unable to verify your account. Please contact our support team for more information.

Next Steps:
1. Contact our support team at support@accez.cloud
2. Provide any requested documentation
3. We'll assist you with the verification process
`
    : ""
}

${
  status === "pending"
    ? `
Verification in Progress

We're currently reviewing your submitted documents.

You can check your verification status at: ${process.env.STAR_URL}/dashboard

Expect resolution within 3-5 business days.
`
    : ""
}

Security Note: Never share your login credentials. Our team will never ask for your password.

Best regards,
The Platform Team

Contact Support: support@accez.cloud
    `;

    await sendEmail({
      to: customer.email || "",
      subject: `Account Status Update: ${status.toUpperCase()}`,
      html: htmlMessage,
      text: textMessage,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Gtech Industries Gmbh",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Customer status updated successfully",
      data: {
        id: customer.id,
        status: customer.starCustomerDetails.accountVerificationStatus,
      },
    });
  } catch (error) {
    console.error("Update customer status error:", error);
    return next(new ErrorHandler("Failed to update customer status", 500));
  }
};

export const getAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const { status } = req.query;
    const sortBy = req.query.sortBy?.toString() || "createdAt";
    const order = req.query.order?.toString().toUpperCase() || "DESC";

    const allowedSortColumns = [
      "createdAt",
      "companyName",
      "legalName",
      "email",
      "contactEmail",
      "contactPhoneNumber",
      "city", // For deliveryCity in starCustomerDetails
      "country", // For deliveryCountry in starCustomerDetails
    ];

    const validatedSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "createdAt";

    const validatedOrder = order === "ASC" ? "ASC" : "DESC";

    const queryBuilder = customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.starCustomerDetails", "starCustomerDetails")
      .where("customer.stage = :stage", { stage: "star_customer" });

    if (status) {
      queryBuilder.andWhere(
        "starCustomerDetails.accountVerificationStatus = :status",
        {
          status: status.toString(),
        },
      );
    }

    // Handle sorting for fields that are in starCustomerDetails
    if (sortBy === "city") {
      queryBuilder.orderBy(`starCustomerDetails.deliveryCity`, validatedOrder);
    } else if (sortBy === "country") {
      queryBuilder.orderBy(
        `starCustomerDetails.deliveryCountry`,
        validatedOrder,
      );
    } else {
      // Sort by customer fields
      queryBuilder.orderBy(`customer.${validatedSortBy}`, validatedOrder);
    }

    const customers = await queryBuilder.getMany();

    const customersData = customers.map((customer) => ({
      id: customer.id,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      taxNumber: customer.starCustomerDetails?.taxNumber,
      vatTaxId: customer?.vatTaxId,
      deliveryAddressLine1: customer.starCustomerDetails?.deliveryAddressLine1,
      deliveryCity: customer.starCustomerDetails?.deliveryCity,
      deliveryCountry: customer.starCustomerDetails?.deliveryCountry,
      // Map delivery fields to city/country for consistent response
      city: customer.starCustomerDetails?.deliveryCity,
      country: customer.starCustomerDetails?.deliveryCountry,
      createdAt: customer.createdAt,
      accountVerificationStatus:
        customer.starCustomerDetails?.accountVerificationStatus,
      avatar: customer.avatar,
      stage: customer.stage,
      defaultPaymentMethod: customer.defaultPaymentMethod,
      defaultShippingMethod: customer.defaultShippingMethod,
      defaultPaymentDueDays: customer.defaultPaymentDueDays,
    }));

    return res.status(200).json({
      success: true,
      count: customersData.length,
      data: customersData,
    });
  } catch (error) {
    console.error("Get all customers error:", error);
    return next(new ErrorHandler("Failed to fetch customers", 500));
  }
};

export const getSingleUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { customerId } = req.params;
    const customerRepo = AppDataSource.getRepository(Customer);
    const customer = await customerRepo.findOne({
      where: { id: customerId },
      relations: ["starCustomerDetails"],
    });

    if (!customer) {
      return next(new ErrorHandler("Customer Not Found!", 404));
    }

    // Filter sensitive data
    const customerData = {
      id: customer.id,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      taxNumber: customer.starCustomerDetails?.taxNumber,
      vatTaxId: customer?.vatTaxId,
      deliveryAddressLine1: customer.starCustomerDetails?.deliveryAddressLine1,
      deliveryAddressLine2: customer.starCustomerDetails?.deliveryAddressLine2,
      deliveryPostalCode: customer.starCustomerDetails?.deliveryPostalCode,
      deliveryCity: customer.starCustomerDetails?.deliveryCity,
      deliveryCountry: customer.starCustomerDetails?.deliveryCountry,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      accountVerificationStatus:
        customer.starCustomerDetails?.accountVerificationStatus,
      avatar: customer.avatar,
      stage: customer.stage,
    };

    return res.status(200).json({
      data: customerData,
      success: true,
    });
  } catch (error) {
    console.error("Get single user error:", error);
    return next(new ErrorHandler("Failed to fetch customer", 500));
  }
};

interface CustomerCsvRow {
  id: string;
  kundennummer: string;
  legalName: string;
  additionalLine: string;
  streetNo: string;
  postalCode: string;
  city: string;
  countryIso: string;
  phone: string;
  email: string;
  url: string;
  vatNo: string;
  debitorNo: string;
  payMethod: string;
  payDueDays: string;
  commentEnd1: string;
  commentEnd2: string;
  sex: string;
  name: string;
  familyName: string;
  contactPhone: string;
}

const CSV_COLUMN_ORDER: (keyof CustomerCsvRow)[] = [
  "id",
  "kundennummer",
  "legalName",
  "additionalLine",
  "streetNo",
  "postalCode",
  "city",
  "countryIso",
  "phone",
  "email",
  "url",
  "vatNo",
  "debitorNo",
  "payMethod",
  "payDueDays",
  "commentEnd1",
  "commentEnd2",
  "sex",
  "name",
  "familyName",
  "contactPhone",
];

/** Splits one semicolon-delimited CSV line into fields, honoring
 * double-quote-wrapped values (with "" as an escaped quote) even though
 * the sample data doesn't currently use them — cheap insurance against a
 * future export that does. */
function parseSemicolonLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ";") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/** Reads /public/customers.csv, strips the BOM, and returns typed rows.
 * Blank lines are skipped; rows without a Kundennummer are skipped since
 * that's the key we match/create customers on. */
function parseCustomerCsv(filePath: string): CustomerCsvRow[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r\n|\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  // First line is the header — we rely on fixed column order (from the
  // known export format) rather than matching header names, since the
  // header text itself is inconsistent casing/spacing.
  const dataLines = lines.slice(1);

  const rows: CustomerCsvRow[] = [];
  for (const line of dataLines) {
    const fields = parseSemicolonLine(line);
    if (fields.length < CSV_COLUMN_ORDER.length) {
      // Pad short rows so trailing empty columns (e.g. no contact info)
      // don't throw off the mapping.
      while (fields.length < CSV_COLUMN_ORDER.length) fields.push("");
    }

    const row = {} as CustomerCsvRow;
    CSV_COLUMN_ORDER.forEach((key, idx) => {
      (row as any)[key] = fields[idx] ?? "";
    });

    if (!row.kundennummer) continue; // no key to match/create against
    rows.push(row);
  }

  return rows;
}

/** First whitespace-separated token of the legal name, used as the
 * customer's short display name (companyName). Falls back to the full
 * legal name if it has no spaces, or a placeholder if legalName is empty. */
function extractDisplayName(legalName: string): string {
  const trimmed = (legalName || "").trim();
  if (!trimmed) return "Unnamed Customer";
  return trimmed.split(/\s+/)[0];
}

/** "Male"/"Female" (any casing) -> the entity's lowercase enum values;
 * anything else (blank, unrecognized) -> "Not Specified". */
function mapSex(raw: string): Sex {
  const normalized = (raw || "").trim().toLowerCase();
  if (normalized === "male") return "male";
  if (normalized === "female") return "female";
  return "Not Specified";
}

/** Combines "Additional Line" + "Street & No" into one address line, since
 * BusinessDetails has a single `address` field rather than a separate
 * additional-line column. Empty additionalLine is dropped entirely rather
 * than leaving a stray leading comma. */
function buildAddressLine(additionalLine: string, streetNo: string): string {
  const parts = [additionalLine, streetNo]
    .map((p) => (p || "").trim())
    .filter((p) => p.length > 0);
  return parts.join(", ");
}

/** "Comment put at end1" and "Customer Comment put at end2" concatenated
 * into BusinessDetails.description, in that order. */
function buildDescription(commentEnd1: string, commentEnd2: string): string {
  return [commentEnd1, commentEnd2]
    .map((p) => (p || "").trim())
    .filter((p) => p.length > 0)
    .join(" ");
}

interface SyncSummary {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { kundennummer: string; message: string }[];
}

export const syncCustomerData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const csvPath = path.join(process.cwd(), "public", "customers.csv");

    if (!fs.existsSync(csvPath)) {
      res.status(400).json({
        success: false,
        message: `customers.csv not found at ${csvPath}`,
      });
      return;
    }

    const rows = parseCustomerCsv(csvPath);

    const customerRepo = AppDataSource.getRepository(Customer);
    const businessDetailsRepo = AppDataSource.getRepository(BusinessDetails);
    const countryRepo = AppDataSource.getRepository(Country);
    const starBusinessDetailsRepo =
      AppDataSource.getRepository(StarBusinessDetails);
    const contactPersonRepo = AppDataSource.getRepository(ContactPerson);

    // Cache country lookups — the same ISO code repeats across many rows.
    const countryCache = new Map<string, Country | null>();
    const getCountryByIso = async (iso: string): Promise<Country | null> => {
      const code = (iso || "").trim().toUpperCase();
      if (!code) return null;
      if (countryCache.has(code)) return countryCache.get(code)!;
      const country = await countryRepo.findOne({ where: { iso2: code } });
      countryCache.set(code, country);
      return country;
    };

    const summary: SyncSummary = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const row of rows) {
      try {
        const country = await getCountryByIso(row.countryIso);
        const description = buildDescription(row.commentEnd1, row.commentEnd2);
        const displayName = extractDisplayName(row.legalName);
        const payDueDays = parseInt(row.payDueDays, 10);

        let customer = await customerRepo.findOne({
          where: { customerNumber: row.kundennummer },
          relations: ["businessDetails", "starBusinessDetails"],
        });

        const isNewCustomer = !customer;

        if (!customer) {
          customer = customerRepo.create({
            customerNumber: row.kundennummer,
          });
        }

        // --- Customer-level fields ---
        customer.legalName = row.legalName || customer.legalName;
        customer.companyName = displayName;
        customer.vatTaxId = row.vatNo || customer.vatTaxId;
        customer.debtor_no = row.debitorNo || customer.debtor_no;
        if (row.payMethod) customer.defaultPaymentMethod = row.payMethod;
        if (!isNaN(payDueDays)) {
          customer.defaultPaymentDueDays = payDueDays;
        }

        // "Additional Line" lives directly on the customer, per the
        // existing getAllBusinesses mapping (addressAdditional ->
        // customer.addressLine2) — it is NOT folded into the business
        // address/street below.
        if (row.additionalLine) customer.addressLine2 = row.additionalLine;

        // Phone and email are mirrored onto the customer entity directly
        // (contactPhoneNumber / email), matching how getAllBusinesses
        // reads them at the top level of its response, in addition to the
        // BusinessDetails copies further down.
        if (row.phone) customer.contactPhoneNumber = row.phone;
        if (row.email) customer.email = row.email;

        if (country) {
          customer.countryEntity = country;
          customer.country_id = country.id;
        }

        // --- BusinessDetails ---
        let businessDetails = customer.businessDetails;
        if (!businessDetails) {
          businessDetails = businessDetailsRepo.create({});
        }

        // "Street & No" is the business address itself — no concatenation
        // with Additional Line, which is stored separately above.
        businessDetails.address = row.streetNo || businessDetails.address;
        businessDetails.postalCode =
          row.postalCode || businessDetails.postalCode;
        businessDetails.city = row.city || businessDetails.city;
        businessDetails.contactPhone =
          row.phone || businessDetails.contactPhone;
        businessDetails.website = row.url || businessDetails.website;
        if (row.email) businessDetails.email = row.email;
        businessDetails.description =
          description || businessDetails.description;

        if (country) {
          businessDetails.country = country.name;
          businessDetails.countryEntity = country;
          businessDetails.country_id = country.id;
        }

        customer.businessDetails =
          await businessDetailsRepo.save(businessDetails);

        customer = await customerRepo.save(customer);

        // --- Contact person ---
        // ContactPerson requires a non-nullable starBusinessDetailsId, so a
        // StarBusinessDetails record is created for the customer if one
        // doesn't exist yet, purely as the attachment point for the
        // contact. ASSUMPTION: StarBusinessDetails has no other required
        // fields beyond its defaults — if it does, this save fails and
        // surfaces in summary.errors for that row without stopping the
        // rest of the import.
        if (row.name || row.familyName) {
          let starBusinessDetails = customer.starBusinessDetails;
          if (!starBusinessDetails) {
            starBusinessDetails = starBusinessDetailsRepo.create({});
            starBusinessDetails =
              await starBusinessDetailsRepo.save(starBusinessDetails);
            customer.starBusinessDetails = starBusinessDetails;
            await customerRepo.save(customer);
          }

          const existingContact = await contactPersonRepo.findOne({
            where: {
              starBusinessDetailsId: starBusinessDetails.id,
              name: row.name,
              familyName: row.familyName,
            },
          });

          const contactPerson =
            existingContact ||
            contactPersonRepo.create({
              starBusinessDetailsId: starBusinessDetails.id,
            });

          contactPerson.name = row.name || contactPerson.name || "";
          contactPerson.familyName =
            row.familyName || contactPerson.familyName || "";
          contactPerson.sex = mapSex(row.sex);
          contactPerson.phone = row.contactPhone || contactPerson.phone;

          await contactPersonRepo.save(contactPerson);
        }

        if (isNewCustomer) summary.created++;
        else summary.updated++;
      } catch (rowError: any) {
        summary.skipped++;
        summary.errors.push({
          kundennummer: row.kundennummer,
          message: rowError?.message || "Unknown error",
        });
        console.error(`Error syncing customer ${row.kundennummer}:`, rowError);
      }
    }

    res.json({
      success: true,
      message: `Processed ${summary.totalRows} rows: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped.`,
      data: summary,
    });
  } catch (error) {
    console.error("Customer sync error:", error);
    return next(new ErrorHandler("Failed to sync customer data", 500));
  }
};
