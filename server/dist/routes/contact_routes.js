"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/contactPersonRoutes.ts
const express_1 = require("express");
const contact_controllers_1 = require("../controllers/contact_controllers");
const authorized_1 = require("../middlewares/authorized");
const router = (0, express_1.Router)();
router.use(authorized_1.authenticateUser);
// Contact Person CRUD Operations
router.post("/", contact_controllers_1.createContactPerson);
router.get("/", contact_controllers_1.getAllContactPersons);
router.get("/statistics", contact_controllers_1.getContactPersonStatistics);
router.get("/export", contact_controllers_1.exportContactPersonsToCSV);
router.get("/:id", contact_controllers_1.getContactPerson);
router.put("/:id", contact_controllers_1.updateContactPerson);
router.delete("/:id", contact_controllers_1.deleteContactPerson);
router.get("/star-businesses/all", contact_controllers_1.getAllStarBusinesses);
router.get("/star-businesses/without-contacts", contact_controllers_1.getStarBusinessesWithoutContacts);
router.get("/star-businesses/contact-summary", contact_controllers_1.getStarBusinessesWithContactSummary);
router.post("/star-businesses/:starBusinessDetailsId/quick-add", contact_controllers_1.quickAddContactPerson);
// Bulk Operations
router.post("/bulk-import", contact_controllers_1.bulkImportContactPersons);
router.post("/bulk-delete", contact_controllers_1.bulkDeleteContactPersons);
router.post("/bulk-update-linkedin-state", contact_controllers_1.bulkUpdateLinkedInState);
// Get Contact Persons by Star Business
router.get("/star-business/:starBusinessDetailsId", contact_controllers_1.getContactPersonsByStarBusiness);
exports.default = router;
