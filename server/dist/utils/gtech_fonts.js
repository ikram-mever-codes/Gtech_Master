"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGtechFonts = resolveGtechFonts;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mm = (millimeters) => millimeters * 2.8346;
function resolveGtechFonts() {
    const interBase = path_1.default.join(__dirname, "../../node_modules/inter-font/ttf");
    const resolve = (filename) => {
        const p = path_1.default.join(interBase, filename);
        return fs_1.default.existsSync(p) ? p : null;
    };
    const regular = resolve("Inter-Regular.ttf") ||
        "Helvetica";
    const medium = resolve("Inter-Medium.ttf") ||
        resolve("Inter-Regular.ttf") ||
        "Helvetica";
    const semiBold = resolve("Inter-SemiBold.ttf") ||
        resolve("Inter-Bold.ttf") ||
        "Helvetica-Bold";
    const serif = "Times-Roman";
    return { regular, medium, semiBold, serif };
}
