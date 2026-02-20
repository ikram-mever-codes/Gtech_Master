"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleUser = exports.getAllCustomers = exports.updateCustomerStatus = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.refresh = exports.editCustomerProfile = exports.logout = exports.login = exports.verifyEmail = exports.requestCustomerAccount = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const customers_1 = require("../models/customers");
const star_customer_details_1 = require("../models/star_customer_details");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const emailService_1 = __importDefault(require("../services/emailService"));
const database_1 = require("../config/database");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
// 1. Request Customer Account
const requestCustomerAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyName, legalName, email, contactEmail, contactPhoneNumber, taxNumber, deliveryAddressLine1, deliveryAddressLine2, deliveryPostalCode, deliveryCity, deliveryCountry, password, } = req.body;
        // Validation
        if (!companyName ||
            !email ||
            !contactEmail ||
            !contactPhoneNumber ||
            !password) {
            return next(new errorHandler_1.default("All required fields must be provided", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        // Check for existing customer with same company name, email, contact email, or phone
        const existingCustomer = yield customerRepository.findOne({
            where: [
                { companyName },
                { email },
                { contactEmail },
                { contactPhoneNumber },
            ],
        });
        if (existingCustomer) {
            if (existingCustomer.companyName === companyName) {
                return next(new errorHandler_1.default("Company name already exists", 400));
            }
            if (existingCustomer.email === email) {
                return next(new errorHandler_1.default("Email already exists", 400));
            }
            if (existingCustomer.contactEmail === contactEmail) {
                return next(new errorHandler_1.default("Contact email already exists", 400));
            }
            return next(new errorHandler_1.default("Phone number already exists", 400));
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Generate email verification code
        const emailVerificationCode = crypto_1.default.randomBytes(20).toString("hex");
        const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Use transaction to ensure both customer and star customer details are created together
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            // Create customer
            const customer = customerRepository.create({
                companyName,
                legalName,
                email,
                contactEmail,
                contactPhoneNumber,
                stage: "star_customer",
            });
            // Save customer first
            const savedCustomer = yield transactionalEntityManager.save(customer);
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
            const savedStarCustomerDetails = yield transactionalEntityManager.save(starCustomerDetails);
            // Update customer with star customer details relationship
            savedCustomer.starCustomerDetails = savedStarCustomerDetails;
            yield transactionalEntityManager.save(savedCustomer);
            return {
                customer: savedCustomer,
                starCustomerDetails: savedStarCustomerDetails,
            };
        }));
        const { customer } = result;
        // Send verification email
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
        yield (0, emailService_1.default)({
            to: email,
            subject: "Verify Your Email Address",
            html: htmlMessage,
            text: textMessage,
            headers: {
                "X-Priority": "3",
                "X-Mailer": "Gtech Industries Gmbh",
            },
        });
        return res.status(201).json({
            success: true,
            message: "Customer account requested successfully. Please verify your email.",
            data: {
                id: customer.id,
                companyName: customer.companyName,
                legalName: customer.legalName,
                email: customer.email,
            },
        });
    }
    catch (error) {
        console.error("Request customer account error:", error);
        return next(new errorHandler_1.default("Failed to create customer account", 500));
    }
});
exports.requestCustomerAccount = requestCustomerAccount;
// 9. Verify Email
const verifyEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        if (!code) {
            return next(new errorHandler_1.default("Verification code is required", 400));
        }
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const starCustomerDetails = yield starCustomerDetailsRepository.findOne({
            where: { emailVerificationCode: code },
            relations: ["customer"],
        });
        if (!starCustomerDetails || !starCustomerDetails.customer) {
            return next(new errorHandler_1.default("Invalid verification code", 400));
        }
        if (starCustomerDetails.emailVerificationExp &&
            starCustomerDetails.emailVerificationExp < new Date()) {
            return next(new errorHandler_1.default("Verification code has expired", 400));
        }
        if (starCustomerDetails.isEmailVerified) {
            return next(new errorHandler_1.default("Email is already verified", 400));
        }
        // Update star customer details
        starCustomerDetails.isEmailVerified = true;
        starCustomerDetails.emailVerificationCode = undefined;
        starCustomerDetails.emailVerificationExp = undefined;
        yield starCustomerDetailsRepository.save(starCustomerDetails);
        return res.status(200).json({
            success: true,
            message: "Email verified successfully. Your account is pending admin approval.",
        });
    }
    catch (error) {
        console.error("Verify email error:", error);
        return next(new errorHandler_1.default("Failed to verify email", 500));
    }
});
exports.verifyEmail = verifyEmail;
// 2. Login Controller
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new errorHandler_1.default("Email and password are required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { email },
            relations: ["starCustomerDetails"],
        });
        console.log(customer);
        if (!customer || !customer.starCustomerDetails) {
            return next(new errorHandler_1.default("Invalid credentials", 401));
        }
        if (!customer.starCustomerDetails.isEmailVerified) {
            return next(new errorHandler_1.default("Please verify your email first", 401));
        }
        if (customer.starCustomerDetails.accountVerificationStatus !== "verified") {
            return next(new errorHandler_1.default("Your account is pending approval", 401));
        }
        const isMatch = yield bcryptjs_1.default.compare(password, customer.starCustomerDetails.password);
        if (!isMatch) {
            return next(new errorHandler_1.default("Invalid credentials", 401));
        }
        const token = jsonwebtoken_1.default.sign({ id: customer.id, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "1d" });
        // Filter sensitive data
        const customerData = {
            id: customer.id,
            companyName: customer.companyName,
            legalName: customer.legalName,
            email: customer.email,
            contactEmail: customer.contactEmail,
            avatar: customer.avatar,
            stage: customer.stage,
            accountVerificationStatus: customer.starCustomerDetails.accountVerificationStatus,
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
    }
    catch (error) {
        console.error("Login error:", error);
        return next(new errorHandler_1.default("Failed to login", 500));
    }
});
exports.login = login;
// 3. Logout
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        return next(error);
    }
});
exports.logout = logout;
// 4. Edit Customer Profile
const editCustomerProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const customerId = req.customer.id;
        const { companyName, legalName, contactEmail, contactPhoneNumber, taxNumber, deliveryAddressLine1, deliveryAddressLine2, deliveryPostalCode, deliveryCity, deliveryCountry, } = req.body;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
            relations: ["starCustomerDetails"],
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        // Handle avatar upload
        if (req.file) {
            if (!fs_1.default.existsSync(req.file.path)) {
                return next(new errorHandler_1.default("File not found", 404));
            }
            try {
                // Delete old avatar if exists
                if (customer.avatar) {
                    const publicId = (_a = customer.avatar.split("/").pop()) === null || _a === void 0 ? void 0 : _a.split(".")[0];
                    if (publicId) {
                        yield cloudinary_1.default.uploader.destroy(publicId);
                    }
                }
                const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: "customer_avatars",
                    width: 150,
                    crop: "scale",
                });
                fs_1.default.unlinkSync(req.file.path);
                customer.avatar = result.secure_url;
            }
            catch (uploadError) {
                return next(new errorHandler_1.default("Error uploading avatar", 500));
            }
        }
        // Update customer fields
        if (companyName)
            customer.companyName = companyName;
        if (legalName)
            customer.legalName = legalName;
        if (contactEmail)
            customer.contactEmail = contactEmail;
        if (contactPhoneNumber)
            customer.contactPhoneNumber = contactPhoneNumber;
        // Save customer updates
        yield customerRepository.save(customer);
        // Update star customer details if they exist
        if (customer.starCustomerDetails) {
            const starCustomerDetails = yield starCustomerDetailsRepository.findOne({
                where: { id: customer.starCustomerDetails.id },
            });
            if (starCustomerDetails) {
                if (taxNumber)
                    starCustomerDetails.taxNumber = taxNumber;
                if (deliveryAddressLine1)
                    starCustomerDetails.deliveryAddressLine1 = deliveryAddressLine1;
                if (deliveryAddressLine2)
                    starCustomerDetails.deliveryAddressLine2 = deliveryAddressLine2;
                if (deliveryPostalCode)
                    starCustomerDetails.deliveryPostalCode = deliveryPostalCode;
                if (deliveryCity)
                    starCustomerDetails.deliveryCity = deliveryCity;
                if (deliveryCountry)
                    starCustomerDetails.deliveryCountry = deliveryCountry;
                yield starCustomerDetailsRepository.save(starCustomerDetails);
            }
        }
        // Get updated customer with relations for response
        const updatedCustomer = yield customerRepository.findOne({
            where: { id: customerId },
            relations: ["starCustomerDetails"],
        });
        if (!updatedCustomer || !updatedCustomer.starCustomerDetails) {
            return next(new errorHandler_1.default("Customer not found after update", 404));
        }
        // Filter sensitive data
        const customerData = {
            id: updatedCustomer.id,
            companyName: updatedCustomer.companyName,
            legalName: updatedCustomer.legalName,
            email: updatedCustomer.email,
            contactEmail: updatedCustomer.contactEmail,
            contactPhoneNumber: updatedCustomer.contactPhoneNumber,
            avatar: updatedCustomer.avatar,
            stage: updatedCustomer.stage,
            starCustomerDetails: {
                taxNumber: updatedCustomer.starCustomerDetails.taxNumber,
                accountVerificationStatus: updatedCustomer.starCustomerDetails.accountVerificationStatus,
                deliveryAddressLine1: updatedCustomer.starCustomerDetails.deliveryAddressLine1,
                deliveryAddressLine2: updatedCustomer.starCustomerDetails.deliveryAddressLine2,
                deliveryPostalCode: updatedCustomer.starCustomerDetails.deliveryPostalCode,
                deliveryCity: updatedCustomer.starCustomerDetails.deliveryCity,
                deliveryCountry: updatedCustomer.starCustomerDetails.deliveryCountry,
            },
        };
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: customerData,
        });
    }
    catch (error) {
        console.error("Edit customer profile error:", error);
        return next(new errorHandler_1.default("Failed to update customer profile", 500));
    }
});
exports.editCustomerProfile = editCustomerProfile;
// 5. Refresh Token
const refresh = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token) {
            return next(new errorHandler_1.default("Not authenticated", 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id: decoded.id },
            relations: ["starCustomerDetails"],
        });
        if (!customer || !customer.starCustomerDetails) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const newToken = jsonwebtoken_1.default.sign({ id: customer.id, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "1d" });
        // Filter sensitive data
        const customerData = {
            id: customer.id,
            companyName: customer.companyName,
            legalName: customer.legalName,
            email: customer.email,
            contactEmail: customer.contactEmail,
            avatar: customer.avatar,
            stage: customer.stage,
            accountVerificationStatus: customer.starCustomerDetails.accountVerificationStatus,
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
    }
    catch (error) {
        return next(new errorHandler_1.default("Invalid token", 401));
    }
});
exports.refresh = refresh;
// 6. Change Password
const changePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        const customerId = req.customer.id;
        if (!currentPassword || !newPassword) {
            return next(new errorHandler_1.default("Both passwords are required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
            relations: ["starCustomerDetails"],
        });
        if (!customer || !customer.starCustomerDetails) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword, customer.starCustomerDetails.password);
        if (!isMatch) {
            return next(new errorHandler_1.default("Current password is incorrect", 401));
        }
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        customer.starCustomerDetails.password = hashedPassword;
        yield starCustomerDetailsRepository.save(customer.starCustomerDetails);
        // Send email notification
        const message = `
      <h2>Password Changed</h2>
      <p>Your password was successfully changed.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;
        yield (0, emailService_1.default)({
            to: customer.email,
            subject: "Password Change Notification",
            html: message,
        });
        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        console.error("Change password error:", error);
        return next(new errorHandler_1.default("Failed to change password", 500));
    }
});
exports.changePassword = changePassword;
// 7. Forgot Password
const forgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return next(new errorHandler_1.default("Email is required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const customer = yield customerRepository.findOne({
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
        const resetToken = crypto_1.default.randomBytes(20).toString("hex");
        const resetPasswordExp = new Date(Date.now() + 30 * 60 * 1000);
        customer.starCustomerDetails.resetPasswordToken = resetToken;
        customer.starCustomerDetails.resetPasswordExp = resetPasswordExp;
        yield starCustomerDetailsRepository.save(customer.starCustomerDetails);
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
        yield (0, emailService_1.default)({
            to: email,
            subject: "Passwort zurücksetzen – GTech Star-Kundenportal",
            html: message,
            text: textVersion,
            headers: {
                "X-Priority": "3",
                "X-Mailer": "Gtech Industries Gmbh",
                "List-Unsubscribe": `<mailto:${process.env.SUPPORT_EMAIL || "contact@gtech.de"}>`,
            },
        });
        return res.status(200).json({
            success: true,
            message: "If the email exists, a password reset link has been sent",
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        return next(new errorHandler_1.default("Failed to process password reset request", 500));
    }
});
exports.forgotPassword = forgotPassword;
// 8. Reset Password
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!token || !password) {
            return next(new errorHandler_1.default("Token and new password are required", 400));
        }
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const starCustomerDetails = yield starCustomerDetailsRepository.findOne({
            where: { resetPasswordToken: token },
            relations: ["customer"],
        });
        if (!starCustomerDetails || !starCustomerDetails.customer) {
            return next(new errorHandler_1.default("Invalid or expired token", 400));
        }
        if (!starCustomerDetails.resetPasswordExp ||
            starCustomerDetails.resetPasswordExp < new Date()) {
            return next(new errorHandler_1.default("Token has expired", 400));
        }
        // Update password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        starCustomerDetails.password = hashedPassword;
        starCustomerDetails.resetPasswordToken = undefined;
        starCustomerDetails.resetPasswordExp = undefined;
        yield starCustomerDetailsRepository.save(starCustomerDetails);
        const message = `
      <h2>Password Reset Successful</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `;
        yield (0, emailService_1.default)({
            to: starCustomerDetails.customer.email,
            subject: "Password Reset Confirmation",
            html: message,
        });
        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        return next(new errorHandler_1.default("Failed to reset password", 500));
    }
});
exports.resetPassword = resetPassword;
const updateCustomerStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        const { status } = req.body;
        // Validate status
        const allowedStatuses = ["pending", "verified", "rejected"];
        if (!allowedStatuses.includes(status)) {
            return next(new errorHandler_1.default("Invalid status value", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
            relations: ["starCustomerDetails"],
        });
        if (!customer || !customer.starCustomerDetails) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        // Update status in star customer details
        customer.starCustomerDetails.accountVerificationStatus = status;
        yield starCustomerDetailsRepository.save(customer.starCustomerDetails);
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

    ${status === "verified"
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
            : ""}

    ${status === "rejected"
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
            : ""}

    ${status === "pending"
            ? `
      <h3>Verification in Progress</h3>
      <p>We're currently reviewing your submitted documents.</p>
      <p>You can check your verification status at: <a href="${process.env.STAR_URL}/dashboard">${process.env.STAR_URL}/dashboard</a></p>
      <p>Expect resolution within 3-5 business days.</p>
    `
            : ""}

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

${status === "verified"
            ? `
Welcome Aboard!

Your account is now fully activated. You can access our platform here:
${process.env.STAR_URL}/login

First-time login instructions:
1. Use your registered email: ${customer.email}
2. Click "Forgot Password" if you need to set/reset your credentials
3. Contact support if you experience any issues
`
            : ""}

${status === "rejected"
            ? `
Account Verification Required

We were unable to verify your account. Please contact our support team for more information.

Next Steps:
1. Contact our support team at support@accez.cloud
2. Provide any requested documentation
3. We'll assist you with the verification process
`
            : ""}

${status === "pending"
            ? `
Verification in Progress

We're currently reviewing your submitted documents.

You can check your verification status at: ${process.env.STAR_URL}/dashboard

Expect resolution within 3-5 business days.
`
            : ""}

Security Note: Never share your login credentials. Our team will never ask for your password.

Best regards,
The Platform Team

Contact Support: support@accez.cloud
    `;
        yield (0, emailService_1.default)({
            to: customer.email,
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
    }
    catch (error) {
        console.error("Update customer status error:", error);
        return next(new errorHandler_1.default("Failed to update customer status", 500));
    }
});
exports.updateCustomerStatus = updateCustomerStatus;
const getAllCustomers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const { status } = req.query;
        const sortBy = ((_a = req.query.sortBy) === null || _a === void 0 ? void 0 : _a.toString()) || "createdAt";
        const order = ((_b = req.query.order) === null || _b === void 0 ? void 0 : _b.toString().toUpperCase()) || "DESC";
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
            queryBuilder.andWhere("starCustomerDetails.accountVerificationStatus = :status", {
                status: status.toString(),
            });
        }
        // Handle sorting for fields that are in starCustomerDetails
        if (sortBy === "city") {
            queryBuilder.orderBy(`starCustomerDetails.deliveryCity`, validatedOrder);
        }
        else if (sortBy === "country") {
            queryBuilder.orderBy(`starCustomerDetails.deliveryCountry`, validatedOrder);
        }
        else {
            // Sort by customer fields
            queryBuilder.orderBy(`customer.${validatedSortBy}`, validatedOrder);
        }
        const customers = yield queryBuilder.getMany();
        const customersData = customers.map((customer) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return ({
                id: customer.id,
                companyName: customer.companyName,
                legalName: customer.legalName,
                email: customer.email,
                contactEmail: customer.contactEmail,
                contactPhoneNumber: customer.contactPhoneNumber,
                taxNumber: (_a = customer.starCustomerDetails) === null || _a === void 0 ? void 0 : _a.taxNumber,
                deliveryAddressLine1: (_b = customer.starCustomerDetails) === null || _b === void 0 ? void 0 : _b.deliveryAddressLine1,
                deliveryCity: (_c = customer.starCustomerDetails) === null || _c === void 0 ? void 0 : _c.deliveryCity,
                deliveryCountry: (_d = customer.starCustomerDetails) === null || _d === void 0 ? void 0 : _d.deliveryCountry,
                // Map delivery fields to city/country for consistent response
                city: (_e = customer.starCustomerDetails) === null || _e === void 0 ? void 0 : _e.deliveryCity,
                country: (_f = customer.starCustomerDetails) === null || _f === void 0 ? void 0 : _f.deliveryCountry,
                createdAt: customer.createdAt,
                accountVerificationStatus: (_g = customer.starCustomerDetails) === null || _g === void 0 ? void 0 : _g.accountVerificationStatus,
                avatar: customer.avatar,
                stage: customer.stage,
            });
        });
        return res.status(200).json({
            success: true,
            count: customersData.length,
            data: customersData,
        });
    }
    catch (error) {
        console.error("Get all customers error:", error);
        return next(new errorHandler_1.default("Failed to fetch customers", 500));
    }
});
exports.getAllCustomers = getAllCustomers;
const getSingleUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { customerId } = req.params;
        const customerRepo = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepo.findOne({
            where: { id: customerId },
            relations: ["starCustomerDetails"],
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer Not Found!", 404));
        }
        // Filter sensitive data
        const customerData = {
            id: customer.id,
            companyName: customer.companyName,
            legalName: customer.legalName,
            email: customer.email,
            contactEmail: customer.contactEmail,
            contactPhoneNumber: customer.contactPhoneNumber,
            taxNumber: (_a = customer.starCustomerDetails) === null || _a === void 0 ? void 0 : _a.taxNumber,
            deliveryAddressLine1: (_b = customer.starCustomerDetails) === null || _b === void 0 ? void 0 : _b.deliveryAddressLine1,
            deliveryAddressLine2: (_c = customer.starCustomerDetails) === null || _c === void 0 ? void 0 : _c.deliveryAddressLine2,
            deliveryPostalCode: (_d = customer.starCustomerDetails) === null || _d === void 0 ? void 0 : _d.deliveryPostalCode,
            deliveryCity: (_e = customer.starCustomerDetails) === null || _e === void 0 ? void 0 : _e.deliveryCity,
            deliveryCountry: (_f = customer.starCustomerDetails) === null || _f === void 0 ? void 0 : _f.deliveryCountry,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            accountVerificationStatus: (_g = customer.starCustomerDetails) === null || _g === void 0 ? void 0 : _g.accountVerificationStatus,
            avatar: customer.avatar,
            stage: customer.stage,
        };
        return res.status(200).json({
            data: customerData,
            success: true,
        });
    }
    catch (error) {
        console.error("Get single user error:", error);
        return next(new errorHandler_1.default("Failed to fetch customer", 500));
    }
});
exports.getSingleUser = getSingleUser;
