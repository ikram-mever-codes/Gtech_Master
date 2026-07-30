"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorized_1 = require("../middlewares/authorized");
const cargo_type_controller_1 = require("../controllers/cargo_type_controller");
const router = (0, express_1.Router)();
router.route("/").post(authorized_1.authenticateUser, cargo_type_controller_1.createCargoType).get(authorized_1.authenticateUser, cargo_type_controller_1.getCargoTypes);
router.route("/:id").get(authorized_1.authenticateUser, cargo_type_controller_1.getCargoTypeById).put(authorized_1.authenticateUser, cargo_type_controller_1.updateCargoType).delete(authorized_1.authenticateUser, cargo_type_controller_1.deleteCargoType);
exports.default = router;
