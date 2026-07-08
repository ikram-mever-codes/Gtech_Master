import { Router } from "express";
import { NumberSequenceController } from "../controllers/number_sequence_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();
const numberSequenceController = new NumberSequenceController();

router.use(authenticateUser);

// Managing number sequences is an admin concern — getting a prefix wrong
// or changing minDigits affects every document created under that sequence.
router.post(
  "",
  authorize(UserRole.ADMIN),
  numberSequenceController.createSequence.bind(numberSequenceController),
);
router.get(
  "",
  authorize(UserRole.ADMIN),
  numberSequenceController.getAllSequences.bind(numberSequenceController),
);
router.get(
  "/:sequenceKey",
  authorize(UserRole.ADMIN),
  numberSequenceController.getSequenceByKey.bind(numberSequenceController),
);
router.put(
  "/:sequenceKey",
  authorize(UserRole.ADMIN),
  numberSequenceController.updateSequence.bind(numberSequenceController),
);
router.delete(
  "/:sequenceKey",
  authorize(UserRole.ADMIN),
  numberSequenceController.deactivateSequence.bind(numberSequenceController),
);

export default router;
