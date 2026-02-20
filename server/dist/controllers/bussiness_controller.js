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
        // Validate input
        if (!businesses || !Array.isArray(businesses)) {
            return next(new errorHandler_1.default("Businesses array is required", 400));
        }
        if (businesses.length === 0) {
            return next(new errorHandler_1.default("Businesses array cannot be empty", 400));
        }
        console.log(`Starting bulk import of ${businesses.length} businesses from source: ${source}...`);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        // Initialize results tracking
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
        // Helper function to extract first word for companyName
        const extractFirstWord = (businessName) => {
            if (!businessName)
                return "";
            return businessName.split(" ")[0] || businessName;
        };
        // Batch check for existing businesses - more efficient
        const businessesToCheck = [];
        // First pass: validate and normalize all businesses
        for (let i = 0; i < businesses.length; i++) {
            const businessData = businesses[i];
            // Skip completely invalid entries
            if (!businessData.name || !businessData.address) {
                results.skippedInvalidData++;
                results.errorsList.push({
                    business: `Business at index ${i}`,
                    error: "Missing required fields: name and address are required",
                });
                continue;
            }
            // Normalize data for duplicate checking (only company name and website)
            const normalizedWebsite = businessData.website
                ? normalizeWebsite(businessData.website)
                : null;
            // Use first word for duplicate checking of company names
            const companyNameFirstWord = extractFirstWord(businessData.name);
            const normalizedCompanyName = companyNameFirstWord.trim().toLowerCase();
            businessesToCheck.push({
                index: i,
                data: businessData,
                normalizedWebsite,
                normalizedCompanyName,
            });
        }
        // Batch query for existing businesses to check duplicates efficiently
        const existingBusinessesByWebsite = new Map();
        const existingBusinessesByName = new Map();
        // Get all unique websites and names to check
        const websitesToCheck = businessesToCheck
            .filter((b) => b.normalizedWebsite)
            .map((b) => b.normalizedWebsite);
        // Use first words for name checking
        const namesToCheck = businessesToCheck.map((b) => b.normalizedCompanyName);
        // Query existing businesses by website
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
        // Query existing customers by company name (using first word matching)
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
        // Process each business and separate duplicates from new entries
        const customersToSave = [];
        const seenInBatch = {
            websites: new Set(),
            names: new Set(),
        };
        for (const businessToCheck of businessesToCheck) {
            const { index, data: businessData, normalizedWebsite, normalizedCompanyName, } = businessToCheck;
            let duplicateReason = "";
            let existingRecord = null;
            // Check for duplicates in current batch
            if (normalizedWebsite && seenInBatch.websites.has(normalizedWebsite)) {
                duplicateReason = "Duplicate website in current batch";
            }
            else if (seenInBatch.names.has(normalizedCompanyName)) {
                duplicateReason = "Duplicate company name in current batch";
            }
            // Check against existing database records
            if (!duplicateReason) {
                // Check by website
                if (normalizedWebsite &&
                    existingBusinessesByWebsite.has(normalizedWebsite)) {
                    duplicateReason = "Website already exists in database";
                    existingRecord = existingBusinessesByWebsite.get(normalizedWebsite);
                }
                // Check by company name (first word)
                else if (existingBusinessesByName.has(normalizedCompanyName)) {
                    duplicateReason = "Company name already exists in database";
                    existingRecord = existingBusinessesByName.get(normalizedCompanyName);
                }
            }
            // If duplicate found, add to results and skip
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
                // Create new customer entity
                const customer = new customers_1.Customer();
                // Assign complete business name to legalName and first word to companyName
                const completeBusinessName = businessData.name.trim();
                const companyNameFirstWord = extractFirstWord(completeBusinessName);
                // Required fields for Customer
                customer.legalName = completeBusinessName; // Complete business name
                customer.companyName = companyNameFirstWord; // First word only
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
                // Optional fields for Customer
                customer.avatar = businessData.avatar
                    ? businessData.avatar.trim()
                    : undefined;
                // Create BusinessDetails
                const businessDetails = new business_details_1.BusinessDetails();
                // Map business data to BusinessDetails
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
                // Handle category tags if provided
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
                // Add to batch tracking (only website and company name)
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
        // Save all non-duplicate customers
        if (customersToSave.length > 0) {
            try {
                console.log(`Attempting to save ${customersToSave.length} new businesses to database...`);
                // Save in chunks to avoid parameter limits
                const CHUNK_SIZE = 50;
                const savedCustomers = [];
                for (let i = 0; i < customersToSave.length; i += CHUNK_SIZE) {
                    const chunk = customersToSave.slice(i, i + CHUNK_SIZE);
                    console.log(`Saving chunk ${Math.floor(i / CHUNK_SIZE) + 1} with ${chunk.length} businesses`);
                    try {
                        const savedChunk = yield customerRepository.save(chunk);
                        savedCustomers.push(...savedChunk);
                        // Add saved businesses to results
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
                        // Try to save individually to identify specific problematic records
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
        // Always return success with detailed results
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
    var _a, _b, _c, _d, _e, _f;
    try {
        const { 
        // Names from frontend - PROPER MAPPING
        displayName, // Frontend display name -> maps to DB companyName (what customers see)
        companyName, // Frontend legal name -> maps to DB legalName (legal registered name)
        name, // Legacy support
        // Address fields
        address, website, description, city, state, country = "Germany", postalCode, latitude, longitude, 
        // Contact fields
        phoneNumber, email, contactEmail, contactPhoneNumber, 
        // Business metadata
        googleMapsUrl, reviewCount, category, additionalCategories, socialMedia, source = exports.BUSINESS_SOURCE.MANUAL, isDeviceMaker, starBusinessDetails, 
        // Star Customer specific fields
        isStarCustomer, starCustomerEmail, } = req.body;
        // Get current user from request
        const user = req.user;
        // FIELD MAPPING: Frontend to Database
        // displayName (frontend) -> companyName (DB) - this is what customers see
        const dbCompanyName = displayName || name; // fallback to name for backward compatibility
        // companyName (frontend) -> legalName (DB) - this is the legal registered name
        const dbLegalName = companyName;
        const finalEmail = email;
        // Required field validation
        if (!dbCompanyName) {
            return next(new errorHandler_1.default("Business display name is required", 400));
        }
        if (!postalCode) {
            return next(new errorHandler_1.default("Postal code is required", 400));
        }
        if (!city) {
            return next(new errorHandler_1.default("City is required", 400));
        }
        if (!website) {
            return next(new errorHandler_1.default("Website is required", 400));
        }
        if (!source) {
            return next(new errorHandler_1.default("Source is required", 400));
        }
        if (!isDeviceMaker || !["Yes", "No", "Unsure"].includes(isDeviceMaker)) {
            return next(new errorHandler_1.default("Please specify if this is a device maker (Yes/No/Unsure)", 400));
        }
        // Star Customer validation
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
        // Normalize website for comparison
        const normalizedWebsite = website ? normalizeWebsite(website) : null;
        // Check for duplicate website
        if (normalizedWebsite) {
            const existingBusinessWithWebsite = yield businessDetailsRepository
                .createQueryBuilder("businessDetails")
                .leftJoinAndSelect("businessDetails.customer", "customer")
                .where("businessDetails.website = :website", {
                website: normalizedWebsite,
            })
                .getOne();
            if (existingBusinessWithWebsite) {
                return next(new errorHandler_1.default("A business with this website already exists", 400));
            }
        }
        // Check for duplicate display name (stored in companyName field)
        const trimmedDisplayName = dbCompanyName.trim();
        const existingCustomerWithName = yield customerRepository
            .createQueryBuilder("customer")
            .where("LOWER(customer.companyName) = LOWER(:companyName)", {
            companyName: trimmedDisplayName,
        })
            .getOne();
        if (existingCustomerWithName) {
            return next(new errorHandler_1.default("A business with this display name already exists", 400));
        }
        // Check for duplicate email
        const emailToCheck = isStarCustomer ? starCustomerEmail : finalEmail;
        if (emailToCheck) {
            const existingCustomerWithEmail = yield customerRepository.findOne({
                where: { email: emailToCheck.trim().toLowerCase() },
            });
            if (existingCustomerWithEmail) {
                return next(new errorHandler_1.default("A business with this email already exists", 400));
            }
        }
        // AUTOMATIC STAGE DETERMINATION LOGIC
        // Check if conditions are met for automatic star_business stage
        const shouldBeStarBusiness = isDeviceMaker === "Yes" &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.inSeries) === true &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.madeIn);
        // Use transaction to ensure all entities are created together
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            // Create Customer entity with PROPER FIELD MAPPING
            const customer = new customers_1.Customer();
            // IMPORTANT: displayName from frontend goes to companyName in DB
            customer.companyName = trimmedDisplayName;
            // IMPORTANT: companyName from frontend goes to legalName in DB
            customer.legalName = dbLegalName ? dbLegalName.trim() : undefined;
            // Set customer stage and email - UPDATED LOGIC
            if (isStarCustomer) {
                customer.stage = "star_customer";
                customer.email = starCustomerEmail.trim().toLowerCase();
                customer.contactEmail = starCustomerEmail.trim().toLowerCase();
            }
            else if (shouldBeStarBusiness) {
                // AUTOMATIC PROMOTION TO STAR BUSINESS
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
                : phoneNumber
                    ? phoneNumber.trim()
                    : undefined;
            // Save customer first
            const savedCustomer = yield transactionalEntityManager.save(customers_1.Customer, customer);
            // Create BusinessDetails
            const businessDetails = new business_details_1.BusinessDetails();
            businessDetails.businessSource = source;
            businessDetails.isDeviceMaker = isDeviceMaker;
            businessDetails.address = address ? address.trim() : undefined;
            businessDetails.website = normalizedWebsite || undefined;
            businessDetails.description = description
                ? description.trim()
                : undefined;
            businessDetails.city = city.trim();
            businessDetails.state = state ? state.trim() : undefined;
            businessDetails.country = country ? country.trim() : undefined;
            businessDetails.postalCode = postalCode.trim();
            businessDetails.latitude = sanitizeNumber(latitude);
            businessDetails.longitude = sanitizeNumber(longitude);
            businessDetails.contactPhone = phoneNumber
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
            // Create StarBusinessDetails if device maker is "Yes" OR if conditions are met for automatic promotion
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
            // Create StarCustomerDetails if this is a star customer
            let tempPassword;
            let defaultList;
            if (isStarCustomer) {
                const starCustomer = new star_customer_details_1.StarCustomerDetails();
                // Generate temporary password
                tempPassword = generateTempPassword();
                starCustomer.password = yield bcryptjs_1.default.hash(tempPassword, 10);
                // Set delivery address from business details
                starCustomer.deliveryPostalCode = businessDetails.postalCode || "";
                starCustomer.deliveryCity = businessDetails.city || "";
                starCustomer.deliveryCountry = businessDetails.country || "Germany";
                starCustomer.customer = savedCustomer;
                const savedStarCustomer = yield transactionalEntityManager.save(star_customer_details_1.StarCustomerDetails, starCustomer);
                savedCustomer.starCustomerDetails = savedStarCustomer;
                // Create default list for star customer
                defaultList = new list_1.List();
                defaultList.name = `Default`;
                defaultList.description = `Default list for ${savedCustomer.companyName}`;
                defaultList.customer = savedCustomer;
                defaultList.status = list_1.LIST_STATUS.ACTIVE;
                defaultList = yield transactionalEntityManager.save(list_1.List, defaultList);
            }
            // Update customer with relationships
            savedCustomer.businessDetails = savedBusinessDetails;
            yield transactionalEntityManager.save(customers_1.Customer, savedCustomer);
            return {
                customer: savedCustomer,
                businessDetails: savedBusinessDetails,
                tempPassword,
                defaultList,
                shouldBeStarBusiness, // Return this flag for response message
            };
        }));
        const { customer, businessDetails, tempPassword, defaultList } = result;
        // Send email if this is a star customer - USING ALISHA'S PROPOSED TEXT
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
        // Fetch complete customer with all relations
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
        // RETURN RESPONSE WITH PROPER FIELD MAPPING
        const businessResponse = Object.assign(Object.assign({ id: finalCustomer.id, 
            // IMPORTANT: Map DB fields back to frontend expected fields
            displayName: finalCustomer.companyName, companyName: finalCustomer.legalName, 
            // Legacy field support
            name: finalCustomer.companyName, legalName: finalCustomer.legalName, 
            // Contact information
            email: finalCustomer.email, contactEmail: finalCustomer.contactEmail, contactPhoneNumber: finalCustomer.contactPhoneNumber, stage: finalCustomer.stage }, finalCustomer.businessDetails), { 
            // Star business details if present
            starBusinessDetails: finalCustomer.starBusinessDetails
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
                : undefined, 
            // Default list if created
            defaultList: defaultList
                ? {
                    id: defaultList.id,
                    name: defaultList.name,
                }
                : undefined, 
            // Backward compatibility fields
            website: (_a = finalCustomer.businessDetails) === null || _a === void 0 ? void 0 : _a.website, hasWebsite: !!((_b = finalCustomer.businessDetails) === null || _b === void 0 ? void 0 : _b.website), phoneNumber: (_c = finalCustomer.businessDetails) === null || _c === void 0 ? void 0 : _c.contactPhone, businessEmail: (_d = finalCustomer.businessDetails) === null || _d === void 0 ? void 0 : _d.email, status: exports.BUSINESS_STATUS.ACTIVE, source: (_e = finalCustomer.businessDetails) === null || _e === void 0 ? void 0 : _e.businessSource, isDeviceMaker: (_f = finalCustomer.businessDetails) === null || _f === void 0 ? void 0 : _f.isDeviceMaker, isStarCustomer: !!finalCustomer.starCustomerDetails, createdAt: finalCustomer.createdAt, updatedAt: finalCustomer.updatedAt });
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { id } = req.params;
        const updateData = req.body;
        const { displayName, name, contactEmail, contactPhoneNumber, isDeviceMaker, isStarCustomer, starCustomerEmail, starBusinessDetails, } = updateData;
        const user = req.user;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        // Fetch existing customer with all relations
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
        // Check if device maker status is changing
        const currentIsDeviceMaker = (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.isDeviceMaker;
        const isDeviceMakerChanged = isDeviceMaker !== undefined && isDeviceMaker !== currentIsDeviceMaker;
        // Check if star customer status is changing
        const currentIsStarCustomer = !!customer.starCustomerDetails;
        const isStarCustomerChanged = isStarCustomer !== undefined && isStarCustomer !== currentIsStarCustomer;
        // AUTOMATIC STAGE DETERMINATION LOGIC FOR UPDATE
        // Check if conditions are met for automatic star_business stage
        const shouldBeStarBusiness = (isDeviceMaker === "Yes" || currentIsDeviceMaker === "Yes") &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.inSeries) === true &&
            (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.madeIn);
        // Validate star customer requirements
        if (isStarCustomer &&
            isDeviceMaker !== "Yes" &&
            ((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.isDeviceMaker) !== "Yes") {
            return next(new errorHandler_1.default("Star Customer can only be created when device maker is Yes", 400));
        }
        if (isStarCustomer && !currentIsStarCustomer && !starCustomerEmail) {
            return next(new errorHandler_1.default("Email is required for Star Customer account", 400));
        }
        // Check for duplicate email if updating
        const emailToCheck = isStarCustomer ? starCustomerEmail : updateData.email;
        if (emailToCheck && emailToCheck !== customer.email) {
            const existingCustomer = yield customerRepository.findOne({
                where: { email: emailToCheck.trim().toLowerCase() },
            });
            if (existingCustomer && existingCustomer.id !== id) {
                return next(new errorHandler_1.default("A business with this email already exists", 400));
            }
        }
        // Update in transaction
        const result = yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Update Customer entity with PROPER FIELD MAPPING
            if (displayName !== undefined) {
                // IMPORTANT: displayName from frontend goes to companyName in DB
                customer.companyName = displayName.trim();
            }
            if (name !== undefined) {
                // IMPORTANT: companyName from frontend goes to legalName in DB
                customer.legalName = name.trim();
            }
            if (contactEmail !== undefined) {
                customer.contactEmail = contactEmail.trim().toLowerCase();
            }
            if (contactPhoneNumber !== undefined) {
                customer.contactPhoneNumber = contactPhoneNumber.trim();
            }
            // Update BusinessDetails
            if (customer.businessDetails) {
                const businessDetails = customer.businessDetails;
                // Update fields from updateData
                if (updateData.address !== undefined)
                    businessDetails.address = updateData.address.trim();
                if (updateData.website !== undefined) {
                    businessDetails.website = updateData.website
                        ? normalizeWebsite(updateData.website)
                        : undefined;
                }
                if (updateData.description !== undefined)
                    businessDetails.description = updateData.description.trim();
                if (updateData.city !== undefined)
                    businessDetails.city = updateData.city.trim();
                if (updateData.state !== undefined)
                    businessDetails.state = updateData.state.trim();
                if (updateData.country !== undefined)
                    businessDetails.country = updateData.country.trim();
                if (updateData.postalCode !== undefined)
                    businessDetails.postalCode = updateData.postalCode.trim();
                if (updateData.latitude !== undefined)
                    businessDetails.latitude = sanitizeNumber(updateData.latitude);
                if (updateData.longitude !== undefined)
                    businessDetails.longitude = sanitizeNumber(updateData.longitude);
                if (updateData.phoneNumber !== undefined)
                    businessDetails.contactPhone = updateData.phoneNumber.trim();
                if (updateData.email !== undefined)
                    businessDetails.email = updateData.email.trim().toLowerCase();
                if (updateData.googleMapsUrl !== undefined)
                    businessDetails.googleMapsUrl = updateData.googleMapsUrl.trim();
                if (updateData.category !== undefined)
                    businessDetails.category = updateData.category.trim();
                if (updateData.additionalCategories !== undefined)
                    businessDetails.additionalCategories =
                        updateData.additionalCategories;
                // Update device maker status
                if (isDeviceMaker !== undefined) {
                    businessDetails.isDeviceMaker = isDeviceMaker;
                    businessDetails.check_timestamp = new Date();
                    businessDetails.check_by = user;
                }
                yield transactionalEntityManager.save(business_details_1.BusinessDetails, businessDetails);
            }
            // Handle StarBusinessDetails updates
            if ((isDeviceMaker === "Yes" || shouldBeStarBusiness) &&
                !customer.starBusinessDetails) {
                // Create new star business details
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
                // Update existing star business details
                Object.assign(customer.starBusinessDetails, starBusinessDetails);
                yield transactionalEntityManager.save(star_business_details_1.StarBusinessDetails, customer.starBusinessDetails);
            }
            // Handle StarCustomerDetails updates
            let tempPassword;
            let defaultList;
            if (isStarCustomer && !customer.starCustomerDetails) {
                // Create new star customer details
                const starCustomerDetails = new star_customer_details_1.StarCustomerDetails();
                tempPassword = generateTempPassword();
                starCustomerDetails.password = yield bcryptjs_1.default.hash(tempPassword, 10);
                // Set delivery address from business details
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
                // Create default list for the new star customer
                defaultList = new list_1.List();
                defaultList.name = `Default`;
                defaultList.description = `Default list for ${customer.companyName}`;
                defaultList.customer = customer;
                defaultList.status = list_1.LIST_STATUS.ACTIVE;
                defaultList = yield transactionalEntityManager.save(list_1.List, defaultList);
                // Update customer email for star customer
                customer.email = starCustomerEmail.trim().toLowerCase();
                customer.contactEmail = starCustomerEmail.trim().toLowerCase();
            }
            // Update customer stage based on current state - UPDATED LOGIC
            if (isStarCustomer) {
                customer.stage = "star_customer";
            }
            else if (shouldBeStarBusiness) {
                // AUTOMATIC PROMOTION TO STAR BUSINESS
                customer.stage = customer.starCustomerDetails
                    ? "star_customer"
                    : "star_business";
            }
            else if (isDeviceMaker === "Yes" ||
                ((_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.isDeviceMaker) === "Yes") {
                customer.stage = customer.starCustomerDetails
                    ? "star_customer"
                    : "star_business";
            }
            else {
                customer.stage = "business";
            }
            // Save customer
            yield transactionalEntityManager.save(customers_1.Customer, customer);
            return {
                customer,
                tempPassword,
                defaultList,
                isDeviceMakerChanged,
                isStarCustomerChanged,
                shouldBeStarBusiness, // Return this flag for response message
            };
        }));
        const { tempPassword, defaultList, isDeviceMakerChanged: deviceMakerChanged, isStarCustomerChanged: starCustomerChanged, } = result;
        // Send email if upgrading to star customer - USING ALISHA'S PROPOSED TEXT
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
        // Fetch updated customer with all relations
        const finalCustomer = yield customerRepository.findOne({
            where: { id },
            relations: [
                "businessDetails",
                "businessDetails.check_by",
                "starBusinessDetails",
                "starBusinessDetails.convertedBy",
                "starCustomerDetails",
            ],
        });
        if (!finalCustomer) {
            return next(new errorHandler_1.default("Business not found after update", 404));
        }
        // RETURN RESPONSE WITH PROPER FIELD MAPPING
        const businessResponse = Object.assign(Object.assign({ id: finalCustomer.id, displayName: finalCustomer.companyName, companyName: finalCustomer.legalName, name: finalCustomer.legalName, legalName: finalCustomer.legalName, email: finalCustomer.email, contactEmail: finalCustomer.contactEmail, contactPhoneNumber: finalCustomer.contactPhoneNumber, stage: finalCustomer.stage }, finalCustomer.businessDetails), { check_by: ((_c = finalCustomer.businessDetails) === null || _c === void 0 ? void 0 : _c.check_by)
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
                : undefined, 
            // Include default list if just created
            defaultList: defaultList
                ? {
                    id: defaultList.id,
                    name: defaultList.name,
                }
                : undefined, 
            // Backward compatibility fields
            website: (_d = finalCustomer.businessDetails) === null || _d === void 0 ? void 0 : _d.website, hasWebsite: !!((_e = finalCustomer.businessDetails) === null || _e === void 0 ? void 0 : _e.website), phoneNumber: (_f = finalCustomer.businessDetails) === null || _f === void 0 ? void 0 : _f.contactPhone, businessEmail: (_g = finalCustomer.businessDetails) === null || _g === void 0 ? void 0 : _g.email, status: exports.BUSINESS_STATUS.ACTIVE, source: (_h = finalCustomer.businessDetails) === null || _h === void 0 ? void 0 : _h.businessSource, isDeviceMaker: (_j = finalCustomer.businessDetails) === null || _j === void 0 ? void 0 : _j.isDeviceMaker, isStarCustomer: !!finalCustomer.starCustomerDetails, createdAt: finalCustomer.createdAt, updatedAt: finalCustomer.updatedAt });
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
// Get Business By ID (also updated to include starBusinessDetails)
const getBusinessById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
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
            ],
        });
        if (!customer) {
            return next(new errorHandler_1.default("Business not found", 404));
        }
        // Transform response
        const businessResponse = {
            id: customer.id,
            displayName: customer.companyName,
            legalName: customer.legalName,
            name: customer.legalName,
            email: customer.email,
            contactEmail: customer.contactEmail,
            contactPhoneNumber: customer.contactPhoneNumber,
            stage: customer.stage,
            businessDetails: customer.businessDetails
                ? Object.assign(Object.assign({}, customer.businessDetails), { 
                    // Include check_by user details if present
                    check_by: customer.businessDetails.check_by
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
            // Backward compatibility fields
            website: (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.website,
            hasWebsite: !!((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.website),
            phoneNumber: (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.contactPhone,
            businessEmail: (_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.email,
            address: (_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.address,
            city: (_f = customer.businessDetails) === null || _f === void 0 ? void 0 : _f.city,
            state: (_g = customer.businessDetails) === null || _g === void 0 ? void 0 : _g.state,
            country: (_h = customer.businessDetails) === null || _h === void 0 ? void 0 : _h.country,
            postalCode: (_j = customer.businessDetails) === null || _j === void 0 ? void 0 : _j.postalCode,
            latitude: (_k = customer.businessDetails) === null || _k === void 0 ? void 0 : _k.latitude,
            longitude: (_l = customer.businessDetails) === null || _l === void 0 ? void 0 : _l.longitude,
            googleMapsUrl: (_m = customer.businessDetails) === null || _m === void 0 ? void 0 : _m.googleMapsUrl,
            reviewCount: (_o = customer.businessDetails) === null || _o === void 0 ? void 0 : _o.reviewCount,
            category: (_p = customer.businessDetails) === null || _p === void 0 ? void 0 : _p.category,
            additionalCategories: (_q = customer.businessDetails) === null || _q === void 0 ? void 0 : _q.additionalCategories,
            socialMedia: (_r = customer.businessDetails) === null || _r === void 0 ? void 0 : _r.socialLinks,
            source: (_s = customer.businessDetails) === null || _s === void 0 ? void 0 : _s.businessSource,
            isDeviceMaker: (_t = customer.businessDetails) === null || _t === void 0 ? void 0 : _t.isDeviceMaker,
            isStarCustomer: (_u = customer.businessDetails) === null || _u === void 0 ? void 0 : _u.isStarCustomer,
            check_timestamp: (_v = customer.businessDetails) === null || _v === void 0 ? void 0 : _v.check_timestamp,
            status: exports.BUSINESS_STATUS.ACTIVE,
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
        const { page = 1, limit = 10, search, postalCode, category, city, country, hasWebsite, status, source, minRating, maxRating, verified, sortBy = "createdAt", // Add sortBy parameter
        sortOrder = "DESC", // Add sortOrder parameter with DESC as default
         } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const queryBuilder = customerRepository
            .createQueryBuilder("customer")
            .leftJoinAndSelect("customer.businessDetails", "businessDetails");
        // Apply filters
        if (search) {
            queryBuilder.andWhere("(customer.companyName LIKE :search OR customer.legalName LIKE :search OR customer.email LIKE :search OR businessDetails.description LIKE :search OR businessDetails.address LIKE :search OR businessDetails.email LIKE :search OR businessDetails.contactPhone LIKE :search)", { search: `%${search}%` });
        }
        // BusinessDetails filters
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
        // Get total count
        const total = yield queryBuilder.getCount();
        // Apply sorting - default is by createdAt DESC (newest first)
        const orderByField = sortBy === "name" ? "customer.companyName" : "customer.createdAt";
        const orderDirection = sortOrder === "ASC" ? "ASC" : "DESC";
        queryBuilder.orderBy(orderByField, orderDirection);
        // Get paginated results
        const customers = yield queryBuilder.skip(skip).take(limitNum).getMany();
        const businesses = customers.map((customer) => {
            var _a, _b, _c, _d, _e;
            const _f = customer.businessDetails || {}, { id: businessId } = _f, businessDetailsWithoutId = __rest(_f, ["id"]);
            return Object.assign(Object.assign({ id: customer.id, displayName: customer.companyName, legalName: customer.legalName, name: customer.legalName, email: customer.email, contactEmail: customer.contactEmail, contactPhoneNumber: customer.contactPhoneNumber, stage: customer.stage }, businessDetailsWithoutId), { website: (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.website, hasWebsite: !!((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.website), phoneNumber: (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.contactPhone, businessEmail: (_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.email, status: exports.BUSINESS_STATUS.ACTIVE, source: (_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.businessSource, createdAt: customer.createdAt, updatedAt: customer.updatedAt });
        });
        return res.status(200).json({
            success: true,
            data: {
                businesses,
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
// 7. Bulk Delete Businesses
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
// 8. Search Businesses by Location
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
        // Haversine formula for distance calculation in kilometers
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
        // Transform response
        const businesses = customers.map((raw) => (Object.assign(Object.assign({ id: raw.customer_id, name: raw.customer_companyName, legalName: raw.customer_legalName, email: raw.customer_email, contactEmail: raw.customer_contactEmail, contactPhoneNumber: raw.customer_contactPhoneNumber, stage: raw.customer_stage }, raw.businessDetails), { distance: raw.distance, 
            // Backward compatibility fields
            website: raw.businessDetails_website, hasWebsite: !!raw.businessDetails_website, phoneNumber: raw.businessDetails_contactPhone, businessEmail: raw.businessDetails_email, status: exports.BUSINESS_STATUS.ACTIVE, source: raw.businessDetails_businessSource, createdAt: raw.customer_createdAt, updatedAt: raw.customer_updatedAt })));
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
// 9. Get Business Statistics
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
        // Count by source
        const sourceCounts = yield businessDetailsRepository
            .createQueryBuilder("businessDetails")
            .innerJoin("businessDetails.customer", "customer")
            .select("businessDetails.businessSource, COUNT(*) as count")
            .where("customer.stage = :stage", { stage: "business" })
            .groupBy("businessDetails.businessSource")
            .orderBy("count", "DESC")
            .getRawMany();
        // Count by country
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
// 10. Update Business Status in Bulk
const bulkUpdateStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new errorHandler_1.default("Array of business IDs is required", 400));
        }
        // For now, we'll just return success since status is handled differently in new structure
        // You might want to map status to stage or handle it differently based on your business logic
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
        // Check for contact persons and requested items ONLY
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
        // SIMPLE FOCUSED APPROACH - Just handle list_creator and delete customer
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        try {
            // DISABLE CONSTRAINTS
            yield queryRunner.query("SET session_replication_role = replica;");
            // 1. Delete list_creator records FIRST (this is the main blocker)
            yield queryRunner.query(`DELETE FROM list_creator WHERE "customerId" = $1`, [id]);
            // 2. Delete customer
            yield queryRunner.query(`DELETE FROM customer WHERE id = $1`, [id]);
            // RE-ENABLE CONSTRAINTS
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
