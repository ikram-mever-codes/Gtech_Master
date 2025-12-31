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
exports.resendVerificationEmail = exports.deleteUser = exports.deleteCustomer = exports.updateUser = exports.updateCustomer = exports.createCompany = exports.resetPassword = exports.forgetPassword = exports.getUserById = exports.getAllUsers = exports.editProfile = exports.changePassword = exports.refresh = exports.logout = exports.login = exports.verifyEmail = exports.createUser = void 0;
const typeorm_1 = require("typeorm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const users_1 = require("../models/users");
const permissions_1 = require("../models/permissions");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const emailService_1 = __importDefault(require("../services/emailService"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const list_1 = require("../models/list");
const invoice_1 = require("../models/invoice");
const star_customer_details_1 = require("../models/star_customer_details");
// Create User with Permissions (Admin/Super Admin only)
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, role, assignedResources, permissions, phoneNumber, gender, dateOfBirth, address, country, } = req.body;
        // Validation - Only name, email and role are required
        if (!name || !email || !role) {
            return next(new errorHandler_1.default("Name, email and role are required", 400));
        }
        if (!Object.values(users_1.UserRole).includes(role)) {
            return next(new errorHandler_1.default("Invalid user role", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const existingUser = yield userRepository.findOne({ where: { email } });
        if (existingUser) {
            return next(new errorHandler_1.default("Email already exists", 400));
        }
        // Generate temporary password
        const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
        const hashedPassword = yield bcryptjs_1.default.hash(tempPassword, 10);
        // Generate email verification code (6-digit code)
        const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Create user with optional fields
        const user = userRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
            assignedResources: assignedResources || [],
            phoneNumber: phoneNumber || null,
            country: country || null,
            gender: gender || null,
            dateOfBirth: dateOfBirth || null,
            address: address || null,
            emailVerificationCode,
            emailVerificationExp,
            isEmailVerified: false,
        });
        yield userRepository.save(user);
        // Handle optional permissions
        if (permissions && permissions.length > 0) {
            const permissionRepository = database_1.AppDataSource.getRepository(permissions_1.Permission);
            const permissionEntities = permissions.map((perm) => permissionRepository.create({
                resource: perm.resource,
                actions: perm.actions,
                user,
            }));
            yield permissionRepository.save(permissionEntities);
        }
        const verificationLink = `https://master.gtech.de/verify?email=${encodeURIComponent(email)}&verificationCode=${emailVerificationCode}`;
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
        yield (0, emailService_1.default)({
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
    }
    catch (error) {
        return next(error);
    }
});
exports.createUser = createUser;
const verifyEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, verificationCode } = req.query;
        if (!email || !verificationCode) {
            return next(new errorHandler_1.default("Email and verification code are required", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: {
                email: email,
                emailVerificationCode: verificationCode,
            },
        });
        if (!user) {
            return next(new errorHandler_1.default("Invalid verification code or email", 400));
        }
        // Check if verification code has expired
        if (user.emailVerificationExp && user.emailVerificationExp < new Date()) {
            return next(new errorHandler_1.default("Verification code has expired", 400));
        }
        // Update user verification status
        user.isEmailVerified = true;
        user.emailVerificationCode = undefined;
        user.emailVerificationExp = null;
        yield userRepository.save(user);
        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.verifyEmail = verifyEmail;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new errorHandler_1.default("Email and password are required", 400));
        }
        // Initialize repository through the DataSource
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: { email },
            relations: ["permissions"],
        });
        if (!user) {
            return next(new errorHandler_1.default("Invalid credentials", 401));
        }
        if (!user.password) {
            return next(new errorHandler_1.default("Account not properly set up", 400));
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return next(new errorHandler_1.default("Invalid credentials", 401));
        }
        if (!user.isEmailVerified) {
            return next(new errorHandler_1.default("Please verify your email first", 401));
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
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
    }
    catch (error) {
        return next(error);
    }
});
exports.login = login;
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        return next(error);
    }
});
exports.logout = logout;
const refresh = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token) {
            return next(new errorHandler_1.default("Not authenticated", 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: { id: decoded.id },
            relations: ["permissions"],
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        const newToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
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
    }
    catch (error) {
        return next(new errorHandler_1.default("Invalid token", 401));
    }
});
exports.refresh = refresh;
const changePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        if (!currentPassword || !newPassword) {
            return next(new errorHandler_1.default("Both passwords are required", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        if (!user.password) {
            return next(new errorHandler_1.default("Password not set for this user", 400));
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return next(new errorHandler_1.default("Current password is incorrect", 401));
        }
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        yield userRepository.save(user);
        // Send email notification
        const message = `
        <h2>Password Changed</h2>
        <p>Your password was successfully changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `;
        yield (0, emailService_1.default)({
            to: user.email,
            subject: "Password Change Notification",
            html: message,
        });
        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.changePassword = changePassword;
const editProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.user.id;
        const { name, phoneNumber, gender, dateOfBirth, address } = req.body;
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        // Handle avatar upload
        if (req.file) {
            if (!fs_1.default.existsSync(req.file.path)) {
                return next(new errorHandler_1.default("File not found", 404));
            }
            try {
                // Delete old avatar if exists
                if (user.avatar) {
                    const publicId = (_a = user.avatar.split("/").pop()) === null || _a === void 0 ? void 0 : _a.split(".")[0];
                    if (publicId) {
                        yield cloudinary_1.default.uploader.destroy(publicId);
                    }
                }
                const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: "avatars",
                    width: 150,
                    crop: "scale",
                });
                fs_1.default.unlinkSync(req.file.path);
                user.avatar = result.secure_url;
            }
            catch (uploadError) {
                return next(new errorHandler_1.default("Error uploading avatar", 500));
            }
        }
        // Update fields
        if (name)
            user.name = name;
        if (phoneNumber) {
            const existingUser = yield userRepository.findOne({
                where: { phoneNumber, id: (0, typeorm_1.Not)(userId) },
            });
            if (existingUser) {
                return next(new errorHandler_1.default("Phone number already in use", 400));
            }
            user.phoneNumber = phoneNumber;
        }
        if (gender)
            user.gender = gender;
        if (dateOfBirth)
            user.dateOfBirth = dateOfBirth;
        if (address)
            user.address = address;
        yield userRepository.save(user);
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
    }
    catch (error) {
        return next(error);
    }
});
exports.editProfile = editProfile;
const getAllUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userRepo = database_1.AppDataSource.getRepository(users_1.User);
        const users = yield userRepo.find({});
        return res.status(200).json({ data: users.reverse(), success: true });
    }
    catch (error) {
        return next(error);
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const id = userId;
        if (!id) {
            return next(new errorHandler_1.default("User ID is required", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: { id },
            relations: ["permissions"],
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
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
    }
    catch (error) {
        return next(error);
    }
});
exports.getUserById = getUserById;
const forgetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return next(new errorHandler_1.default("Email is required", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({ where: { email } });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If the email exists, a reset link has been sent",
            });
        }
        // Generate reset token with expiration (30 minutes)
        const resetToken = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "30m",
        });
        // Save reset token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExp = new Date(Date.now() + 1800000); // 30 minutes
        yield userRepository.save(user);
        // Create reset link
        const resetLink = `${process.env.MASTER}/reset-password?token=${resetToken}`;
        const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Passwort zurücksetzen – GTech Star-Kundenportal</h2>
          <p>Hallo ${user.name || "Nutzer"},</p>
          <p>Du hast eine Anfrage gestellt, Dein Passwort für das GTech Star-Kundenportal zurückzusetzen.</p>
          <p>Klicke einfach auf den Button, um Dein neues Passwort festzulegen:</p>
          <p>
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              👉 Passwort jetzt zurücksetzen
            </a>
          </p>
          <p>Falls Du den Link lieber kopieren möchtest, kannst Du ihn auch direkt in Deinen Browser einfügen:</p>
          <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
          <p><strong>Aus Sicherheitsgründen ist dieser Link 30 Minuten gültig.</strong></p>
          <p>Wenn Du kein neues Passwort angefordert hast, kannst Du diese E-Mail einfach ignorieren.</p>
          <br>
          <p>Viele Grüße<br>Dein GTech Team</p>
        </div>
      `;
        yield (0, emailService_1.default)({
            to: email,
            subject: "Passwort zurücksetzen – GTech Star-Kundenportal",
            html: message,
        });
        return res.status(200).json({
            success: true,
            message: "If the email exists, a reset link has been sent",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.forgetPassword = forgetPassword;
// Reset Password Controller
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return next(new errorHandler_1.default("Token and new password are required", 400));
        }
        // Verify token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch (error) {
            return next(new errorHandler_1.default("Invalid or expired token", 401));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: {
                id: decoded.id,
                resetPasswordToken: token,
            },
        });
        if (!user ||
            (user.resetPasswordExp && new Date() > user.resetPasswordExp)) {
            return next(new errorHandler_1.default("Invalid or expired token", 401));
        }
        // Update password and clear reset token
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExp = undefined;
        yield userRepository.save(user);
        // Send confirmation email
        const message = `
        <h2>Password Updated</h2>
        <p>Your password has been successfully updated.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `;
        yield (0, emailService_1.default)({
            to: user.email,
            subject: "Password Updated",
            html: message,
        });
        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.resetPassword = resetPassword;
const createCompany = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyName, email, contactEmail, contactPhoneNumber, taxNumber, legalName, deliveryAddressLine1, deliveryAddressLine2, deliveryPostalCode, deliveryCity, deliveryCountry, } = req.body;
        // Validations
        if (!companyName ||
            !legalName ||
            !email ||
            !contactEmail ||
            !contactPhoneNumber ||
            !taxNumber) {
            return next(new errorHandler_1.default("Company name, legal Name, email, contact email, contact phone number and tax number are required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const existingCustomer = yield customerRepository.findOne({
            where: { email },
        });
        if (existingCustomer) {
            return next(new errorHandler_1.default("Email already exists", 400));
        }
        // Generate temporary password
        const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
        const hashedPassword = yield bcryptjs_1.default.hash(tempPassword, 10);
        // Use transaction to ensure both customer and star customer details are created together
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            // Create customer (company)
            const customer = customerRepository.create({
                companyName,
                legalName,
                email,
                contactEmail,
                contactPhoneNumber,
                stage: "star_customer", // Set stage to star_customer
            });
            // Save customer first
            const savedCustomer = yield transactionalEntityManager.save(customer);
            const starCustomerDetails = starCustomerDetailsRepository.create({
                customer: savedCustomer,
                taxNumber,
                password: hashedPassword,
                accountVerificationStatus: "verified",
                isEmailVerified: true,
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
            // Create default list for the customer
            const defaultList = listRepository.create({
                name: `${companyName} - Default List`,
                description: `Default list for ${companyName}`,
                customer: savedCustomer,
                createdBy: {
                    customer: savedCustomer,
                },
                status: list_1.LIST_STATUS.ACTIVE,
            });
            // Save the default list
            const savedList = yield transactionalEntityManager.save(defaultList);
            return {
                customer: savedCustomer,
                starCustomerDetails: savedStarCustomerDetails,
                list: savedList,
            };
        }));
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
        yield (0, emailService_1.default)({
            to: email,
            subject: "Your Company Account Credentials",
            html: message,
        });
        // Also send to contact email if different
        if (contactEmail !== email) {
            yield (0, emailService_1.default)({
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
            stage: customer.stage,
            createdAt: customer.createdAt,
            defaultList: {
                id: list.id,
                name: list.name,
                listNumber: list.listNumber,
            },
        };
        return res.status(201).json({
            success: true,
            message: "Company created successfully with default list. Credentials sent to email.",
            data: customerData,
        });
    }
    catch (error) {
        console.error("Error creating company:", error);
        return next(new errorHandler_1.default("Failed to create company account", 500));
    }
});
exports.createCompany = createCompany;
const updateCustomer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { companyName, legalName, contactEmail, contactPhoneNumber, taxNumber, deliveryAddressLine1, deliveryAddressLine2, deliveryPostalCode, deliveryCity, deliveryCountry, id, } = req.body;
        const customerId = id;
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
        if (!updatedCustomer) {
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
            starCustomerDetails: updatedCustomer.starCustomerDetails
                ? {
                    taxNumber: updatedCustomer.starCustomerDetails.taxNumber,
                    accountVerificationStatus: updatedCustomer.starCustomerDetails.accountVerificationStatus,
                    deliveryAddressLine1: updatedCustomer.starCustomerDetails.deliveryAddressLine1,
                    deliveryAddressLine2: updatedCustomer.starCustomerDetails.deliveryAddressLine2,
                    deliveryPostalCode: updatedCustomer.starCustomerDetails.deliveryPostalCode,
                    deliveryCity: updatedCustomer.starCustomerDetails.deliveryCity,
                    deliveryCountry: updatedCustomer.starCustomerDetails.deliveryCountry,
                }
                : null,
        };
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: customerData,
        });
    }
    catch (error) {
        console.error("Error updating customer:", error);
        return next(new errorHandler_1.default("Failed to update customer profile", 500));
    }
});
exports.updateCustomer = updateCustomer;
const updateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const id = userId;
        const { name, email, role, assignedResources, permissions, phoneNumber, gender, dateOfBirth, address, country, } = req.body;
        // Validation
        if (!id) {
            return next(new errorHandler_1.default("User ID is required", 400));
        }
        if (!name || !email || !role) {
            return next(new errorHandler_1.default("Name, email and role are required", 400));
        }
        if (!Object.values(users_1.UserRole).includes(role)) {
            return next(new errorHandler_1.default("Invalid user role", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const permissionRepository = database_1.AppDataSource.getRepository(permissions_1.Permission);
        const user = yield userRepository.findOne({
            where: { id },
            relations: ["permissions"],
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        if (email !== user.email) {
            const existingUser = yield userRepository.findOne({ where: { email } });
            if (existingUser) {
                return next(new errorHandler_1.default("Email already exists", 400));
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
            yield permissionRepository.delete({ user: { id: user.id } });
            if (permissions.length > 0) {
                const permissionEntities = permissions.map((perm) => permissionRepository.create({
                    resource: perm.resource,
                    actions: perm.actions,
                    user,
                }));
                yield permissionRepository.save(permissionEntities);
            }
        }
        yield userRepository.save(user);
        const updatedUser = yield userRepository.findOne({
            where: { id: user.id },
            relations: ["permissions"],
        });
        if (!updatedUser) {
            return next(new errorHandler_1.default("Failed to fetch updated user", 500));
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
    }
    catch (error) {
        return next(error);
    }
});
exports.updateUser = updateUser;
const deleteCustomer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        if (!customerId) {
            return next(new errorHandler_1.default("Customer ID is required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        // Check if customer exists
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        // Check for lists with items
        const listsWithItems = yield listRepository
            .createQueryBuilder("list")
            .innerJoinAndSelect("list.items", "items")
            .where("list.customerId = :customerId", { customerId })
            .getMany();
        const hasListItems = listsWithItems.some((list) => list.items && list.items.length > 0);
        if (hasListItems) {
            return next(new errorHandler_1.default("Cannot delete customer. Customer has lists with items. Please delete all items first.", 400));
        }
        // Use a transaction to ensure data consistency
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. First find all lists for this customer
            const customerLists = yield transactionalEntityManager.find(list_1.List, {
                where: { customer: { id: customerId } },
            });
            // 2. Delete list items for each list
            for (const list of customerLists) {
                yield transactionalEntityManager.delete(list_1.ListItem, {
                    list: { id: list.id },
                });
            }
            // 3. Delete all lists for this customer
            yield transactionalEntityManager.delete(list_1.List, {
                customer: { id: customerId },
            });
            // 4. Find all invoices for this customer and delete their items first
            const customerInvoices = yield transactionalEntityManager.find(invoice_1.Invoice, {
                where: { customer: { id: customerId } },
                relations: ["items"],
            });
            for (const invoice of customerInvoices) {
                // Delete invoice items first
                yield transactionalEntityManager.delete(invoice_1.InvoiceItem, {
                    invoice: { id: invoice.id },
                });
                // Then delete the invoice
                yield transactionalEntityManager.delete(invoice_1.Invoice, invoice.id);
            }
            // 5. Finally delete the customer
            yield transactionalEntityManager.delete(customers_1.Customer, customerId);
        }));
        return res.status(200).json({
            success: true,
            message: "Customer and all associated invoices deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting customer:", error);
        return next(new errorHandler_1.default("Failed to delete customer. Please check all associated data has been removed.", 500));
    }
});
exports.deleteCustomer = deleteCustomer;
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId } = req.params;
        if (!userId) {
            return next(new errorHandler_1.default("User ID is required", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const permissionRepository = database_1.AppDataSource.getRepository(permissions_1.Permission);
        // Check if user exists
        const user = yield userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        // Prevent self-deletion (admin cannot delete themselves)
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (currentUserId && userId === currentUserId) {
            return next(new errorHandler_1.default("You cannot delete your own account", 400));
        }
        // Check if user is the last admin (optional safety check)
        if (user.role === users_1.UserRole.ADMIN) {
            const adminCount = yield userRepository.count({
                where: { role: users_1.UserRole.ADMIN },
            });
            if (adminCount <= 1) {
                return next(new errorHandler_1.default("Cannot delete the last admin account", 400));
            }
        }
        yield userRepository.delete(user.id);
        // Send notification email (optional)
        try {
            const message = `
          <h2>Account Deletion Notification</h2>
          <p>Your account (${user.email}) has been deleted by an administrator.</p>
          <p>If you believe this was a mistake, please contact support immediately.</p>
        `;
            yield (0, emailService_1.default)({
                to: user.email,
                subject: "Account Deletion Notification",
                html: message,
            });
        }
        catch (emailError) {
            console.error("Failed to send deletion notification email:", emailError);
            // Continue with the response even if email fails
        }
        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        return next(new errorHandler_1.default("Failed to delete user. Please try again later.", 500));
    }
});
exports.deleteUser = deleteUser;
const resendVerificationEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return next(new errorHandler_1.default("Email is required", 400));
        }
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({ where: { email } });
        if (!user) {
            // For security reasons, don't reveal if email exists or not
            return res.status(200).json({
                success: true,
                message: "If the email exists, a verification email has been sent",
            });
        }
        if (user.isEmailVerified) {
            return next(new errorHandler_1.default("Email is already verified", 400));
        }
        // Check if there's a recent verification attempt (prevent spam)
        const now = new Date();
        // Generate new verification code
        const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Update user with new verification code
        user.emailVerificationCode = emailVerificationCode;
        user.emailVerificationExp = emailVerificationExp;
        yield userRepository.save(user);
        // Send verification email
        const verificationLink = `https://master.gtech.de/verify?email=${encodeURIComponent(email)}&verificationCode=${emailVerificationCode}`;
        const message = `
        <h2>Email Verification</h2>
        <p>You requested a new verification email for your account.</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p>${verificationLink}</p>
        <p>Alternatively, you can use this verification code: <strong>${emailVerificationCode}</strong></p>
        <p><strong>Note:</strong> This verification code will expire in 24 hours.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      `;
        yield (0, emailService_1.default)({
            to: email,
            subject: "Verify Your Email Address",
            html: message,
        });
        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.resendVerificationEmail = resendVerificationEmail;
