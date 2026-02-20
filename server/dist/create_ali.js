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
const database_1 = require("./config/database");
const users_1 = require("./models/users");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function createAli() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield database_1.AppDataSource.initialize();
            const userRepository = database_1.AppDataSource.getRepository(users_1.User);
            const existingAli = yield userRepository.findOne({ where: { email: "ali@gmail.com" } });
            if (existingAli) {
                console.log("User Ali already exists");
                process.exit(0);
            }
            const hashedPassword = yield bcryptjs_1.default.hash("ali123", 10);
            const ali = userRepository.create({
                name: "Ali",
                email: "ali@gmail.com",
                password: hashedPassword,
                role: users_1.UserRole.SALES,
                isEmailVerified: true,
                assignedResources: ["Products", "Orders"]
            });
            yield userRepository.save(ali);
            console.log("User Ali created successfully");
            process.exit(0);
        }
        catch (error) {
            console.error("Error creating user:", error);
            process.exit(1);
        }
    });
}
createAli();
