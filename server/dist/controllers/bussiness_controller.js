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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBusiness = exports.bulkUpdateStatus = exports.getBusinessStatistics = exports.searchBusinessesByLocation = exports.bulkDeleteBusinesses = exports.getAllBusinesses = exports.getBusinessById = exports.updateBusiness = exports.createBusiness = exports.bulkImportBusinesses = exports.BUSINESS_STATUS = exports.BUSINESS_SOURCE = void 0;
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const business_details_1 = require("../models/business_details");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const star_business_details_1 = require("../models/star_business_details");
const star_customer_details_1 = require("../models/star_customer_details");
const list_1 = require("../models/list");
const emailService_1 = __importDefault(require("../services/emailService"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const country_1 = require("../models/country");
exports.BUSINESS_SOURCE = {
    GOOGLE_MAPS: "Google Maps",
    MANUAL: "Manual",
    IMPORT: "Import",
};
exports.BUSINESS_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    NO_WEBSITE: "no_website",
    VERIFIED: "verified",
};
const bulkImportBusinesses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { businesses, source = exports.BUSINESS_SOURCE.GOOGLE_MAPS } = req.body;
        if (!businesses || !Array.isArray(businesses)) {
            return next(new errorHandler_1.default("Businesses array is required", 400));
        }
        if (businesses.length === 0) {
            return next(new errorHandler_1.default("Businesses array cannot be empty", 400));
        }
        console.log(`Starting bulk import of ${businesses.length} businesses from source: ${source}...`);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        const results = {
            total: businesses.length,
            imported: 0,
            skippedInvalidData: 0,
            duplicates: 0,
            errors: 0,
            errorsList: [],
            duplicateEntries: [],
            importedBusinesses: [],
            startTime: new Date(),
            endTime: null,
        };
        const extractFirstWord = (businessName) => {
            if (!businessName)
                return "";
            return businessName.split(" ")[0] || businessName;
        };
        const businessesToCheck = [];
        for (let i = 0; i < businesses.length; i++) {
            const businessData = businesses[i];
            if (!businessData.name || !businessData.address) {
                results.skippedInvalidData++;
                results.errorsList.push({
                    business: `Business at index ${i}`,
                    error: "Missing required fields: name and address are required",
                });
                continue;
            }
            const normalizedWebsite = businessData.website
                ? normalizeWebsite(businessData.website)
                : null;
            const companyNameFirstWord = extractFirstWord(businessData.name);
            const normalizedCompanyName = companyNameFirstWord.trim().toLowerCase();
            businessesToCheck.push({
                index: i,
                data: businessData,
                normalizedWebsite,
                normalizedCompanyName,
            });
        }
        const existingBusinessesByWebsite = new Map();
        const existingBusinessesByName = new Map();
        const websitesToCheck = businessesToCheck
            .filter((b) => b.normalizedWebsite)
            .map((b) => b.normalizedWebsite);
        const namesToCheck = businessesToCheck.map((b) => b.normalizedCompanyName);
        if (websitesToCheck.length > 0) {
            const existingByWebsite = yield businessDetailsRepository
                .createQueryBuilder("businessDetails")
                .innerJoinAndSelect("businessDetails.customer", "customer")
                .where("LOWER(businessDetails.website) IN (:...websites)", {
                websites: websitesToCheck,
            })
                .andWhere("customer.stage = :stage", { stage: "business" })
                .getMany();
            existingByWebsite.forEach((business) => {
                if (business.website) {
                    existingBusinessesByWebsite.set(normalizeWebsite(business.website), {
                        id: business.customer.id,
                        companyName: business.customer.companyName,
                        email: business.customer.email,
                        website: business.website,
                        stage: business.customer.stage,
                    });
                }
            });
        }
        if (namesToCheck.length > 0) {
            const existingByName = yield customerRepository
                .createQueryBuilder("customer")
                .leftJoinAndSelect("customer.businessDetails", "businessDetails")
                .where("LOWER(customer.companyName) IN (:...names)", {
                names: namesToCheck,
            })
                .andWhere("customer.stage = :stage", { stage: "business" })
                .getMany();
            existingByName.forEach((customer) => {
                var _a;
                existingBusinessesByName.set(customer.companyName.toLowerCase(), {
                    id: customer.id,
                    companyName: customer.companyName,
                    email: customer.email,
                    website: (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.website,
                    stage: customer.stage,
                });
            });
        }
        const customersToSave = [];
        const seenInBatch = {
            websites: new Set(),
            names: new Set(),
        };
        for (const businessToCheck of businessesToCheck) {
            const { index, data: businessData, normalizedWebsite, normalizedCompanyName, } = businessToCheck;
            let duplicateReason = "";
            let existingRecord = null;
            if (normalizedWebsite && seenInBatch.websites.has(normalizedWebsite)) {
                duplicateReason = "Duplicate website in current batch";
            }
            else if (seenInBatch.names.has(normalizedCompanyName)) {
                duplicateReason = "Duplicate company name in current batch";
            }
            if (!duplicateReason) {
                if (normalizedWebsite &&
                    existingBusinessesByWebsite.has(normalizedWebsite)) {
                    duplicateReason = "Website already exists in database";
                    existingRecord = existingBusinessesByWebsite.get(normalizedWebsite);
                }
                else if (existingBusinessesByName.has(normalizedCompanyName)) {
                    duplicateReason = "Company name already exists in database";
                    existingRecord = existingBusinessesByName.get(normalizedCompanyName);
                }
            }
            if (duplicateReason) {
                results.duplicates++;
                results.duplicateEntries.push({
                    business: {
                        index: index,
                        name: businessData.name,
                        email: businessData.email,
                        website: businessData.website,
                        address: businessData.address,
                        city: businessData.city,
                        country: businessData.country,
                        source: businessData.source || source,
                    },
                    reason: duplicateReason,
                    existingRecord: existingRecord,
                });
                continue;
            }
            try {
                const customer = new customers_1.Customer();
                const completeBusinessName = businessData.name.trim();
                const companyNameFirstWord = extractFirstWord(completeBusinessName);
                customer.legalName = completeBusinessName;
                customer.companyName = companyNameFirstWord;
                customer.email = businessData.email
                    ? businessData.email.trim().toLowerCase()
                    : `${companyNameFirstWord
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, ".")}@imported.business`;
                customer.stage = "business";
                customer.contactEmail = businessData.contactEmail
                    ? businessData.contactEmail.trim().toLowerCase()
                    : customer.email;
                customer.contactPhoneNumber = businessData.contactPhoneNumber
                    ? businessData.contactPhoneNumber.trim()
                    : businessData.phoneNumber
                        ? businessData.phoneNumber.trim()
                        : "";
                customer.avatar = businessData.avatar
                    ? businessData.avatar.trim()
                    : undefined;
                const businessDetails = new business_details_1.BusinessDetails();
                businessDetails.businessSource = businessData.businessSource || source;
                businessDetails.longitude = sanitizeNumber(businessData.longitude);
                businessDetails.latitude = sanitizeNumber(businessData.latitude);
                businessDetails.googleMapsUrl = businessData.googleMapsUrl
                    ? businessData.googleMapsUrl.trim()
                    : undefined;
                businessDetails.reviewCount = sanitizeInteger(businessData.reviewCount);
                businessDetails.website = normalizedWebsite || undefined;
                businessDetails.contactPhone = businessData.phoneNumber
                    ? businessData.phoneNumber.trim()
                    : undefined;
                businessDetails.email = businessData.businessEmail
                    ? businessData.businessEmail.trim().toLowerCase()
                    : undefined;
                businessDetails.socialLinks = sanitizeSocialLinks(businessData.socialMedia || businessData.socialLinks);
                businessDetails.isDeviceMaker = sanitizeIsDeviceMaker(businessData.isDeviceMaker);
                businessDetails.description = businessData.description
                    ? businessData.description.trim()
                    : undefined;
                businessDetails.address = businessData.address
                    ? businessData.address.trim()
                    : undefined;
                businessDetails.city = businessData.city
                    ? businessData.city.trim()
                    : undefined;
                businessDetails.state = businessData.state
                    ? businessData.state.trim()
                    : undefined;
                businessDetails.country = businessData.country
                    ? businessData.country.trim()
                    : undefined;
                businessDetails.postalCode = businessData.postalCode
                    ? businessData.postalCode.trim()
                    : undefined;
                businessDetails.category = businessData.category
                    ? businessData.category.trim()
                    : undefined;
                if (businessData.categoryTags &&
                    Array.isArray(businessData.categoryTags)) {
                    businessDetails.additionalCategories = businessData.categoryTags
                        .map((cat) => cat.trim())
                        .filter(Boolean);
                }
                else if (businessData.additionalCategories &&
                    Array.isArray(businessData.additionalCategories)) {
                    businessDetails.additionalCategories =
                        businessData.additionalCategories
                            .map((cat) => cat.trim())
                            .filter(Boolean);
                }
                else {
                    businessDetails.additionalCategories = undefined;
                }
                businessDetails.industry = businessData.industry
                    ? businessData.industry.trim()
                    : undefined;
                businessDetails.employeeCount = sanitizeInteger(businessData.employeeCount);
                businessDetails.isStarBusiness = false;
                businessDetails.isStarCustomer = false;
                customer.businessDetails = businessDetails;
                if (normalizedWebsite) {
                    seenInBatch.websites.add(normalizedWebsite);
                }
                seenInBatch.names.add(normalizedCompanyName);
                customersToSave.push(customer);
                console.log(`Prepared business for import: ${customer.companyName}`, {
                    legalName: customer.legalName,
                    companyName: customer.companyName,
                    email: customer.email,
                    website: normalizedWebsite,
                    stage: customer.stage,
                });
            }
            catch (error) {
                results.errors++;
                results.errorsList.push({
                    business: (businessData === null || businessData === void 0 ? void 0 : businessData.name) || `Business at index ${index}`,
                    error: error.message || "Unknown processing error",
                });
                console.error(`Error processing business at index ${index}:`, error);
            }
        }
        if (customersToSave.length > 0) {
            try {
                console.log(`Attempting to save ${customersToSave.length} new businesses to database...`);
                const CHUNK_SIZE = 50;
                const savedCustomers = [];
                for (let i = 0; i < customersToSave.length; i += CHUNK_SIZE) {
                    const chunk = customersToSave.slice(i, i + CHUNK_SIZE);
                    console.log(`Saving chunk ${Math.floor(i / CHUNK_SIZE) + 1} with ${chunk.length} businesses`);
                    try {
                        const savedChunk = yield customerRepository.save(chunk);
                        savedCustomers.push(...savedChunk);
                        savedChunk.forEach((customer) => {
                            var _a;
                            results.importedBusinesses.push({
                                id: customer.id,
                                legalName: customer.legalName,
                                companyName: customer.companyName,
                                email: customer.email,
                                website: (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.website,
                            });
                        });
                        console.log(`Successfully saved chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`, savedChunk.length, "businesses");
                    }
                    catch (chunkError) {
                        console.error(`Error saving chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`, chunkError);
                        for (const customer of chunk) {
                            try {
                                const saved = yield customerRepository.save(customer);
                                savedCustomers.push(saved);
                                results.importedBusinesses.push({
                                    id: saved.id,
                                    legalName: saved.legalName,
                                    companyName: saved.companyName,
                                    email: saved.email,
                                    website: (_a = saved.businessDetails) === null || _a === void 0 ? void 0 : _a.website,
                                });
                            }
                            catch (individualError) {
                                results.errors++;
                                results.errorsList.push({
                                    business: customer.legalName || "",
                                    error: individualError.message || "Failed to save",
                                });
                                console.error(`Failed to save business: ${customer.legalName}`, individualError);
                            }
                        }
                    }
                }
                results.imported = savedCustomers.length;
                console.log(`Successfully saved ${savedCustomers.length} businesses.`);
            }
            catch (error) {
                console.error("Error during save operation:", error);
                return next(new errorHandler_1.default(`Failed to save businesses: ${error.message}`, 500));
            }
        }
        else {
            console.log("No new businesses to save after duplicate checking.");
        }
        results.endTime = new Date();
        const duration = results.endTime.getTime() - results.startTime.getTime();
        console.log(`Bulk import completed in ${duration}ms:`, {
            total: results.total,
            imported: results.imported,
            skippedInvalidData: results.skippedInvalidData,
            duplicates: results.duplicates,
            errors: results.errors,
            source: source,
        });
        return res.status(200).json({
            success: true,
            message: `Bulk import completed. ${results.imported} new businesses imported, ${results.duplicates} duplicates found.`,
            data: results,
        });
    }
    catch (error) {
        console.error("Critical error in bulk import:", error);
        return next(new errorHandler_1.default(`Failed to process bulk import: ${error.message}`, 500));
    }
});
exports.bulkImportBusinesses = bulkImportBusinesses;
const normalizeWebsite = (website) => {
    let normalized = website.trim().toLowerCase();
    normalized = normalized.replace(/\/+$/, "");
    if (normalized.startsWith("www.")) {
        normalized = normalized.substring(4);
    }
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = "https://" + normalized;
    }
    return normalized;
};
const sanitizeNumber = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
};
const generateTempPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};
const createBusiness = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { displayName, companyName, name, customerNumber, companyLabelPrintLogo, address, street, addressAdditional, website, description, note, city, state, country = "Germany", postalCode, latitude, longitude, phoneNumber, phone, email, contactEmail, contactPhoneNumber, vatTaxId, googleMapsUrl, reviewCount, category, additionalCategories, socialMedia, source = exports.BUSINESS_SOURCE.MANUAL, isDeviceMaker, starBusinessDetails, isStarCustomer, starCustomerEmail, asanaLink, debtor_no, default_tax_profile_id, vat_id_status, } = req.body;
        const user = req.user;
        const dbCompanyName = displayName || name || companyName;
        const dbLegalName = companyName;
        const finalEmail = email;
        if (!dbCompanyName) {
            return next(new errorHandler_1.default("Company name is required", 400));
        }
        if (isDeviceMaker && !["Yes", "No", "Unsure"].includes(isDeviceMaker)) {
            return next(new errorHandler_1.default("Device maker must be one of Yes / No / Unsure", 400));
        }
        if (isStarCustomer && isDeviceMaker !== "Yes") {
            return next(new errorHandler_1.default("Star Customer can only be created when device maker is Yes", 400));
        }
        if (isStarCustomer && !starCustomerEmail) {
            return next(new errorHandler_1.default("Email is required for Star Customer account", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const normalizedWebsite = website ? normalizeWebsite(website) : null;
        if (normalizedWebsite) {
            console.log(`[DEBUG] Checking website uniqueness: ${normalizedWebsite}`);
            const existingBusinessWithWebsite = yield businessDetailsRepository
                .createQueryBuilder("businessDetails")
                .leftJoinAndSelect("businessDetails.customer", "customer")
                .where("businessDetails.website = :website", {
                website: normalizedWebsite,
            })
                .getOne();
            if (existingBusinessWithWebsite) {
                console.warn(`[DEBUG] Duplicate website found: ${normalizedWebsite}`);
                return next(new errorHandler_1.default("A business with this website already exists", 400));
            }
        }
        const trimmedDisplayName = dbCompanyName.trim();
        console.log(`[DEBUG] Checking display name uniqueness: ${trimmedDisplayName}`);
        const existingCustomerWithName = yield customerRepository
            .createQueryBuilder("customer")
            .where("LOWER(customer.companyName) = LOWER(:companyName)", {
            companyName: trimmedDisplayName,
        })
            .getOne();
        if (existingCustomerWithName) {
            console.warn(`[DEBUG] Duplicate display name found: ${trimmedDisplayName}`);
            return next(new errorHandler_1.default("A business with this display name already exists", 400));
        }
        const trimmedCustomerNumber = customerNumber ? customerNumber.trim() : "";
        if (trimmedCustomerNumber) {
            console.log(`[DEBUG] Checking customer number uniqueness: ${trimmedCustomerNumber}`);
            const existingCustomerWithNumber = yield customerRepository
                .createQueryBuilder("customer")
                .where("customer.customerNumber = :customerNumber", {
                customerNumber: trimmedCustomerNumber,
            })
                .getOne();
            if (existingCustomerWithNumber) {
                console.warn(`[DEBUG] Duplicate customer number found: ${trimmedCustomerNumber}`);
                return next(new errorHandler_1.default("A business with this customer number already exists", 400));
            }
        }
        const emailToCheck = isStarCustomer ? starCustomerEmail : finalEmail;
        if (emailToCheck) {
            const trimmedEmail = emailToCheck.trim().toLowerCase();
            console.log(`[DEBUG] Checking email uniqueness: ${trimmedEmail}`);
            const existingCustomerWithEmail = yield customerRepository.findOne({
                where: { email: trimmedEmail },
            });
            if (existingCustomerWithEmail) {
                console.warn(`[DEBUG] Duplicate email found in Customer table: ${trimmedEmail}`);
                return next(new errorHandler_1.default("A business with this email already exists", 400));
            }
            const existingBusinessWithEmail = yield businessDetailsRepository.findOne({
                where: { email: trimmedEmail },
            });
            if (existingBusinessWithEmail) {
                console.warn(`[DEBUG] Duplicate email found in BusinessDetails table: ${trimmedEmail}`);
                return next(new errorHandler_1.default("This email is already associated with another business's details", 400));
            }
        }
        const shouldBeStarBusiness = isDeviceMaker === "Yes" &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.inSeries) === true &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.madeIn);
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            const customer = new customers_1.Customer();
            customer.companyName = trimmedDisplayName;
            customer.legalName = dbLegalName ? dbLegalName.trim() : undefined;
            customer.customerNumber = trimmedCustomerNumber || undefined;
            customer.companyLabelPrintLogo = companyLabelPrintLogo
                ? companyLabelPrintLogo.trim()
                : undefined;
            customer.vatTaxId = vatTaxId ? vatTaxId.trim() : undefined;
            customer.debtor_no = debtor_no ? debtor_no.trim() : undefined;
            customer.default_tax_profile_id = default_tax_profile_id || undefined;
            customer.vat_id_status = vat_id_status || "unchecked";
            customer.asanaLink = asanaLink ? asanaLink.trim() : undefined;
            customer.addressLine2 = addressAdditional ? addressAdditional.trim() : undefined;
            if (isStarCustomer) {
                customer.stage = "star_customer";
                customer.email = starCustomerEmail.trim().toLowerCase();
                customer.contactEmail = starCustomerEmail.trim().toLowerCase();
            }
            else if (shouldBeStarBusiness) {
                customer.stage = "star_business";
                customer.email = finalEmail
                    ? finalEmail.trim().toLowerCase()
                    : undefined;
                customer.contactEmail = contactEmail
                    ? contactEmail.trim().toLowerCase()
                    : finalEmail
                        ? finalEmail.trim().toLowerCase()
                        : undefined;
            }
            else if (isDeviceMaker === "Yes") {
                customer.stage = "star_business";
                customer.email = finalEmail
                    ? finalEmail.trim().toLowerCase()
                    : undefined;
                customer.contactEmail = contactEmail
                    ? contactEmail.trim().toLowerCase()
                    : finalEmail
                        ? finalEmail.trim().toLowerCase()
                        : undefined;
            }
            else {
                customer.stage = "business";
                customer.email = finalEmail
                    ? finalEmail.trim().toLowerCase()
                    : undefined;
                customer.contactEmail = contactEmail
                    ? contactEmail.trim().toLowerCase()
                    : finalEmail
                        ? finalEmail.trim().toLowerCase()
                        : undefined;
            }
            customer.contactPhoneNumber = contactPhoneNumber
                ? contactPhoneNumber.trim()
                : phone
                    ? phone.trim()
                    : phoneNumber
                        ? phoneNumber.trim()
                        : undefined;
            const savedCustomer = yield transactionalEntityManager.save(customers_1.Customer, customer);
            const businessDetails = new business_details_1.BusinessDetails();
            businessDetails.businessSource = source;
            businessDetails.isDeviceMaker = isDeviceMaker;
            businessDetails.check_timestamp = new Date();
            businessDetails.check_by = user;
            businessDetails.address = street
                ? street.trim()
                : address
                    ? address.trim()
                    : undefined;
            businessDetails.website = normalizedWebsite || undefined;
            businessDetails.description =
                note !== undefined
                    ? note
                        ? String(note).trim()
                        : undefined
                    : description
                        ? description.trim()
                        : undefined;
            businessDetails.city = city ? city.trim() : undefined;
            businessDetails.state = state ? state.trim() : undefined;
            businessDetails.country = country ? country.trim() : undefined;
            if (country) {
                const countryRepo = database_1.AppDataSource.getRepository(country_1.Country);
                const matched = yield countryRepo.findOne({
                    where: [
                        { iso2: country.trim().toUpperCase() },
                        { name: country.trim() }
                    ]
                });
                if (matched) {
                    customer.country_id = matched.id;
                    businessDetails.country_id = matched.id;
                }
            }
            businessDetails.postalCode = postalCode ? postalCode.trim() : undefined;
            businessDetails.latitude = sanitizeNumber(latitude);
            businessDetails.longitude = sanitizeNumber(longitude);
            businessDetails.contactPhone = phone
                ? phone.trim()
                : phoneNumber
                    ? phoneNumber.trim()
                    : undefined;
            businessDetails.email = finalEmail
                ? finalEmail.trim().toLowerCase()
                : undefined;
            businessDetails.googleMapsUrl = googleMapsUrl
                ? googleMapsUrl.trim()
                : undefined;
            businessDetails.reviewCount = reviewCount ? parseInt(reviewCount) : 0;
            businessDetails.category = category ? category.trim() : undefined;
            businessDetails.additionalCategories = additionalCategories || [];
            businessDetails.customer = savedCustomer;
            const savedBusinessDetails = yield transactionalEntityManager.save(business_details_1.BusinessDetails, businessDetails);
            if (isDeviceMaker === "Yes" || shouldBeStarBusiness) {
                const starBusiness = new star_business_details_1.StarBusinessDetails();
                if (starBusinessDetails) {
                    starBusiness.inSeries = starBusinessDetails.inSeries || false;
                    starBusiness.madeIn = starBusinessDetails.madeIn || undefined;
                    starBusiness.device = starBusinessDetails.device || undefined;
                    starBusiness.industry = starBusinessDetails.industry || undefined;
                }
                starBusiness.converted_timestamp = new Date();
                starBusiness.convertedBy = user;
                starBusiness.customer = savedCustomer;
                const savedStarBusiness = yield transactionalEntityManager.save(star_business_details_1.StarBusinessDetails, starBusiness);
                savedCustomer.starBusinessDetails = savedStarBusiness;
            }
            let tempPassword;
            let defaultList;
            if (isStarCustomer) {
                const starCustomer = new star_customer_details_1.StarCustomerDetails();
                tempPassword = generateTempPassword();
                starCustomer.password = yield bcryptjs_1.default.hash(tempPassword, 10);
                starCustomer.deliveryPostalCode = businessDetails.postalCode || "";
                starCustomer.deliveryCity = businessDetails.city || "";
                starCustomer.deliveryCountry = businessDetails.country || "Germany";
                starCustomer.customer = savedCustomer;
                const savedStarCustomer = yield transactionalEntityManager.save(star_customer_details_1.StarCustomerDetails, starCustomer);
                savedCustomer.starCustomerDetails = savedStarCustomer;
                defaultList = new list_1.List();
                defaultList.name = `Default`;
                defaultList.description = `Default list for ${savedCustomer.companyName}`;
                defaultList.customer = savedCustomer;
                defaultList.status = list_1.LIST_STATUS.ACTIVE;
                defaultList = yield transactionalEntityManager.save(list_1.List, defaultList);
            }
            savedCustomer.businessDetails = savedBusinessDetails;
            yield transactionalEntityManager.save(customers_1.Customer, savedCustomer);
            return {
                customer: savedCustomer,
                businessDetails: savedBusinessDetails,
                tempPassword,
                defaultList,
                shouldBeStarBusiness,
            };
        }));
        const { customer, businessDetails, tempPassword, defaultList } = result;
        if (isStarCustomer && tempPassword) {
            const loginLink = `${process.env.STAR_URL}/login`;
            const portalLink = "https://stars.gtech.de/potis";
            const message = `
        <h2>Welcome to the GTech Star customer portal!</h2>
        <p>From now on, you have direct access to all your products as well as upcoming and completed deliveries.</p>
        <p>In read-only mode, you can see the complete overview and track the current status of your orders at any time – without any login required.</p>
        <p>Try it directly here: <a href="${portalLink}">${portalLink}</a></p>
        <p>This way you'll always stay informed – fast, clear, and reliable.</p>
        <p>Enjoy your access!</p>
        <p>Your GTech Team</p>
        <br>
        <p><strong>Your Login Credentials:</strong></p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please login <a href="${loginLink}">here</a> to access your full account features.</p>
        ${defaultList
                ? `<p>A default list "${defaultList.name}" has been created for your company.</p>`
                : ""}
      `;
            yield (0, emailService_1.default)({
                to: customer.email,
                subject: "Welcome to the GTech Star Customer Portal!",
                html: message,
            });
        }
        const finalCustomer = yield customerRepository.findOne({
            where: { id: customer.id },
            relations: [
                "businessDetails",
                "starBusinessDetails",
                "starBusinessDetails.convertedBy",
                "starCustomerDetails",
            ],
        });
        if (!finalCustomer) {
            return next(new errorHandler_1.default("Business not found after creation", 404));
        }
        const _l = finalCustomer.businessDetails || {}, { id: detailsId } = _l, businessDetailsWithoutId = __rest(_l, ["id"]);
        const businessResponse = Object.assign(Object.assign({ id: finalCustomer.id, displayName: finalCustomer.companyName, companyName: finalCustomer.companyName, name: finalCustomer.companyName, legalName: finalCustomer.legalName, customerNumber: finalCustomer.customerNumber, companyLabelPrintLogo: finalCustomer.companyLabelPrintLogo, asanaLink: finalCustomer.asanaLink, email: finalCustomer.email, contactEmail: finalCustomer.contactEmail, contactPhoneNumber: finalCustomer.contactPhoneNumber, stage: finalCustomer.stage }, businessDetailsWithoutId), { address: (_a = finalCustomer.businessDetails) === null || _a === void 0 ? void 0 : _a.address, street: (_b = finalCustomer.businessDetails) === null || _b === void 0 ? void 0 : _b.address, addressAdditional: finalCustomer.addressLine2, note: (_c = finalCustomer.businessDetails) === null || _c === void 0 ? void 0 : _c.description, starBusinessDetails: finalCustomer.starBusinessDetails
                ? {
                    inSeries: finalCustomer.starBusinessDetails.inSeries,
                    madeIn: finalCustomer.starBusinessDetails.madeIn,
                    device: finalCustomer.starBusinessDetails.device,
                    industry: finalCustomer.starBusinessDetails.industry,
                    converted_timestamp: finalCustomer.starBusinessDetails.converted_timestamp,
                    convertedBy: finalCustomer.starBusinessDetails.convertedBy
                        ? {
                            id: finalCustomer.starBusinessDetails.convertedBy.id,
                            name: finalCustomer.starBusinessDetails.convertedBy.name,
                            email: finalCustomer.starBusinessDetails.convertedBy.email,
                        }
                        : undefined,
                }
                : undefined, defaultList: defaultList
                ? {
                    id: defaultList.id,
                    name: defaultList.name,
                }
                : undefined, website: (_d = finalCustomer.businessDetails) === null || _d === void 0 ? void 0 : _d.website, hasWebsite: !!((_e = finalCustomer.businessDetails) === null || _e === void 0 ? void 0 : _e.website), phoneNumber: (_f = finalCustomer.businessDetails) === null || _f === void 0 ? void 0 : _f.contactPhone, phone: (_g = finalCustomer.businessDetails) === null || _g === void 0 ? void 0 : _g.contactPhone, businessEmail: (_h = finalCustomer.businessDetails) === null || _h === void 0 ? void 0 : _h.email, status: exports.BUSINESS_STATUS.ACTIVE, source: (_j = finalCustomer.businessDetails) === null || _j === void 0 ? void 0 : _j.businessSource, isDeviceMaker: (_k = finalCustomer.businessDetails) === null || _k === void 0 ? void 0 : _k.isDeviceMaker, isStarCustomer: !!finalCustomer.starCustomerDetails, vatTaxId: finalCustomer.vatTaxId, debtor_no: finalCustomer.debtor_no, default_tax_profile_id: finalCustomer.default_tax_profile_id, vat_id_status: finalCustomer.vat_id_status, vat_id_checked_at: finalCustomer.vat_id_checked_at, vat_id_check_source: finalCustomer.vat_id_check_source, vat_id_check_response_json: finalCustomer.vat_id_check_response_json, createdAt: finalCustomer.createdAt, updatedAt: finalCustomer.updatedAt });
        let successMessage = "Business created successfully";
        if (isStarCustomer) {
            successMessage =
                "Star Customer created successfully. Welcome email sent with credentials.";
        }
        else if (shouldBeStarBusiness) {
            successMessage =
                "Star Business created automatically (Device Maker: Yes, In Series: Yes, Made In provided).";
        }
        else if (isDeviceMaker === "Yes") {
            successMessage = "Star Business (Device Maker) created successfully.";
        }
        return res.status(201).json({
            success: true,
            message: successMessage,
            data: businessResponse,
        });
    }
    catch (error) {
        console.error("Error creating business:", error);
        return next(new errorHandler_1.default("Error creating business: " + error.message, 500));
    }
});
exports.createBusiness = createBusiness;
const updateBusiness = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    try {
        const { id } = req.params;
        const updateData = req.body;
        const { displayName, name, customerNumber, companyLabelPrintLogo, contactEmail, contactPhoneNumber, isDeviceMaker, isStarCustomer, starCustomerEmail, starBusinessDetails, street, addressAdditional, phone, vatTaxId, asanaLink, debtor_no, default_tax_profile_id, vat_id_status, } = updateData;
        const user = req.user;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const customer = yield customerRepository.findOne({
            where: { id },
            relations: [
                "businessDetails",
                "businessDetails.check_by",
                "starBusinessDetails",
                "starBusinessDetails.convertedBy",
                "starCustomerDetails",
            ],
        });
        if (!customer) {
            return next(new errorHandler_1.default("Business not found", 404));
        }
        const currentIsDeviceMaker = (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.isDeviceMaker;
        const isDeviceMakerChanged = isDeviceMaker !== undefined && isDeviceMaker !== currentIsDeviceMaker;
        const currentIsStarCustomer = !!customer.starCustomerDetails;
        const isStarCustomerChanged = isStarCustomer !== undefined && isStarCustomer !== currentIsStarCustomer;
        const shouldBeStarBusiness = (isDeviceMaker === "Yes" || currentIsDeviceMaker === "Yes") &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.inSeries) === true &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.madeIn);
        if (isStarCustomer &&
            isDeviceMaker !== "Yes" &&
            ((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.isDeviceMaker) !== "Yes") {
            return next(new errorHandler_1.default("Star Customer can only be created when device maker is Yes", 400));
        }
        if (isStarCustomer && !currentIsStarCustomer && !starCustomerEmail) {
            return next(new errorHandler_1.default("Email is required for Star Customer account", 400));
        }
        const emailToCheck = isStarCustomer ? starCustomerEmail : updateData.email;
        if (emailToCheck && emailToCheck !== customer.email) {
            const existingCustomer = yield customerRepository.findOne({
                where: { email: emailToCheck.trim().toLowerCase() },
            });
            if (existingCustomer && existingCustomer.id !== id) {
                return next(new errorHandler_1.default("A business with this email already exists", 400));
            }
        }
        const newCompanyName = name !== undefined
            ? name.trim()
            : displayName !== undefined
                ? displayName.trim()
                : undefined;
        if (newCompanyName !== undefined &&
            newCompanyName !== customer.companyName) {
            const existingCustomerWithName = yield customerRepository
                .createQueryBuilder("customer")
                .where("LOWER(customer.companyName) = LOWER(:companyName)", {
                companyName: newCompanyName,
            })
                .getOne();
            if (existingCustomerWithName && existingCustomerWithName.id !== id) {
                return next(new errorHandler_1.default("A business with this display name already exists", 400));
            }
        }
        if (customerNumber !== undefined) {
            const trimmedCustomerNumber = customerNumber ? customerNumber.trim() : "";
            if (trimmedCustomerNumber &&
                trimmedCustomerNumber !== customer.customerNumber) {
                const existingCustomerWithNumber = yield customerRepository
                    .createQueryBuilder("customer")
                    .where("customer.customerNumber = :customerNumber", {
                    customerNumber: trimmedCustomerNumber,
                })
                    .getOne();
                if (existingCustomerWithNumber &&
                    existingCustomerWithNumber.id !== id) {
                    return next(new errorHandler_1.default("A business with this customer number already exists", 400));
                }
            }
        }
        if (updateData.website !== undefined &&
            updateData.website !== ((_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.website)) {
            const normalizedWebsite = updateData.website
                ? normalizeWebsite(updateData.website)
                : null;
            if (normalizedWebsite) {
                const existingBusinessWithWebsite = yield businessDetailsRepository
                    .createQueryBuilder("businessDetails")
                    .leftJoinAndSelect("businessDetails.customer", "cust")
                    .where("businessDetails.website = :website", {
                    website: normalizedWebsite,
                })
                    .getOne();
                if (existingBusinessWithWebsite &&
                    ((_d = existingBusinessWithWebsite.customer) === null || _d === void 0 ? void 0 : _d.id) !== id) {
                    return next(new errorHandler_1.default("A business with this website already exists", 400));
                }
            }
        }
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            if (name !== undefined) {
                customer.companyName = name.trim();
            }
            else if (displayName !== undefined) {
                customer.companyName = displayName.trim();
            }
            if (updateData.companyName !== undefined) {
                customer.legalName = updateData.companyName.trim();
            }
            if (customerNumber !== undefined) {
                customer.customerNumber =
                    customerNumber && customerNumber.trim()
                        ? customerNumber.trim()
                        : undefined;
            }
            if (companyLabelPrintLogo !== undefined) {
                customer.companyLabelPrintLogo =
                    companyLabelPrintLogo && companyLabelPrintLogo.trim()
                        ? companyLabelPrintLogo.trim()
                        : undefined;
            }
            if (contactEmail !== undefined) {
                customer.contactEmail = contactEmail.trim()
                    ? contactEmail.trim().toLowerCase()
                    : undefined;
            }
            if (contactPhoneNumber !== undefined) {
                customer.contactPhoneNumber = contactPhoneNumber.trim();
            }
            else if (phone !== undefined) {
                customer.contactPhoneNumber = phone ? phone.trim() : undefined;
            }
            if (vatTaxId !== undefined) {
                customer.vatTaxId = vatTaxId ? vatTaxId.trim() : undefined;
            }
            if (debtor_no !== undefined) {
                customer.debtor_no = debtor_no ? debtor_no.trim() : undefined;
            }
            if (default_tax_profile_id !== undefined) {
                customer.default_tax_profile_id = default_tax_profile_id || undefined;
            }
            if (vat_id_status !== undefined) {
                customer.vat_id_status = vat_id_status || "unchecked";
            }
            if (asanaLink !== undefined) {
                customer.asanaLink = asanaLink ? asanaLink.trim() : null;
            }
            if (addressAdditional !== undefined) {
                customer.addressLine2 = addressAdditional ? addressAdditional.trim() : undefined;
            }
            if (customer.businessDetails) {
                const businessDetails = customer.businessDetails;
                if (street !== undefined) {
                    businessDetails.address = street ? street.trim() : undefined;
                }
                else if (updateData.address !== undefined) {
                    businessDetails.address = updateData.address.trim();
                }
                if (updateData.website !== undefined) {
                    businessDetails.website = updateData.website
                        ? normalizeWebsite(updateData.website)
                        : undefined;
                }
                if (updateData.description !== undefined)
                    businessDetails.description = updateData.description.trim();
                if (updateData.note !== undefined) {
                    const trimmedNote = String((_a = updateData.note) !== null && _a !== void 0 ? _a : "").trim();
                    businessDetails.description = trimmedNote ? trimmedNote : "";
                }
                if (updateData.city !== undefined)
                    businessDetails.city = updateData.city.trim();
                if (updateData.state !== undefined)
                    businessDetails.state = updateData.state.trim();
                if (updateData.country !== undefined) {
                    const countryStr = updateData.country.trim();
                    businessDetails.country = countryStr;
                    const countryRepo = database_1.AppDataSource.getRepository(country_1.Country);
                    const matched = yield countryRepo.findOne({
                        where: [
                            { iso2: countryStr.toUpperCase() },
                            { name: countryStr }
                        ]
                    });
                    if (matched) {
                        customer.country_id = matched.id;
                        businessDetails.country_id = matched.id;
                    }
                    else {
                        customer.country_id = null;
                        businessDetails.country_id = null;
                    }
                }
                if (updateData.postalCode !== undefined)
                    businessDetails.postalCode = updateData.postalCode.trim();
                if (updateData.latitude !== undefined)
                    businessDetails.latitude = sanitizeNumber(updateData.latitude);
                if (updateData.longitude !== undefined)
                    businessDetails.longitude = sanitizeNumber(updateData.longitude);
                if (phone !== undefined) {
                    businessDetails.contactPhone = phone ? phone.trim() : undefined;
                }
                else if (updateData.phoneNumber !== undefined) {
                    businessDetails.contactPhone = updateData.phoneNumber.trim();
                }
                if (updateData.email !== undefined) {
                    const trimmedEmail = updateData.email.trim()
                        ? updateData.email.trim().toLowerCase()
                        : undefined;
                    businessDetails.email = trimmedEmail;
                    customer.email = trimmedEmail;
                }
                if (updateData.googleMapsUrl !== undefined)
                    businessDetails.googleMapsUrl = updateData.googleMapsUrl.trim();
                if (updateData.category !== undefined)
                    businessDetails.category = updateData.category.trim();
                if (updateData.additionalCategories !== undefined)
                    businessDetails.additionalCategories =
                        updateData.additionalCategories;
                if (isDeviceMaker !== undefined) {
                    businessDetails.isDeviceMaker = isDeviceMaker;
                    businessDetails.check_timestamp = new Date();
                    businessDetails.check_by = user;
                }
                yield transactionalEntityManager.save(business_details_1.BusinessDetails, businessDetails);
            }
            if ((isDeviceMaker === "Yes" || shouldBeStarBusiness) &&
                !customer.starBusinessDetails) {
                const starBusiness = new star_business_details_1.StarBusinessDetails();
                if (starBusinessDetails) {
                    starBusiness.inSeries = starBusinessDetails.inSeries || false;
                    starBusiness.madeIn = starBusinessDetails.madeIn || undefined;
                    starBusiness.device = starBusinessDetails.device || undefined;
                    starBusiness.industry = starBusinessDetails.industry || undefined;
                }
                starBusiness.converted_timestamp = new Date();
                starBusiness.convertedBy = user;
                starBusiness.customer = customer;
                const savedStarBusiness = yield transactionalEntityManager.save(star_business_details_1.StarBusinessDetails, starBusiness);
                customer.starBusinessDetails = savedStarBusiness;
            }
            else if (customer.starBusinessDetails && starBusinessDetails) {
                Object.assign(customer.starBusinessDetails, starBusinessDetails);
                yield transactionalEntityManager.save(star_business_details_1.StarBusinessDetails, customer.starBusinessDetails);
            }
            let tempPassword;
            let defaultList;
            if (isStarCustomer && !customer.starCustomerDetails) {
                const starCustomerDetails = new star_customer_details_1.StarCustomerDetails();
                tempPassword = generateTempPassword();
                starCustomerDetails.password = yield bcryptjs_1.default.hash(tempPassword, 10);
                if (customer.businessDetails) {
                    starCustomerDetails.deliveryPostalCode =
                        customer.businessDetails.postalCode || "";
                    starCustomerDetails.deliveryCity =
                        customer.businessDetails.city || "";
                    starCustomerDetails.deliveryCountry =
                        customer.businessDetails.country || "Germany";
                }
                starCustomerDetails.customer = customer;
                const savedStarCustomerDetails = yield transactionalEntityManager.save(star_customer_details_1.StarCustomerDetails, starCustomerDetails);
                customer.starCustomerDetails = savedStarCustomerDetails;
                defaultList = new list_1.List();
                defaultList.name = `Default`;
                defaultList.description = `Default list for ${customer.companyName}`;
                defaultList.customer = customer;
                defaultList.status = list_1.LIST_STATUS.ACTIVE;
                defaultList = yield transactionalEntityManager.save(list_1.List, defaultList);
                customer.email = starCustomerEmail.trim().toLowerCase();
                customer.contactEmail = starCustomerEmail.trim().toLowerCase();
            }
            if (isStarCustomer) {
                customer.stage = "star_customer";
            }
            else if (shouldBeStarBusiness) {
                customer.stage = customer.starCustomerDetails
                    ? "star_customer"
                    : "star_business";
            }
            else if (isDeviceMaker === "Yes" ||
                ((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.isDeviceMaker) === "Yes") {
                customer.stage = customer.starCustomerDetails
                    ? "star_customer"
                    : "star_business";
            }
            else {
                customer.stage = "business";
            }
            yield transactionalEntityManager.save(customers_1.Customer, customer);
            return {
                customer,
                tempPassword,
                defaultList,
                isDeviceMakerChanged,
                isStarCustomerChanged,
                shouldBeStarBusiness,
            };
        }));
        const { tempPassword, defaultList, isDeviceMakerChanged: deviceMakerChanged, isStarCustomerChanged: starCustomerChanged, } = result;
        if (isStarCustomer && tempPassword) {
            const loginLink = `${process.env.STAR_URL}/login`;
            const portalLink = "https://stars.gtech.de/potis";
            const message = `
        <h2>Welcome to the GTech Star customer portal!</h2>
        <p>From now on, you have direct access to all your products as well as upcoming and completed deliveries.</p>
        <p>In read-only mode, you can see the complete overview and track the current status of your orders at any time – without any login required.</p>
        <p>Try it directly here: <a href="${portalLink}">${portalLink}</a></p>
        <p>This way you'll always stay informed – fast, clear, and reliable.</p>
        <p>Enjoy your access!</p>
        <p>Your GTech Team</p>
        <br>
        <p><strong>Your Account Has Been Upgraded to Star Customer</strong></p>
        <p><strong>Company Name:</strong> ${customer.companyName}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please login <a href="${loginLink}">here</a> to access your full account features and change your password.</p>
        ${defaultList
                ? `<p>A default list "${defaultList.name}" has been created for your company.</p>`
                : ""}
      `;
            yield (0, emailService_1.default)({
                to: customer.email,
                subject: "Welcome to the GTech Star Customer Portal!",
                html: message,
            });
        }
        const finalCustomer = yield customerRepository.findOne({
            where: { id },
            relations: [
                "businessDetails",
                "businessDetails.check_by",
                "starBusinessDetails",
                "starBusinessDetails.convertedBy",
                "starCustomerDetails",
                "tags",
            ],
        });
        if (!finalCustomer) {
            return next(new errorHandler_1.default("Business not found after update", 404));
        }
        const _q = finalCustomer.businessDetails || {}, { id: detailsId } = _q, businessDetailsWithoutId = __rest(_q, ["id"]);
        const businessResponse = Object.assign(Object.assign({ id: finalCustomer.id, displayName: finalCustomer.companyName, companyName: finalCustomer.companyName, name: finalCustomer.companyName, legalName: finalCustomer.legalName, customerNumber: finalCustomer.customerNumber, companyLabelPrintLogo: finalCustomer.companyLabelPrintLogo, asanaLink: finalCustomer.asanaLink, email: finalCustomer.email, contactEmail: finalCustomer.contactEmail, contactPhoneNumber: finalCustomer.contactPhoneNumber, stage: finalCustomer.stage }, businessDetailsWithoutId), { address: (_e = finalCustomer.businessDetails) === null || _e === void 0 ? void 0 : _e.address, street: (_f = finalCustomer.businessDetails) === null || _f === void 0 ? void 0 : _f.address, addressAdditional: finalCustomer.addressLine2, note: (_g = finalCustomer.businessDetails) === null || _g === void 0 ? void 0 : _g.description, vatTaxId: finalCustomer.vatTaxId, debtor_no: finalCustomer.debtor_no, default_tax_profile_id: finalCustomer.default_tax_profile_id, vat_id_status: finalCustomer.vat_id_status, vat_id_checked_at: finalCustomer.vat_id_checked_at, vat_id_check_source: finalCustomer.vat_id_check_source, vat_id_check_response_json: finalCustomer.vat_id_check_response_json, check_by: ((_h = finalCustomer.businessDetails) === null || _h === void 0 ? void 0 : _h.check_by)
                ? {
                    id: finalCustomer.businessDetails.check_by.id,
                    name: finalCustomer.businessDetails.check_by.name,
                    email: finalCustomer.businessDetails.check_by.email,
                }
                : undefined, starBusinessDetails: finalCustomer.starBusinessDetails
                ? {
                    inSeries: finalCustomer.starBusinessDetails.inSeries,
                    madeIn: finalCustomer.starBusinessDetails.madeIn,
                    lastChecked: finalCustomer.starBusinessDetails.lastChecked,
                    checkedBy: finalCustomer.starBusinessDetails.checkedBy,
                    device: finalCustomer.starBusinessDetails.device,
                    industry: finalCustomer.starBusinessDetails.industry,
                    converted_timestamp: finalCustomer.starBusinessDetails.converted_timestamp,
                    convertedBy: finalCustomer.starBusinessDetails.convertedBy
                        ? {
                            id: finalCustomer.starBusinessDetails.convertedBy.id,
                            name: finalCustomer.starBusinessDetails.convertedBy.name,
                            email: finalCustomer.starBusinessDetails.convertedBy.email,
                        }
                        : undefined,
                }
                : undefined, defaultList: defaultList
                ? {
                    id: defaultList.id,
                    name: defaultList.name,
                }
                : undefined, website: (_j = finalCustomer.businessDetails) === null || _j === void 0 ? void 0 : _j.website, hasWebsite: !!((_k = finalCustomer.businessDetails) === null || _k === void 0 ? void 0 : _k.website), phoneNumber: (_l = finalCustomer.businessDetails) === null || _l === void 0 ? void 0 : _l.contactPhone, phone: (_m = finalCustomer.businessDetails) === null || _m === void 0 ? void 0 : _m.contactPhone, businessEmail: (_o = finalCustomer.businessDetails) === null || _o === void 0 ? void 0 : _o.email, status: exports.BUSINESS_STATUS.ACTIVE, source: (_p = finalCustomer.businessDetails) === null || _p === void 0 ? void 0 : _p.businessSource, isStarCustomer: !!finalCustomer.starCustomerDetails, tags: finalCustomer.tags, tagOrder: finalCustomer.tagOrder, createdAt: finalCustomer.createdAt, updatedAt: finalCustomer.updatedAt });
        let successMessage = "Business updated successfully";
        if (isStarCustomer && tempPassword) {
            successMessage =
                "Business upgraded to Star Customer successfully. Welcome email sent with credentials.";
        }
        else if (shouldBeStarBusiness) {
            successMessage =
                "Business automatically promoted to Star Business (Device Maker: Yes, In Series: Yes, Made In provided).";
        }
        else if (deviceMakerChanged) {
            successMessage =
                "Business updated successfully. Device maker status changed.";
        }
        else if (starCustomerChanged) {
            successMessage =
                "Business updated successfully. Star customer status changed.";
        }
        return res.status(200).json({
            success: true,
            message: successMessage,
            data: businessResponse,
        });
    }
    catch (error) {
        console.error("Error updating business:", error);
        return next(new errorHandler_1.default("Error updating business: " + error.message, 500));
    }
});
exports.updateBusiness = updateBusiness;
const getBusinessById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    try {
        const { id } = req.params;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id },
            relations: [
                "businessDetails",
                "businessDetails.check_by",
                "starBusinessDetails",
                "starBusinessDetails.convertedBy",
                "starCustomerDetails",
                "tags",
            ],
        });
        if (!customer) {
            return next(new errorHandler_1.default("Business not found", 404));
        }
        const businessResponse = {
            id: customer.id,
            displayName: customer.companyName,
            legalName: customer.legalName,
            name: customer.companyName,
            customerNumber: customer.customerNumber,
            companyLabelPrintLogo: customer.companyLabelPrintLogo,
            asanaLink: customer.asanaLink,
            email: customer.email,
            contactEmail: customer.contactEmail,
            contactPhoneNumber: customer.contactPhoneNumber,
            stage: customer.stage,
            vatTaxId: customer.vatTaxId,
            debtor_no: customer.debtor_no,
            default_tax_profile_id: customer.default_tax_profile_id,
            vat_id_status: customer.vat_id_status,
            vat_id_checked_at: customer.vat_id_checked_at,
            vat_id_check_source: customer.vat_id_check_source,
            vat_id_check_response_json: customer.vat_id_check_response_json,
            businessDetails: customer.businessDetails
                ? Object.assign(Object.assign({}, customer.businessDetails), { check_by: customer.businessDetails.check_by
                        ? {
                            id: customer.businessDetails.check_by.id,
                            name: customer.businessDetails.check_by.name,
                            email: customer.businessDetails.check_by.email,
                        }
                        : undefined }) : undefined,
            starBusinessDetails: customer.starBusinessDetails
                ? {
                    id: customer.starBusinessDetails.id,
                    inSeries: customer.starBusinessDetails.inSeries,
                    madeIn: customer.starBusinessDetails.madeIn,
                    lastChecked: customer.starBusinessDetails.lastChecked,
                    checkedBy: customer.starBusinessDetails.checkedBy,
                    device: customer.starBusinessDetails.device,
                    industry: customer.starBusinessDetails.industry,
                    converted_timestamp: customer.starBusinessDetails.converted_timestamp,
                    convertedBy: customer.starBusinessDetails.convertedBy
                        ? {
                            id: customer.starBusinessDetails.convertedBy.id,
                            name: customer.starBusinessDetails.convertedBy.name,
                            email: customer.starBusinessDetails.convertedBy.email,
                        }
                        : undefined,
                    comment: customer.starBusinessDetails.comment,
                    createdAt: customer.starBusinessDetails.createdAt,
                    updatedAt: customer.starBusinessDetails.updatedAt,
                }
                : undefined,
            starCustomerDetails: customer.starCustomerDetails
                ? {
                    id: customer.starCustomerDetails.id,
                    taxNumber: customer.starCustomerDetails.taxNumber,
                    accountVerificationStatus: customer.starCustomerDetails.accountVerificationStatus,
                    isEmailVerified: customer.starCustomerDetails.isEmailVerified,
                    deliveryAddressLine1: customer.starCustomerDetails.deliveryAddressLine1,
                    deliveryPostalCode: customer.starCustomerDetails.deliveryPostalCode,
                    deliveryCity: customer.starCustomerDetails.deliveryCity,
                    deliveryCountry: customer.starCustomerDetails.deliveryCountry,
                    createdAt: customer.starCustomerDetails.createdAt,
                    updatedAt: customer.starCustomerDetails.updatedAt,
                }
                : undefined,
            website: (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.website,
            hasWebsite: !!((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.website),
            phoneNumber: (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.contactPhone,
            phone: (_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.contactPhone,
            businessEmail: (_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.email,
            address: (_f = customer.businessDetails) === null || _f === void 0 ? void 0 : _f.address,
            street: (_g = customer.businessDetails) === null || _g === void 0 ? void 0 : _g.address,
            addressAdditional: customer.addressLine2,
            city: (_h = customer.businessDetails) === null || _h === void 0 ? void 0 : _h.city,
            state: (_j = customer.businessDetails) === null || _j === void 0 ? void 0 : _j.state,
            country: (_k = customer.businessDetails) === null || _k === void 0 ? void 0 : _k.country,
            postalCode: (_l = customer.businessDetails) === null || _l === void 0 ? void 0 : _l.postalCode,
            latitude: (_m = customer.businessDetails) === null || _m === void 0 ? void 0 : _m.latitude,
            longitude: (_o = customer.businessDetails) === null || _o === void 0 ? void 0 : _o.longitude,
            googleMapsUrl: (_p = customer.businessDetails) === null || _p === void 0 ? void 0 : _p.googleMapsUrl,
            reviewCount: (_q = customer.businessDetails) === null || _q === void 0 ? void 0 : _q.reviewCount,
            category: (_r = customer.businessDetails) === null || _r === void 0 ? void 0 : _r.category,
            additionalCategories: (_s = customer.businessDetails) === null || _s === void 0 ? void 0 : _s.additionalCategories,
            socialMedia: (_t = customer.businessDetails) === null || _t === void 0 ? void 0 : _t.socialLinks,
            source: (_u = customer.businessDetails) === null || _u === void 0 ? void 0 : _u.businessSource,
            isDeviceMaker: (_v = customer.businessDetails) === null || _v === void 0 ? void 0 : _v.isDeviceMaker,
            isStarCustomer: (_w = customer.businessDetails) === null || _w === void 0 ? void 0 : _w.isStarCustomer,
            check_timestamp: (_x = customer.businessDetails) === null || _x === void 0 ? void 0 : _x.check_timestamp,
            note: (_y = customer.businessDetails) === null || _y === void 0 ? void 0 : _y.description,
            status: exports.BUSINESS_STATUS.ACTIVE,
            tags: customer.tags,
            tagOrder: customer.tagOrder,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        };
        return res.status(200).json({
            success: true,
            data: businessResponse,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getBusinessById = getBusinessById;
const sanitizeInteger = (value) => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
};
const sanitizeSocialLinks = (socialMedia) => {
    if (!socialMedia || typeof socialMedia !== "object") {
        return undefined;
    }
    const cleaned = {};
    let hasAnyValue = false;
    for (const [key, value] of Object.entries(socialMedia)) {
        if (value && typeof value === "string" && value.trim()) {
            cleaned[key] = value.trim();
            hasAnyValue = true;
        }
    }
    return hasAnyValue ? cleaned : undefined;
};
const getAllBusinesses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, postalCode, category, city, country, hasWebsite, status, source, minRating, maxRating, verified, sortBy = "createdAt", sortOrder = "DESC", tags, } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const queryBuilder = customerRepository
            .createQueryBuilder("customer")
            .leftJoinAndSelect("customer.businessDetails", "businessDetails")
            .leftJoinAndSelect("customer.tags", "tags");
        if (tags) {
            const tagIds = tags.split(",");
            const includeTagIds = tagIds
                .filter((id) => !id.startsWith("!"))
                .map((id) => id.trim());
            const excludeTagIds = tagIds
                .filter((id) => id.startsWith("!"))
                .map((id) => id.substring(1).trim());
            if (includeTagIds.length > 0) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("c.id")
                        .from(customers_1.Customer, "c")
                        .innerJoin("c.tags", "t")
                        .where("t.id IN (:...includeTagIds)")
                        .groupBy("c.id")
                        .having("COUNT(t.id) = :includeCount");
                    return `customer.id IN ${subQuery.getQuery()}`;
                });
                queryBuilder.setParameter("includeTagIds", includeTagIds);
                queryBuilder.setParameter("includeCount", includeTagIds.length);
            }
            if (excludeTagIds.length > 0) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("c.id")
                        .from(customers_1.Customer, "c")
                        .innerJoin("c.tags", "t")
                        .where("t.id IN (:...excludeTagIds)");
                    return `customer.id NOT IN ${subQuery.getQuery()}`;
                });
                queryBuilder.setParameter("excludeTagIds", excludeTagIds);
            }
        }
        if (search) {
            queryBuilder.andWhere("(customer.companyName LIKE :search OR customer.legalName LIKE :search OR customer.customerNumber LIKE :search OR customer.email LIKE :search OR businessDetails.description LIKE :search OR businessDetails.address LIKE :search OR businessDetails.email LIKE :search OR businessDetails.contactPhone LIKE :search)", { search: `%${search}%` });
        }
        if (postalCode) {
            queryBuilder.andWhere("businessDetails.postalCode = :postalCode", {
                postalCode: postalCode.toString().trim().toUpperCase(),
            });
        }
        if (category) {
            queryBuilder.andWhere("businessDetails.category = :category", {
                category,
            });
        }
        if (city) {
            queryBuilder.andWhere("businessDetails.city = :city", { city });
        }
        if (country) {
            queryBuilder.andWhere("businessDetails.country = :country", { country });
        }
        if (hasWebsite !== undefined) {
            const hasWebsiteBool = hasWebsite === "true";
            if (hasWebsiteBool) {
                queryBuilder.andWhere("businessDetails.website IS NOT NULL");
            }
            else {
                queryBuilder.andWhere("businessDetails.website IS NULL");
            }
        }
        if (source) {
            queryBuilder.andWhere("businessDetails.businessSource = :source", {
                source,
            });
        }
        if (minRating) {
            queryBuilder.andWhere("businessDetails.averageRating >= :minRating", {
                minRating: parseFloat(minRating),
            });
        }
        if (maxRating) {
            queryBuilder.andWhere("businessDetails.averageRating <= :maxRating", {
                maxRating: parseFloat(maxRating),
            });
        }
        if (verified !== undefined) {
            const verifiedBool = verified === "true";
            queryBuilder.andWhere("customer.isVerified = :verified", {
                verified: verifiedBool,
            });
        }
        const total = yield queryBuilder.getCount();
        const orderByField = sortBy === "name" ? "customer.companyName" : "customer.createdAt";
        const orderDirection = sortOrder === "ASC" ? "ASC" : "DESC";
        queryBuilder.orderBy(orderByField, orderDirection);
        const customers = yield queryBuilder.skip(skip).take(limitNum).getMany();
        const businesses = customers.map((customer) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            const _p = customer.businessDetails || {}, { id: businessId } = _p, businessDetailsWithoutId = __rest(_p, ["id"]);
            return Object.assign(Object.assign({ id: customer.id, companyName: customer.companyName, displayName: customer.companyName, legalName: customer.legalName, name: customer.companyName, customerNumber: customer.customerNumber, companyLabelPrintLogo: customer.companyLabelPrintLogo, asanaLink: customer.asanaLink, email: customer.email, contactEmail: customer.contactEmail, contactPhoneNumber: customer.contactPhoneNumber, stage: customer.stage }, businessDetailsWithoutId), { address: (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.address, street: (_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.address, addressAdditional: customer.addressLine2, city: (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.city, state: (_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.state, country: (_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.country, postalCode: (_f = customer.businessDetails) === null || _f === void 0 ? void 0 : _f.postalCode, website: (_g = customer.businessDetails) === null || _g === void 0 ? void 0 : _g.website, hasWebsite: !!((_h = customer.businessDetails) === null || _h === void 0 ? void 0 : _h.website), phoneNumber: (_j = customer.businessDetails) === null || _j === void 0 ? void 0 : _j.contactPhone, phone: (_k = customer.businessDetails) === null || _k === void 0 ? void 0 : _k.contactPhone, businessEmail: (_l = customer.businessDetails) === null || _l === void 0 ? void 0 : _l.email, note: (_m = customer.businessDetails) === null || _m === void 0 ? void 0 : _m.description, status: exports.BUSINESS_STATUS.ACTIVE, source: (_o = customer.businessDetails) === null || _o === void 0 ? void 0 : _o.businessSource, vatTaxId: customer.vatTaxId, debtor_no: customer.debtor_no, default_tax_profile_id: customer.default_tax_profile_id, vat_id_status: customer.vat_id_status, vat_id_checked_at: customer.vat_id_checked_at, vat_id_check_source: customer.vat_id_check_source, vat_id_check_response_json: customer.vat_id_check_response_json, tags: customer.tags, tagOrder: customer.tagOrder, createdAt: customer.createdAt, updatedAt: customer.updatedAt });
        });
        return res.status(200).json({
            success: true,
            data: {
                businesses,
                customers: businesses,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching businesses:", error);
        return next(new errorHandler_1.default("Failed to fetch businesses", 500));
    }
});
exports.getAllBusinesses = getAllBusinesses;
const bulkDeleteBusinesses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new errorHandler_1.default("Array of business IDs is required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const result = yield customerRepository.delete(ids);
        return res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.affected} businesses`,
            data: {
                deletedCount: result.affected,
            },
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to delete businesses", 500));
    }
});
exports.bulkDeleteBusinesses = bulkDeleteBusinesses;
const searchBusinessesByLocation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { latitude, longitude, radius = 10, limit = 20 } = req.query;
        if (!latitude || !longitude) {
            return next(new errorHandler_1.default("Latitude and longitude are required", 400));
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseFloat(radius);
        const lim = parseInt(limit);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customers = yield customerRepository
            .createQueryBuilder("customer")
            .leftJoinAndSelect("customer.businessDetails", "businessDetails")
            .where("customer.stage = :stage", { stage: "business" })
            .andWhere("businessDetails.latitude IS NOT NULL")
            .andWhere("businessDetails.longitude IS NOT NULL")
            .select([
            "customer",
            "businessDetails",
            `(6371 * acos(cos(radians(${lat})) * cos(radians(businessDetails.latitude)) * cos(radians(businessDetails.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(businessDetails.latitude)))) as distance`,
        ])
            .having("distance < :radius", { radius: rad })
            .orderBy("distance", "ASC")
            .limit(lim)
            .getRawMany();
        const businesses = customers.map((raw) => (Object.assign(Object.assign({ id: raw.customer_id, name: raw.customer_companyName, legalName: raw.customer_legalName, customerNumber: raw.customer_customerNumber, companyLabelPrintLogo: raw.customer_companyLabelPrintLogo, email: raw.customer_email, contactEmail: raw.customer_contactEmail, contactPhoneNumber: raw.customer_contactPhoneNumber, stage: raw.customer_stage }, raw.businessDetails), { distance: raw.distance, website: raw.businessDetails_website, hasWebsite: !!raw.businessDetails_website, phoneNumber: raw.businessDetails_contactPhone, businessEmail: raw.businessDetails_email, status: exports.BUSINESS_STATUS.ACTIVE, source: raw.businessDetails_businessSource, createdAt: raw.customer_createdAt, updatedAt: raw.customer_updatedAt })));
        return res.status(200).json({
            success: true,
            data: businesses,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to search businesses by location", 500));
    }
});
exports.searchBusinessesByLocation = searchBusinessesByLocation;
const getBusinessStatistics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        const totalBusinesses = yield customerRepository.count({
            where: { stage: "business" },
        });
        const businessesWithWebsite = yield businessDetailsRepository
            .createQueryBuilder("businessDetails")
            .innerJoin("businessDetails.customer", "customer")
            .where("customer.stage = :stage", { stage: "business" })
            .andWhere("businessDetails.website IS NOT NULL")
            .getCount();
        const businessesWithoutWebsite = yield businessDetailsRepository
            .createQueryBuilder("businessDetails")
            .innerJoin("businessDetails.customer", "customer")
            .where("customer.stage = :stage", { stage: "business" })
            .andWhere("businessDetails.website IS NULL")
            .getCount();
        const sourceCounts = yield businessDetailsRepository
            .createQueryBuilder("businessDetails")
            .innerJoin("businessDetails.customer", "customer")
            .select("businessDetails.businessSource, COUNT(*) as count")
            .where("customer.stage = :stage", { stage: "business" })
            .groupBy("businessDetails.businessSource")
            .orderBy("count", "DESC")
            .getRawMany();
        const countryCounts = yield businessDetailsRepository
            .createQueryBuilder("businessDetails")
            .innerJoin("businessDetails.customer", "customer")
            .select("businessDetails.country, COUNT(*) as count")
            .where("customer.stage = :stage", { stage: "business" })
            .andWhere("businessDetails.country IS NOT NULL")
            .groupBy("businessDetails.country")
            .orderBy("count", "DESC")
            .limit(10)
            .getRawMany();
        return res.status(200).json({
            success: true,
            data: {
                total: totalBusinesses,
                withWebsite: businessesWithWebsite,
                withoutWebsite: businessesWithoutWebsite,
                bySource: sourceCounts,
                topCountries: countryCounts,
            },
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to fetch statistics", 500));
    }
});
exports.getBusinessStatistics = getBusinessStatistics;
const bulkUpdateStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new errorHandler_1.default("Array of business IDs is required", 400));
        }
        return res.status(200).json({
            success: true,
            message: `Status update functionality needs to be mapped to new structure`,
            data: {
                updatedCount: 0,
            },
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to update business status", 500));
    }
});
exports.bulkUpdateStatus = bulkUpdateStatus;
function sanitizeIsDeviceMaker(value) {
    if (!value)
        return undefined;
    const stringValue = String(value).trim();
    if (["Yes", "No", "Unsure"].includes(stringValue)) {
        return stringValue;
    }
    return undefined;
}
const deleteBusiness = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id },
            relations: ["starBusinessDetails"],
        });
        if (!customer) {
            return next(new errorHandler_1.default("Business not found", 404));
        }
        if (customer.starBusinessDetails) {
            const starBusinessDetails = yield database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails).findOne({
                where: { id: customer.starBusinessDetails.id },
                relations: ["contactPersons", "requestedItems"],
            });
            if (starBusinessDetails) {
                if (((_a = starBusinessDetails.contactPersons) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                    return next(new errorHandler_1.default("Cannot delete business with associated contact persons", 400));
                }
                if (((_b = starBusinessDetails.requestedItems) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    return next(new errorHandler_1.default("Cannot delete business with associated item requests", 400));
                }
            }
        }
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        try {
            yield queryRunner.query("SET session_replication_role = replica;");
            yield queryRunner.query(`DELETE FROM list_creator WHERE "customerId" = $1`, [id]);
            yield queryRunner.query(`DELETE FROM customer WHERE id = $1`, [id]);
            yield queryRunner.query("SET session_replication_role = DEFAULT;");
            yield queryRunner.commitTransaction();
            return res.status(200).json({
                success: true,
                message: "Business deleted successfully",
            });
        }
        catch (error) {
            yield queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            yield queryRunner.release();
        }
    }
    catch (error) {
        console.error("Error deleting business:", error);
        return next(new errorHandler_1.default("Failed to delete business", 500));
    }
});
exports.deleteBusiness = deleteBusiness;
