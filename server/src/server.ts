import dotenv from "dotenv";
dotenv.config();

import app, { initializeCronJobs } from "./app";
import { initializeDatabase } from "./config/database";
import { getConnection } from "./config/misDb";
import ErrorHandler from "./utils/errorHandler";
import { addBestellungStatusMigration } from "./migrations/add_bestellung_status";
import { backfillOfferOrdersMigration } from "./migrations/backfill_offer_orders";

const PORT = process.env.PORT || 1000;

const startServer = async () => {
  try {
    await initializeDatabase();
    await addBestellungStatusMigration();
    await backfillOfferOrdersMigration();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is running`);
    });

    server.on("error", (error: any) => {
      console.error("Server execution error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
