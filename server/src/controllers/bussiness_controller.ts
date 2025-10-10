// controllers/businessController.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { BusinessDetails } from "../models/business_details";
import ErrorHandler from "../utils/errorHandler";
import { In, Like } from "typeorm";

// Constants for business sources and status (maintaining compatibility)
export const BUSINESS_SOURCE = {
  GOOGLE_MAPS: "Google Maps",
  MANUAL: "Manual",
  IMPORT: "Import",
};

export const BUSINESS_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  NO_WEBSITE: "no_website",
  VERIFIED: "verified",
};

export const bulkImportBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { businesses, source = BUSINESS_SOURCE.GOOGLE_MAPS } = req.body;

    // Validate input
    if (!businesses || !Array.isArray(businesses)) {
      return next(new ErrorHandler("Businesses array is required", 400));
    }

    if (businesses.length === 0) {
      return next(new ErrorHandler("Businesses array cannot be empty", 400));
    }

    console.log(
      `Starting bulk import of ${businesses.length} businesses from source: ${source}...`
    );

    const customerRepository = AppDataSource.getRepository(Customer);
    const businessDetailsRepository =
      AppDataSource.getRepository(BusinessDetails);

    // Initialize results tracking
    const results = {
      total: businesses.length,
      imported: 0,
      skippedInvalidData: 0,
      duplicates: 0,
      errors: 0,
      errorsList: [] as Array<{ business: string; error: string }>,
      duplicateEntries: [] as Array<{
        business: any;
        reason: string;
        existingRecord?: any;
      }>,
      importedBusinesses: [] as Array<any>,
      startTime: new Date(),
      endTime: null as Date | null,
    };

    // Batch check for existing businesses - more efficient
    const businessesToCheck: Array<{
      index: number;
      data: any;
      normalizedEmail: string;
      normalizedWebsite: string | null;
      normalizedCompanyName: string;
    }> = [];

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

      // Normalize data for duplicate checking
      const normalizedEmail = businessData.email
        ? businessData.email.trim().toLowerCase()
        : `${businessData.name
            .toLowerCase()
            .replace(/\s+/g, ".")}@imported.business`;

      const normalizedWebsite = businessData.website
        ? normalizeWebsite(businessData.website)
        : null;

      const normalizedCompanyName = businessData.name.trim().toLowerCase();

      businessesToCheck.push({
        index: i,
        data: businessData,
        normalizedEmail,
        normalizedWebsite,
        normalizedCompanyName,
      });
    }

    // Batch query for existing businesses to check duplicates efficiently
    const existingBusinessesByEmail = new Map<string, any>();
    const existingBusinessesByWebsite = new Map<string, any>();
    const existingBusinessesByName = new Map<string, any>();

    // Get all unique emails, websites, and names to check
    const emailsToCheck = businessesToCheck.map((b) => b.normalizedEmail);
    const websitesToCheck = businessesToCheck
      .filter((b) => b.normalizedWebsite)
      .map((b) => b.normalizedWebsite!);
    const namesToCheck = businessesToCheck.map((b) => b.normalizedCompanyName);

    // Query existing customers by email
    if (emailsToCheck.length > 0) {
      const existingByEmail = await customerRepository
        .createQueryBuilder("customer")
        .leftJoinAndSelect("customer.businessDetails", "businessDetails")
        .where("LOWER(customer.email) IN (:...emails)", {
          emails: emailsToCheck,
        })
        .andWhere("customer.stage = :stage", { stage: "business" })
        .getMany();

      existingByEmail.forEach((customer) => {
        existingBusinessesByEmail.set(customer.email.toLowerCase(), {
          id: customer.id,
          companyName: customer.companyName,
          email: customer.email,
          website: customer.businessDetails?.website,
          stage: customer.stage,
        });
      });
    }

    // Query existing businesses by website
    if (websitesToCheck.length > 0) {
      const existingByWebsite = await businessDetailsRepository
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

    // Query existing customers by company name
    if (namesToCheck.length > 0) {
      const existingByName = await customerRepository
        .createQueryBuilder("customer")
        .leftJoinAndSelect("customer.businessDetails", "businessDetails")
        .where("LOWER(customer.companyName) IN (:...names)", {
          names: namesToCheck,
        })
        .andWhere("customer.stage = :stage", { stage: "business" })
        .getMany();

      existingByName.forEach((customer) => {
        existingBusinessesByName.set(customer.companyName.toLowerCase(), {
          id: customer.id,
          companyName: customer.companyName,
          email: customer.email,
          website: customer.businessDetails?.website,
          stage: customer.stage,
        });
      });
    }

    // Process each business and separate duplicates from new entries
    const customersToSave: Customer[] = [];
    const seenInBatch = {
      emails: new Set<string>(),
      websites: new Set<string>(),
      names: new Set<string>(),
    };

    for (const businessToCheck of businessesToCheck) {
      const {
        index,
        data: businessData,
        normalizedEmail,
        normalizedWebsite,
        normalizedCompanyName,
      } = businessToCheck;

      let duplicateReason = "";
      let existingRecord = null;

      // Check for duplicates in current batch
      if (seenInBatch.emails.has(normalizedEmail)) {
        duplicateReason = "Duplicate email in current batch";
      } else if (
        normalizedWebsite &&
        seenInBatch.websites.has(normalizedWebsite)
      ) {
        duplicateReason = "Duplicate website in current batch";
      } else if (seenInBatch.names.has(normalizedCompanyName)) {
        duplicateReason = "Duplicate company name in current batch";
      }

      // Check against existing database records
      if (!duplicateReason) {
        // Check by email
        if (existingBusinessesByEmail.has(normalizedEmail)) {
          duplicateReason = "Email already exists in database";
          existingRecord = existingBusinessesByEmail.get(normalizedEmail);
        }
        // Check by website
        else if (
          normalizedWebsite &&
          existingBusinessesByWebsite.has(normalizedWebsite)
        ) {
          duplicateReason = "Website already exists in database";
          existingRecord = existingBusinessesByWebsite.get(normalizedWebsite);
        }
        // Check by company name
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
            email: normalizedEmail,
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
        const customer = new Customer();

        // Required fields for Customer
        customer.companyName = businessData.name.trim();
        customer.email = normalizedEmail;
        customer.stage = "business";
        customer.contactEmail = businessData.contactEmail
          ? businessData.contactEmail.trim().toLowerCase()
          : normalizedEmail;
        customer.contactPhoneNumber = businessData.contactPhoneNumber
          ? businessData.contactPhoneNumber.trim()
          : businessData.phoneNumber
          ? businessData.phoneNumber.trim()
          : "";

        // Optional fields for Customer
        customer.legalName = businessData.legalName
          ? businessData.legalName.trim()
          : undefined;
        customer.avatar = businessData.avatar
          ? businessData.avatar.trim()
          : undefined;

        // Create BusinessDetails
        const businessDetails = new BusinessDetails();

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
        businessDetails.socialLinks = sanitizeSocialLinks(
          businessData.socialMedia || businessData.socialLinks
        );
        businessDetails.isDeviceMaker = sanitizeIsDeviceMaker(
          businessData.isDeviceMaker
        );
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
        businessDetails.additionalCategories = Array.isArray(
          businessData.additionalCategories
        )
          ? businessData.additionalCategories
              .map((cat: string) => cat.trim())
              .filter(Boolean)
          : undefined;
        businessDetails.industry = businessData.industry
          ? businessData.industry.trim()
          : undefined;
        businessDetails.employeeCount = sanitizeInteger(
          businessData.employeeCount
        );
        businessDetails.isStarBusiness = false;
        businessDetails.isStarCustomer = false;

        customer.businessDetails = businessDetails;

        // Add to batch tracking
        seenInBatch.emails.add(normalizedEmail);
        if (normalizedWebsite) {
          seenInBatch.websites.add(normalizedWebsite);
        }
        seenInBatch.names.add(normalizedCompanyName);

        customersToSave.push(customer);

        console.log(`Prepared business for import: ${customer.companyName}`, {
          email: customer.email,
          website: normalizedWebsite,
          stage: customer.stage,
        });
      } catch (error: any) {
        results.errors++;
        results.errorsList.push({
          business: businessData?.name || `Business at index ${index}`,
          error: error.message || "Unknown processing error",
        });
        console.error(`Error processing business at index ${index}:`, error);
      }
    }

    // Save all non-duplicate customers
    if (customersToSave.length > 0) {
      try {
        console.log(
          `Attempting to save ${customersToSave.length} new businesses to database...`
        );

        // Save in chunks to avoid parameter limits
        const CHUNK_SIZE = 50;
        const savedCustomers: Customer[] = [];

        for (let i = 0; i < customersToSave.length; i += CHUNK_SIZE) {
          const chunk = customersToSave.slice(i, i + CHUNK_SIZE);
          console.log(
            `Saving chunk ${Math.floor(i / CHUNK_SIZE) + 1} with ${
              chunk.length
            } businesses`
          );

          try {
            const savedChunk = await customerRepository.save(chunk);
            savedCustomers.push(...savedChunk);

            // Add saved businesses to results
            savedChunk.forEach((customer) => {
              results.importedBusinesses.push({
                id: customer.id,
                companyName: customer.companyName,
                email: customer.email,
                website: customer.businessDetails?.website,
              });
            });

            console.log(
              `Successfully saved chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`,
              savedChunk.length,
              "businesses"
            );
          } catch (chunkError: any) {
            console.error(
              `Error saving chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`,
              chunkError
            );

            // Try to save individually to identify specific problematic records
            for (const customer of chunk) {
              try {
                const saved = await customerRepository.save(customer);
                savedCustomers.push(saved);
                results.importedBusinesses.push({
                  id: saved.id,
                  companyName: saved.companyName,
                  email: saved.email,
                  website: saved.businessDetails?.website,
                });
              } catch (individualError: any) {
                results.errors++;
                results.errorsList.push({
                  business: customer.companyName,
                  error: individualError.message || "Failed to save",
                });
                console.error(
                  `Failed to save business: ${customer.companyName}`,
                  individualError
                );
              }
            }
          }
        }

        results.imported = savedCustomers.length;
        console.log(`Successfully saved ${savedCustomers.length} businesses.`);
      } catch (error: any) {
        console.error("Error during save operation:", error);
        return next(
          new ErrorHandler(`Failed to save businesses: ${error.message}`, 500)
        );
      }
    } else {
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
  } catch (error: any) {
    console.error("Critical error in bulk import:", error);
    return next(
      new ErrorHandler(`Failed to process bulk import: ${error.message}`, 500)
    );
  }
};

export const createBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      address,
      website,
      description,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      phoneNumber,
      email,
      googlePlaceId,
      googleMapsUrl,
      reviewCount,
      averageRating,
      category,
      additionalCategories,
      socialMedia,
      businessHours,
      source = BUSINESS_SOURCE.MANUAL,
      isDeviceMaker, // New field
      // Customer specific fields
      companyName,
      legalName,
      contactEmail,
      contactPhoneNumber,
    } = req.body;

    // Use companyName if provided, otherwise fall back to name for backward compatibility
    const finalCompanyName = companyName || name;
    const finalEmail = email;

    // Required field validation
    if (!finalCompanyName) {
      return next(new ErrorHandler("Company name is required", 400));
    }

    if (!postalCode) {
      return next(new ErrorHandler("Postal code is required", 400));
    }

    if (!city) {
      return next(new ErrorHandler("City is required", 400));
    }

    if (!website) {
      return next(new ErrorHandler("Website is required", 400));
    }

    if (!source) {
      return next(new ErrorHandler("Source is required", 400));
    }

    if (!isDeviceMaker || !["Yes", "No", "Unsure"].includes(isDeviceMaker)) {
      return next(
        new ErrorHandler(
          "Please specify if this is a device maker (Yes/No/Unsure)",
          400
        )
      );
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const businessDetailsRepository =
      AppDataSource.getRepository(BusinessDetails);

    // Normalize website for comparison (remove trailing slashes, www, etc.)
    const normalizedWebsite = website ? normalizeWebsite(website) : null;

    // UNIQUE CHECK 1: Check for duplicate website
    if (normalizedWebsite) {
      const existingBusinessWithWebsite = await businessDetailsRepository
        .createQueryBuilder("businessDetails")
        .innerJoin("businessDetails.customer", "customer")
        .where("businessDetails.website = :website", {
          website: normalizedWebsite,
        })
        .getOne();

      if (existingBusinessWithWebsite) {
        return next(
          new ErrorHandler("A business with this website already exists", 400)
        );
      }
    }

    // UNIQUE CHECK 2: Check for duplicate company name (case-insensitive)
    const trimmedCompanyName = finalCompanyName.trim();
    const existingCustomerWithCompanyName = await customerRepository
      .createQueryBuilder("customer")
      .where("LOWER(customer.companyName) = LOWER(:companyName)", {
        companyName: trimmedCompanyName,
      })
      .getOne();

    if (existingCustomerWithCompanyName) {
      return next(
        new ErrorHandler(
          "A business with this company name already exists",
          400
        )
      );
    }

    // Optional: Check for duplicate email if provided
    if (finalEmail) {
      const existingCustomerWithEmail = await customerRepository.findOne({
        where: { email: finalEmail.trim().toLowerCase() },
      });

      if (existingCustomerWithEmail) {
        return next(
          new ErrorHandler("A business with this email already exists", 400)
        );
      }
    }

    // Create Customer entity
    const customer = new Customer();
    customer.companyName = trimmedCompanyName;
    customer.email = finalEmail ? finalEmail.trim().toLowerCase() : undefined;
    customer.stage = "business";
    customer.legalName = legalName ? legalName.trim() : undefined;
    customer.contactEmail = contactEmail
      ? contactEmail.trim().toLowerCase()
      : finalEmail
      ? finalEmail.trim().toLowerCase()
      : undefined;
    customer.contactPhoneNumber = contactPhoneNumber
      ? contactPhoneNumber.trim()
      : phoneNumber
      ? phoneNumber.trim()
      : undefined;
    // Create BusinessDetails entity
    const businessDetails = new BusinessDetails();
    businessDetails.businessSource = source as any;
    businessDetails.isDeviceMaker = isDeviceMaker as "Yes" | "No" | "Unsure";
    businessDetails.businessSource = source;
    businessDetails.address = address ? address.trim() : undefined;
    businessDetails.website = normalizedWebsite || undefined;
    businessDetails.description = description ? description.trim() : undefined;
    businessDetails.city = city.trim(); // Required field
    businessDetails.state = state ? state.trim() : undefined;
    businessDetails.country = country ? country.trim() : undefined;
    businessDetails.postalCode = postalCode.trim(); // Required field
    businessDetails.latitude = sanitizeNumber(latitude);
    businessDetails.longitude = sanitizeNumber(longitude);
    businessDetails.contactPhone = phoneNumber ? phoneNumber.trim() : undefined;
    businessDetails.email = email ? email.trim().toLowerCase() : undefined;
    businessDetails.googleMapsUrl = googleMapsUrl
      ? googleMapsUrl.trim()
      : undefined;
    businessDetails.reviewCount = sanitizeInteger(reviewCount);
    businessDetails.category = category ? category.trim() : undefined;
    businessDetails.additionalCategories = Array.isArray(additionalCategories)
      ? additionalCategories.map((cat: string) => cat.trim()).filter(Boolean)
      : undefined;
    businessDetails.socialLinks = sanitizeSocialLinks(socialMedia);
    businessDetails.isStarBusiness = false;
    businessDetails.isStarCustomer = false;

    // Associate BusinessDetails with Customer
    customer.businessDetails = businessDetails;

    // Save to database
    await customerRepository.save(customer);

    // Return response in the expected format
    const responseBusiness = {
      name: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      stage: customer.stage,
      source: customer.businessDetails.businessSource,
      isDeviceMaker: customer.businessDetails.isDeviceMaker,
      ...businessDetails,
      // Include backward compatibility fields
      website: businessDetails.website,
      hasWebsite: !!businessDetails.website,
      phoneNumber: businessDetails.contactPhone,
      businessEmail: businessDetails.email,
      status: BUSINESS_STATUS.ACTIVE, // Default status for new businesses
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      data: responseBusiness,
    });
  } catch (error: any) {
    // Log error for debugging
    console.error("Error creating business:", error);

    // Handle database constraint errors
    if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
      // PostgreSQL or MySQL duplicate key error
      if (error.message.includes("companyName")) {
        return next(
          new ErrorHandler(
            "A business with this company name already exists",
            400
          )
        );
      }
      if (error.message.includes("website")) {
        return next(
          new ErrorHandler("A business with this website already exists", 400)
        );
      }
      if (error.message.includes("email")) {
        return next(
          new ErrorHandler("A business with this email already exists", 400)
        );
      }
    }

    return next(error);
  }
};

// Helper function to normalize website URLs for comparison
const normalizeWebsite = (website: string): string => {
  if (!website) return "";

  let normalized = website.trim().toLowerCase();

  // Remove protocol if present
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove www. if present
  normalized = normalized.replace(/^www\./, "");

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");

  return normalized;
};

// Helper functions for data sanitization
const sanitizeNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
};

const sanitizeInteger = (value: any): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
};

const sanitizeSocialLinks = (socialMedia: any): any => {
  if (!socialMedia || typeof socialMedia !== "object") {
    return undefined;
  }

  const cleaned: any = {};
  let hasAnyValue = false;

  for (const [key, value] of Object.entries(socialMedia)) {
    if (value && typeof value === "string" && value.trim()) {
      cleaned[key] = value.trim();
      hasAnyValue = true;
    }
  }

  return hasAnyValue ? cleaned : undefined;
};

export const getAllBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      postalCode,
      category,
      city,
      country,
      hasWebsite,
      status,
      source,
      minRating,
      maxRating,
      verified,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const customerRepository = AppDataSource.getRepository(Customer);
    const queryBuilder = customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.businessDetails", "businessDetails")
      .where("customer.stage = :stage", { stage: "business" });

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        "(customer.companyName LIKE :search OR customer.legalName LIKE :search OR customer.email LIKE :search OR businessDetails.description LIKE :search OR businessDetails.address LIKE :search OR businessDetails.email LIKE :search OR businessDetails.contactPhone LIKE :search)",
        { search: `%${search}%` }
      );
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
      } else {
        queryBuilder.andWhere("businessDetails.website IS NULL");
      }
    }

    if (source) {
      queryBuilder.andWhere("businessDetails.businessSource = :source", {
        source,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const customers = await queryBuilder
      .orderBy("customer.createdAt", "DESC")
      .skip(skip)
      .take(limitNum)
      .getMany();

    const businesses = customers.map((customer) => {
      const { id: businessId, ...businessDetailsWithoutId } =
        customer.businessDetails || {};

      return {
        id: customer.id, // This will now be customer.id
        name: customer.companyName,
        legalName: customer.legalName,
        email: customer.email,
        contactEmail: customer.contactEmail,
        contactPhoneNumber: customer.contactPhoneNumber,
        stage: customer.stage,
        ...businessDetailsWithoutId, // Spread without the id
        // Backward compatibility fields
        website: customer.businessDetails?.website,
        hasWebsite: !!customer.businessDetails?.website,
        phoneNumber: customer.businessDetails?.contactPhone,
        businessEmail: customer.businessDetails?.email,
        status: BUSINESS_STATUS.ACTIVE, // Default status
        source: customer.businessDetails?.businessSource,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
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
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return next(new ErrorHandler("Failed to fetch businesses", 500));
  }
};

// 5. Update Business
export const updateBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id },
      relations: ["businessDetails"],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    // Check for duplicate email if email is being updated
    if (updateData.email && updateData.email !== customer.email) {
      const existingCustomer = await customerRepository.findOne({
        where: { email: updateData.email.trim().toLowerCase() },
      });
      if (existingCustomer && existingCustomer.id !== id) {
        return next(
          new ErrorHandler("Business with this email already exists", 400)
        );
      }
    }

    // Check for duplicate company name if being updated
    if (updateData.name && updateData.name !== customer.companyName) {
      const existingCustomer = await customerRepository.findOne({
        where: { companyName: updateData.name.trim() },
      });
      if (existingCustomer && existingCustomer.id !== id) {
        return next(
          new ErrorHandler(
            "Business with this company name already exists",
            400
          )
        );
      }
    }

    // Update main customer fields (with backward compatibility)
    if (updateData.name) customer.companyName = updateData.name.trim();
    if (updateData.companyName)
      customer.companyName = updateData.companyName.trim();
    if (updateData.legalName !== undefined)
      customer.legalName = updateData.legalName
        ? updateData.legalName.trim()
        : undefined;
    if (updateData.email)
      customer.email = updateData.email.trim().toLowerCase();
    if (updateData.contactEmail)
      customer.contactEmail = updateData.contactEmail.trim().toLowerCase();
    if (updateData.contactPhoneNumber)
      customer.contactPhoneNumber = updateData.contactPhoneNumber.trim();

    // Update BusinessDetails
    if (!customer.businessDetails) {
      customer.businessDetails = new BusinessDetails();
    }

    const businessDetails = customer.businessDetails;

    // Map update data to BusinessDetails (with backward compatibility)
    if (updateData.address) businessDetails.address = updateData.address.trim();
    if (updateData.isDeviceMaker)
      businessDetails.isDeviceMaker = updateData.isDeviceMaker;
    if (updateData.website !== undefined)
      businessDetails.website = updateData.website
        ? updateData.website.trim()
        : undefined;
    if (updateData.description !== undefined)
      businessDetails.description = updateData.description
        ? updateData.description.trim()
        : undefined;
    if (updateData.city !== undefined)
      businessDetails.city = updateData.city
        ? updateData.city.trim()
        : undefined;
    if (updateData.state !== undefined)
      businessDetails.state = updateData.state
        ? updateData.state.trim()
        : undefined;
    if (updateData.country !== undefined)
      businessDetails.country = updateData.country
        ? updateData.country.trim()
        : undefined;
    if (updateData.postalCode !== undefined)
      businessDetails.postalCode = updateData.postalCode
        ? updateData.postalCode.trim()
        : undefined;
    if (updateData.latitude !== undefined)
      businessDetails.latitude = sanitizeNumber(updateData.latitude);
    if (updateData.longitude !== undefined)
      businessDetails.longitude = sanitizeNumber(updateData.longitude);
    if (updateData.phoneNumber !== undefined)
      businessDetails.contactPhone = updateData.phoneNumber
        ? updateData.phoneNumber.trim()
        : undefined;
    if (updateData.businessEmail !== undefined)
      businessDetails.email = updateData.businessEmail
        ? updateData.businessEmail.trim().toLowerCase()
        : undefined;
    if (updateData.googleMapsUrl !== undefined)
      businessDetails.googleMapsUrl = updateData.googleMapsUrl
        ? updateData.googleMapsUrl.trim()
        : undefined;
    if (updateData.reviewCount !== undefined)
      businessDetails.reviewCount = sanitizeInteger(updateData.reviewCount);
    if (updateData.category !== undefined)
      businessDetails.category = updateData.category
        ? updateData.category.trim()
        : undefined;
    if (updateData.additionalCategories !== undefined)
      businessDetails.additionalCategories = Array.isArray(
        updateData.additionalCategories
      )
        ? updateData.additionalCategories
            .map((cat: string) => cat.trim())
            .filter(Boolean)
        : undefined;
    if (updateData.socialMedia !== undefined)
      businessDetails.socialLinks = sanitizeSocialLinks(updateData.socialMedia);
    if (updateData.source !== undefined)
      businessDetails.businessSource = updateData.source;

    await customerRepository.save(customer);

    // Fetch updated customer
    const updatedCustomer = await customerRepository.findOne({
      where: { id },
      relations: ["businessDetails"],
    });

    // Transform response
    const businessResponse = {
      id: updatedCustomer!.id,
      name: updatedCustomer!.companyName,
      legalName: updatedCustomer!.legalName,
      email: updatedCustomer!.email,
      contactEmail: updatedCustomer!.contactEmail,
      contactPhoneNumber: updatedCustomer!.contactPhoneNumber,
      stage: updatedCustomer!.stage,
      ...updatedCustomer!.businessDetails,
      // Backward compatibility fields
      website: updatedCustomer!.businessDetails?.website,
      hasWebsite: !!updatedCustomer!.businessDetails?.website,
      phoneNumber: updatedCustomer!.businessDetails?.contactPhone,
      businessEmail: updatedCustomer!.businessDetails?.email,
      status: BUSINESS_STATUS.ACTIVE,
      source: updatedCustomer!.businessDetails?.businessSource,
      createdAt: updatedCustomer!.createdAt,
      updatedAt: updatedCustomer!.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: businessResponse,
    });
  } catch (error) {
    return next(error);
  }
};

// 6. Delete Business
export const deleteBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id },
      relations: ["businessDetails"],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    await customerRepository.remove(customer);

    return res.status(200).json({
      success: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// 7. Bulk Delete Businesses
export const bulkDeleteBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new ErrorHandler("Array of business IDs is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);

    const result = await customerRepository.delete(ids);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.affected} businesses`,
      data: {
        deletedCount: result.affected,
      },
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to delete businesses", 500));
  }
};

// 8. Search Businesses by Location
export const searchBusinessesByLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return next(new ErrorHandler("Latitude and longitude are required", 400));
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const rad = parseFloat(radius as string);
    const lim = parseInt(limit as string);

    const customerRepository = AppDataSource.getRepository(Customer);

    // Haversine formula for distance calculation in kilometers
    const customers = await customerRepository
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
    const businesses = customers.map((raw: any) => ({
      id: raw.customer_id,
      name: raw.customer_companyName,
      legalName: raw.customer_legalName,
      email: raw.customer_email,
      contactEmail: raw.customer_contactEmail,
      contactPhoneNumber: raw.customer_contactPhoneNumber,
      stage: raw.customer_stage,
      ...raw.businessDetails,
      distance: raw.distance,
      // Backward compatibility fields
      website: raw.businessDetails_website,
      hasWebsite: !!raw.businessDetails_website,
      phoneNumber: raw.businessDetails_contactPhone,
      businessEmail: raw.businessDetails_email,
      status: BUSINESS_STATUS.ACTIVE,
      source: raw.businessDetails_businessSource,
      createdAt: raw.customer_createdAt,
      updatedAt: raw.customer_updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: businesses,
    });
  } catch (error) {
    return next(
      new ErrorHandler("Failed to search businesses by location", 500)
    );
  }
};

// 9. Get Business Statistics
export const getBusinessStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const businessDetailsRepository =
      AppDataSource.getRepository(BusinessDetails);

    const totalBusinesses = await customerRepository.count({
      where: { stage: "business" },
    });

    const businessesWithWebsite = await businessDetailsRepository
      .createQueryBuilder("businessDetails")
      .innerJoin("businessDetails.customer", "customer")
      .where("customer.stage = :stage", { stage: "business" })
      .andWhere("businessDetails.website IS NOT NULL")
      .getCount();

    const businessesWithoutWebsite = await businessDetailsRepository
      .createQueryBuilder("businessDetails")
      .innerJoin("businessDetails.customer", "customer")
      .where("customer.stage = :stage", { stage: "business" })
      .andWhere("businessDetails.website IS NULL")
      .getCount();

    // Count by source
    const sourceCounts = await businessDetailsRepository
      .createQueryBuilder("businessDetails")
      .innerJoin("businessDetails.customer", "customer")
      .select("businessDetails.businessSource, COUNT(*) as count")
      .where("customer.stage = :stage", { stage: "business" })
      .groupBy("businessDetails.businessSource")
      .orderBy("count", "DESC")
      .getRawMany();

    // Count by country
    const countryCounts = await businessDetailsRepository
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
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch statistics", 500));
  }
};

// 10. Update Business Status in Bulk
export const bulkUpdateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new ErrorHandler("Array of business IDs is required", 400));
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
  } catch (error) {
    return next(new ErrorHandler("Failed to update business status", 500));
  }
};

function sanitizeIsDeviceMaker(
  value: any
): "Yes" | "No" | "Unsure" | undefined {
  if (!value) return undefined;
  const stringValue = String(value).trim();
  if (["Yes", "No", "Unsure"].includes(stringValue)) {
    return stringValue as "Yes" | "No" | "Unsure";
  }
  return undefined;
}

// 4. Get Business by ID
export const getBusinessById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id },
      relations: ["businessDetails"],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    const businessResponse = {
      id: customer.id,
      name: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      stage: customer.stage,
      ...customer.businessDetails,
      website: customer.businessDetails?.website,
      hasWebsite: !!customer.businessDetails?.website,
      phoneNumber: customer.businessDetails?.contactPhone,
      businessEmail: customer.businessDetails?.email,
      status: BUSINESS_STATUS.ACTIVE,
      source: customer.businessDetails?.businessSource,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: businessResponse,
    });
  } catch (error) {
    return next(error);
  }
};
