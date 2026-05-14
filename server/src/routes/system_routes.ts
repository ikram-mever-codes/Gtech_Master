import { Router } from "express";
import { fixSequences } from "../utils/dbUtils";
import { _cachedCjkFontPath } from "../controllers/order_controller";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/fix-sequences", async (req, res) => {
    try {
        await fixSequences();
        res.status(200).json({ success: true, message: "Database sequences fixed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fix sequences", error: (error as any).message });
    }
});

router.get("/font-status", async (req, res) => {
    try {
        const fontPath = _cachedCjkFontPath;
        const exists = fontPath ? fs.existsSync(fontPath) : false;
        const stats = exists ? fs.statSync(fontPath!) : null;

        res.status(200).json({
            success: true,
            data: {
                cachedPath: fontPath,
                exists: exists,
                size: stats ? stats.size : 0,
                __dirname: __dirname,
                cwd: process.cwd()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to check font status", error: (error as any).message });
    }
});

export default router;
