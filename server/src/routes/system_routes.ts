
import { Router } from "express";
import { fixSequences } from "../utils/dbUtils";

const router = Router();

router.get("/fix-sequences", async (req, res) => {
    try {
        await fixSequences();
        res.status(200).json({ success: true, message: "Database sequences fixed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fix sequences", error: (error as any).message });
    }
});

export default router;
