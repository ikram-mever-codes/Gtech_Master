// controllers/contactPersonController.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import {
  ContactPerson,
  Sex,
  Position,
  LinkedInState,
  ContactType,
  DecisionMakerState,
} from "../models/contact_person";
import { StarBusinessDetails } from "../models/star_business_details";
import { Customer } from "../models/customers";
import ErrorHandler from "../utils/errorHandler";
import { In, Like, Brackets, ILike } from "typeorm";
import { User } from "../models/users";

// Constants for ContactPerson statuses and types
export const LINKEDIN_STATES = {
  OPEN: "open",
  NO_LINKEDIN: "NoLinkedIn",
  REQUEST_SENT: "Vernetzung geschickt",
  LINKED: "Linked angenommen",
  FIRST_CONTACT: "Erstkontakt",
  IN_DISCUSSION: "im Gespräch",
  NOT_CONTACT_PERSON: "NichtAnsprechpartner",
};

export const CONTACT_TYPES = {
  USER: "User",
  PURCHASER: "Purchaser",
  INFLUENCER: "Influencer",
  GATEKEEPER: "Gatekeeper",
  DECISION_MAKER_TECH: "DecisionMaker technical",
  DECISION_MAKER_FIN: "DecisionMaker financial",
  REAL_DECISION_MAKER: "real DecisionMaker",
};

export const POSITIONS = {
  PURCHASING: "Einkauf",
  DEVELOPER: "Entwickler",
  PRODUCTION_MANAGER: "Produktionsleiter",
  OPERATIONS_MANAGER: "Betriebsleiter",
  MANAGING_DIRECTOR: "Geschäftsführer",
  OWNER: "Owner",
  OTHERS: "Others",
};

// 1. Create Contact Person
function isDecisionMakerContactType(contactType: ContactType): boolean {
  return [
    CONTACT_TYPES.DECISION_MAKER_TECH,
    CONTACT_TYPES.DECISION_MAKER_FIN,
    CONTACT_TYPES.REAL_DECISION_MAKER,
  ].includes(contactType as any);
}

// Helper function to set isDecisionMaker based on contact type
function setDecisionMakerFromContactType(contactPerson: ContactPerson): void {
  if (contactPerson.contact) {
    contactPerson.isDecisionMaker = isDecisionMakerContactType(
      contactPerson.contact
    );
  } else {
    contactPerson.isDecisionMaker = false;
  }
}

export const sanitizeDecisionMakerState = (state: any): DecisionMakerState => {
  const validStates: DecisionMakerState[] = [
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

export const createContactPerson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      sex,
      starBusinessDetailsId,
      name,
      familyName,
      position,
      positionOthers,
      email,
      phone,
      linkedInLink,
      noteContactPreference,
      stateLinkedIn = LINKEDIN_STATES.OPEN,
      contact,
      decisionMakerState,
      note,
      decisionMakerNote,
      isDecisionMaker,
    } = req.body;

    // Validate required fields
    if (!starBusinessDetailsId || !name || !familyName) {
      return next(
        new ErrorHandler(
          "Star business details ID, name, and family name are required",
          400
        )
      );
    }

    // Validate position and positionOthers relationship
    if (position === POSITIONS.OTHERS && !positionOthers) {
      return next(
        new ErrorHandler(
          "Position description is required when position is 'Others'",
          400
        )
      );
    }

    // Get repositories
    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);
    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);

    // Verify star business exists
    const starBusinessDetails = await starBusinessDetailsRepository.findOne({
      where: { id: starBusinessDetailsId },
      relations: ["customer"],
    });

    if (!starBusinessDetails) {
      return next(new ErrorHandler("Star business not found", 404));
    }

    // Check for duplicate contact person
    if (email) {
      const existingContactByEmail = await contactPersonRepository.findOne({
        where: {
          email: email.toLowerCase(),
          starBusinessDetailsId,
        },
      });

      if (existingContactByEmail) {
        return next(
          new ErrorHandler(
            "A contact person with this email already exists for this business",
            400
          )
        );
      }
    }

    // Check for duplicate by name and family name
    const existingContactByName = await contactPersonRepository.findOne({
      where: {
        name: name.trim(),
        familyName: familyName.trim(),
        starBusinessDetailsId,
      },
    });

    if (existingContactByName) {
      return next(
        new ErrorHandler(
          "A contact person with this name already exists for this business",
          400
        )
      );
    }

    // Create new contact person
    const contactPerson = new ContactPerson();
    contactPerson.sex = sanitizeSex(sex);
    contactPerson.starBusinessDetailsId = starBusinessDetailsId;
    contactPerson.starBusinessDetails = starBusinessDetails;
    contactPerson.name = name.trim();
    contactPerson.familyName = familyName.trim();
    contactPerson.position = position;

    if (position === POSITIONS.OTHERS) {
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

    // Add decisionMakerState handling
    if (decisionMakerState !== undefined) {
      contactPerson.decisionMakerState =
        sanitizeDecisionMakerState(decisionMakerState);
    }

    if (note) {
      contactPerson.note = note.trim();
    }

    // Allow decisionMakerNote only if the contact person is a decision maker
    if (decisionMakerNote) {
      // Set isDecisionMaker based on contact type first
      setDecisionMakerFromContactType(contactPerson);

      // Only allow decisionMakerNote if the person is a decision maker
      if (contactPerson.isDecisionMaker) {
        contactPerson.decisionMakerNote = decisionMakerNote.trim();
      } else {
        return next(
          new ErrorHandler(
            "Decision maker note can only be set for decision makers",
            400
          )
        );
      }
    }

    // Set isDecisionMaker based on contact type (overrides explicit setting)
    // This is called again to ensure consistency after potential changes above
    setDecisionMakerFromContactType(contactPerson);

    // Save to database
    const savedContactPerson = await contactPersonRepository.save(
      contactPerson
    );

    // Fetch with relations for response
    const contactPersonWithRelations = await contactPersonRepository.findOne({
      where: { id: savedContactPerson.id },
      relations: ["starBusinessDetails", "starBusinessDetails.customer"],
    });

    return res.status(201).json({
      success: true,
      message: "Contact person created successfully",
      data: formatContactPersonResponse(contactPersonWithRelations),
    });
  } catch (error) {
    console.error("Error creating contact person:", error);
    return next(new ErrorHandler("Failed to create contact person", 500));
  }
};

// Updated updateContactPerson function with decisionMakerState
export const updateContactPerson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      sex,
      name,
      familyName,
      position,
      positionOthers,
      email,
      phone,
      linkedInLink,
      noteContactPreference,
      stateLinkedIn,
      contact,
      decisionMakerState,
      note,
      decisionMakerNote,
      isDecisionMaker, // Allow explicit setting, but will be overridden by contact type logic if contact changes
    } = req.body;

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);

    // Find existing contact person
    const contactPerson = await contactPersonRepository.findOne({
      where: { id },
      relations: ["starBusinessDetails", "starBusinessDetails.customer"],
    });

    if (!contactPerson) {
      return next(new ErrorHandler("Contact person not found", 404));
    }

    // Validate position and positionOthers relationship
    if (position === POSITIONS.OTHERS && !positionOthers) {
      return next(
        new ErrorHandler(
          "Position description is required when position is 'Others'",
          400
        )
      );
    }

    // Check for duplicate email if email is being updated
    if (email && email !== contactPerson.email) {
      const existingContactByEmail = await contactPersonRepository.findOne({
        where: {
          email: email.toLowerCase(),
          starBusinessDetailsId: contactPerson.starBusinessDetailsId,
          id: Not(id),
        },
      });

      if (existingContactByEmail) {
        return next(
          new ErrorHandler(
            "A contact person with this email already exists for this business",
            400
          )
        );
      }
    }

    // Handle contact type and decision maker logic first to determine if they're a decision maker
    let contactTypeChanged = false;
    if (contact !== undefined) {
      const newContactType = sanitizeContactType(contact);
      contactTypeChanged = contactPerson.contact !== newContactType;
      contactPerson.contact = newContactType;
    }

    // Update decisionMakerState if provided
    if (decisionMakerState !== undefined) {
      contactPerson.decisionMakerState =
        sanitizeDecisionMakerState(decisionMakerState);
    }

    // Update isDecisionMaker based on contact type if contact type changed
    // Otherwise respect the explicit isDecisionMaker value if provided
    if (contactTypeChanged) {
      setDecisionMakerFromContactType(contactPerson);
    } else if (isDecisionMaker !== undefined) {
      contactPerson.isDecisionMaker = Boolean(isDecisionMaker);
    }

    // Validate decisionMakerNote - only allow if the person is a decision maker
    if (decisionMakerNote !== undefined) {
      // Check if the person is currently a decision maker or will become one
      const willBeDecisionMaker = contactTypeChanged
        ? isDecisionMakerFromContactType(contactPerson.contact)
        : isDecisionMaker !== undefined
        ? Boolean(isDecisionMaker)
        : contactPerson.isDecisionMaker;

      if (decisionMakerNote && !willBeDecisionMaker) {
        return next(
          new ErrorHandler(
            "Decision maker note can only be set for decision makers",
            400
          )
        );
      }

      // If validation passes, update the decisionMakerNote
      contactPerson.decisionMakerNote = decisionMakerNote
        ? decisionMakerNote.trim()
        : null;
    }

    // Update other fields
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
      if (position === POSITIONS.OTHERS) {
        contactPerson.positionOthers = positionOthers?.trim() || "";
      } else {
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

    // Save updates
    const updatedContactPerson = await contactPersonRepository.save(
      contactPerson
    );

    return res.status(200).json({
      success: true,
      message: "Contact person updated successfully",
      data: formatContactPersonResponse(updatedContactPerson),
    });
  } catch (error) {
    console.error("Error updating contact person:", error);
    return next(new ErrorHandler("Failed to update contact person", 500));
  }
};
// 8. Bulk Import Contact Persons
export const bulkImportContactPersons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { contactPersons, starBusinessDetailsId } = req.body;

    // Validate input
    if (!contactPersons || !Array.isArray(contactPersons)) {
      return next(new ErrorHandler("Contact persons array is required", 400));
    }

    if (contactPersons.length === 0) {
      return next(
        new ErrorHandler("Contact persons array cannot be empty", 400)
      );
    }

    if (!starBusinessDetailsId) {
      return next(
        new ErrorHandler("Star business details ID is required", 400)
      );
    }

    console.log(
      `Starting bulk import of ${contactPersons.length} contact persons for star business: ${starBusinessDetailsId}...`
    );

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);
    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);

    // Verify star business exists
    const starBusinessDetails = await starBusinessDetailsRepository.findOne({
      where: { id: starBusinessDetailsId },
      relations: ["customer"],
    });

    if (!starBusinessDetails) {
      return next(new ErrorHandler("Star business not found", 404));
    }

    // Initialize results tracking
    const results = {
      total: contactPersons.length,
      imported: 0,
      skippedInvalidData: 0,
      duplicates: 0,
      errors: 0,
      errorsList: [] as Array<{ contact: string; error: string }>,
      duplicateEntries: [] as Array<{
        contact: any;
        reason: string;
        existingRecord?: any;
      }>,
      importedContactPersons: [] as Array<any>,
      startTime: new Date(),
      endTime: null as Date | null,
    };

    // Get existing contact persons for duplicate checking
    const existingContactPersons = await contactPersonRepository.find({
      where: { starBusinessDetailsId },
      select: ["id", "name", "familyName", "email"],
    });

    // Create maps for duplicate checking
    const existingByEmail = new Map<string, any>();
    const existingByName = new Map<string, any>();

    existingContactPersons.forEach((contact) => {
      if (contact.email) {
        existingByEmail.set(contact.email.toLowerCase(), contact);
      }
      const nameKey = `${contact.name.toLowerCase()}_${contact.familyName.toLowerCase()}`;
      existingByName.set(nameKey, contact);
    });

    // Process each contact person
    const contactPersonsToSave: ContactPerson[] = [];
    const seenInBatch = {
      emails: new Set<string>(),
      names: new Set<string>(),
    };

    for (let i = 0; i < contactPersons.length; i++) {
      const contactData = contactPersons[i];

      // Validate required fields
      if (!contactData.name || !contactData.familyName) {
        results.skippedInvalidData++;
        results.errorsList.push({
          contact: `Contact at index ${i}`,
          error: "Missing required fields: name and familyName are required",
        });
        continue;
      }

      // Validate position and positionOthers
      if (
        contactData.position === POSITIONS.OTHERS &&
        !contactData.positionOthers
      ) {
        results.skippedInvalidData++;
        results.errorsList.push({
          contact: `${contactData.name} ${contactData.familyName}`,
          error: "Position description is required when position is 'Others'",
        });
        continue;
      }

      // Normalize data for duplicate checking
      const normalizedEmail = contactData.email
        ? contactData.email.trim().toLowerCase()
        : null;
      const nameKey = `${contactData.name
        .trim()
        .toLowerCase()}_${contactData.familyName.trim().toLowerCase()}`;

      // Check for duplicates in current batch
      let duplicateReason = "";
      let existingRecord = null;

      if (normalizedEmail && seenInBatch.emails.has(normalizedEmail)) {
        duplicateReason = "Duplicate email in current batch";
      } else if (seenInBatch.names.has(nameKey)) {
        duplicateReason = "Duplicate name in current batch";
      }

      // Check against existing database records
      if (!duplicateReason) {
        if (normalizedEmail && existingByEmail.has(normalizedEmail)) {
          duplicateReason = "Email already exists for this star business";
          existingRecord = existingByEmail.get(normalizedEmail);
        } else if (existingByName.has(nameKey)) {
          duplicateReason = "Name already exists for this star business";
          existingRecord = existingByName.get(nameKey);
        }
      }

      // If duplicate found, add to results and skip
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

      // Add to seen sets
      if (normalizedEmail) {
        seenInBatch.emails.add(normalizedEmail);
      }
      seenInBatch.names.add(nameKey);

      try {
        // Create new contact person entity
        const contactPerson = new ContactPerson();
        contactPerson.sex = sanitizeSex(contactData.sex);
        contactPerson.starBusinessDetailsId = starBusinessDetailsId;
        contactPerson.starBusinessDetails = starBusinessDetails;
        contactPerson.name = contactData.name.trim();
        contactPerson.familyName = contactData.familyName.trim();
        contactPerson.position = sanitizePosition(contactData.position);

        if (
          contactData.position === POSITIONS.OTHERS &&
          contactData.positionOthers
        ) {
          contactPerson.positionOthers = contactData.positionOthers.trim();
        }

        if (contactData.email) {
          contactPerson.email = normalizedEmail;
        }

        if (contactData.phone) {
          contactPerson.phone = contactData.phone.trim();
        }

        if (contactData.linkedInLink) {
          contactPerson.linkedInLink = normalizeLinkedInUrl(
            contactData.linkedInLink
          );
        }

        if (contactData.noteContactPreference) {
          contactPerson.noteContactPreference =
            contactData.noteContactPreference.trim();
        }

        contactPerson.stateLinkedIn = sanitizeLinkedInState(
          contactData.stateLinkedIn || LINKEDIN_STATES.OPEN
        );
        contactPerson.contact = sanitizeContactType(contactData.contact);

        if (contactData.note) {
          contactPerson.note = contactData.note.trim();
        }

        // Set isDecisionMaker based on contact type for imported contacts
        setDecisionMakerFromContactType(contactPerson);

        contactPersonsToSave.push(contactPerson);
      } catch (error) {
        results.errors++;
        results.errorsList.push({
          contact: `${contactData.name} ${contactData.familyName}`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Bulk save all valid contact persons
    if (contactPersonsToSave.length > 0) {
      try {
        const savedContactPersons = await contactPersonRepository.save(
          contactPersonsToSave,
          { chunk: 100 } // Save in chunks of 100
        );
        results.imported = savedContactPersons.length;
        results.importedContactPersons = savedContactPersons.map(
          formatContactPersonResponse
        );
      } catch (error) {
        console.error("Error during bulk save:", error);
        results.errors += contactPersonsToSave.length;
        results.errorsList.push({
          contact: "Bulk save operation",
          error:
            error instanceof Error ? error.message : "Database save failed",
        });
      }
    }

    results.endTime = new Date();

    const executionTime =
      results.endTime.getTime() - results.startTime.getTime();
    console.log(
      `Bulk import completed in ${executionTime}ms. Imported: ${results.imported}/${results.total}`
    );

    return res.status(200).json({
      success: true,
      message: `Bulk import completed. ${results.imported} contact persons imported successfully.`,
      data: {
        ...results,
        executionTimeMs: executionTime,
      },
    });
  } catch (error) {
    console.error("Error bulk importing contact persons:", error);
    return next(new ErrorHandler("Failed to bulk import contact persons", 500));
  }
};

// 15. Quick Add Contact Person to Star Business
export const quickAddContactPerson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { starBusinessDetailsId } = req.params;
    const { name, familyName, email, phone, position, contact } = req.body;

    // Validate minimum required fields
    if (!name || !familyName) {
      return next(new ErrorHandler("Name and family name are required", 400));
    }

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);
    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);

    // Verify star business exists
    const starBusinessDetails = await starBusinessDetailsRepository.findOne({
      where: { id: starBusinessDetailsId },
      relations: ["customer"],
    });

    if (!starBusinessDetails) {
      return next(new ErrorHandler("Star business not found", 404));
    }

    // Quick duplicate check by name and email
    const existingQuery = contactPersonRepository
      .createQueryBuilder("contactPerson")
      .where("contactPerson.starBusinessDetailsId = :starBusinessDetailsId", {
        starBusinessDetailsId,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            "LOWER(contactPerson.name) = :name AND LOWER(contactPerson.familyName) = :familyName",
            {
              name: name.toLowerCase(),
              familyName: familyName.toLowerCase(),
            }
          );
          if (email) {
            qb.orWhere("LOWER(contactPerson.email) = :email", {
              email: email.toLowerCase(),
            });
          }
        })
      );

    const existingContact = await existingQuery.getOne();

    if (existingContact) {
      return next(
        new ErrorHandler(
          "A similar contact person already exists for this business",
          400
        )
      );
    }

    // Create contact person with minimal fields
    const contactPerson = new ContactPerson();
    contactPerson.name = name.trim();
    contactPerson.familyName = familyName.trim();
    contactPerson.starBusinessDetailsId = starBusinessDetailsId;
    contactPerson.starBusinessDetails = starBusinessDetails;

    // Optional fields
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

    // Set defaults
    contactPerson.sex = "Not Specified";
    contactPerson.stateLinkedIn = "open";
    if (!contact) {
      contactPerson.contact = "";
    }

    // Set isDecisionMaker based on contact type for quick add
    setDecisionMakerFromContactType(contactPerson);

    // Save to database
    const savedContactPerson = await contactPersonRepository.save(
      contactPerson
    );

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
  } catch (error) {
    console.error("Error quick adding contact person:", error);
    return next(new ErrorHandler("Failed to add contact person", 500));
  }
};

// 3. Get Single Contact Person
export const getContactPerson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);

    const contactPerson = await contactPersonRepository.findOne({
      where: { id },
      relations: ["starBusinessDetails", "starBusinessDetails.customer"],
    });

    if (!contactPerson) {
      return next(new ErrorHandler("Contact person not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: formatContactPersonResponse(contactPerson),
    });
  } catch (error) {
    console.error("Error fetching contact person:", error);
    return next(new ErrorHandler("Failed to fetch contact person", 500));
  }
};

// 4. Get All Contact Persons with Filters
export const getAllContactPersons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 30,
      search,
      businessName,
      starBusinessDetailsId,
      position,
      sex,
      stateLinkedIn,
      contact,
      hasEmail,
      hasPhone,
      hasLinkedIn,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const customerRepository = AppDataSource.getRepository(Customer);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get all star business customers with their contact persons
    const allCustomers = await customerRepository.find({
      where: {},
      relations: [
        "starBusinessDetails",
        "starBusinessDetails.contactPersons",
        "businessDetails",
      ],
      order: { createdAt: "DESC" },
    });

    console.log(`Total star business customers found: ${allCustomers.length}`);

    // Extract and flatten all contact persons from all customers
    let allContactPersons = allCustomers.flatMap(
      (customer) =>
        customer.starBusinessDetails?.contactPersons?.map((contactPerson) => ({
          ...contactPerson,
          starBusinessDetails: customer.starBusinessDetails,
          customer: customer,
        })) || []
    );

    console.log(`Total contact persons found: ${allContactPersons.length}`);

    // Apply search filter if provided
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      allContactPersons = allContactPersons.filter(
        (contactPerson) =>
          contactPerson.name?.toLowerCase().includes(searchTerm) ||
          contactPerson.familyName?.toLowerCase().includes(searchTerm) ||
          contactPerson.email?.toLowerCase().includes(searchTerm) ||
          contactPerson.phone?.toLowerCase().includes(searchTerm) ||
          contactPerson.customer?.companyName
            ?.toLowerCase()
            .includes(searchTerm)
      );
    }

    // Business name filter
    if (businessName) {
      const businessTerm = businessName.toString().toLowerCase();
      allContactPersons = allContactPersons.filter((contactPerson) =>
        contactPerson.customer?.companyName
          ?.toLowerCase()
          .includes(businessTerm)
      );
    }

    // Star business details ID filter
    if (starBusinessDetailsId) {
      allContactPersons = allContactPersons.filter(
        (contactPerson) =>
          contactPerson.starBusinessDetails?.id === starBusinessDetailsId
      );
    }

    // Position filter
    if (position) {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => contactPerson.position === position
      );
    }

    // Sex filter
    if (sex) {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => contactPerson.sex === sex
      );
    }

    // LinkedIn state filter
    if (stateLinkedIn) {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => contactPerson.stateLinkedIn === stateLinkedIn
      );
    }

    // Contact type filter
    if (contact) {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => contactPerson.contact === contact
      );
    }

    // Has email filter
    if (hasEmail === "true") {
      allContactPersons = allContactPersons.filter(
        (contactPerson) =>
          contactPerson.email !== null && contactPerson.email !== undefined
      );
    } else if (hasEmail === "false") {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => !contactPerson.email
      );
    }

    // Has phone filter
    if (hasPhone === "true") {
      allContactPersons = allContactPersons.filter(
        (contactPerson) =>
          contactPerson.phone !== null && contactPerson.phone !== undefined
      );
    } else if (hasPhone === "false") {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => !contactPerson.phone
      );
    }

    // Has LinkedIn filter
    if (hasLinkedIn === "true") {
      allContactPersons = allContactPersons.filter(
        (contactPerson) =>
          contactPerson.linkedInLink !== null &&
          contactPerson.linkedInLink !== undefined
      );
    } else if (hasLinkedIn === "false") {
      allContactPersons = allContactPersons.filter(
        (contactPerson) => !contactPerson.linkedInLink
      );
    }

    // Apply sorting
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "familyName",
      "position",
      "stateLinkedIn",
      "contact",
    ];
    const sortField: any = validSortFields.includes(sortBy as string)
      ? sortBy
      : "createdAt";
    const order = sortOrder === "ASC" ? "ASC" : "DESC";

    allContactPersons.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      if (order === "ASC") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const total = allContactPersons.length;
    const paginatedContactPersons = allContactPersons.slice(
      skip,
      skip + limitNum
    );

    // Format response
    const formattedContactPersons = paginatedContactPersons.map(
      (contactPerson) => {
        const customer = contactPerson.customer;
        const starBusinessDetails = contactPerson.starBusinessDetails;
        const businessDetails = customer?.businessDetails;

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
          isDecisionMaker: true,
          decisionMakerState: contactPerson.decisionMakerState,
          // Business info
          businessId: customer?.id || null,
          businessName: customer?.companyName || null,
          businessLegalName: customer?.legalName || null,
          businessEmail: customer?.email || null,
          businessContactEmail: customer?.contactEmail || null,
          businessContactPhone: customer?.contactPhoneNumber || null,

          // Business details
          website: businessDetails?.website || null,
          city: businessDetails?.city || null,
          state: businessDetails?.state || null,
          country: businessDetails?.country || null,
          address: businessDetails?.address || null,
          postalCode: businessDetails?.postalCode || null,
          category: businessDetails?.category || null,
          industry:
            starBusinessDetails?.industry || businessDetails?.industry || null,

          // Display fields
          fullName: `${contactPerson.name || ""} ${
            contactPerson.familyName || ""
          }`.trim(),
          displayPosition: contactPerson.position || "",
          note: contactPerson.note || null,
          noteContactPreference: contactPerson.noteContactPreference || null,
          positionOthers: null,
        };
      }
    );

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
  } catch (error) {
    console.error("Error fetching contact persons:", error);
    return next(new ErrorHandler("Failed to fetch contact persons", 500));
  }
};

// 5. Get Contact Persons by Star Business
export const getContactPersonsByStarBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { starBusinessDetailsId } = req.params;

    const customerRepository = AppDataSource.getRepository(Customer);

    // Find the customer that has this star business details
    const customer = await customerRepository.findOne({
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
      return next(new ErrorHandler("Star business not found", 404));
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

        // Business info
        businessId: customer.id,
        businessName: customer.companyName,
        businessLegalName: customer.legalName,
        businessEmail: customer.email,
        businessContactEmail: customer.contactEmail,
        businessContactPhone: customer.contactPhoneNumber,

        // Business details
        website: businessDetails?.website || null,
        city: businessDetails?.city || null,
        state: businessDetails?.state || null,
        country: businessDetails?.country || null,
        address: businessDetails?.address || null,
        postalCode: businessDetails?.postalCode || null,
        category: businessDetails?.category || null,
        industry:
          starBusinessDetails?.industry || businessDetails?.industry || null,

        // Display fields
        fullName: `${contactPerson.name || ""} ${
          contactPerson.familyName || ""
        }`.trim(),
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
  } catch (error) {
    console.error("Error fetching contact persons by star business:", error);
    return next(
      new ErrorHandler("Failed to fetch contact persons for star business", 500)
    );
  }
};

// 6. Delete Contact Person
// 6. Delete Contact Person
export const deleteContactPerson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);
    const requestedItemRepository = AppDataSource.getRepository(RequestedItem);

    const contactPerson = await contactPersonRepository.findOne({
      where: { id },
      relations: ["requestedItems"],
    });

    if (!contactPerson) {
      return next(new ErrorHandler("Contact person not found", 404));
    }

    const hasRequestedItems = await requestedItemRepository.exists({
      where: { contactPersonId: id },
    });

    if (hasRequestedItems) {
      return next(
        new ErrorHandler(
          "Cannot delete contact person because they have associated item requests. Please remove the item requests first.",
          400
        )
      );
    }

    await contactPersonRepository.remove(contactPerson);

    return res.status(200).json({
      success: true,
      message: "Contact person deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contact person:", error);
    return next(new ErrorHandler("Failed to delete contact person", 500));
  }
};

// 7. Bulk Delete Contact Persons
export const bulkDeleteContactPersons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(
        new ErrorHandler("Array of contact person IDs is required", 400)
      );
    }

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);

    const result = await contactPersonRepository.delete(ids);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.affected} contact persons`,
      data: {
        deletedCount: result.affected,
      },
    });
  } catch (error) {
    console.error("Error bulk deleting contact persons:", error);
    return next(new ErrorHandler("Failed to delete contact persons", 500));
  }
};

// 9. Update LinkedIn State in Bulk
export const bulkUpdateLinkedInState = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids, stateLinkedIn } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(
        new ErrorHandler("Array of contact person IDs is required", 400)
      );
    }

    if (!stateLinkedIn) {
      return next(new ErrorHandler("LinkedIn state is required", 400));
    }

    const sanitizedState = sanitizeLinkedInState(stateLinkedIn);

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);

    const result = await contactPersonRepository
      .createQueryBuilder()
      .update(ContactPerson)
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
  } catch (error) {
    console.error("Error updating LinkedIn state in bulk:", error);
    return next(new ErrorHandler("Failed to update LinkedIn state", 500));
  }
};

// 10. Get Contact Person Statistics
export const getContactPersonStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { starBusinessDetailsId } = req.query;

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);

    let baseQuery = contactPersonRepository.createQueryBuilder("contactPerson");

    if (starBusinessDetailsId) {
      baseQuery.where(
        "contactPerson.starBusinessDetailsId = :starBusinessDetailsId",
        {
          starBusinessDetailsId,
        }
      );
    }

    // Total count
    const totalContactPersons = await baseQuery.getCount();

    // Count by position
    const positionCounts = await baseQuery
      .select("contactPerson.position, COUNT(*) as count")
      .groupBy("contactPerson.position")
      .orderBy("count", "DESC")
      .getRawMany();

    // Count by LinkedIn state
    const linkedInStateCounts = await baseQuery
      .select("contactPerson.stateLinkedIn, COUNT(*) as count")
      .groupBy("contactPerson.stateLinkedIn")
      .orderBy("count", "DESC")
      .getRawMany();

    // Count by contact type
    const contactTypeCounts = await baseQuery
      .select("contactPerson.contact, COUNT(*) as count")
      .where("contactPerson.contact IS NOT NULL")
      .andWhere("contactPerson.contact != :empty", { empty: "" })
      .groupBy("contactPerson.contact")
      .orderBy("count", "DESC")
      .getRawMany();

    // Count by sex

    // Contact information availability
    const withEmail = await baseQuery
      .clone()
      .where("contactPerson.email IS NOT NULL")
      .getCount();

    const withPhone = await baseQuery
      .clone()
      .where("contactPerson.phone IS NOT NULL")
      .getCount();

    const withLinkedIn = await baseQuery
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
  } catch (error) {
    console.error("Error fetching contact person statistics:", error);
    return next(new ErrorHandler("Failed to fetch statistics", 500));
  }
};

// 11. Export Contact Persons to CSV
export const exportContactPersonsToCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      starBusinessDetailsId,
      ids,
      search,
      position,
      sex,
      stateLinkedIn,
      contact,
    } = req.query;

    const contactPersonRepository = AppDataSource.getRepository(ContactPerson);

    let query = contactPersonRepository
      .createQueryBuilder("contactPerson")
      .leftJoinAndSelect(
        "contactPerson.starBusinessDetails",
        "starBusinessDetails"
      )
      .leftJoinAndSelect("starBusinessDetails.customer", "customer");

    // Apply filters
    if (ids && typeof ids === "string") {
      const idsArray = ids.split(",");
      query.andWhere("contactPerson.id IN (:...ids)", { ids: idsArray });
    }

    if (starBusinessDetailsId) {
      query.andWhere(
        "contactPerson.starBusinessDetailsId = :starBusinessDetailsId",
        {
          starBusinessDetailsId,
        }
      );
    }

    if (search) {
      const searchTerm = `%${search}%`;
      query.andWhere(
        new Brackets((qb) => {
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
        })
      );
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

    const contactPersons = await query.getMany();

    // Format data for CSV export
    const csvData = contactPersons.map((person) => ({
      ID: person.id,
      "Business Name": person.starBusinessDetails?.customer?.companyName || "",
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
    }));

    return res.status(200).json({
      success: true,
      data: csvData,
      count: csvData.length,
    });
  } catch (error) {
    console.error("Error exporting contact persons:", error);
    return next(new ErrorHandler("Failed to export contact persons", 500));
  }
};

// Helper Functions

function sanitizeSex(value: any): Sex {
  if (!value) return "Not Specified";
  const stringValue = String(value).trim().toLowerCase();
  if (stringValue === "male") return "male";
  if (stringValue === "female") return "female";
  if (stringValue === "Not Specified") return "Not Specified";
  return "Not Specified";
}

function sanitizePosition(value: any): Position {
  if (!value) return "";
  const stringValue = String(value).trim();
  const validPositions: Position[] = [
    "Einkauf",
    "Entwickler",
    "Produktionsleiter",
    "Betriebsleiter",
    "Geschäftsführer",
    "Owner",
    "Others",
  ];
  if (validPositions.includes(stringValue as Position)) {
    return stringValue as Position;
  }
  return "";
}

function sanitizeLinkedInState(value: any): LinkedInState {
  if (!value) return "open";
  const stringValue = String(value).trim();
  const validStates: LinkedInState[] = [
    "open",
    "NoLinkedIn",
    "Vernetzung geschickt",
    "Linked angenommen",
    "Erstkontakt",
    "im Gespräch",
    "NichtAnsprechpartner",
  ];
  if (validStates.includes(stringValue as LinkedInState)) {
    return stringValue as LinkedInState;
  }
  return "open";
}

function sanitizeContactType(value: any): ContactType {
  if (!value) return "";
  const stringValue = String(value).trim();
  const validTypes: ContactType[] = [
    "User",
    "Purchaser",
    "Influencer",
    "Gatekeeper",
    "DecisionMaker technical",
    "DecisionMaker financial",
    "real DecisionMaker",
  ];
  if (validTypes.includes(stringValue as ContactType)) {
    return stringValue as ContactType;
  }
  return "";
}

function normalizeLinkedInUrl(url: string): string {
  if (!url) return "";
  url = url.trim();

  // Add https:// if no protocol is specified
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Ensure it's a LinkedIn URL
  if (!url.includes("linkedin.com")) {
    return url; // Return as-is if not a LinkedIn URL
  }

  // Normalize to https
  url = url.replace("http://", "https://");

  // Remove trailing slashes
  url = url.replace(/\/+$/, "");

  return url;
}

function formatContactPersonResponse(contactPerson: any) {
  return {
    id: contactPerson.id,
    sex: contactPerson.sex,
    starBusinessDetailsId: contactPerson.starBusinessDetailsId,
    businessName:
      contactPerson.starBusinessDetails?.customer?.companyName || null,
    businessId: contactPerson.starBusinessDetails?.customer?.id || null,
    name: contactPerson.name,
    familyName: contactPerson.familyName,
    fullName: `${contactPerson.name} ${contactPerson.familyName}`,
    position: contactPerson.position,
    positionOthers: contactPerson.positionOthers,
    displayPosition:
      contactPerson.position === "Others" && contactPerson.positionOthers
        ? contactPerson.positionOthers
        : contactPerson.position,
    email: contactPerson.email,
    phone: contactPerson.phone,
    linkedInLink: contactPerson.linkedInLink,
    noteContactPreference: contactPerson.noteContactPreference,
    stateLinkedIn: contactPerson.stateLinkedIn,
    contact: contactPerson.contact,
    isDecisionMaker: contactPerson.isDecisionMaker,
    note: contactPerson.note,
    createdAt: contactPerson.createdAt,
    updatedAt: contactPerson.updatedAt,
  };
}

// Add missing import
import { Not } from "typeorm";
import { link } from "pdfkit";
import { RequestedItem } from "../models/requested_items";
export const getAllStarBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      page = 1,
      limit = 50,
      withContactsCount = "true",
    } = req.query;

    const customerRepository = AppDataSource.getRepository(Customer);
    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const includeContactsCount = withContactsCount === "true";

    // Modified query to include both star_business and star_customer stages
    let query = customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.starBusinessDetails", "starBusinessDetails")
      .leftJoinAndSelect("customer.businessDetails", "businessDetails")
      .where("customer.stage IN (:...stages)", {
        stages: ["star_business", "star_customer"],
      });

    // Add search filter
    if (search) {
      const searchTerm = `%${search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where("customer.companyName ILIKE :search", { search: searchTerm })
            .orWhere("customer.legalName ILIKE :search", { search: searchTerm })
            .orWhere("customer.email ILIKE :search", { search: searchTerm })
            .orWhere("businessDetails.city ILIKE :search", {
              search: searchTerm,
            })
            .orWhere("businessDetails.country ILIKE :search", {
              search: searchTerm,
            });
        })
      );
    }

    query.orderBy("customer.companyName", "ASC");

    const [starRecords, total] = await query
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const formattedRecords = await Promise.all(
      starRecords.map(async (record) => {
        const baseData = {
          id: record.starBusinessDetails?.id,
          customerId: record.id,
          companyName: record.companyName,
          legalName: record.legalName,
          email: record.email,
          contactEmail: record.contactEmail,
          contactPhoneNumber: record.contactPhoneNumber,
          website: record.businessDetails?.website,
          city: record.businessDetails?.city,
          country: record.businessDetails?.country,
          address: record.businessDetails?.address,
          postalCode: record.businessDetails?.postalCode,
          industry:
            record.starBusinessDetails?.industry ||
            record.businessDetails?.industry,
          inSeries: record.starBusinessDetails?.inSeries,
          madeIn: record.starBusinessDetails?.madeIn,
          device: record.starBusinessDetails?.device,
          lastChecked: record.starBusinessDetails?.lastChecked,
          checkedBy: record.starBusinessDetails?.checkedBy,
          comment: record.starBusinessDetails?.comment,
          stage: record.stage,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };

        if (
          includeContactsCount &&
          record.starBusinessDetails?.id &&
          record.stage === "star_business"
        ) {
          const contactPersonRepository =
            AppDataSource.getRepository(ContactPerson);
          const contactCount = await contactPersonRepository.count({
            where: { starBusinessDetailsId: record.starBusinessDetails.id },
          });
          return { ...baseData, contactPersonsCount: contactCount };
        }

        if (includeContactsCount && record.stage === "star_customer") {
          return { ...baseData, contactPersonsCount: 0 };
        }

        return baseData;
      })
    );

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
  } catch (error) {
    console.error("Error fetching star businesses and customers:", error);
    return next(
      new ErrorHandler("Failed to fetch star businesses and customers", 500)
    );
  }
};

export const getStarBusinessesWithoutContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, city, country, industry } = req.query;

    const customerRepository = AppDataSource.getRepository(Customer);

    const starCustomers = await customerRepository.find({
      where: {
        stage: In(["star_business", "star_customer"]),
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

    console.log(
      `Total star businesses and customers found: ${starCustomers.length}`
    );

    // Filter records based on their stage and contact persons
    let filteredRecords = starCustomers.filter((customer) => {
      // For star_business: must have starBusinessDetails and no contact persons
      if (customer.stage === "star_business") {
        return (
          customer.starBusinessDetails &&
          (!customer.starBusinessDetails.contactPersons ||
            customer.starBusinessDetails.contactPersons.length === 0)
        );
      }

      // For star_customer: they don't have contact persons by definition
      if (customer.stage === "star_customer") {
        return (
          customer.starBusinessDetails &&
          (!customer.starBusinessDetails.contactPersons ||
            customer.starBusinessDetails.contactPersons.length === 0)
        );
      }

      return false;
    });

    console.log(
      `Star businesses and customers without contacts: ${filteredRecords.length}`
    );

    // Apply search filter if provided
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredRecords = filteredRecords.filter(
        (customer) =>
          customer.companyName?.toLowerCase().includes(searchTerm) ||
          customer.legalName?.toLowerCase().includes(searchTerm) ||
          customer.email?.toLowerCase().includes(searchTerm) ||
          customer.contactEmail?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply city filter if provided
    if (city) {
      const cityTerm = city.toString().toLowerCase();
      filteredRecords = filteredRecords.filter((customer) =>
        customer.businessDetails?.city?.toLowerCase().includes(cityTerm)
      );
    }

    // Apply country filter if provided
    if (country) {
      const countryTerm = country.toString().toLowerCase();
      filteredRecords = filteredRecords.filter((customer) =>
        customer.businessDetails?.country?.toLowerCase().includes(countryTerm)
      );
    }

    // Apply industry filter if provided
    if (industry) {
      const industryTerm = industry.toString().toLowerCase();
      filteredRecords = filteredRecords.filter(
        (customer) =>
          customer.starBusinessDetails?.industry
            ?.toLowerCase()
            .includes(industryTerm) ||
          customer.businessDetails?.industry
            ?.toLowerCase()
            .includes(industryTerm)
      );
    }

    // Format the response
    const formattedRecords = filteredRecords.map((customer) => {
      const starBusiness = customer.starBusinessDetails;
      const businessDetails = customer.businessDetails;

      const baseData = {
        id: starBusiness?.id || customer.id,
        customerId: customer.id,
        companyName: customer.companyName || "N/A",
        legalName: customer.legalName || "N/A",
        email: customer.email || "N/A",
        contactEmail: customer.contactEmail || "N/A",
        contactPhoneNumber: customer.contactPhoneNumber || "N/A",
        website: businessDetails?.website || "N/A",
        city: businessDetails?.city || "N/A",
        state: businessDetails?.state || "N/A",
        country: businessDetails?.country || "N/A",
        address: businessDetails?.address || "N/A",
        postalCode: businessDetails?.postalCode || "N/A",
        category: businessDetails?.category || "N/A",
        industry: starBusiness?.industry || businessDetails?.industry || "N/A",
        stage: customer.stage,
        createdAt: starBusiness?.createdAt || customer.createdAt,
        updatedAt: starBusiness?.updatedAt || customer.updatedAt,
        contactPersonsCount: 0,
        needsContactPerson: customer.stage === "star_business",
      };

      if (customer.stage === "star_business") {
        return {
          ...baseData,
          inSeries: starBusiness?.inSeries,
          madeIn: starBusiness?.madeIn,
          device: starBusiness?.device,
          lastChecked: starBusiness?.lastChecked,
          checkedBy: starBusiness?.checkedBy,
          convertedTimestamp: starBusiness?.converted_timestamp,
          comment: starBusiness?.comment,
          daysSinceConverted: starBusiness?.converted_timestamp
            ? Math.floor(
                (Date.now() -
                  new Date(starBusiness.converted_timestamp).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
        };
      }

      return baseData;
    });

    const starBusinesses = formattedRecords.filter(
      (record) => record.stage === "star_business"
    );
    const starCustomersOnly = formattedRecords.filter(
      (record) => record.stage === "star_customer"
    );

    const starBusinessesWithDays = starBusinesses.filter(
      (b: any) => b.daysSinceConverted !== null
    );
    const averageDaysSinceConverted =
      starBusinessesWithDays.length > 0
        ? Math.round(
            starBusinessesWithDays.reduce(
              (acc, b: any) => acc + (b.daysSinceConverted || 0),
              0
            ) / starBusinessesWithDays.length
          )
        : 0;

    return res.status(200).json({
      success: true,
      message:
        "Star businesses and customers without contact persons fetched successfully",
      data: {
        starBusinesses: formattedRecords, // Keeping same response structure for compatibility
        total: filteredRecords.length,
        summary: {
          totalStarBusinesses: starBusinesses.length,
          totalStarCustomers: starCustomersOnly.length,
          totalWithoutContacts: filteredRecords.length,
          averageDaysSinceConverted,
        },
      },
    });
  } catch (error) {
    console.error(
      "Error fetching star businesses and customers without contacts:",
      error
    );
    return next(
      new ErrorHandler(
        "Failed to fetch star businesses and customers without contacts",
        500
      )
    );
  }
};
export const getStarBusinessesWithContactSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { minContacts = 0, maxContacts } = req.query;

    const minContactsNum = parseInt(minContacts as string);
    const maxContactsNum = maxContacts
      ? parseInt(maxContacts as string)
      : undefined;

    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);

    // Get all star businesses with contact person count
    const query = starBusinessDetailsRepository
      .createQueryBuilder("starBusinessDetails")
      .leftJoinAndSelect("starBusinessDetails.customer", "customer")
      .leftJoinAndSelect("customer.businessDetails", "businessDetails")
      .loadRelationCountAndMap(
        "starBusinessDetails.contactPersonsCount",
        "starBusinessDetails.contactPersons"
      )
      .where("customer.stage = :stage", { stage: "star_business" });

    const allStarBusinesses = await query.getMany();
    console.log(allStarBusinesses);
    // Filter by contact count
    const filteredBusinesses = allStarBusinesses.filter((business: any) => {
      const count = business.contactPersonsCount || 0;
      if (maxContactsNum !== undefined) {
        return count >= minContactsNum && count <= maxContactsNum;
      }
      return count >= minContactsNum;
    });

    // Group businesses by contact count
    const groupedByContactCount: Record<number, any[]> = {};
    filteredBusinesses.forEach((business: any) => {
      const count = business.contactPersonsCount || 0;
      if (!groupedByContactCount[count]) {
        groupedByContactCount[count] = [];
      }
      groupedByContactCount[count].push({
        id: business.id,
        customerId: business.customer.id,
        companyName: business.customer.companyName,
        city: business.customer.businessDetails?.city,
        country: business.customer.businessDetails?.country,
        industry:
          business.industry || business.customer.businessDetails?.industry,
        contactPersonsCount: count,
      });
    });

    // Calculate statistics
    const totalStarBusinesses = allStarBusinesses.length;
    const withContacts = allStarBusinesses.filter(
      (b: any) => b.contactPersonsCount > 0
    ).length;
    const withoutContacts = totalStarBusinesses - withContacts;

    const avgContactsPerBusiness =
      withContacts > 0
        ? allStarBusinesses.reduce(
            (sum: number, b: any) => sum + (b.contactPersonsCount || 0),
            0
          ) / withContacts
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStarBusinesses,
          withContacts,
          withoutContacts,
          percentageWithContacts:
            totalStarBusinesses > 0
              ? ((withContacts / totalStarBusinesses) * 100).toFixed(2)
              : "0",
          averageContactsPerBusiness: avgContactsPerBusiness.toFixed(2),
        },
        groupedByContactCount,
        businesses: filteredBusinesses.map((business: any) => ({
          id: business.id,
          customerId: business.customer.id,
          companyName: business.customer.companyName,
          legalName: business.customer.legalName,
          email: business.customer.email,
          city: business.customer.businessDetails?.city,
          country: business.customer.businessDetails?.country,
          industry:
            business.industry || business.customer.businessDetails?.industry,
          contactPersonsCount: business.contactPersonsCount || 0,
          inSeries: business.inSeries,
          madeIn: business.madeIn,
          device: business.device,
          lastChecked: business.lastChecked,
          convertedTimestamp: business.converted_timestamp,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching star businesses contact summary:", error);
    return next(
      new ErrorHandler("Failed to fetch star businesses contact summary", 500)
    );
  }
};

function isDecisionMakerFromContactType(contactType: ContactType): boolean {
  const decisionMakerTypes = [
    "DecisionMaker technical",
    "DecisionMaker financial",
    "real DecisionMaker",
  ];
  return decisionMakerTypes.includes(contactType);
}
