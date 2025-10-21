// routes/contactPersonRoutes.ts
import { Router } from "express";
import {
  createContactPerson,
  updateContactPerson,
  getContactPerson,
  getAllContactPersons,
  getContactPersonsByStarBusiness,
  deleteContactPerson,
  bulkDeleteContactPersons,
  bulkImportContactPersons,
  bulkUpdateLinkedInState,
  getContactPersonStatistics,
  exportContactPersonsToCSV,
  getStarBusinessesWithoutContacts,
  getStarBusinessesWithContactSummary,
  quickAddContactPerson,
  getAllStarBusinesses,
} from "../controllers/contact_controllers";
import { authenticateUser } from "../middlewares/authorized";

const router: any = Router();

router.use(authenticateUser);

// Contact Person CRUD Operations
router.post("/", createContactPerson);
router.get("/", getAllContactPersons);
router.get("/statistics", getContactPersonStatistics);
router.get("/export", exportContactPersonsToCSV);
router.get("/:id", getContactPerson);
router.put("/:id", updateContactPerson);
router.delete("/:id", deleteContactPerson);

router.get("/star-businesses/all", getAllStarBusinesses);
router.get(
  "/star-businesses/without-contacts",
  getStarBusinessesWithoutContacts
);
router.get(
  "/star-businesses/contact-summary",
  getStarBusinessesWithContactSummary
);
router.post(
  "/star-businesses/:starBusinessDetailsId/quick-add",
  quickAddContactPerson
);

// Bulk Operations
router.post("/bulk-import", bulkImportContactPersons);
router.post("/bulk-delete", bulkDeleteContactPersons);
router.post("/bulk-update-linkedin-state", bulkUpdateLinkedInState);

// Get Contact Persons by Star Business
router.get(
  "/star-business/:starBusinessDetailsId",
  getContactPersonsByStarBusiness
);

export default router;
