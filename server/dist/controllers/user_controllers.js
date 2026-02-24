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
exports.resendVerificationEmail = exports.deleteUser = exports.deleteCustomer = exports.updateUser = exports.updateCustomer = exports.createCompany = exports.resetPassword = exports.forgetPassword = exports.getUserById = exports.getAllUsers = exports.editProfile = exports.changePassword = exports.refresh = exports.getMe = exports.logout = exports.login = exports.verifyEmail = exports.createUser = void 0;
const typeorm_1 = require("typeorm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const users_1 = require("../models/users");
const permissions_1 = require("../models/permissions");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const notification_service_1 = require("../services/notification.service");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const list_1 = require("../models/list");
const invoice_1 = require("../models/invoice");
const star_customer_details_1 = require("../models/star_customer_details");
const cookieOptions_1 = require("../utils/cookieOptions");
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, role, assignedResources, permissions, phoneNumber, gender, dateOfBirth, address, country, } = req.body;
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
        const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
        const hashedPassword = yield bcryptjs_1.default.hash(tempPassword, 10);
        const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
            partnerName: req.body.partnerName || null,
            emergencyContact: req.body.emergencyContact || null,
            joiningDate: req.body.joiningDate || null,
            isLoginEnabled: req.body.isLoginEnabled !== undefined ? req.body.isLoginEnabled : true,
            emailVerificationCode,
            emailVerificationExp,
            isEmailVerified: false,
        });
        yield userRepository.save(user);
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
        (0, notification_service_1.sendEmailSafe)({
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
        if (user.emailVerificationExp && user.emailVerificationExp < new Date()) {
            return next(new errorHandler_1.default("Verification code has expired", 400));
        }
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
        if (!user.isLoginEnabled) {
            return next(new errorHandler_1.default("Your account has been disabled. Please contact support.", 403));
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            assignedResources: user.assignedResources,
            avatar: user.avatar,
            partnerName: user.partnerName,
            emergencyContact: user.emergencyContact,
            joiningDate: user.joiningDate,
            phoneNumber: user.phoneNumber,
            isLoginEnabled: user.isLoginEnabled,
        };
        return res
            .status(200)
            .cookie("token", token, cookieOptions_1.cookieOptions)
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
            .clearCookie("token", cookieOptions_1.cookieOptions)
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
const getMe = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.user.id;
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: { id: userId },
            relations: ["permissions"],
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        const cleanResources = (user.assignedResources || []).map(r => r.trim()).filter(r => r.length > 0);
        const derivedResources = ((_a = user.permissions) === null || _a === void 0 ? void 0 : _a.map(p => p.resource.trim())) || [];
        const finalResources = Array.from(new Set([...cleanResources, ...derivedResources]));
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            assignedResources: finalResources || [],
            avatar: user.avatar,
            phoneNumber: user.phoneNumber,
            gender: user.gender,
            dateOfBirth: user.dateOfBirth,
            address: user.address,
            country: user.country,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            partnerName: user.partnerName,
            emergencyContact: user.emergencyContact,
            joiningDate: user.joiningDate,
            isLoginEnabled: user.isLoginEnabled,
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
exports.getMe = getMe;
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
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            assignedResources: user.assignedResources,
            avatar: user.avatar,
            partnerName: user.partnerName,
            emergencyContact: user.emergencyContact,
            joiningDate: user.joiningDate,
            phoneNumber: user.phoneNumber,
            isLoginEnabled: user.isLoginEnabled,
        };
        return res
            .status(200)
            .cookie("token", newToken, cookieOptions_1.cookieOptions)
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
        const message = `
        <h2>Password Changed</h2>
        <p>Your password was successfully changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `;
        (0, notification_service_1.sendEmailSafe)({
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
    var _a, _b;
    try {
        const userId = req.user.id;
        const { name, phoneNumber, gender, dateOfBirth, address, partnerName, emergencyContact, country } = req.body;
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        if (req.file) {
            if (!fs_1.default.existsSync(req.file.path)) {
                return next(new errorHandler_1.default("File not found", 404));
            }
            try {
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
        if (country)
            user.country = country;
        if (partnerName !== undefined)
            user.partnerName = partnerName;
        if (emergencyContact !== undefined)
            user.emergencyContact = emergencyContact;
        yield userRepository.save(user);
        const updatedUser = yield userRepository.findOne({
            where: { id: userId },
            relations: ["permissions"],
        });
        if (!updatedUser) {
            return next(new errorHandler_1.default("User not found after update", 404));
        }
        const cleanResources = (updatedUser.assignedResources || []).map(r => r.trim()).filter(r => r.length > 0);
        const derivedResources = ((_b = updatedUser.permissions) === null || _b === void 0 ? void 0 : _b.map(p => p.resource)) || [];
        const finalResources = cleanResources.length > 0 ? cleanResources : Array.from(new Set(derivedResources));
        const userData = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            permissions: updatedUser.permissions || [],
            assignedResources: finalResources || [],
            avatar: updatedUser.avatar,
            phoneNumber: updatedUser.phoneNumber,
            gender: updatedUser.gender,
            dateOfBirth: updatedUser.dateOfBirth,
            address: updatedUser.address,
            country: updatedUser.country,
            partnerName: updatedUser.partnerName,
            emergencyContact: updatedUser.emergencyContact,
            joiningDate: updatedUser.joiningDate,
            isLoginEnabled: updatedUser.isLoginEnabled,
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
    var _a;
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
        const cleanResources = (user.assignedResources || []).map(r => r.trim()).filter(r => r.length > 0);
        const derivedResources = ((_a = user.permissions) === null || _a === void 0 ? void 0 : _a.map(p => p.resource)) || [];
        const finalResources = cleanResources.length > 0 ? cleanResources : Array.from(new Set(derivedResources));
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            assignedResources: finalResources || [],
            avatar: user.avatar,
            phoneNumber: user.phoneNumber,
            gender: user.gender,
            dateOfBirth: user.dateOfBirth,
            address: user.address,
            country: user.country,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            partnerName: user.partnerName,
            emergencyContact: user.emergencyContact,
            joiningDate: user.joiningDate,
            isLoginEnabled: user.isLoginEnabled,
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
        const resetToken = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "30m",
        });
        user.resetPasswordToken = resetToken;
        user.resetPasswordExp = new Date(Date.now() + 1800000); // 30 minutes
        yield userRepository.save(user);
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
        (0, notification_service_1.sendEmailSafe)({
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
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return next(new errorHandler_1.default("Token and new password are required", 400));
        }
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
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExp = undefined;
        yield userRepository.save(user);
        const message = `
        <h2>Password Updated</h2>
        <p>Your password has been successfully updated.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `;
        (0, notification_service_1.sendEmailSafe)({
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
        const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
        const hashedPassword = yield bcryptjs_1.default.hash(tempPassword, 10);
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            const customer = customerRepository.create({
                companyName,
                legalName,
                email,
                contactEmail,
                contactPhoneNumber,
                stage: "star_customer",
            });
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
            const savedStarCustomerDetails = yield transactionalEntityManager.save(starCustomerDetails);
            savedCustomer.starCustomerDetails = savedStarCustomerDetails;
            yield transactionalEntityManager.save(savedCustomer);
            const defaultList = listRepository.create({
                name: `${companyName} - Default List`,
                description: `Default list for ${companyName}`,
                customer: savedCustomer,
                createdBy: {
                    customer: savedCustomer,
                },
                status: list_1.LIST_STATUS.ACTIVE,
            });
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
        (0, notification_service_1.sendEmailSafe)({
            to: email,
            subject: "Your Company Account Credentials",
            html: message,
        });
        if (contactEmail !== email) {
            (0, notification_service_1.sendEmailSafe)({
                to: contactEmail,
                subject: "Your Company Account Credentials",
                html: message,
            });
        }
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
        if (req.file) {
            if (!fs_1.default.existsSync(req.file.path)) {
                return next(new errorHandler_1.default("File not found", 404));
            }
            try {
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
        yield customerRepository.save(customer);
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
        const updatedCustomer = yield customerRepository.findOne({
            where: { id: customerId },
            relations: ["starCustomerDetails"],
        });
        if (!updatedCustomer) {
            return next(new errorHandler_1.default("Customer not found after update", 404));
        }
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
    var _a;
    try {
        const { userId } = req.params;
        const id = userId;
        const { name, email, role, assignedResources, permissions, phoneNumber, gender, dateOfBirth, address, country, partnerName, emergencyContact, joiningDate, isLoginEnabled, } = req.body;
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
        yield database_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
            const tUserRepo = manager.getRepository(users_1.User);
            const tPermRepo = manager.getRepository(permissions_1.Permission);
            user.name = name;
            user.email = email;
            user.role = role;
            const rawResources = Array.isArray(assignedResources) ? assignedResources : [];
            user.assignedResources = rawResources.map((r) => r.trim()).filter((r) => r.length > 0);
            user.phoneNumber = phoneNumber || null;
            user.gender = gender || null;
            user.dateOfBirth = dateOfBirth || null;
            user.address = address || null;
            user.country = country || null;
            if (partnerName !== undefined)
                user.partnerName = partnerName || null;
            if (emergencyContact !== undefined)
                user.emergencyContact = emergencyContact || null;
            if (joiningDate !== undefined)
                user.joiningDate = joiningDate || null;
            if (isLoginEnabled !== undefined)
                user.isLoginEnabled = isLoginEnabled;
            // Save user first
            yield tUserRepo.save(user);
            // Handle Permissions if provided
            if (permissions) {
                // Delete existing for this user
                yield tPermRepo.delete({ user: { id: user.id } });
                // Save new ones if any
                if (permissions.length > 0) {
                    const permissionEntities = permissions.map((perm) => tPermRepo.create({
                        resource: String(perm.resource).trim(),
                        actions: Array.isArray(perm.actions)
                            ? perm.actions.map((a) => String(a).trim())
                            : [],
                        user,
                    }));
                    yield tPermRepo.save(permissionEntities);
                }
            }
        }));
        // Fetch the update state to confirm and return
        const updatedUser = yield userRepository.findOne({
            where: { id: user.id },
            relations: ["permissions"],
        });
        if (!updatedUser) {
            return next(new errorHandler_1.default("Failed to fetch updated user", 500));
        }
        const cleanResources = (updatedUser.assignedResources || []).map(r => r.trim()).filter(r => r.length > 0);
        const derivedResources = ((_a = updatedUser.permissions) === null || _a === void 0 ? void 0 : _a.map(p => p.resource.trim())) || [];
        const finalResources = Array.from(new Set([...cleanResources, ...derivedResources]));
        const userData = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            assignedResources: finalResources,
            permissions: updatedUser.permissions,
            phoneNumber: updatedUser.phoneNumber,
            gender: updatedUser.gender,
            dateOfBirth: updatedUser.dateOfBirth,
            address: updatedUser.address,
            country: updatedUser.country,
            avatar: updatedUser.avatar,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            partnerName: updatedUser.partnerName,
            emergencyContact: updatedUser.emergencyContact,
            joiningDate: updatedUser.joiningDate,
            isLoginEnabled: updatedUser.isLoginEnabled,
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
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const listsWithItems = yield listRepository
            .createQueryBuilder("list")
            .innerJoinAndSelect("list.items", "items")
            .where("list.customerId = :customerId", { customerId })
            .getMany();
        const hasListItems = listsWithItems.some((list) => list.items && list.items.length > 0);
        if (hasListItems) {
            return next(new errorHandler_1.default("Cannot delete customer. Customer has lists with items. Please delete all items first.", 400));
        }
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            const customerLists = yield transactionalEntityManager.find(list_1.List, {
                where: { customer: { id: customerId } },
            });
            for (const list of customerLists) {
                yield transactionalEntityManager.delete(list_1.ListItem, {
                    list: { id: list.id },
                });
            }
            yield transactionalEntityManager.delete(list_1.List, {
                customer: { id: customerId },
            });
            const customerInvoices = yield transactionalEntityManager.find(invoice_1.Invoice, {
                where: { customer: { id: customerId } },
                relations: ["items"],
            });
            for (const invoice of customerInvoices) {
                yield transactionalEntityManager.delete(invoice_1.InvoiceItem, {
                    invoice: { id: invoice.id },
                });
                yield transactionalEntityManager.delete(invoice_1.Invoice, invoice.id);
            }
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
        const user = yield userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (currentUserId && userId === currentUserId) {
            return next(new errorHandler_1.default("You cannot delete your own account", 400));
        }
        if (user.role === users_1.UserRole.ADMIN) {
            const adminCount = yield userRepository.count({
                where: { role: users_1.UserRole.ADMIN },
            });
            if (adminCount <= 1) {
                return next(new errorHandler_1.default("Cannot delete the last admin account", 400));
            }
        }
        yield userRepository.delete(user.id);
        try {
            const message = `
          <h2>Account Deletion Notification</h2>
          <p>Your account (${user.email}) has been deleted by an administrator.</p>
          <p>If you believe this was a mistake, please contact support immediately.</p>
        `;
            (0, notification_service_1.sendEmailSafe)({
                to: user.email,
                subject: "Account Deletion Notification",
                html: message,
            });
        }
        catch (emailError) {
            console.error("Failed to send deletion notification email:", emailError);
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
            return res.status(200).json({
                success: true,
                message: "If the email exists, a verification email has been sent",
            });
        }
        if (user.isEmailVerified) {
            return next(new errorHandler_1.default("Email is already verified", 400));
        }
        const now = new Date();
        const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const emailVerificationExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user.emailVerificationCode = emailVerificationCode;
        user.emailVerificationExp = emailVerificationExp;
        yield userRepository.save(user);
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
        (0, notification_service_1.sendEmailSafe)({
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
