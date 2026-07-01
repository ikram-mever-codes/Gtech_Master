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
exports.deleteCountry = exports.deactivateCountry = exports.updateCountry = exports.createCountry = exports.getAllCountries = void 0;
const database_1 = require("../config/database");
const country_1 = require("../models/country");
const getAllCountries = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const includeInactive = req.query.all === "true";
        const countries = yield countryRepository.find({
            where: includeInactive ? {} : { is_active: true },
            order: { name: "ASC" },
        });
        return res.status(200).json({ success: true, data: countries });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
exports.getAllCountries = getAllCountries;
const createCountry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const { iso2, name, is_eu, is_igl_country } = req.body;
        if (!iso2 || !name) {
            return res
                .status(400)
                .json({ success: false, message: "ISO2 code and name are required." });
        }
        const existing = yield countryRepository.findOne({
            where: { iso2: iso2.trim().toUpperCase() },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Country with ISO2 code "${iso2.toUpperCase()}" already exists.`,
            });
        }
        const country = countryRepository.create({
            iso2: iso2.trim().toUpperCase(),
            name: name.trim(),
            is_eu: !!is_eu,
            is_igl_country: !!is_igl_country,
            is_active: true,
        });
        const saved = yield countryRepository.save(country);
        return res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
exports.createCountry = createCountry;
const updateCountry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const { id } = req.params;
        const { name, is_eu, is_igl_country, is_active } = req.body;
        const country = yield countryRepository.findOne({ where: { id } });
        if (!country) {
            return res
                .status(404)
                .json({ success: false, message: "Country not found." });
        }
        if (name !== undefined)
            country.name = name.trim();
        if (is_eu !== undefined)
            country.is_eu = !!is_eu;
        if (is_igl_country !== undefined)
            country.is_igl_country = !!is_igl_country;
        if (is_active !== undefined)
            country.is_active = !!is_active;
        const updated = yield countryRepository.save(country);
        return res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
exports.updateCountry = updateCountry;
const deactivateCountry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const { id } = req.params;
        const country = yield countryRepository.findOne({ where: { id } });
        if (!country) {
            return res
                .status(404)
                .json({ success: false, message: "Country not found." });
        }
        country.is_active = false;
        yield countryRepository.save(country);
        return res
            .status(200)
            .json({ success: true, message: "Country deactivated successfully." });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
exports.deactivateCountry = deactivateCountry;
const deleteCountry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const { id } = req.params;
        const country = yield countryRepository.findOne({ where: { id } });
        if (!country) {
            return res
                .status(404)
                .json({ success: false, message: "Country not found." });
        }
        try {
            yield countryRepository.remove(country);
            return res.status(200).json({ success: true, message: "Country deleted successfully." });
        }
        catch (err) {
            country.is_active = false;
            yield countryRepository.save(country);
            return res.status(200).json({
                success: true,
                message: "Country is in use by other data, so it has been set to Inactive instead.",
            });
        }
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
exports.deleteCountry = deleteCountry;
