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
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: "smtp.strato.de",
        port: 587, // Alternative port
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            // ⚠️ Only use this in development!
            rejectUnauthorized: false,
        },
    });
};
const sendEmail = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const transporter = createTransporter();
    try {
        // Use a proper from format with name and email
        const fromAddress = options.from || `"Gtech Industires Gmbh" <${process.env.EMAIL_USER}>`;
        const mailOptions = {
            from: fromAddress,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            headers: Object.assign({ "X-Priority": "3", "X-Mailer": "Your App" }, options.headers),
        };
        const info = yield transporter.sendMail(mailOptions);
        console.log("Email sent successfully to:", options.to);
        console.log("Message ID:", info.messageId);
        return info;
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email. Please try again.");
    }
});
exports.default = sendEmail;
