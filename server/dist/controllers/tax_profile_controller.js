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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
<<<<<<< HEAD
exports.deleteTaxProfile = exports.deactivateTaxProfile = exports.updateTaxProfile = exports.createTaxProfile = exports.getAllTaxProfiles = void 0;
const database_1 = require("../config/database");
const tax_profile_1 = require("../models/tax_profile");
const country_1 = require("../models/country");
=======
exports.getTaxProfileById = exports.deleteTaxProfile = exports.deactivateTaxProfile = exports.updateTaxProfile = exports.createTaxProfile = exports.getAllTaxProfiles = void 0;
const database_1 = require("../config/database");
const tax_profile_1 = require("../models/tax_profile");
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const getAllTaxProfiles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
        const includeInactive = req.query.all === "true";
        const taxProfiles = yield taxProfileRepository.find({
            where: includeInactive ? {} : { is_active: true },
<<<<<<< HEAD
            relations: ["country"],
=======
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
            order: {
                tax_rate: "DESC",
                name: "ASC",
            },
        });
        return res.status(200).json({
            success: true,
            data: taxProfiles,
        });
    }
    catch (error) {
        console.error("Error fetching tax profiles:", error);
        return next(new errorHandler_1.default("Failed to retrieve tax profiles", 500));
    }
});
exports.getAllTaxProfiles = getAllTaxProfiles;
const createTaxProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
<<<<<<< HEAD
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const { name, country_id, tax_case, tax_rate, tax_code, revenue_account_no, requires_vat_id, requires_confirmed_vat_id, description, } = req.body;
=======
        const { name, tax_case, tax_rate, tax_code, revenue_account_no, requires_vat_id, requires_confirmed_vat_id, description, } = req.body;
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Tax Profile name is required.",
            });
        }
<<<<<<< HEAD
        let countryEntity = null;
        if (country_id) {
            countryEntity = yield countryRepository.findOne({
                where: { id: country_id },
            });
            if (!countryEntity) {
                return res.status(404).json({
                    success: false,
                    message: "Linked Country not found.",
                });
            }
        }
        const taxProfile = taxProfileRepository.create({
            name: name.trim(),
            country: countryEntity,
=======
        const taxProfile = taxProfileRepository.create({
            name: name.trim(),
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
            tax_case: tax_case ? tax_case.trim() : null,
            tax_rate: tax_rate !== undefined ? Number(tax_rate) : 0.0,
            tax_code: tax_code ? tax_code.trim() : null,
            revenue_account_no: revenue_account_no ? revenue_account_no.trim() : null,
            requires_vat_id: !!requires_vat_id,
            requires_confirmed_vat_id: !!requires_confirmed_vat_id,
            is_active: true,
            description: description ? description.trim() : undefined,
        });
        const saved = yield taxProfileRepository.save(taxProfile);
        return res.status(201).json({
            success: true,
            data: saved,
        });
    }
    catch (error) {
        console.error("Error creating tax profile:", error);
        return next(new errorHandler_1.default("Failed to create tax profile", 500));
    }
});
exports.createTaxProfile = createTaxProfile;
const updateTaxProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
<<<<<<< HEAD
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const { id } = req.params;
        const { name, country_id, tax_case, tax_rate, tax_code, revenue_account_no, requires_vat_id, requires_confirmed_vat_id, is_active, description, } = req.body;
        const profile = yield taxProfileRepository.findOne({
            where: { id },
            relations: ["country"],
=======
        const { id } = req.params;
        const { name, tax_case, tax_rate, tax_code, revenue_account_no, requires_vat_id, requires_confirmed_vat_id, is_active, description, } = req.body;
        const profile = yield taxProfileRepository.findOne({
            where: { id },
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Tax Profile not found.",
            });
        }
        if (name !== undefined)
            profile.name = name.trim();
        if (tax_case !== undefined)
            profile.tax_case = tax_case ? tax_case.trim() : null;
        if (tax_rate !== undefined)
            profile.tax_rate = Number(tax_rate);
        if (tax_code !== undefined)
            profile.tax_code = tax_code ? tax_code.trim() : null;
        if (revenue_account_no !== undefined)
            profile.revenue_account_no = revenue_account_no ? revenue_account_no.trim() : null;
        if (requires_vat_id !== undefined)
            profile.requires_vat_id = !!requires_vat_id;
        if (requires_confirmed_vat_id !== undefined)
            profile.requires_confirmed_vat_id = !!requires_confirmed_vat_id;
        if (is_active !== undefined)
            profile.is_active = !!is_active;
        if (description !== undefined)
            profile.description = description ? description.trim() : undefined;
<<<<<<< HEAD
        if (country_id !== undefined) {
            if (country_id === null || country_id === "") {
                profile.country = null;
            }
            else {
                const countryEntity = yield countryRepository.findOne({
                    where: { id: country_id },
                });
                if (!countryEntity) {
                    return res.status(404).json({
                        success: false,
                        message: "Linked Country not found.",
                    });
                }
                profile.country = countryEntity;
            }
        }
=======
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
        const updated = yield taxProfileRepository.save(profile);
        return res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        console.error("Error updating tax profile:", error);
        return next(new errorHandler_1.default("Failed to update tax profile", 500));
    }
});
exports.updateTaxProfile = updateTaxProfile;
const deactivateTaxProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
        const { id } = req.params;
        const profile = yield taxProfileRepository.findOne({ where: { id } });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Tax Profile not found.",
            });
        }
        profile.is_active = false;
        yield taxProfileRepository.save(profile);
        return res.status(200).json({
            success: true,
            message: "Tax Profile deactivated successfully.",
        });
    }
    catch (error) {
        console.error("Error deactivating tax profile:", error);
        return next(new errorHandler_1.default("Failed to deactivate tax profile", 500));
    }
});
exports.deactivateTaxProfile = deactivateTaxProfile;
const deleteTaxProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
        const { id } = req.params;
        const profile = yield taxProfileRepository.findOne({ where: { id } });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Tax Profile not found.",
            });
        }
        try {
            yield taxProfileRepository.remove(profile);
            return res.status(200).json({ success: true, message: "Tax Profile deleted successfully." });
        }
        catch (err) {
            profile.is_active = false;
            yield taxProfileRepository.save(profile);
            return res.status(200).json({
                success: true,
                message: "Tax Profile is in use by other data, so it has been set to Inactive instead.",
            });
        }
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
exports.deleteTaxProfile = deleteTaxProfile;
<<<<<<< HEAD
=======
const getTaxProfileById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
        const { id } = req.params;
        const profile = yield taxProfileRepository.findOne({
            where: { id },
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Tax Profile not found.",
            });
        }
        return res.status(200).json({
            success: true,
            data: profile,
        });
    }
    catch (error) {
        console.error("Error fetching tax profile by ID:", error);
        return next(new errorHandler_1.default("Failed to retrieve tax profile details", 500));
    }
});
exports.getTaxProfileById = getTaxProfileById;
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
