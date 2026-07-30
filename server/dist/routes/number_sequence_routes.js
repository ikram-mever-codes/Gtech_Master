"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const number_sequence_controller_1 = require("../controllers/number_sequence_controller");
const authorized_1 = require("../middlewares/authorized");
const users_1 = require("../models/users");
const router = (0, express_1.Router)();
const numberSequenceController = new number_sequence_controller_1.NumberSequenceController();
router.use(authorized_1.authenticateUser);
// Managing number sequences is an admin concern — getting a prefix wrong
// or changing minDigits affects every document created under that sequence.
router.post("", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), numberSequenceController.createSequence.bind(numberSequenceController));
router.get("", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), numberSequenceController.getAllSequences.bind(numberSequenceController));
router.get("/:sequenceKey", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), numberSequenceController.getSequenceByKey.bind(numberSequenceController));
router.put("/:sequenceKey", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), numberSequenceController.updateSequence.bind(numberSequenceController));
router.delete("/:sequenceKey", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), numberSequenceController.deactivateSequence.bind(numberSequenceController));
exports.default = router;
