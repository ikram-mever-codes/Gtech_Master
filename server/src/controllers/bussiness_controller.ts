// controllers/businessController.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { BusinessDetails } from "../models/business_details";
import ErrorHandler from "../utils/errorHandler";
import { In, Like } from "typeorm";
import { StarBusinessDetails } from "../models/star_business_details";
import { StarCustomerDetails } from "../models/star_customer_details";
import crypto from "crypto";
import { CustomerCreator, List, LIST_STATUS } from "../models/list";
import sendEmail from "../services/emailService";
import bcrypt from "bcryptjs";
import { User } from "../models/users";

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

      // Normalize data for duplicate checking (only company name and website)
      const normalizedWebsite = businessData.website
        ? normalizeWebsite(businessData.website)
        : null;

      const normalizedCompanyName = businessData.name.trim().toLowerCase();

      businessesToCheck.push({
        index: i,
        data: businessData,
        normalizedWebsite,
        normalizedCompanyName,
      });
    }

    // Batch query for existing businesses to check duplicates efficiently
    const existingBusinessesByWebsite = new Map<string, any>();
    const existingBusinessesByName = new Map<string, any>();

    // Get all unique websites and names to check
    const websitesToCheck = businessesToCheck
      .filter((b) => b.normalizedWebsite)
      .map((b) => b.normalizedWebsite!);
    const namesToCheck = businessesToCheck.map((b) => b.normalizedCompanyName);

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
      websites: new Set<string>(),
      names: new Set<string>(),
    };

    for (const businessToCheck of businessesToCheck) {
      const {
        index,
        data: businessData,
        normalizedWebsite,
        normalizedCompanyName,
      } = businessToCheck;

      let duplicateReason = "";
      let existingRecord = null;

      // Check for duplicates in current batch
      if (normalizedWebsite && seenInBatch.websites.has(normalizedWebsite)) {
        duplicateReason = "Duplicate website in current batch";
      } else if (seenInBatch.names.has(normalizedCompanyName)) {
        duplicateReason = "Duplicate company name in current batch";
      }

      // Check against existing database records
      if (!duplicateReason) {
        // Check by website
        if (
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
        const customer = new Customer();

        // Required fields for Customer
        customer.companyName = businessData.name.trim();
        customer.email = businessData.email
          ? businessData.email.trim().toLowerCase()
          : `${businessData.name
              .toLowerCase()
              .replace(/\s+/g, ".")}@imported.business`;
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

        // Add to batch tracking (only website and company name)
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
      country = "Germany",
      postalCode,
      latitude,
      longitude,
      phoneNumber,
      email,
      googleMapsUrl,
      reviewCount,
      category,
      additionalCategories,
      socialMedia,
      source = BUSINESS_SOURCE.MANUAL,
      isDeviceMaker,
      starBusinessDetails,
      // Star Customer specific fields
      isStarCustomer,
      starCustomerEmail,
      // Customer specific fields
      companyName,
      legalName,
      contactEmail,
      contactPhoneNumber,
    } = req.body;

    // Get current user from request
    const user = (req as any).user;
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

    // Star Customer validation
    if (isStarCustomer && isDeviceMaker !== "Yes") {
      return next(
        new ErrorHandler(
          "Star Customer can only be created when device maker is Yes",
          400
        )
      );
    }

    if (isStarCustomer && !starCustomerEmail) {
      return next(
        new ErrorHandler("Email is required for Star Customer account", 400)
      );
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const businessDetailsRepository =
      AppDataSource.getRepository(BusinessDetails);
    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);
    const listRepository = AppDataSource.getRepository(List);

    // Normalize website for comparison (remove trailing slashes, www, etc.)
    const normalizedWebsite = website ? normalizeWebsite(website) : null;

    // UNIQUE CHECK 1: Check for duplicate website
    if (normalizedWebsite) {
      const existingBusinessWithWebsite = await businessDetailsRepository
        .createQueryBuilder("businessDetails")
        .leftJoinAndSelect("businessDetails.customer", "customer")
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

    // Check for duplicate email - for star customers or regular businesses
    const emailToCheck = isStarCustomer ? starCustomerEmail : finalEmail;
    if (emailToCheck) {
      const existingCustomerWithEmail = await customerRepository.findOne({
        where: { email: emailToCheck.trim().toLowerCase() },
      });

      if (existingCustomerWithEmail) {
        return next(
          new ErrorHandler("A business with this email already exists", 400)
        );
      }
    }

    // Use transaction to ensure all entities are created together
    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        // Create Customer entity first with minimal data
        const customer = new Customer();
        customer.companyName = trimmedCompanyName;
        customer.legalName = legalName ? legalName.trim() : undefined;

        // Determine customer stage based on star customer and device maker
        if (isStarCustomer) {
          customer.stage = "star_customer";
          customer.email = starCustomerEmail.trim().toLowerCase();
          customer.contactEmail = starCustomerEmail.trim().toLowerCase();
        } else if (isDeviceMaker === "Yes") {
          customer.stage = "star_business";
          customer.email = finalEmail
            ? finalEmail.trim().toLowerCase()
            : undefined;
          customer.contactEmail = contactEmail
            ? contactEmail.trim().toLowerCase()
            : finalEmail
            ? finalEmail.trim().toLowerCase()
            : undefined;
        } else {
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

        // Save customer first without any relationships
        const savedCustomer = await transactionalEntityManager.save(
          Customer,
          customer
        );

        // Create BusinessDetails entity
        const businessDetails = new BusinessDetails();
        businessDetails.businessSource = source as any;
        businessDetails.isDeviceMaker = isDeviceMaker as
          | "Yes"
          | "No"
          | "Unsure";
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
        businessDetails.reviewCount = sanitizeInteger(reviewCount);
        businessDetails.category = category ? category.trim() : undefined;
        businessDetails.additionalCategories = Array.isArray(
          additionalCategories
        )
          ? additionalCategories
              .map((cat: string) => cat.trim())
              .filter(Boolean)
          : undefined;
        businessDetails.socialLinks = sanitizeSocialLinks(socialMedia);
        businessDetails.isStarBusiness = isDeviceMaker === "Yes";
        businessDetails.isStarCustomer = isStarCustomer || false;
        businessDetails.customer = savedCustomer;

        // Set check_by and check_timestamp for device maker status
        businessDetails.check_timestamp = new Date();
        if (user) {
          businessDetails.check_by = user as User;
        }

        // Save BusinessDetails
        const savedBusinessDetails = await transactionalEntityManager.save(
          BusinessDetails,
          businessDetails
        );

        // Create StarBusinessDetails if isDeviceMaker is "Yes"
        let savedStarBusiness = null;
        if (isDeviceMaker === "Yes" && starBusinessDetails) {
          const starBusiness = new StarBusinessDetails();

          // Map star business fields
          if (starBusinessDetails.inSeries) {
            starBusiness.inSeries = starBusinessDetails.inSeries as
              | "Yes"
              | "No";
          }

          if (starBusinessDetails.madeIn) {
            starBusiness.madeIn = starBusinessDetails.madeIn as
              | "Germany"
              | "Switzerland"
              | "Austria";
          }

          if (starBusinessDetails.lastChecked) {
            starBusiness.lastChecked = new Date(
              starBusinessDetails.lastChecked
            );
          }

          if (starBusinessDetails.checkedBy) {
            starBusiness.checkedBy = starBusinessDetails.checkedBy as
              | "manual"
              | "AI";
          }

          if (starBusinessDetails.device) {
            starBusiness.device = starBusinessDetails.device.trim();
          }

          if (starBusinessDetails.industry) {
            starBusiness.industry = starBusinessDetails.industry.trim();
          }

          // Set converted_by and converted_timestamp for star customer conversion
          if (isStarCustomer) {
            starBusiness.converted_timestamp = new Date();
            if (user) {
              starBusiness.convertedBy = user as User;
            }
          }

          starBusiness.customer = savedCustomer;

          // Save StarBusinessDetails
          savedStarBusiness = await transactionalEntityManager.save(
            StarBusinessDetails,
            starBusiness
          );
        }

        // Create StarCustomerDetails if isStarCustomer is true
        let tempPassword = null;
        let defaultList = null;
        let savedStarCustomerDetails = null;

        if (isStarCustomer) {
          // Generate temporary password
          tempPassword = crypto.randomBytes(8).toString("hex");
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          // Create star customer details
          const starCustomerDetails = new StarCustomerDetails();
          starCustomerDetails.customer = savedCustomer;
          starCustomerDetails.taxNumber = "PENDING";
          starCustomerDetails.password = hashedPassword;
          starCustomerDetails.accountVerificationStatus = "verified";
          starCustomerDetails.isEmailVerified = true;
          starCustomerDetails.deliveryAddressLine1 = address || "";
          starCustomerDetails.deliveryPostalCode = postalCode;
          starCustomerDetails.deliveryCity = city;
          starCustomerDetails.deliveryCountry = country;

          savedStarCustomerDetails = await transactionalEntityManager.save(
            StarCustomerDetails,
            starCustomerDetails
          );

          // Create default list for the star customer
          defaultList = new List();
          defaultList.name = `${trimmedCompanyName} - Default List`;
          defaultList.description = `Default list for ${trimmedCompanyName}`;
          defaultList.customer = savedCustomer;
          defaultList.status = LIST_STATUS.ACTIVE;

          // Save the default list
          defaultList = await transactionalEntityManager.save(
            List,
            defaultList
          );
        }

        // Return a clean response object without circular references
        return {
          customer: {
            id: savedCustomer.id,
            companyName: savedCustomer.companyName,
            email: savedCustomer.email,
            stage: savedCustomer.stage,
          },
          businessDetails: {
            id: savedBusinessDetails.id,
            website: savedBusinessDetails.website,
            check_timestamp: savedBusinessDetails.check_timestamp,
            check_by: savedBusinessDetails.check_by
              ? {
                  id: savedBusinessDetails.check_by.id,
                  name: savedBusinessDetails.check_by.name,
                }
              : null,
          },
          starBusinessDetails: savedStarBusiness
            ? {
                id: savedStarBusiness.id,
                device: savedStarBusiness.device,
                converted_timestamp: savedStarBusiness.converted_timestamp,
                convertedBy: savedStarBusiness.convertedBy
                  ? {
                      id: savedStarBusiness.convertedBy.id,
                      name: savedStarBusiness.convertedBy.name,
                    }
                  : null,
              }
            : null,
          starCustomerDetails: savedStarCustomerDetails
            ? {
                id: savedStarCustomerDetails.id,
              }
            : null,
          tempPassword,
          defaultList: defaultList
            ? {
                id: defaultList.id,
                name: defaultList.name,
              }
            : null,
        };
      }
    );

    const { customer, tempPassword, defaultList } = result;

    // Send email if it's a star customer
    if (isStarCustomer && tempPassword) {
      const loginLink = `${process.env.STAR_URL}/login`;
      const message = `
        <h2>Welcome to Our Gtech Customers Portal</h2>
        <p>Your Star Customer account has been created with the following credentials:</p>
        <p><strong>Company Name:</strong> ${customer.companyName}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please login <a href="${loginLink}">here</a> and change your password.</p>
        <p>You can now start using our platform to manage your orders and access exclusive features.</p>
        ${
          defaultList
            ? `<p>A default list "${defaultList.name}" has been created for your company.</p>`
            : ""
        }
      `;

      await sendEmail({
        to: customer.email,
        subject: "Your Star Customer Account Credentials",
        html: message,
      });
    }

    const successMessage = isStarCustomer
      ? "Star Customer created successfully with account credentials. Email sent."
      : "Business created successfully";

    return res.status(201).json({
      success: true,
      message: successMessage,
    });
  } catch (error: any) {
    console.error("Error creating business:", error);

    // Handle database constraint errors
    if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
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

    return next(
      new ErrorHandler("Error creating business: " + error.message, 500)
    );
  }
};

export const updateBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = (req as any).user;
    console.log(user);
    const customerRepository = AppDataSource.getRepository(Customer);
    const businessDetailsRepository =
      AppDataSource.getRepository(BusinessDetails);
    const starBusinessDetailsRepository =
      AppDataSource.getRepository(StarBusinessDetails);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);
    const listRepository = AppDataSource.getRepository(List);

    const customer = await customerRepository.findOne({
      where: { id },
      relations: [
        "businessDetails",
        "starBusinessDetails",
        "starCustomerDetails",
      ],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    // Store original values to detect changes
    const originalIsDeviceMaker = customer.businessDetails?.isDeviceMaker;
    const originalIsStarCustomer = customer.businessDetails?.isStarCustomer;

    const isDeviceMakerChanged =
      updateData.isDeviceMaker !== undefined &&
      updateData.isDeviceMaker !== originalIsDeviceMaker;

    const isStarCustomerChanged =
      updateData.isStarCustomer !== undefined &&
      updateData.isStarCustomer !== originalIsStarCustomer &&
      updateData.isStarCustomer === true; // Only when upgrading to star customer

    // Check for duplicate email if email is being updated
    const emailToCheck = updateData.isStarCustomer
      ? updateData.starCustomerEmail
      : updateData.email;

    if (emailToCheck && emailToCheck !== customer.email) {
      const existingCustomer = await customerRepository.findOne({
        where: { email: emailToCheck.trim().toLowerCase() },
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

    // Validate star customer conditions
    if (updateData.isStarCustomer && updateData.isDeviceMaker !== "Yes") {
      return next(
        new ErrorHandler(
          "Star Customer can only be created when device maker is Yes",
          400
        )
      );
    }

    if (updateData.isStarCustomer && !updateData.starCustomerEmail) {
      return next(
        new ErrorHandler("Email is required for Star Customer account", 400)
      );
    }

    // Use transaction for updates
    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        // Update main customer fields (with backward compatibility)
        if (updateData.name) customer.companyName = updateData.name.trim();
        if (updateData.companyName)
          customer.companyName = updateData.companyName.trim();
        if (updateData.legalName !== undefined)
          customer.legalName = updateData.legalName
            ? updateData.legalName.trim()
            : undefined;

        // Handle email updates based on star customer status
        if (updateData.isStarCustomer) {
          customer.email = updateData.starCustomerEmail.trim().toLowerCase();
          customer.contactEmail = updateData.starCustomerEmail
            .trim()
            .toLowerCase();
        } else {
          if (updateData.email)
            customer.email = updateData.email.trim().toLowerCase();
          if (updateData.contactEmail)
            customer.contactEmail = updateData.contactEmail
              .trim()
              .toLowerCase();
        }

        if (updateData.contactPhoneNumber)
          customer.contactPhoneNumber = updateData.contactPhoneNumber.trim();

        // Update BusinessDetails
        if (!customer.businessDetails) {
          customer.businessDetails = new BusinessDetails();
        }

        const businessDetails = customer.businessDetails;

        // Handle isDeviceMaker change - update check_timestamp and check_by
        if (isDeviceMakerChanged) {
          businessDetails.isDeviceMaker = updateData.isDeviceMaker;
          businessDetails.check_timestamp = new Date(); // Current timestamp

          // Set check_by to the current user making the change
          if (user) {
            businessDetails.check_by = user as User;
          }
        } else if (updateData.isDeviceMaker !== undefined) {
          // If not changed but provided, still update the value
          businessDetails.isDeviceMaker = updateData.isDeviceMaker;
        }

        // Map update data to BusinessDetails (with backward compatibility)
        if (updateData.address !== undefined)
          businessDetails.address = updateData.address
            ? updateData.address.trim()
            : undefined;
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
          businessDetails.socialLinks = sanitizeSocialLinks(
            updateData.socialMedia
          );
        if (updateData.source !== undefined)
          businessDetails.businessSource = updateData.source;

        // Update star customer flag
        if (updateData.isStarCustomer !== undefined) {
          businessDetails.isStarCustomer = updateData.isStarCustomer;
        }

        // Save business details first to get ID if new
        const savedBusinessDetails = await transactionalEntityManager.save(
          BusinessDetails,
          businessDetails
        );
        customer.businessDetails = savedBusinessDetails;

        // Handle StarBusinessDetails
        if (
          updateData.isDeviceMaker === "Yes" &&
          updateData.starBusinessDetails
        ) {
          // Create or update StarBusinessDetails
          if (!customer.starBusinessDetails) {
            customer.starBusinessDetails = new StarBusinessDetails();
            customer.starBusinessDetails.customer = customer;
          }

          const starBusiness = customer.starBusinessDetails;

          // Update star business fields
          if (updateData.starBusinessDetails.inSeries !== undefined) {
            starBusiness.inSeries = updateData.starBusinessDetails.inSeries as
              | "Yes"
              | "No"
              | undefined;
          }

          if (updateData.starBusinessDetails.madeIn !== undefined) {
            starBusiness.madeIn = updateData.starBusinessDetails.madeIn as
              | "Germany"
              | "Switzerland"
              | "Austria"
              | undefined;
          }

          if (updateData.starBusinessDetails.lastChecked !== undefined) {
            starBusiness.lastChecked = updateData.starBusinessDetails
              .lastChecked
              ? new Date(updateData.starBusinessDetails.lastChecked)
              : undefined;
          }

          if (updateData.starBusinessDetails.checkedBy !== undefined) {
            starBusiness.checkedBy = updateData.starBusinessDetails
              .checkedBy as "manual" | "AI" | undefined;
          }

          if (updateData.starBusinessDetails.device !== undefined) {
            starBusiness.device = updateData.starBusinessDetails.device
              ? updateData.starBusinessDetails.device.trim()
              : undefined;
          }

          if (updateData.starBusinessDetails.industry !== undefined) {
            starBusiness.industry = updateData.starBusinessDetails.industry
              ? updateData.starBusinessDetails.industry.trim()
              : undefined;
          }

          // Set converted_by and converted_timestamp when upgrading to star customer
          if (isStarCustomerChanged) {
            starBusiness.converted_timestamp = new Date();
            if (user) {
              starBusiness.convertedBy = user as User;
            }
          }

          await transactionalEntityManager.save(
            StarBusinessDetails,
            starBusiness
          );
          businessDetails.isStarBusiness = true;
        }

        // Handle StarCustomerDetails
        let tempPassword = null;
        let defaultList = null;

        if (updateData.isStarCustomer && !customer.starCustomerDetails) {
          // Create new star customer details if upgrading to star customer
          tempPassword = crypto.randomBytes(8).toString("hex");
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          const starCustomerDetails = new StarCustomerDetails();
          starCustomerDetails.customer = customer;
          starCustomerDetails.taxNumber = "PENDING";
          starCustomerDetails.password = hashedPassword;
          starCustomerDetails.accountVerificationStatus = "verified";
          starCustomerDetails.isEmailVerified = true;
          starCustomerDetails.deliveryAddressLine1 =
            businessDetails.address || "";
          starCustomerDetails.deliveryPostalCode =
            businessDetails.postalCode || "";
          starCustomerDetails.deliveryCity = businessDetails.city || "";
          starCustomerDetails.deliveryCountry =
            businessDetails.country || "Germany";

          const savedStarCustomerDetails =
            await transactionalEntityManager.save(
              StarCustomerDetails,
              starCustomerDetails
            );

          customer.starCustomerDetails = savedStarCustomerDetails;

          // Create default list for the new star customer
          defaultList = new List();
          defaultList.name = `${customer.companyName} - Default List`;
          defaultList.description = `Default list for ${customer.companyName}`;
          defaultList.customer = customer;
          defaultList.status = LIST_STATUS.ACTIVE;

          defaultList = await transactionalEntityManager.save(
            List,
            defaultList
          );

          // Update customer stage
          customer.stage = "star_customer";
        } else if (!updateData.isStarCustomer && customer.starCustomerDetails) {
          // Remove star customer details if downgrading
          // Update stage
        } else if (updateData.isStarCustomer && customer.starCustomerDetails) {
          // Star customer already exists, just update stage if needed
          customer.stage = "star_customer";
        } else {
          // Update stage based on device maker status
          if (updateData.isDeviceMaker === "Yes") {
            customer.stage = customer.starCustomerDetails
              ? "star_customer"
              : "star_business";
          } else {
            customer.stage = "business";
          }
        }

        // Save customer
        await transactionalEntityManager.save(Customer, customer);

        // Return a clean response object without circular references
        return {
          customer: {
            id: customer.id,
            companyName: customer.companyName,
            email: customer.email,
            stage: customer.stage,
          },
          businessDetails: {
            id: businessDetails.id,
            website: businessDetails.website,
            isDeviceMaker: businessDetails.isDeviceMaker,
            check_timestamp: businessDetails.check_timestamp,
            check_by: businessDetails.check_by
              ? {
                  id: businessDetails.check_by.id,
                  name: businessDetails.check_by.name,
                }
              : null,
          },
          starBusinessDetails: customer.starBusinessDetails
            ? {
                id: customer.starBusinessDetails.id,
                converted_timestamp:
                  customer.starBusinessDetails.converted_timestamp,
                convertedBy: customer.starBusinessDetails.convertedBy
                  ? {
                      id: customer.starBusinessDetails.convertedBy.id,
                      name: customer.starBusinessDetails.convertedBy.name,
                    }
                  : null,
              }
            : null,
          tempPassword,
          defaultList: defaultList
            ? {
                id: defaultList.id,
                name: defaultList.name,
              }
            : null,
          isDeviceMakerChanged,
          isStarCustomerChanged,
        };
      }
    );

    const { customer: updatedCustomer, tempPassword, defaultList } = result;

    // Send email if upgrading to star customer
    if (updateData.isStarCustomer && tempPassword) {
      const loginLink = `${process.env.STAR_URL}/login`;
      const message = `
        <h2>Your Account Has Been Upgraded to Star Customer</h2>
        <p>Congratulations! Your business account has been upgraded to a Star Customer account.</p>
        <p><strong>Company Name:</strong> ${updatedCustomer.companyName}</p>
        <p><strong>Email:</strong> ${updatedCustomer.email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please login <a href="${loginLink}">here</a> and change your password.</p>
        <p>You can now access exclusive features and manage your orders directly.</p>
        ${
          defaultList
            ? `<p>A default list "${defaultList.name}" has been created for your company.</p>`
            : ""
        }
      `;

      await sendEmail({
        to: updatedCustomer.email,
        subject: "Your Account Has Been Upgraded to Star Customer",
        html: message,
      });
    }

    // Fetch updated customer with all relations
    const finalCustomer = await customerRepository.findOne({
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
      return next(new ErrorHandler("Business not found after update", 404));
    }

    // Transform response
    const businessResponse = {
      id: finalCustomer.id,
      name: finalCustomer.companyName,
      legalName: finalCustomer.legalName,
      email: finalCustomer.email,
      contactEmail: finalCustomer.contactEmail,
      contactPhoneNumber: finalCustomer.contactPhoneNumber,
      stage: finalCustomer.stage,
      ...finalCustomer.businessDetails,
      // Include check_by user details if present
      check_by: finalCustomer.businessDetails?.check_by
        ? {
            id: finalCustomer.businessDetails.check_by.id,
            name: finalCustomer.businessDetails.check_by.name,
            email: finalCustomer.businessDetails.check_by.email,
          }
        : undefined,
      // Include star business details if present
      starBusinessDetails: finalCustomer.starBusinessDetails
        ? {
            inSeries: finalCustomer.starBusinessDetails.inSeries,
            madeIn: finalCustomer.starBusinessDetails.madeIn,
            lastChecked: finalCustomer.starBusinessDetails.lastChecked,
            checkedBy: finalCustomer.starBusinessDetails.checkedBy,
            device: finalCustomer.starBusinessDetails.device,
            industry: finalCustomer.starBusinessDetails.industry,
            converted_timestamp:
              finalCustomer.starBusinessDetails.converted_timestamp,
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
      website: finalCustomer.businessDetails?.website,
      hasWebsite: !!finalCustomer.businessDetails?.website,
      phoneNumber: finalCustomer.businessDetails?.contactPhone,
      businessEmail: finalCustomer.businessDetails?.email,
      status: BUSINESS_STATUS.ACTIVE,
      source: finalCustomer.businessDetails?.businessSource,
      isDeviceMaker: finalCustomer.businessDetails?.isDeviceMaker,
      isStarCustomer: finalCustomer.businessDetails?.isStarCustomer,
      createdAt: finalCustomer.createdAt,
      updatedAt: finalCustomer.updatedAt,
    };

    let successMessage = "Business updated successfully";

    if (updateData.isStarCustomer && tempPassword) {
      successMessage =
        "Business upgraded to Star Customer successfully. Credentials sent to email.";
    } else if (isDeviceMakerChanged) {
      successMessage =
        "Business updated successfully. Device maker status change recorded.";
    } else if (isStarCustomerChanged) {
      successMessage =
        "Business updated successfully. Star customer conversion recorded.";
    }

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: businessResponse,
    });
  } catch (error) {
    console.error("Error updating business:", error);
    return next(
      new ErrorHandler(
        "Error updating business: " + (error as Error).message,
        500
      )
    );
  }
};
// Get Business By ID (also updated to include starBusinessDetails)
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
      relations: [
        "businessDetails",
        "businessDetails.check_by",
        "starBusinessDetails",
        "starBusinessDetails.convertedBy",
        "starCustomerDetails",
      ],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    // Transform response
    const businessResponse = {
      id: customer.id,
      name: customer.companyName,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      stage: customer.stage,
      businessDetails: customer.businessDetails
        ? {
            ...customer.businessDetails,
            // Include check_by user details if present
            check_by: customer.businessDetails.check_by
              ? {
                  id: customer.businessDetails.check_by.id,
                  name: customer.businessDetails.check_by.name,
                  email: customer.businessDetails.check_by.email,
                }
              : undefined,
          }
        : undefined,
      starBusinessDetails: customer.starBusinessDetails
        ? {
            id: customer.starBusinessDetails.id,
            inSeries: customer.starBusinessDetails.inSeries,
            madeIn: customer.starBusinessDetails.madeIn,
            lastChecked: customer.starBusinessDetails.lastChecked,
            checkedBy: customer.starBusinessDetails.checkedBy,
            device: customer.starBusinessDetails.device,
            industry: customer.starBusinessDetails.industry,
            converted_timestamp:
              customer.starBusinessDetails.converted_timestamp,
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
            accountVerificationStatus:
              customer.starCustomerDetails.accountVerificationStatus,
            isEmailVerified: customer.starCustomerDetails.isEmailVerified,
            deliveryAddressLine1:
              customer.starCustomerDetails.deliveryAddressLine1,
            deliveryPostalCode: customer.starCustomerDetails.deliveryPostalCode,
            deliveryCity: customer.starCustomerDetails.deliveryCity,
            deliveryCountry: customer.starCustomerDetails.deliveryCountry,
            createdAt: customer.starCustomerDetails.createdAt,
            updatedAt: customer.starCustomerDetails.updatedAt,
          }
        : undefined,
      // Backward compatibility fields
      website: customer.businessDetails?.website,
      hasWebsite: !!customer.businessDetails?.website,
      phoneNumber: customer.businessDetails?.contactPhone,
      businessEmail: customer.businessDetails?.email,
      address: customer.businessDetails?.address,
      city: customer.businessDetails?.city,
      state: customer.businessDetails?.state,
      country: customer.businessDetails?.country,
      postalCode: customer.businessDetails?.postalCode,
      latitude: customer.businessDetails?.latitude,
      longitude: customer.businessDetails?.longitude,
      googleMapsUrl: customer.businessDetails?.googleMapsUrl,
      reviewCount: customer.businessDetails?.reviewCount,
      category: customer.businessDetails?.category,
      additionalCategories: customer.businessDetails?.additionalCategories,
      socialMedia: customer.businessDetails?.socialLinks,
      source: customer.businessDetails?.businessSource,
      isDeviceMaker: customer.businessDetails?.isDeviceMaker,
      isStarCustomer: customer.businessDetails?.isStarCustomer,
      check_timestamp: customer.businessDetails?.check_timestamp,
      status: BUSINESS_STATUS.ACTIVE,
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
      sortBy = "createdAt", // Add sortBy parameter
      sortOrder = "DESC", // Add sortOrder parameter with DESC as default
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const customerRepository = AppDataSource.getRepository(Customer);
    const queryBuilder = customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.businessDetails", "businessDetails");

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

    if (minRating) {
      queryBuilder.andWhere("businessDetails.averageRating >= :minRating", {
        minRating: parseFloat(minRating as string),
      });
    }

    if (maxRating) {
      queryBuilder.andWhere("businessDetails.averageRating <= :maxRating", {
        maxRating: parseFloat(maxRating as string),
      });
    }

    if (verified !== undefined) {
      const verifiedBool = verified === "true";
      queryBuilder.andWhere("customer.isVerified = :verified", {
        verified: verifiedBool,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting - default is by createdAt DESC (newest first)
    const orderByField =
      sortBy === "name" ? "customer.companyName" : "customer.createdAt";
    const orderDirection = sortOrder === "ASC" ? "ASC" : "DESC";

    queryBuilder.orderBy(orderByField, orderDirection);

    // Get paginated results
    const customers = await queryBuilder.skip(skip).take(limitNum).getMany();

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
