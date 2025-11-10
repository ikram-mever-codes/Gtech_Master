// routes/cronRoutes.ts
import { Router } from "express";
import { CronJobs } from "../services/cronJob";

const router = Router();
const cronJobs = CronJobs.getInstance();

router.get("/start", (req, res) => {
  cronJobs.start();
  res.json({
    success: true,
    message: "Cron jobs started",
    status: cronJobs.getStatus(),
  });
});

router.post("/stop", (req, res) => {
  cronJobs.stop();
  res.json({
    success: true,
    message: "Cron jobs stopped",
    status: cronJobs.getStatus(),
  });
});

router.get("/status", (req, res) => {
  res.json({
    success: true,
    status: cronJobs.getStatus(),
  });
});

router.post("/refresh-list/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const success = await cronJobs.refreshSpecificList(listId);

    res.json({
      success,
      message: success
        ? "List refreshed successfully"
        : "Failed to refresh list",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error refreshing list",
    });
  }
});

router.post("/refresh-all", async (req, res) => {
  try {
    await (cronJobs as any).refreshAllLists();

    res.json({
      success: true,
      message: "All lists refresh triggered",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error triggering refresh",
    });
  }
});

export default router;
