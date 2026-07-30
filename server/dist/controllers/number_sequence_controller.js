"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberSequenceController = void 0;
const database_1 = require("../config/database");
const number_sequence_1 = require("../models/number_sequence");
class NumberSequenceController {
    constructor() {
        this.repository = database_1.AppDataSource.getRepository(number_sequence_1.NumberSequence);
    }
    // ==========================================================================
    // CREATE
    // POST /number-sequences
    // sequenceKey is fixed at creation and never changes afterwards, since
    // other code (offer/invoice/order controllers) references it by string.
    // ==========================================================================
    createSequence(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const body = request.body || {};
                if (!body.sequenceKey || !body.name || !body.prefix) {
                    return response.status(400).json({
                        success: false,
                        message: "sequenceKey, name and prefix are required",
                    });
                }
                const existing = yield this.repository.findOne({
                    where: { sequenceKey: body.sequenceKey },
                });
                if (existing) {
                    return response.status(409).json({
                        success: false,
                        message: `A sequence with key "${body.sequenceKey}" already exists`,
                    });
                }
                const sequence = this.repository.create({
                    sequenceKey: body.sequenceKey,
                    name: body.name,
                    prefix: body.prefix,
                    formatPattern: body.formatPattern || "{prefix}{yy}{mm}-{number}",
                    minDigits: (_a = body.minDigits) !== null && _a !== void 0 ? _a : 2,
                    resetPolicy: body.resetPolicy || "never",
                    nextRunningNo: (_b = body.startingNumber) !== null && _b !== void 0 ? _b : 1,
                    isActive: (_c = body.isActive) !== null && _c !== void 0 ? _c : true,
                });
                const saved = yield this.repository.save(sequence);
                return response.status(201).json({
                    success: true,
                    message: "Number sequence created successfully",
                    data: saved,
                });
            }
            catch (error) {
                console.error("Error creating number sequence:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    // ==========================================================================
    // READ - list all
    // GET /number-sequences
    // ==========================================================================
    getAllSequences(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sequences = yield this.repository.find({
                    order: { name: "ASC" },
                });
                return response.status(200).json({ success: true, data: sequences });
            }
            catch (error) {
                console.error("Error fetching number sequences:", error);
                return response
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            }
        });
    }
    // ==========================================================================
    // READ - single, by sequenceKey (not id, since that's what callers know)
    // GET /number-sequences/:sequenceKey
    // ==========================================================================
    getSequenceByKey(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sequenceKey } = request.params;
                const sequence = yield this.repository.findOne({
                    where: { sequenceKey },
                });
                if (!sequence) {
                    return response
                        .status(404)
                        .json({ success: false, message: "Number sequence not found" });
                }
                return response.status(200).json({ success: true, data: sequence });
            }
            catch (error) {
                console.error("Error fetching number sequence:", error);
                return response
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            }
        });
    }
    // ==========================================================================
    // UPDATE
    // PUT /number-sequences/:sequenceKey
    // sequenceKey and nextRunningNo are intentionally not editable here.
    // Changing sequenceKey would break every entity that references it, and
    // nextRunningNo must only ever move forward through getNextNumber, never
    // via manual edit, or two people could get the same number.
    // ==========================================================================
    updateSequence(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sequenceKey } = request.params;
                const body = request.body || {};
                const sequence = yield this.repository.findOne({
                    where: { sequenceKey },
                });
                if (!sequence) {
                    return response
                        .status(404)
                        .json({ success: false, message: "Number sequence not found" });
                }
                const updatableFields = [
                    "name",
                    "prefix",
                    "formatPattern",
                    "minDigits",
                    "resetPolicy",
                    "nextRunningNo",
                    "isActive",
                ];
                updatableFields.forEach((field) => {
                    if (body[field] !== undefined) {
                        sequence[field] = body[field];
                    }
                });
                const updated = yield this.repository.save(sequence);
                return response.status(200).json({
                    success: true,
                    message: "Number sequence updated successfully",
                    data: updated,
                });
            }
            catch (error) {
                console.error("Error updating number sequence:", error);
                return response
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            }
        });
    }
    // ==========================================================================
    // DEACTIVATE (soft delete)
    // DELETE /number-sequences/:sequenceKey
    // A sequence is never hard-deleted: entities created under it still
    // reference its key/prefix, and reusing a running number would break
    // uniqueness. Deactivating just stops getNextNumber from issuing new ones.
    // ==========================================================================
    deactivateSequence(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sequenceKey } = request.params;
                const sequence = yield this.repository.findOne({
                    where: { sequenceKey },
                });
                if (!sequence) {
                    return response
                        .status(404)
                        .json({ success: false, message: "Number sequence not found" });
                }
                sequence.isActive = false;
                yield this.repository.save(sequence);
                return response.status(200).json({
                    success: true,
                    message: "Number sequence deactivated successfully",
                });
            }
            catch (error) {
                console.error("Error deactivating number sequence:", error);
                return response
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            }
        });
    }
}
exports.NumberSequenceController = NumberSequenceController;
