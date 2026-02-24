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
exports.getStarBusinessesWithContactSummary = exports.getStarBusinessesWithoutContacts = exports.getAllStarBusinesses = exports.exportContactPersonsToCSV = exports.getContactPersonStatistics = exports.bulkUpdateLinkedInState = exports.bulkDeleteContactPersons = exports.deleteContactPerson = exports.getContactPersonsByStarBusiness = exports.getAllContactPersons = exports.getContactPerson = exports.quickAddContactPerson = exports.bulkImportContactPersons = exports.updateContactPerson = exports.createContactPerson = exports.sanitizeDecisionMakerState = exports.POSITIONS = exports.CONTACT_TYPES = exports.LINKEDIN_STATES = void 0;
const database_1 = require("../config/database");
const contact_person_1 = require("../models/contact_person");
const star_business_details_1 = require("../models/star_business_details");
const customers_1 = require("../models/customers");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const typeorm_1 = require("typeorm");
exports.LINKEDIN_STATES = {
    OPEN: "open",
    NO_LINKEDIN: "NoLinkedIn",
    REQUEST_SENT: "Vernetzung geschickt",
    LINKED: "Linked angenommen",
    FIRST_CONTACT: "Erstkontakt",
    IN_DISCUSSION: "im Gespräch",
    NOT_CONTACT_PERSON: "NichtAnsprechpartner",
};
exports.CONTACT_TYPES = {
    USER: "User",
    PURCHASER: "Purchaser",
    INFLUENCER: "Influencer",
    GATEKEEPER: "Gatekeeper",
    DECISION_MAKER_TECH: "DecisionMaker technical",
    DECISION_MAKER_FIN: "DecisionMaker financial",
    REAL_DECISION_MAKER: "real DecisionMaker",
};
exports.POSITIONS = {
    PURCHASING: "Einkauf",
    DEVELOPER: "Entwickler",
    PRODUCTION_MANAGER: "Produktionsleiter",
    OPERATIONS_MANAGER: "Betriebsleiter",
    MANAGING_DIRECTOR: "Geschäftsführer",
    OWNER: "Owner",
    OTHERS: "Others",
};
function isDecisionMakerContactType(contactType) {
    return [
        exports.CONTACT_TYPES.DECISION_MAKER_TECH,
        exports.CONTACT_TYPES.DECISION_MAKER_FIN,
        exports.CONTACT_TYPES.REAL_DECISION_MAKER,
    ].includes(contactType);
}
function setDecisionMakerFromContactType(contactPerson) {
    if (contactPerson.contact) {
        contactPerson.isDecisionMaker = isDecisionMakerContactType(contactPerson.contact);
    }
    else {
        contactPerson.isDecisionMaker = false;
    }
}
const sanitizeDecisionMakerState = (state) => {
    const validStates = [
        "",
        "open",
        "ErstEmail",
        "Folgetelefonat",
        "2.Email",
        "Anfragtelefonat",
        "weiteres Serienteil",
        "kein Interesse",
    ];
    return validStates.includes(state) ? state : "";
};
exports.sanitizeDecisionMakerState = sanitizeDecisionMakerState;
const createContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sex, starBusinessDetailsId, name, familyName, position, positionOthers, email, phone, linkedInLink, noteContactPreference, stateLinkedIn = exports.LINKEDIN_STATES.OPEN, contact, decisionMakerState, note, decisionMakerNote, isDecisionMaker, } = req.body;
        if (!starBusinessDetailsId || !name || !familyName) {
            return next(new errorHandler_1.default("Star business details ID, name, and family name are required", 400));
        }
        if (position === exports.POSITIONS.OTHERS && !positionOthers) {
            return next(new errorHandler_1.default("Position description is required when position is 'Others'", 400));
        }
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        let starBusinessDetails = yield starBusinessDetailsRepository.findOne({
            where: { id: starBusinessDetailsId },
            relations: ["customer"],
        });
        if (!starBusinessDetails) {
            const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
            const customer = yield customerRepository.findOne({
                where: { id: starBusinessDetailsId },
                relations: ["starBusinessDetails"],
            });
            if (customer) {
                if (customer.starBusinessDetails) {
                    starBusinessDetails = customer.starBusinessDetails;
                }
                else {
                    if (["star_business", "star_customer"].includes(customer.stage)) {
                        starBusinessDetails = starBusinessDetailsRepository.create({
                            customer: customer,
                        });
                        yield starBusinessDetailsRepository.save(starBusinessDetails);
                    }
                }
            }
        }
        if (!starBusinessDetails) {
            return next(new errorHandler_1.default("Star business or customer not found", 404));
        }
        const actualStarBusinessDetailsId = starBusinessDetails.id;
        if (email) {
            const existingContactByEmail = yield contactPersonRepository.findOne({
                where: {
                    email: email.toLowerCase(),
                    starBusinessDetailsId: actualStarBusinessDetailsId,
                },
            });
            if (existingContactByEmail) {
                return next(new errorHandler_1.default("A contact person with this email already exists for this business", 400));
            }
        }
        const contactPerson = new contact_person_1.ContactPerson();
        contactPerson.sex = sanitizeSex(sex);
        contactPerson.starBusinessDetailsId = starBusinessDetailsId;
        contactPerson.starBusinessDetails = starBusinessDetails;
        contactPerson.name = name.trim();
        contactPerson.familyName = familyName.trim();
        contactPerson.position = position;
        if (position === exports.POSITIONS.OTHERS) {
            contactPerson.positionOthers = positionOthers.trim();
        }
        if (email) {
            contactPerson.email = email.trim().toLowerCase();
        }
        if (phone) {
            contactPerson.phone = phone.trim();
        }
        if (linkedInLink) {
            contactPerson.linkedInLink = normalizeLinkedInUrl(linkedInLink);
        }
        if (noteContactPreference) {
            contactPerson.noteContactPreference = noteContactPreference.trim();
        }
        contactPerson.stateLinkedIn = sanitizeLinkedInState(stateLinkedIn);
        contactPerson.contact = sanitizeContactType(contact);
        if (decisionMakerState !== undefined) {
            contactPerson.decisionMakerState =
                (0, exports.sanitizeDecisionMakerState)(decisionMakerState);
        }
        if (note) {
            contactPerson.note = note.trim();
        }
        if (decisionMakerNote) {
            setDecisionMakerFromContactType(contactPerson);
            if (contactPerson.isDecisionMaker) {
                contactPerson.decisionMakerNote = decisionMakerNote.trim();
            }
            else {
                return next(new errorHandler_1.default("Decision maker note can only be set for decision makers", 400));
            }
        }
        setDecisionMakerFromContactType(contactPerson);
        const savedContactPerson = yield contactPersonRepository.save(contactPerson);
        const contactPersonWithRelations = yield contactPersonRepository.findOne({
            where: { id: savedContactPerson.id },
            relations: ["starBusinessDetails", "starBusinessDetails.customer"],
        });
        return res.status(201).json({
            success: true,
            message: "Contact person created successfully",
            data: formatContactPersonResponse(contactPersonWithRelations),
        });
    }
    catch (error) {
        console.error("Error creating contact person:", error);
        return next(new errorHandler_1.default("Failed to create contact person", 500));
    }
});
exports.createContactPerson = createContactPerson;
const updateContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { sex, name, familyName, position, positionOthers, email, phone, linkedInLink, noteContactPreference, stateLinkedIn, contact, decisionMakerState, note, decisionMakerNote, isDecisionMaker, } = req.body;
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const contactPerson = yield contactPersonRepository.findOne({
            where: { id },
            relations: ["starBusinessDetails", "starBusinessDetails.customer"],
        });
        if (!contactPerson) {
            return next(new errorHandler_1.default("Contact person not found", 404));
        }
        if (position === exports.POSITIONS.OTHERS && !positionOthers) {
            return next(new errorHandler_1.default("Position description is required when position is 'Others'", 400));
        }
        if (email && email !== contactPerson.email) {
            const existingContactByEmail = yield contactPersonRepository.findOne({
                where: {
                    email: email.toLowerCase(),
                    starBusinessDetailsId: contactPerson.starBusinessDetailsId,
                    id: (0, typeorm_2.Not)(id),
                },
            });
            if (existingContactByEmail) {
                return next(new errorHandler_1.default("A contact person with this email already exists for this business", 400));
            }
        }
        let contactTypeChanged = false;
        if (contact !== undefined) {
            const newContactType = sanitizeContactType(contact);
            contactTypeChanged = contactPerson.contact !== newContactType;
            contactPerson.contact = newContactType;
        }
        if (decisionMakerState !== undefined) {
            contactPerson.decisionMakerState =
                (0, exports.sanitizeDecisionMakerState)(decisionMakerState);
        }
        if (contactTypeChanged) {
            setDecisionMakerFromContactType(contactPerson);
        }
        else if (isDecisionMaker !== undefined) {
            contactPerson.isDecisionMaker = Boolean(isDecisionMaker);
        }
        if (decisionMakerNote !== undefined) {
            const willBeDecisionMaker = contactTypeChanged
                ? isDecisionMakerFromContactType(contactPerson.contact)
                : isDecisionMaker !== undefined
                    ? Boolean(isDecisionMaker)
                    : contactPerson.isDecisionMaker;
            if (decisionMakerNote && !willBeDecisionMaker) {
                return next(new errorHandler_1.default("Decision maker note can only be set for decision makers", 400));
            }
            contactPerson.decisionMakerNote = decisionMakerNote
                ? decisionMakerNote.trim()
                : null;
        }
        if (sex !== undefined) {
            contactPerson.sex = sanitizeSex(sex);
        }
        if (name !== undefined) {
            contactPerson.name = name.trim();
        }
        if (familyName !== undefined) {
            contactPerson.familyName = familyName.trim();
        }
        if (position !== undefined) {
            contactPerson.position = sanitizePosition(position);
            if (position === exports.POSITIONS.OTHERS) {
                contactPerson.positionOthers = (positionOthers === null || positionOthers === void 0 ? void 0 : positionOthers.trim()) || "";
            }
            else {
                contactPerson.positionOthers = "";
            }
        }
        if (email !== undefined) {
            contactPerson.email = email ? email.trim().toLowerCase() : null;
        }
        if (phone !== undefined) {
            contactPerson.phone = phone ? phone.trim() : null;
        }
        if (linkedInLink !== undefined) {
            contactPerson.linkedInLink = linkedInLink
                ? normalizeLinkedInUrl(linkedInLink)
                : "";
        }
        if (noteContactPreference !== undefined) {
            contactPerson.noteContactPreference = noteContactPreference
                ? noteContactPreference.trim()
                : null;
        }
        if (stateLinkedIn !== undefined) {
            contactPerson.stateLinkedIn = sanitizeLinkedInState(stateLinkedIn);
        }
        if (note !== undefined) {
            contactPerson.note = note ? note.trim() : null;
        }
        const updatedContactPerson = yield contactPersonRepository.save(contactPerson);
        return res.status(200).json({
            success: true,
            message: "Contact person updated successfully",
            data: formatContactPersonResponse(updatedContactPerson),
        });
    }
    catch (error) {
        console.error("Error updating contact person:", error);
        return next(new errorHandler_1.default("Failed to update contact person", 500));
    }
});
exports.updateContactPerson = updateContactPerson;
const bulkImportContactPersons = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { contactPersons, starBusinessDetailsId } = req.body;
        if (!contactPersons || !Array.isArray(contactPersons)) {
            return next(new errorHandler_1.default("Contact persons array is required", 400));
        }
        if (contactPersons.length === 0) {
            return next(new errorHandler_1.default("Contact persons array cannot be empty", 400));
        }
        if (!starBusinessDetailsId) {
            return next(new errorHandler_1.default("Star business details ID is required", 400));
        }
        console.log(`Starting bulk import of ${contactPersons.length} contact persons for star business: ${starBusinessDetailsId}...`);
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const starBusinessDetails = yield starBusinessDetailsRepository.findOne({
            where: { id: starBusinessDetailsId },
            relations: ["customer"],
        });
        if (!starBusinessDetails) {
            return next(new errorHandler_1.default("Star business not found", 404));
        }
        const results = {
            total: contactPersons.length,
            imported: 0,
            skippedInvalidData: 0,
            duplicates: 0,
            errors: 0,
            errorsList: [],
            duplicateEntries: [],
            importedContactPersons: [],
            startTime: new Date(),
            endTime: null,
        };
        const existingContactPersons = yield contactPersonRepository.find({
            where: { starBusinessDetailsId },
            select: ["id", "name", "familyName", "email"],
        });
        const existingByEmail = new Map();
        const existingByName = new Map();
        existingContactPersons.forEach((contact) => {
            if (contact.email) {
                existingByEmail.set(contact.email.toLowerCase(), contact);
            }
            const nameKey = `${contact.name.toLowerCase()}_${contact.familyName.toLowerCase()}`;
            existingByName.set(nameKey, contact);
        });
        const contactPersonsToSave = [];
        const seenInBatch = {
            emails: new Set(),
            names: new Set(),
        };
        for (let i = 0; i < contactPersons.length; i++) {
            const contactData = contactPersons[i];
            if (!contactData.name || !contactData.familyName) {
                results.skippedInvalidData++;
                results.errorsList.push({
                    contact: `Contact at index ${i}`,
                    error: "Missing required fields: name and familyName are required",
                });
                continue;
            }
            if (contactData.position === exports.POSITIONS.OTHERS &&
                !contactData.positionOthers) {
                results.skippedInvalidData++;
                results.errorsList.push({
                    contact: `${contactData.name} ${contactData.familyName}`,
                    error: "Position description is required when position is 'Others'",
                });
                continue;
            }
            const normalizedEmail = contactData.email
                ? contactData.email.trim().toLowerCase()
                : null;
            const nameKey = `${contactData.name
                .trim()
                .toLowerCase()}_${contactData.familyName.trim().toLowerCase()}`;
            let duplicateReason = "";
            let existingRecord = null;
            if (normalizedEmail && seenInBatch.emails.has(normalizedEmail)) {
                duplicateReason = "Duplicate email in current batch";
            }
            else if (seenInBatch.names.has(nameKey)) {
                duplicateReason = "Duplicate name in current batch";
            }
            if (!duplicateReason) {
                if (normalizedEmail && existingByEmail.has(normalizedEmail)) {
                    duplicateReason = "Email already exists for this star business";
                    existingRecord = existingByEmail.get(normalizedEmail);
                }
                else if (existingByName.has(nameKey)) {
                    duplicateReason = "Name already exists for this star business";
                    existingRecord = existingByName.get(nameKey);
                }
            }
            if (duplicateReason) {
                results.duplicates++;
                results.duplicateEntries.push({
                    contact: {
                        index: i,
                        name: contactData.name,
                        familyName: contactData.familyName,
                        email: contactData.email,
                        position: contactData.position,
                    },
                    reason: duplicateReason,
                    existingRecord: existingRecord,
                });
                continue;
            }
            if (normalizedEmail) {
                seenInBatch.emails.add(normalizedEmail);
            }
            seenInBatch.names.add(nameKey);
            try {
                const contactPerson = new contact_person_1.ContactPerson();
                contactPerson.sex = sanitizeSex(contactData.sex);
                contactPerson.starBusinessDetailsId = starBusinessDetailsId;
                contactPerson.starBusinessDetails = starBusinessDetails;
                contactPerson.name = contactData.name.trim();
                contactPerson.familyName = contactData.familyName.trim();
                contactPerson.position = sanitizePosition(contactData.position);
                if (contactData.position === exports.POSITIONS.OTHERS &&
                    contactData.positionOthers) {
                    contactPerson.positionOthers = contactData.positionOthers.trim();
                }
                if (contactData.email) {
                    contactPerson.email = normalizedEmail;
                }
                if (contactData.phone) {
                    contactPerson.phone = contactData.phone.trim();
                }
                if (contactData.linkedInLink) {
                    contactPerson.linkedInLink = normalizeLinkedInUrl(contactData.linkedInLink);
                }
                if (contactData.noteContactPreference) {
                    contactPerson.noteContactPreference =
                        contactData.noteContactPreference.trim();
                }
                contactPerson.stateLinkedIn = sanitizeLinkedInState(contactData.stateLinkedIn || exports.LINKEDIN_STATES.OPEN);
                contactPerson.contact = sanitizeContactType(contactData.contact);
                if (contactData.note) {
                    contactPerson.note = contactData.note.trim();
                }
                setDecisionMakerFromContactType(contactPerson);
                contactPersonsToSave.push(contactPerson);
            }
            catch (error) {
                results.errors++;
                results.errorsList.push({
                    contact: `${contactData.name} ${contactData.familyName}`,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
        if (contactPersonsToSave.length > 0) {
            try {
                const savedContactPersons = yield contactPersonRepository.save(contactPersonsToSave, { chunk: 100 });
                results.imported = savedContactPersons.length;
                results.importedContactPersons = savedContactPersons.map(formatContactPersonResponse);
            }
            catch (error) {
                console.error("Error during bulk save:", error);
                results.errors += contactPersonsToSave.length;
                results.errorsList.push({
                    contact: "Bulk save operation",
                    error: error instanceof Error ? error.message : "Database save failed",
                });
            }
        }
        results.endTime = new Date();
        const executionTime = results.endTime.getTime() - results.startTime.getTime();
        console.log(`Bulk import completed in ${executionTime}ms. Imported: ${results.imported}/${results.total}`);
        return res.status(200).json({
            success: true,
            message: `Bulk import completed. ${results.imported} contact persons imported successfully.`,
            data: Object.assign(Object.assign({}, results), { executionTimeMs: executionTime }),
        });
    }
    catch (error) {
        console.error("Error bulk importing contact persons:", error);
        return next(new errorHandler_1.default("Failed to bulk import contact persons", 500));
    }
});
exports.bulkImportContactPersons = bulkImportContactPersons;
const quickAddContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { starBusinessDetailsId } = req.params;
        const { name, familyName, email, phone, position, contact } = req.body;
        if (!name || !familyName) {
            return next(new errorHandler_1.default("Name and family name are required", 400));
        }
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const starBusinessDetails = yield starBusinessDetailsRepository.findOne({
            where: { id: starBusinessDetailsId },
            relations: ["customer"],
        });
        if (!starBusinessDetails) {
            return next(new errorHandler_1.default("Star business not found", 404));
        }
        const existingQuery = contactPersonRepository
            .createQueryBuilder("contactPerson")
            .where("contactPerson.starBusinessDetailsId = :starBusinessDetailsId", {
            starBusinessDetailsId,
        })
            .andWhere(new typeorm_1.Brackets((qb) => {
            qb.where("LOWER(contactPerson.name) = :name AND LOWER(contactPerson.familyName) = :familyName", {
                name: name.toLowerCase(),
                familyName: familyName.toLowerCase(),
            });
            if (email) {
                qb.orWhere("LOWER(contactPerson.email) = :email", {
                    email: email.toLowerCase(),
                });
            }
        }));
        const existingContact = yield existingQuery.getOne();
        if (existingContact) {
            return next(new errorHandler_1.default("A similar contact person already exists for this business", 400));
        }
        const contactPerson = new contact_person_1.ContactPerson();
        contactPerson.name = name.trim();
        contactPerson.familyName = familyName.trim();
        contactPerson.starBusinessDetailsId = starBusinessDetailsId;
        contactPerson.starBusinessDetails = starBusinessDetails;
        if (email) {
            contactPerson.email = email.trim().toLowerCase();
        }
        if (phone) {
            contactPerson.phone = phone.trim();
        }
        if (position) {
            contactPerson.position = sanitizePosition(position);
        }
        if (contact) {
            contactPerson.contact = sanitizeContactType(contact);
        }
        contactPerson.sex = "Not Specified";
        contactPerson.stateLinkedIn = "open";
        if (!contact) {
            contactPerson.contact = "";
        }
        setDecisionMakerFromContactType(contactPerson);
        const savedContactPerson = yield contactPersonRepository.save(contactPerson);
        return res.status(201).json({
            success: true,
            message: "Contact person added successfully",
            data: {
                id: savedContactPerson.id,
                name: savedContactPerson.name,
                familyName: savedContactPerson.familyName,
                fullName: `${savedContactPerson.name} ${savedContactPerson.familyName}`,
                email: savedContactPerson.email,
                phone: savedContactPerson.phone,
                position: savedContactPerson.position,
                contact: savedContactPerson.contact,
                isDecisionMaker: savedContactPerson.isDecisionMaker,
                businessName: starBusinessDetails.customer.companyName,
                starBusinessDetailsId: savedContactPerson.starBusinessDetailsId,
            },
        });
    }
    catch (error) {
        console.error("Error quick adding contact person:", error);
        return next(new errorHandler_1.default("Failed to add contact person", 500));
    }
});
exports.quickAddContactPerson = quickAddContactPerson;
const getContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const contactPerson = yield contactPersonRepository.findOne({
            where: { id },
            relations: ["starBusinessDetails", "starBusinessDetails.customer"],
        });
        if (!contactPerson) {
            return next(new errorHandler_1.default("Contact person not found", 404));
        }
        return res.status(200).json({
            success: true,
            data: formatContactPersonResponse(contactPerson),
        });
    }
    catch (error) {
        console.error("Error fetching contact person:", error);
        return next(new errorHandler_1.default("Failed to fetch contact person", 500));
    }
});
exports.getContactPerson = getContactPerson;
const getAllContactPersons = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 30, search, businessName, starBusinessDetailsId, position, sex, stateLinkedIn, contact, hasEmail, hasPhone, hasLinkedIn, sortBy = "createdAt", sortOrder = "DESC", } = req.query;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const allCustomers = yield customerRepository.find({
            where: {},
            relations: [
                "starBusinessDetails",
                "starBusinessDetails.contactPersons",
                "businessDetails",
            ],
            order: { createdAt: "DESC" },
        });
        console.log(`Total star business customers found: ${allCustomers.length}`);
        let allContactPersons = allCustomers.flatMap((customer) => {
            var _a, _b;
            return ((_b = (_a = customer.starBusinessDetails) === null || _a === void 0 ? void 0 : _a.contactPersons) === null || _b === void 0 ? void 0 : _b.map((contactPerson) => (Object.assign(Object.assign({}, contactPerson), { starBusinessDetails: customer.starBusinessDetails, customer: customer })))) || [];
        });
        console.log(`Total contact persons found: ${allContactPersons.length}`);
        if (search) {
            const searchTerm = search.toString().toLowerCase();
            allContactPersons = allContactPersons.filter((contactPerson) => {
                var _a, _b, _c, _d, _e, _f;
                return ((_a = contactPerson.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchTerm)) ||
                    ((_b = contactPerson.familyName) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchTerm)) ||
                    ((_c = contactPerson.email) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchTerm)) ||
                    ((_d = contactPerson.phone) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(searchTerm)) ||
                    ((_f = (_e = contactPerson.customer) === null || _e === void 0 ? void 0 : _e.companyName) === null || _f === void 0 ? void 0 : _f.toLowerCase().includes(searchTerm));
            });
        }
        if (businessName) {
            const businessTerm = businessName.toString().toLowerCase();
            allContactPersons = allContactPersons.filter((contactPerson) => {
                var _a, _b;
                return (_b = (_a = contactPerson.customer) === null || _a === void 0 ? void 0 : _a.companyName) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(businessTerm);
            });
        }
        if (starBusinessDetailsId) {
            allContactPersons = allContactPersons.filter((contactPerson) => { var _a; return ((_a = contactPerson.starBusinessDetails) === null || _a === void 0 ? void 0 : _a.id) === starBusinessDetailsId; });
        }
        if (position) {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.position === position);
        }
        if (sex) {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.sex === sex);
        }
        if (stateLinkedIn) {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.stateLinkedIn === stateLinkedIn);
        }
        if (contact) {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.contact === contact);
        }
        if (hasEmail === "true") {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.email !== null && contactPerson.email !== undefined);
        }
        else if (hasEmail === "false") {
            allContactPersons = allContactPersons.filter((contactPerson) => !contactPerson.email);
        }
        if (hasPhone === "true") {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.phone !== null && contactPerson.phone !== undefined);
        }
        else if (hasPhone === "false") {
            allContactPersons = allContactPersons.filter((contactPerson) => !contactPerson.phone);
        }
        if (hasLinkedIn === "true") {
            allContactPersons = allContactPersons.filter((contactPerson) => contactPerson.linkedInLink !== null &&
                contactPerson.linkedInLink !== undefined);
        }
        else if (hasLinkedIn === "false") {
            allContactPersons = allContactPersons.filter((contactPerson) => !contactPerson.linkedInLink);
        }
        const validSortFields = [
            "createdAt",
            "updatedAt",
            "name",
            "familyName",
            "position",
            "stateLinkedIn",
            "contact",
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";
        const order = sortOrder === "ASC" ? "ASC" : "DESC";
        allContactPersons.sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];
            if (aValue === null || aValue === undefined)
                aValue = "";
            if (bValue === null || bValue === undefined)
                bValue = "";
            if (order === "ASC") {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }
            else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
        const total = allContactPersons.length;
        const paginatedContactPersons = allContactPersons.slice(skip, skip + limitNum);
        const formattedContactPersons = paginatedContactPersons.map((contactPerson) => {
            const customer = contactPerson.customer;
            const starBusinessDetails = contactPerson.starBusinessDetails;
            const businessDetails = customer === null || customer === void 0 ? void 0 : customer.businessDetails;
            console.log("Formatting contact person:", contactPerson);
            return {
                id: contactPerson.id,
                name: contactPerson.name,
                familyName: contactPerson.familyName,
                position: contactPerson.position,
                email: contactPerson.email,
                phone: contactPerson.phone,
                linkedInLink: contactPerson.linkedInLink,
                stateLinkedIn: contactPerson.stateLinkedIn,
                sex: contactPerson.sex,
                contact: contactPerson.contact,
                comment: contactPerson.note,
                createdAt: contactPerson.createdAt,
                updatedAt: contactPerson.updatedAt,
                starBusinessDetailsId: contactPerson.starBusinessDetailsId,
                isDecisionMaker: contactPerson.isDecisionMaker,
                decisionMakerState: contactPerson.decisionMakerState,
                decisionMakerNote: contactPerson.decisionMakerNote,
                businessId: (customer === null || customer === void 0 ? void 0 : customer.id) || null,
                businessName: (customer === null || customer === void 0 ? void 0 : customer.companyName) || null,
                businessLegalName: customer === null || customer === void 0 ? void 0 : customer.legalName,
                businessEmail: (customer === null || customer === void 0 ? void 0 : customer.email) || null,
                businessContactEmail: (customer === null || customer === void 0 ? void 0 : customer.contactEmail) || null,
                businessContactPhone: (customer === null || customer === void 0 ? void 0 : customer.contactPhoneNumber) || null,
                website: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.website) || null,
                city: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.city) || null,
                state: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.state) || null,
                country: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.country) || null,
                address: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.address) || null,
                postalCode: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.postalCode) || null,
                category: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.category) || null,
                industry: (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.industry) || (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.industry) || null,
                fullName: `${contactPerson.name || ""} ${contactPerson.familyName || ""}`.trim(),
                displayPosition: contactPerson.position || "",
                note: contactPerson.note || null,
                noteContactPreference: contactPerson.noteContactPreference || null,
                positionOthers: null,
            };
        });
        return res.status(200).json({
            success: true,
            data: {
                contactPersons: formattedContactPersons,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching contact persons:", error);
        return next(new errorHandler_1.default("Failed to fetch contact persons", 500));
    }
});
exports.getAllContactPersons = getAllContactPersons;
const getContactPersonsByStarBusiness = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { starBusinessDetailsId } = req.params;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: {
                starBusinessDetails: { id: starBusinessDetailsId },
            },
            relations: [
                "starBusinessDetails",
                "starBusinessDetails.contactPersons",
                "businessDetails",
            ],
        });
        if (!customer || !customer.starBusinessDetails) {
            return next(new errorHandler_1.default("Star business not found", 404));
        }
        const contactPersons = customer.starBusinessDetails.contactPersons || [];
        const formattedContactPersons = contactPersons.map((contactPerson) => {
            const starBusinessDetails = customer.starBusinessDetails;
            const businessDetails = customer.businessDetails;
            return {
                id: contactPerson.id,
                name: contactPerson.name,
                familyName: contactPerson.familyName,
                position: contactPerson.position,
                email: contactPerson.email,
                phone: contactPerson.phone,
                linkedInLink: contactPerson.linkedInLink,
                stateLinkedIn: contactPerson.stateLinkedIn,
                sex: contactPerson.sex,
                contact: contactPerson.contact,
                comment: contactPerson.note,
                createdAt: contactPerson.createdAt,
                updatedAt: contactPerson.updatedAt,
                starBusinessDetailsId: contactPerson.starBusinessDetailsId,
                isDecisionMaker: contactPerson.isDecisionMaker,
                decisionMakerState: contactPerson.decisionMakerState,
                decisionMakerNote: contactPerson.decisionMakerNote,
                businessId: customer.id,
                businessName: customer.companyName,
                businessLegalName: customer.legalName,
                businessEmail: customer.email,
                businessContactEmail: customer.contactEmail,
                businessContactPhone: customer.contactPhoneNumber,
                website: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.website) || null,
                city: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.city) || null,
                state: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.state) || null,
                country: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.country) || null,
                address: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.address) || null,
                postalCode: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.postalCode) || null,
                category: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.category) || null,
                industry: (starBusinessDetails === null || starBusinessDetails === void 0 ? void 0 : starBusinessDetails.industry) || (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.industry) || null,
                fullName: `${contactPerson.name || ""} ${contactPerson.familyName || ""}`.trim(),
                displayPosition: contactPerson.position || "",
                note: contactPerson.note || null,
                noteContactPreference: contactPerson.noteContactPreference || null,
                positionOthers: null,
            };
        });
        return res.status(200).json({
            success: true,
            data: formattedContactPersons,
        });
    }
    catch (error) {
        console.error("Error fetching contact persons by star business:", error);
        return next(new errorHandler_1.default("Failed to fetch contact persons for star business", 500));
    }
});
exports.getContactPersonsByStarBusiness = getContactPersonsByStarBusiness;
const deleteContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const requestedItemRepository = database_1.AppDataSource.getRepository(requested_items_1.RequestedItem);
        const contactPerson = yield contactPersonRepository.findOne({
            where: { id },
            relations: ["requestedItems"],
        });
        if (!contactPerson) {
            return next(new errorHandler_1.default("Contact person not found", 404));
        }
        const hasRequestedItems = yield requestedItemRepository.exists({
            where: { contactPersonId: id },
        });
        if (hasRequestedItems) {
            return next(new errorHandler_1.default("Cannot delete contact person because they have associated item requests. Please remove the item requests first.", 400));
        }
        yield contactPersonRepository.remove(contactPerson);
        return res.status(200).json({
            success: true,
            message: "Contact person deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting contact person:", error);
        return next(new errorHandler_1.default("Failed to delete contact person", 500));
    }
});
exports.deleteContactPerson = deleteContactPerson;
const bulkDeleteContactPersons = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new errorHandler_1.default("Array of contact person IDs is required", 400));
        }
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const result = yield contactPersonRepository.delete(ids);
        return res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.affected} contact persons`,
            data: {
                deletedCount: result.affected,
            },
        });
    }
    catch (error) {
        console.error("Error bulk deleting contact persons:", error);
        return next(new errorHandler_1.default("Failed to delete contact persons", 500));
    }
});
exports.bulkDeleteContactPersons = bulkDeleteContactPersons;
const bulkUpdateLinkedInState = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, stateLinkedIn } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new errorHandler_1.default("Array of contact person IDs is required", 400));
        }
        if (!stateLinkedIn) {
            return next(new errorHandler_1.default("LinkedIn state is required", 400));
        }
        const sanitizedState = sanitizeLinkedInState(stateLinkedIn);
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const result = yield contactPersonRepository
            .createQueryBuilder()
            .update(contact_person_1.ContactPerson)
            .set({ stateLinkedIn: sanitizedState })
            .where("id IN (:...ids)", { ids })
            .execute();
        return res.status(200).json({
            success: true,
            message: `Successfully updated LinkedIn state for ${result.affected} contact persons`,
            data: {
                updatedCount: result.affected,
                newState: sanitizedState,
            },
        });
    }
    catch (error) {
        console.error("Error updating LinkedIn state in bulk:", error);
        return next(new errorHandler_1.default("Failed to update LinkedIn state", 500));
    }
});
exports.bulkUpdateLinkedInState = bulkUpdateLinkedInState;
const getContactPersonStatistics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { starBusinessDetailsId } = req.query;
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        let baseQuery = contactPersonRepository.createQueryBuilder("contactPerson");
        if (starBusinessDetailsId) {
            baseQuery.where("contactPerson.starBusinessDetailsId = :starBusinessDetailsId", {
                starBusinessDetailsId,
            });
        }
        const totalContactPersons = yield baseQuery.getCount();
        const positionCounts = yield baseQuery
            .select("contactPerson.position, COUNT(*) as count")
            .groupBy("contactPerson.position")
            .orderBy("count", "DESC")
            .getRawMany();
        const linkedInStateCounts = yield baseQuery
            .select("contactPerson.stateLinkedIn, COUNT(*) as count")
            .groupBy("contactPerson.stateLinkedIn")
            .orderBy("count", "DESC")
            .getRawMany();
        const contactTypeCounts = yield baseQuery
            .select("contactPerson.contact, COUNT(*) as count")
            .where("contactPerson.contact IS NOT NULL")
            .andWhere("contactPerson.contact != :empty", { empty: "" })
            .groupBy("contactPerson.contact")
            .orderBy("count", "DESC")
            .getRawMany();
        const withEmail = yield baseQuery
            .clone()
            .where("contactPerson.email IS NOT NULL")
            .getCount();
        const withPhone = yield baseQuery
            .clone()
            .where("contactPerson.phone IS NOT NULL")
            .getCount();
        const withLinkedIn = yield baseQuery
            .clone()
            .where("contactPerson.linkedInLink IS NOT NULL")
            .getCount();
        return res.status(200).json({
            success: true,
            data: {
                total: totalContactPersons,
                byPosition: positionCounts,
                byLinkedInState: linkedInStateCounts,
                byContactType: contactTypeCounts,
                contactInfo: {
                    withEmail,
                    withPhone,
                    withLinkedIn,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching contact person statistics:", error);
        return next(new errorHandler_1.default("Failed to fetch statistics", 500));
    }
});
exports.getContactPersonStatistics = getContactPersonStatistics;
const exportContactPersonsToCSV = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { starBusinessDetailsId, ids, search, position, sex, stateLinkedIn, contact, } = req.query;
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        let query = contactPersonRepository
            .createQueryBuilder("contactPerson")
            .leftJoinAndSelect("contactPerson.starBusinessDetails", "starBusinessDetails")
            .leftJoinAndSelect("starBusinessDetails.customer", "customer");
        if (ids && typeof ids === "string") {
            const idsArray = ids.split(",");
            query.andWhere("contactPerson.id IN (:...ids)", { ids: idsArray });
        }
        if (starBusinessDetailsId) {
            query.andWhere("contactPerson.starBusinessDetailsId = :starBusinessDetailsId", {
                starBusinessDetailsId,
            });
        }
        if (search) {
            const searchTerm = `%${search}%`;
            query.andWhere(new typeorm_1.Brackets((qb) => {
                qb.where("contactPerson.name ILIKE :search", { search: searchTerm })
                    .orWhere("contactPerson.familyName ILIKE :search", {
                    search: searchTerm,
                })
                    .orWhere("contactPerson.email ILIKE :search", {
                    search: searchTerm,
                })
                    .orWhere("contactPerson.phone ILIKE :search", {
                    search: searchTerm,
                });
            }));
        }
        if (position) {
            query.andWhere("contactPerson.position = :position", { position });
        }
        if (sex) {
            query.andWhere("contactPerson.sex = :sex", { sex });
        }
        if (stateLinkedIn) {
            query.andWhere("contactPerson.stateLinkedIn = :stateLinkedIn", {
                stateLinkedIn,
            });
        }
        if (contact) {
            query.andWhere("contactPerson.contact = :contact", { contact });
        }
        const contactPersons = yield query.getMany();
        const csvData = contactPersons.map((person) => {
            var _a, _b;
            return ({
                ID: person.id,
                "Business Name": ((_b = (_a = person.starBusinessDetails) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.companyName) || "",
                Name: person.name,
                "Family Name": person.familyName,
                Sex: person.sex || "",
                Position: person.position || "",
                "Position Description": person.positionOthers || "",
                Email: person.email || "",
                Phone: person.phone || "",
                "LinkedIn URL": person.linkedInLink || "",
                "LinkedIn State": person.stateLinkedIn,
                "Contact Type": person.contact || "",
                "Contact Preference": person.noteContactPreference || "",
                Note: person.note || "",
                "Created At": person.createdAt,
                "Updated At": person.updatedAt,
            });
        });
        return res.status(200).json({
            success: true,
            data: csvData,
            count: csvData.length,
        });
    }
    catch (error) {
        console.error("Error exporting contact persons:", error);
        return next(new errorHandler_1.default("Failed to export contact persons", 500));
    }
});
exports.exportContactPersonsToCSV = exportContactPersonsToCSV;
function sanitizeSex(value) {
    if (!value)
        return "Not Specified";
    const stringValue = String(value).trim().toLowerCase();
    if (stringValue === "male")
        return "male";
    if (stringValue === "female")
        return "female";
    if (stringValue === "Not Specified")
        return "Not Specified";
    return "Not Specified";
}
function sanitizePosition(value) {
    if (!value)
        return "";
    const stringValue = String(value).trim();
    const validPositions = [
        "Einkauf",
        "Entwickler",
        "Produktionsleiter",
        "Betriebsleiter",
        "Geschäftsführer",
        "Owner",
        "Others",
    ];
    if (validPositions.includes(stringValue)) {
        return stringValue;
    }
    return "";
}
function sanitizeLinkedInState(value) {
    if (!value)
        return "open";
    const stringValue = String(value).trim();
    const validStates = [
        "open",
        "NoLinkedIn",
        "Vernetzung geschickt",
        "Linked angenommen",
        "Erstkontakt",
        "im Gespräch",
        "NichtAnsprechpartner",
    ];
    if (validStates.includes(stringValue)) {
        return stringValue;
    }
    return "open";
}
function sanitizeContactType(value) {
    if (!value)
        return "";
    const stringValue = String(value).trim();
    const validTypes = [
        "User",
        "Purchaser",
        "Influencer",
        "Gatekeeper",
        "DecisionMaker technical",
        "DecisionMaker financial",
        "real DecisionMaker",
    ];
    if (validTypes.includes(stringValue)) {
        return stringValue;
    }
    return "";
}
function normalizeLinkedInUrl(url) {
    if (!url)
        return "";
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }
    if (!url.includes("linkedin.com")) {
        return url;
    }
    url = url.replace("http://", "https://");
    url = url.replace(/\/+$/, "");
    return url;
}
function formatContactPersonResponse(contactPerson) {
    var _a, _b, _c, _d;
    return {
        id: contactPerson.id,
        sex: contactPerson.sex,
        starBusinessDetailsId: contactPerson.starBusinessDetailsId,
        businessName: ((_b = (_a = contactPerson.starBusinessDetails) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.companyName) || null,
        businessId: ((_d = (_c = contactPerson.starBusinessDetails) === null || _c === void 0 ? void 0 : _c.customer) === null || _d === void 0 ? void 0 : _d.id) || null,
        name: contactPerson.name,
        familyName: contactPerson.familyName,
        fullName: `${contactPerson.name} ${contactPerson.familyName}`,
        position: contactPerson.position,
        positionOthers: contactPerson.positionOthers,
        displayPosition: contactPerson.position === "Others" && contactPerson.positionOthers
            ? contactPerson.positionOthers
            : contactPerson.position,
        email: contactPerson.email,
        phone: contactPerson.phone,
        linkedInLink: contactPerson.linkedInLink,
        noteContactPreference: contactPerson.noteContactPreference,
        stateLinkedIn: contactPerson.stateLinkedIn,
        contact: contactPerson.contact,
        isDecisionMaker: contactPerson.isDecisionMaker,
        decisionMakerState: contactPerson.decisionMakerState,
        decisionMakerNote: contactPerson.decisionMakerNote,
        note: contactPerson.note,
        createdAt: contactPerson.createdAt,
        updatedAt: contactPerson.updatedAt,
    };
}
const typeorm_2 = require("typeorm");
const requested_items_1 = require("../models/requested_items");
const getAllStarBusinesses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, page = 1, limit = 50, withContactsCount = "true", } = req.query;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const includeContactsCount = withContactsCount === "true";
        let query = customerRepository
            .createQueryBuilder("customer")
            .leftJoinAndSelect("customer.starBusinessDetails", "starBusinessDetails")
            .leftJoinAndSelect("customer.businessDetails", "businessDetails")
            .where("customer.stage IN (:...stages)", {
            stages: ["star_business", "star_customer"],
        });
        if (search) {
            const searchTerm = `%${search}%`;
            query.andWhere(new typeorm_1.Brackets((qb) => {
                qb.where("customer.companyName ILIKE :search", { search: searchTerm })
                    .orWhere("customer.legalName ILIKE :search", { search: searchTerm })
                    .orWhere("customer.email ILIKE :search", { search: searchTerm })
                    .orWhere("businessDetails.city ILIKE :search", {
                    search: searchTerm,
                })
                    .orWhere("businessDetails.country ILIKE :search", {
                    search: searchTerm,
                });
            }));
        }
        query.orderBy("customer.companyName", "ASC");
        const [starRecords, total] = yield query
            .skip(skip)
            .take(limitNum)
            .getManyAndCount();
        const formattedRecords = yield Promise.all(starRecords.map((record) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            const id = ((_a = record.starBusinessDetails) === null || _a === void 0 ? void 0 : _a.id) || record.id;
            console.log(`[DEBUG] Mapping customer ${record.companyName}: id=${id}, record.id=${record.id}, starBusinessDetails.id=${(_b = record.starBusinessDetails) === null || _b === void 0 ? void 0 : _b.id}`);
            const baseData = {
                id: id,
                customerId: record.id,
                companyName: record.companyName,
                legalName: record.legalName,
                email: record.email,
                contactEmail: record.contactEmail,
                contactPhoneNumber: record.contactPhoneNumber,
                website: (_c = record.businessDetails) === null || _c === void 0 ? void 0 : _c.website,
                city: (_d = record.businessDetails) === null || _d === void 0 ? void 0 : _d.city,
                country: (_e = record.businessDetails) === null || _e === void 0 ? void 0 : _e.country,
                address: (_f = record.businessDetails) === null || _f === void 0 ? void 0 : _f.address,
                postalCode: (_g = record.businessDetails) === null || _g === void 0 ? void 0 : _g.postalCode,
                industry: ((_h = record.starBusinessDetails) === null || _h === void 0 ? void 0 : _h.industry) ||
                    ((_j = record.businessDetails) === null || _j === void 0 ? void 0 : _j.industry),
                inSeries: (_k = record.starBusinessDetails) === null || _k === void 0 ? void 0 : _k.inSeries,
                madeIn: (_l = record.starBusinessDetails) === null || _l === void 0 ? void 0 : _l.madeIn,
                device: (_m = record.starBusinessDetails) === null || _m === void 0 ? void 0 : _m.device,
                lastChecked: (_o = record.starBusinessDetails) === null || _o === void 0 ? void 0 : _o.lastChecked,
                checkedBy: (_p = record.starBusinessDetails) === null || _p === void 0 ? void 0 : _p.checkedBy,
                comment: (_q = record.starBusinessDetails) === null || _q === void 0 ? void 0 : _q.comment,
                stage: record.stage,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
            };
            if (includeContactsCount &&
                ((_r = record.starBusinessDetails) === null || _r === void 0 ? void 0 : _r.id) &&
                record.stage === "star_business") {
                const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
                const contactCount = yield contactPersonRepository.count({
                    where: { starBusinessDetailsId: record.starBusinessDetails.id },
                });
                return Object.assign(Object.assign({}, baseData), { contactPersonsCount: contactCount });
            }
            if (includeContactsCount && record.stage === "star_customer") {
                return Object.assign(Object.assign({}, baseData), { contactPersonsCount: 0 });
            }
            return baseData;
        })));
        return res.status(200).json({
            success: true,
            data: {
                starBusinesses: formattedRecords,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching star businesses and customers:", error);
        return next(new errorHandler_1.default("Failed to fetch star businesses and customers", 500));
    }
});
exports.getAllStarBusinesses = getAllStarBusinesses;
const getStarBusinessesWithoutContacts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, city, country, industry } = req.query;
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomers = yield customerRepository.find({
            where: {
                stage: (0, typeorm_1.In)(["star_business", "star_customer"]),
            },
            relations: [
                "starBusinessDetails",
                "starBusinessDetails.contactPersons",
                "businessDetails",
            ],
            order: {
                createdAt: "DESC",
            },
        });
        console.log(`Total star businesses and customers found: ${starCustomers.length}`);
        let filteredRecords = starCustomers.filter((customer) => {
            if (customer.stage === "star_business") {
                return (customer.starBusinessDetails &&
                    (!customer.starBusinessDetails.contactPersons ||
                        customer.starBusinessDetails.contactPersons.length === 0));
            }
            if (customer.stage === "star_customer") {
                return (customer.starBusinessDetails &&
                    (!customer.starBusinessDetails.contactPersons ||
                        customer.starBusinessDetails.contactPersons.length === 0));
            }
            return false;
        });
        console.log(`Star businesses and customers without contacts: ${filteredRecords.length}`);
        if (search) {
            const searchTerm = search.toString().toLowerCase();
            filteredRecords = filteredRecords.filter((customer) => {
                var _a, _b, _c, _d;
                return ((_a = customer.companyName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchTerm)) ||
                    ((_b = customer.legalName) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchTerm)) ||
                    ((_c = customer.email) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchTerm)) ||
                    ((_d = customer.contactEmail) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(searchTerm));
            });
        }
        if (city) {
            const cityTerm = city.toString().toLowerCase();
            filteredRecords = filteredRecords.filter((customer) => { var _a, _b; return (_b = (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.city) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(cityTerm); });
        }
        if (country) {
            const countryTerm = country.toString().toLowerCase();
            filteredRecords = filteredRecords.filter((customer) => { var _a, _b; return (_b = (_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.country) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(countryTerm); });
        }
        if (industry) {
            const industryTerm = industry.toString().toLowerCase();
            filteredRecords = filteredRecords.filter((customer) => {
                var _a, _b, _c, _d;
                return ((_b = (_a = customer.starBusinessDetails) === null || _a === void 0 ? void 0 : _a.industry) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(industryTerm)) ||
                    ((_d = (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.industry) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(industryTerm));
            });
        }
        const formattedRecords = filteredRecords.map((customer) => {
            const starBusiness = customer.starBusinessDetails;
            const businessDetails = customer.businessDetails;
            const baseData = {
                id: (starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.id) || customer.id,
                customerId: customer.id,
                companyName: customer.companyName || "N/A",
                legalName: customer.legalName || "N/A",
                email: customer.email || "N/A",
                contactEmail: customer.contactEmail || "N/A",
                contactPhoneNumber: customer.contactPhoneNumber || "N/A",
                website: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.website) || "N/A",
                city: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.city) || "N/A",
                state: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.state) || "N/A",
                country: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.country) || "N/A",
                address: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.address) || "N/A",
                postalCode: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.postalCode) || "N/A",
                category: (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.category) || "N/A",
                industry: (starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.industry) || (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.industry) || "N/A",
                stage: customer.stage,
                createdAt: (starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.createdAt) || customer.createdAt,
                updatedAt: (starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.updatedAt) || customer.updatedAt,
                contactPersonsCount: 0,
                needsContactPerson: customer.stage === "star_business",
            };
            if (customer.stage === "star_business") {
                return Object.assign(Object.assign({}, baseData), { inSeries: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.inSeries, madeIn: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.madeIn, device: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.device, lastChecked: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.lastChecked, checkedBy: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.checkedBy, convertedTimestamp: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.converted_timestamp, comment: starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.comment, daysSinceConverted: (starBusiness === null || starBusiness === void 0 ? void 0 : starBusiness.converted_timestamp)
                        ? Math.floor((Date.now() -
                            new Date(starBusiness.converted_timestamp).getTime()) /
                            (1000 * 60 * 60 * 24))
                        : null });
            }
            return baseData;
        });
        const starBusinesses = formattedRecords.filter((record) => record.stage === "star_business");
        const starCustomersOnly = formattedRecords.filter((record) => record.stage === "star_customer");
        const starBusinessesWithDays = starBusinesses.filter((b) => b.daysSinceConverted !== null);
        const averageDaysSinceConverted = starBusinessesWithDays.length > 0
            ? Math.round(starBusinessesWithDays.reduce((acc, b) => acc + (b.daysSinceConverted || 0), 0) / starBusinessesWithDays.length)
            : 0;
        return res.status(200).json({
            success: true,
            message: "Star businesses and customers without contact persons fetched successfully",
            data: {
                starBusinesses: formattedRecords,
                total: filteredRecords.length,
                summary: {
                    totalStarBusinesses: starBusinesses.length,
                    totalStarCustomers: starCustomersOnly.length,
                    totalWithoutContacts: filteredRecords.length,
                    averageDaysSinceConverted,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching star businesses and customers without contacts:", error);
        return next(new errorHandler_1.default("Failed to fetch star businesses and customers without contacts", 500));
    }
});
exports.getStarBusinessesWithoutContacts = getStarBusinessesWithoutContacts;
const getStarBusinessesWithContactSummary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { minContacts = 0, maxContacts } = req.query;
        const minContactsNum = parseInt(minContacts);
        const maxContactsNum = maxContacts
            ? parseInt(maxContacts)
            : undefined;
        const starBusinessDetailsRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        const query = starBusinessDetailsRepository
            .createQueryBuilder("starBusinessDetails")
            .leftJoinAndSelect("starBusinessDetails.customer", "customer")
            .leftJoinAndSelect("customer.businessDetails", "businessDetails")
            .loadRelationCountAndMap("starBusinessDetails.contactPersonsCount", "starBusinessDetails.contactPersons")
            .where("customer.stage = :stage", { stage: "star_business" });
        const allStarBusinesses = yield query.getMany();
        console.log(allStarBusinesses);
        const filteredBusinesses = allStarBusinesses.filter((business) => {
            const count = business.contactPersonsCount || 0;
            if (maxContactsNum !== undefined) {
                return count >= minContactsNum && count <= maxContactsNum;
            }
            return count >= minContactsNum;
        });
        const groupedByContactCount = {};
        filteredBusinesses.forEach((business) => {
            var _a, _b, _c;
            const count = business.contactPersonsCount || 0;
            if (!groupedByContactCount[count]) {
                groupedByContactCount[count] = [];
            }
            groupedByContactCount[count].push({
                id: business.id,
                customerId: business.customer.id,
                companyName: business.customer.companyName,
                city: (_a = business.customer.businessDetails) === null || _a === void 0 ? void 0 : _a.city,
                country: (_b = business.customer.businessDetails) === null || _b === void 0 ? void 0 : _b.country,
                industry: business.industry || ((_c = business.customer.businessDetails) === null || _c === void 0 ? void 0 : _c.industry),
                contactPersonsCount: count,
            });
        });
        const totalStarBusinesses = allStarBusinesses.length;
        const withContacts = allStarBusinesses.filter((b) => b.contactPersonsCount > 0).length;
        const withoutContacts = totalStarBusinesses - withContacts;
        const avgContactsPerBusiness = withContacts > 0
            ? allStarBusinesses.reduce((sum, b) => sum + (b.contactPersonsCount || 0), 0) / withContacts
            : 0;
        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalStarBusinesses,
                    withContacts,
                    withoutContacts,
                    percentageWithContacts: totalStarBusinesses > 0
                        ? ((withContacts / totalStarBusinesses) * 100).toFixed(2)
                        : "0",
                    averageContactsPerBusiness: avgContactsPerBusiness.toFixed(2),
                },
                groupedByContactCount,
                businesses: filteredBusinesses.map((business) => {
                    var _a, _b, _c;
                    return ({
                        id: business.id,
                        customerId: business.customer.id,
                        companyName: business.customer.companyName,
                        legalName: business.customer.legalName,
                        email: business.customer.email,
                        city: (_a = business.customer.businessDetails) === null || _a === void 0 ? void 0 : _a.city,
                        country: (_b = business.customer.businessDetails) === null || _b === void 0 ? void 0 : _b.country,
                        industry: business.industry || ((_c = business.customer.businessDetails) === null || _c === void 0 ? void 0 : _c.industry),
                        contactPersonsCount: business.contactPersonsCount || 0,
                        inSeries: business.inSeries,
                        madeIn: business.madeIn,
                        device: business.device,
                        lastChecked: business.lastChecked,
                        convertedTimestamp: business.converted_timestamp,
                    });
                }),
            },
        });
    }
    catch (error) {
        console.error("Error fetching star businesses contact summary:", error);
        return next(new errorHandler_1.default("Failed to fetch star businesses contact summary", 500));
    }
});
exports.getStarBusinessesWithContactSummary = getStarBusinessesWithContactSummary;
function isDecisionMakerFromContactType(contactType) {
    const decisionMakerTypes = [
        "DecisionMaker technical",
        "DecisionMaker financial",
        "real DecisionMaker",
    ];
    return decisionMakerTypes.includes(contactType);
}
