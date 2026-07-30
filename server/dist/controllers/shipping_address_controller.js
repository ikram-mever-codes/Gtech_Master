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
exports.setDefaultShippingAddress = exports.deleteShippingAddress = exports.updateShippingAddress = exports.createShippingAddress = exports.getShippingAddresses = void 0;
const database_1 = require("../config/database");
const company_shipping_address_1 = require("../models/company_shipping_address");
const customers_1 = require("../models/customers");
const country_1 = require("../models/country");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const getShippingAddresses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const addressRepository = database_1.AppDataSource.getRepository(company_shipping_address_1.CompanyShippingAddress);
        const addresses = yield addressRepository.find({
            where: { company: { id: companyId } },
            relations: ["country"],
            order: {
                is_default: "DESC",
                name: "ASC",
            },
        });
        return res.status(200).json({
            success: true,
            data: addresses,
        });
    }
    catch (error) {
        console.error("Error fetching shipping addresses:", error);
        return next(new errorHandler_1.default("Failed to retrieve shipping addresses", 500));
    }
});
exports.getShippingAddresses = getShippingAddresses;
const createShippingAddress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const { name, address_additional_line, street, postal_code, city, country_id, is_default, } = req.body;
        if (!name || !street || !postal_code || !city) {
            return res.status(400).json({
                success: false,
                message: "Name, street, postal code, and city are required fields.",
            });
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const company = yield customerRepository.findOne({ where: { id: companyId } });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company (Customer) not found.",
            });
        }
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        let countryEntity = null;
        if (country_id) {
            countryEntity = yield countryRepository.findOne({ where: { id: country_id } });
            if (!countryEntity) {
                return res.status(404).json({
                    success: false,
                    message: "Linked Country not found.",
                });
            }
        }
        const addressRepository = database_1.AppDataSource.getRepository(company_shipping_address_1.CompanyShippingAddress);
        const setAsDefault = !!is_default;
        if (setAsDefault) {
            yield addressRepository.update({ company: { id: companyId } }, { is_default: false });
        }
        const newAddress = addressRepository.create({
            company,
            name: name.trim(),
            address_additional_line: address_additional_line ? address_additional_line.trim() : null,
            street: street.trim(),
            postal_code: postal_code.trim(),
            city: city.trim(),
            country: countryEntity,
            is_default: setAsDefault,
        });
        const saved = yield addressRepository.save(newAddress);
        const reloaded = yield addressRepository.findOne({
            where: { id: saved.id },
            relations: ["country"],
        });
        return res.status(201).json({
            success: true,
            data: reloaded,
        });
    }
    catch (error) {
        console.error("Error creating shipping address:", error);
        return next(new errorHandler_1.default("Failed to create shipping address", 500));
    }
});
exports.createShippingAddress = createShippingAddress;
const updateShippingAddress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, addressId } = req.params;
        const { name, address_additional_line, street, postal_code, city, country_id, is_default, } = req.body;
        const addressRepository = database_1.AppDataSource.getRepository(company_shipping_address_1.CompanyShippingAddress);
        const address = yield addressRepository.findOne({
            where: { id: addressId, company: { id: companyId } },
        });
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Shipping address not found for this company.",
            });
        }
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        if (country_id !== undefined) {
            if (country_id === null || country_id === "") {
                address.country = null;
            }
            else {
                const countryEntity = yield countryRepository.findOne({ where: { id: country_id } });
                if (!countryEntity) {
                    return res.status(404).json({
                        success: false,
                        message: "Linked Country not found.",
                    });
                }
                address.country = countryEntity;
            }
        }
        if (name !== undefined)
            address.name = name.trim();
        if (address_additional_line !== undefined)
            address.address_additional_line = address_additional_line ? address_additional_line.trim() : null;
        if (street !== undefined)
            address.street = street.trim();
        if (postal_code !== undefined)
            address.postal_code = postal_code.trim();
        if (city !== undefined)
            address.city = city.trim();
        if (is_default !== undefined) {
            const setAsDefault = !!is_default;
            if (setAsDefault) {
                yield addressRepository.update({ company: { id: companyId } }, { is_default: false });
            }
            address.is_default = setAsDefault;
        }
        yield addressRepository.save(address);
        const reloaded = yield addressRepository.findOne({
            where: { id: address.id },
            relations: ["country"],
        });
        return res.status(200).json({
            success: true,
            data: reloaded,
        });
    }
    catch (error) {
        console.error("Error updating shipping address:", error);
        return next(new errorHandler_1.default("Failed to update shipping address", 500));
    }
});
exports.updateShippingAddress = updateShippingAddress;
const deleteShippingAddress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, addressId } = req.params;
        const addressRepository = database_1.AppDataSource.getRepository(company_shipping_address_1.CompanyShippingAddress);
        const address = yield addressRepository.findOne({
            where: { id: addressId, company: { id: companyId } },
        });
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Shipping address not found for this company.",
            });
        }
        yield addressRepository.remove(address);
        return res.status(200).json({
            success: true,
            message: "Shipping address deleted successfully.",
        });
    }
    catch (error) {
        console.error("Error deleting shipping address:", error);
        return next(new errorHandler_1.default("Failed to delete shipping address", 500));
    }
});
exports.deleteShippingAddress = deleteShippingAddress;
const setDefaultShippingAddress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, addressId } = req.params;
        const addressRepository = database_1.AppDataSource.getRepository(company_shipping_address_1.CompanyShippingAddress);
        const address = yield addressRepository.findOne({
            where: { id: addressId, company: { id: companyId } },
        });
        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Shipping address not found for this company.",
            });
        }
        yield addressRepository.update({ company: { id: companyId } }, { is_default: false });
        address.is_default = true;
        yield addressRepository.save(address);
        return res.status(200).json({
            success: true,
            message: "Default shipping address updated successfully.",
        });
    }
    catch (error) {
        console.error("Error setting default shipping address:", error);
        return next(new errorHandler_1.default("Failed to set default shipping address", 500));
    }
});
exports.setDefaultShippingAddress = setDefaultShippingAddress;
