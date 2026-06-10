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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const users_1 = require("../models/users");
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield database_1.AppDataSource.initialize();
    const userRepo = database_1.AppDataSource.getRepository(users_1.User);
    const hashedPassword = yield bcryptjs_1.default.hash("Password123", 10);
    const user = userRepo.create({
        name: "Sayed",
        email: "sayed@test.com",
        password: hashedPassword,
        role: users_1.UserRole.ADMIN,
        isEmailVerified: true
    });
    yield userRepo.save(user);
    console.log("User created:", user);
}))();
