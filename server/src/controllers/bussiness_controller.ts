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
import {
  CustomerCreator,
  List,
  LIST_STATUS,
  ListCreator,
} from "../models/list";
import sendEmail from "../services/emailService";
import bcrypt from "bcryptjs";
import { User } from "../models/users";
import { Invoice } from "../models/invoice";
import { RequestedItem } from "../models/requested_items";
import { ContactPerson } from "../models/contact_person";

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

    const extractFirstWord = (businessName: string): string => {
      if (!businessName) return "";
      return businessName.split(" ")[0] || businessName;
    };

    const businessesToCheck: Array<{
      index: number;
      data: any;
      normalizedWebsite: string | null;
      normalizedCompanyName: string;
    }> = [];

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

    const existingBusinessesByWebsite = new Map<string, any>();
    const existingBusinessesByName = new Map<string, any>();

    const websitesToCheck = businessesToCheck
      .filter((b) => b.normalizedWebsite)
      .map((b) => b.normalizedWebsite!);

    const namesToCheck = businessesToCheck.map((b) => b.normalizedCompanyName);

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

      if (normalizedWebsite && seenInBatch.websites.has(normalizedWebsite)) {
        duplicateReason = "Duplicate website in current batch";
      } else if (seenInBatch.names.has(normalizedCompanyName)) {
        duplicateReason = "Duplicate company name in current batch";
      }

      if (!duplicateReason) {
        if (
          normalizedWebsite &&
          existingBusinessesByWebsite.has(normalizedWebsite)
        ) {
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
        const customer = new Customer();
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
        const businessDetails = new BusinessDetails();
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

        if (
          businessData.categoryTags &&
          Array.isArray(businessData.categoryTags)
        ) {
          businessDetails.additionalCategories = businessData.categoryTags
            .map((cat: string) => cat.trim())
            .filter(Boolean);
        } else if (
          businessData.additionalCategories &&
          Array.isArray(businessData.additionalCategories)
        ) {
          businessDetails.additionalCategories =
            businessData.additionalCategories
              .map((cat: string) => cat.trim())
              .filter(Boolean);
        } else {
          businessDetails.additionalCategories = undefined;
        }

        businessDetails.industry = businessData.industry
          ? businessData.industry.trim()
          : undefined;
        businessDetails.employeeCount = sanitizeInteger(
          businessData.employeeCount
        );
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
      } catch (error: any) {
        results.errors++;
        results.errorsList.push({
          business: businessData?.name || `Business at index ${index}`,
          error: error.message || "Unknown processing error",
        });
        console.error(`Error processing business at index ${index}:`, error);
      }
    }

    if (customersToSave.length > 0) {
      try {
        console.log(
          `Attempting to save ${customersToSave.length} new businesses to database...`
        );

        const CHUNK_SIZE = 50;
        const savedCustomers: Customer[] = [];

        for (let i = 0; i < customersToSave.length; i += CHUNK_SIZE) {
          const chunk = customersToSave.slice(i, i + CHUNK_SIZE);
          console.log(
            `Saving chunk ${Math.floor(i / CHUNK_SIZE) + 1} with ${chunk.length
            } businesses`
          );

          try {
            const savedChunk = await customerRepository.save(chunk);
            savedCustomers.push(...savedChunk);

            savedChunk.forEach((customer) => {
              results.importedBusinesses.push({
                id: customer.id,
                legalName: customer.legalName,
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

            for (const customer of chunk) {
              try {
                const saved = await customerRepository.save(customer);
                savedCustomers.push(saved);
                results.importedBusinesses.push({
                  id: saved.id,
                  legalName: saved.legalName,
                  companyName: saved.companyName,
                  email: saved.email,
                  website: saved.businessDetails?.website,
                });
              } catch (individualError: any) {
                results.errors++;
                results.errorsList.push({
                  business: customer.legalName || "",
                  error: individualError.message || "Failed to save",
                });
                console.error(
                  `Failed to save business: ${customer.legalName}`,
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

const normalizeWebsite = (website: string): string => {
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

const sanitizeNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? undefined : num;
};

const generateTempPassword = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const createBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      displayName,
      companyName,
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
      contactEmail,
      contactPhoneNumber,
      googleMapsUrl,
      reviewCount,
      category,
      additionalCategories,
      socialMedia,
      source = BUSINESS_SOURCE.MANUAL,
      isDeviceMaker,
      starBusinessDetails,
      isStarCustomer,
      starCustomerEmail,
    } = req.body;

    const user = (req as any).user;

    const dbCompanyName = displayName || name;
    const dbLegalName = companyName;
    const finalEmail = email;

    if (!dbCompanyName) {
      return next(new ErrorHandler("Business display name is required", 400));
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

    const normalizedWebsite = website ? normalizeWebsite(website) : null;

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

    const trimmedDisplayName = dbCompanyName.trim();
    const existingCustomerWithName = await customerRepository
      .createQueryBuilder("customer")
      .where("LOWER(customer.companyName) = LOWER(:companyName)", {
        companyName: trimmedDisplayName,
      })
      .getOne();

    if (existingCustomerWithName) {
      return next(
        new ErrorHandler(
          "A business with this display name already exists",
          400
        )
      );
    }

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

    const shouldBeStarBusiness =
      isDeviceMaker === "Yes" &&
      starBusinessDetails?.inSeries === true &&
      starBusinessDetails?.madeIn;
    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const customer = new Customer();
        customer.companyName = trimmedDisplayName;
        customer.legalName = dbLegalName ? dbLegalName.trim() : undefined;

        if (isStarCustomer) {
          customer.stage = "star_customer";
          customer.email = starCustomerEmail.trim().toLowerCase();
          customer.contactEmail = starCustomerEmail.trim().toLowerCase();
        } else if (shouldBeStarBusiness) {
          customer.stage = "star_business";
          customer.email = finalEmail
            ? finalEmail.trim().toLowerCase()
            : undefined;
          customer.contactEmail = contactEmail
            ? contactEmail.trim().toLowerCase()
            : finalEmail
              ? finalEmail.trim().toLowerCase()
              : undefined;
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

        const savedCustomer = await transactionalEntityManager.save(
          Customer,
          customer
        );
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
        businessDetails.reviewCount = reviewCount ? parseInt(reviewCount) : 0;
        businessDetails.category = category ? category.trim() : undefined;
        businessDetails.additionalCategories = additionalCategories || [];
        businessDetails.customer = savedCustomer;

        const savedBusinessDetails = await transactionalEntityManager.save(
          BusinessDetails,
          businessDetails
        );

        if (isDeviceMaker === "Yes" || shouldBeStarBusiness) {
          const starBusiness = new StarBusinessDetails();

          if (starBusinessDetails) {
            starBusiness.inSeries = starBusinessDetails.inSeries || false;
            starBusiness.madeIn = starBusinessDetails.madeIn || undefined;
            starBusiness.device = starBusinessDetails.device || undefined;
            starBusiness.industry = starBusinessDetails.industry || undefined;
          }

          starBusiness.converted_timestamp = new Date();
          starBusiness.convertedBy = user;
          starBusiness.customer = savedCustomer;

          const savedStarBusiness = await transactionalEntityManager.save(
            StarBusinessDetails,
            starBusiness
          );

          savedCustomer.starBusinessDetails = savedStarBusiness;
        }

        let tempPassword: string | undefined;
        let defaultList: any;

        if (isStarCustomer) {
          const starCustomer = new StarCustomerDetails();

          tempPassword = generateTempPassword();
          starCustomer.password = await bcrypt.hash(tempPassword, 10);

          starCustomer.deliveryPostalCode = businessDetails.postalCode || "";
          starCustomer.deliveryCity = businessDetails.city || "";
          starCustomer.deliveryCountry = businessDetails.country || "Germany";

          starCustomer.customer = savedCustomer;

          const savedStarCustomer = await transactionalEntityManager.save(
            StarCustomerDetails,
            starCustomer
          );

          savedCustomer.starCustomerDetails = savedStarCustomer;

          defaultList = new List();
          defaultList.name = `Default`;
          defaultList.description = `Default list for ${savedCustomer.companyName}`;
          defaultList.customer = savedCustomer;
          defaultList.status = LIST_STATUS.ACTIVE;

          defaultList = await transactionalEntityManager.save(
            List,
            defaultList
          );
        }

        savedCustomer.businessDetails = savedBusinessDetails;
        await transactionalEntityManager.save(Customer, savedCustomer);

        return {
          customer: savedCustomer,
          businessDetails: savedBusinessDetails,
          tempPassword,
          defaultList,
          shouldBeStarBusiness,
        };
      }
    );

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
          : ""
        }
      `;

      await sendEmail({
        to: customer.email,
        subject: "Welcome to the GTech Star Customer Portal!",
        html: message,
      });
    }

    const finalCustomer = await customerRepository.findOne({
      where: { id: customer.id },
      relations: [
        "businessDetails",
        "starBusinessDetails",
        "starBusinessDetails.convertedBy",
        "starCustomerDetails",
      ],
    });

    if (!finalCustomer) {
      return next(new ErrorHandler("Business not found after creation", 404));
    }

    const businessResponse = {
      id: finalCustomer.id,
      displayName: finalCustomer.companyName,
      companyName: finalCustomer.legalName,
      name: finalCustomer.companyName,
      legalName: finalCustomer.legalName,
      email: finalCustomer.email,
      contactEmail: finalCustomer.contactEmail,
      contactPhoneNumber: finalCustomer.contactPhoneNumber,
      stage: finalCustomer.stage,
      ...finalCustomer.businessDetails,
      starBusinessDetails: finalCustomer.starBusinessDetails
        ? {
          inSeries: finalCustomer.starBusinessDetails.inSeries,
          madeIn: finalCustomer.starBusinessDetails.madeIn,
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
      defaultList: defaultList
        ? {
          id: defaultList.id,
          name: defaultList.name,
        }
        : undefined,
      website: finalCustomer.businessDetails?.website,
      hasWebsite: !!finalCustomer.businessDetails?.website,
      phoneNumber: finalCustomer.businessDetails?.contactPhone,
      businessEmail: finalCustomer.businessDetails?.email,
      status: BUSINESS_STATUS.ACTIVE,
      source: finalCustomer.businessDetails?.businessSource,
      isDeviceMaker: finalCustomer.businessDetails?.isDeviceMaker,
      isStarCustomer: !!finalCustomer.starCustomerDetails,
      createdAt: finalCustomer.createdAt,
      updatedAt: finalCustomer.updatedAt,
    };

    let successMessage = "Business created successfully";

    if (isStarCustomer) {
      successMessage =
        "Star Customer created successfully. Welcome email sent with credentials.";
    } else if (shouldBeStarBusiness) {
      successMessage =
        "Star Business created automatically (Device Maker: Yes, In Series: Yes, Made In provided).";
    } else if (isDeviceMaker === "Yes") {
      successMessage = "Star Business (Device Maker) created successfully.";
    }

    return res.status(201).json({
      success: true,
      message: successMessage,
      data: businessResponse,
    });
  } catch (error) {
    console.error("Error creating business:", error);
    return next(
      new ErrorHandler(
        "Error creating business: " + (error as Error).message,
        500
      )
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

    const {
      displayName,
      name,
      contactEmail,
      contactPhoneNumber,
      isDeviceMaker,
      isStarCustomer,
      starCustomerEmail,
      starBusinessDetails,
    } = updateData;

    const user = (req as any).user;

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
        "businessDetails.check_by",
        "starBusinessDetails",
        "starBusinessDetails.convertedBy",
        "starCustomerDetails",
      ],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    const currentIsDeviceMaker = customer.businessDetails?.isDeviceMaker;
    const isDeviceMakerChanged =
      isDeviceMaker !== undefined && isDeviceMaker !== currentIsDeviceMaker;
    const currentIsStarCustomer = !!customer.starCustomerDetails;
    const isStarCustomerChanged =
      isStarCustomer !== undefined && isStarCustomer !== currentIsStarCustomer;

    const shouldBeStarBusiness =
      (isDeviceMaker === "Yes" || currentIsDeviceMaker === "Yes") &&
      starBusinessDetails?.inSeries === true &&
      starBusinessDetails?.madeIn;
    if (
      isStarCustomer &&
      isDeviceMaker !== "Yes" &&
      customer.businessDetails?.isDeviceMaker !== "Yes"
    ) {
      return next(
        new ErrorHandler(
          "Star Customer can only be created when device maker is Yes",
          400
        )
      );
    }

    if (isStarCustomer && !currentIsStarCustomer && !starCustomerEmail) {
      return next(
        new ErrorHandler("Email is required for Star Customer account", 400)
      );
    }

    const emailToCheck = isStarCustomer ? starCustomerEmail : updateData.email;
    if (emailToCheck && emailToCheck !== customer.email) {
      const existingCustomer = await customerRepository.findOne({
        where: { email: emailToCheck.trim().toLowerCase() },
      });

      if (existingCustomer && existingCustomer.id !== id) {
        return next(
          new ErrorHandler("A business with this email already exists", 400)
        );
      }
    }

    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        if (displayName !== undefined) {
          customer.companyName = displayName.trim();
        }
        if (name !== undefined) {
          customer.legalName = name.trim();
        }
        if (contactEmail !== undefined) {
          customer.contactEmail = contactEmail.trim().toLowerCase();
        }
        if (contactPhoneNumber !== undefined) {
          customer.contactPhoneNumber = contactPhoneNumber.trim();
        }

        if (customer.businessDetails) {
          const businessDetails = customer.businessDetails;

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

          if (isDeviceMaker !== undefined) {
            businessDetails.isDeviceMaker = isDeviceMaker as
              | "Yes"
              | "No"
              | "Unsure";
            businessDetails.check_timestamp = new Date();
            businessDetails.check_by = user;
          }

          await transactionalEntityManager.save(
            BusinessDetails,
            businessDetails
          );
        }

        if (
          (isDeviceMaker === "Yes" || shouldBeStarBusiness) &&
          !customer.starBusinessDetails
        ) {
          const starBusiness = new StarBusinessDetails();
          if (starBusinessDetails) {
            starBusiness.inSeries = starBusinessDetails.inSeries || false;
            starBusiness.madeIn = starBusinessDetails.madeIn || undefined;
            starBusiness.device = starBusinessDetails.device || undefined;
            starBusiness.industry = starBusinessDetails.industry || undefined;
          }
          starBusiness.converted_timestamp = new Date();
          starBusiness.convertedBy = user;
          starBusiness.customer = customer;

          const savedStarBusiness = await transactionalEntityManager.save(
            StarBusinessDetails,
            starBusiness
          );
          customer.starBusinessDetails = savedStarBusiness;
        } else if (customer.starBusinessDetails && starBusinessDetails) {
          Object.assign(customer.starBusinessDetails, starBusinessDetails);
          await transactionalEntityManager.save(
            StarBusinessDetails,
            customer.starBusinessDetails
          );
        }

        let tempPassword: string | undefined;
        let defaultList: any;

        if (isStarCustomer && !customer.starCustomerDetails) {
          const starCustomerDetails = new StarCustomerDetails();

          tempPassword = generateTempPassword();
          starCustomerDetails.password = await bcrypt.hash(tempPassword, 10);

          if (customer.businessDetails) {
            starCustomerDetails.deliveryPostalCode =
              customer.businessDetails.postalCode || "";
            starCustomerDetails.deliveryCity =
              customer.businessDetails.city || "";
            starCustomerDetails.deliveryCountry =
              customer.businessDetails.country || "Germany";
          }

          starCustomerDetails.customer = customer;

          const savedStarCustomerDetails =
            await transactionalEntityManager.save(
              StarCustomerDetails,
              starCustomerDetails
            );

          customer.starCustomerDetails = savedStarCustomerDetails;

          defaultList = new List();
          defaultList.name = `Default`;
          defaultList.description = `Default list for ${customer.companyName}`;
          defaultList.customer = customer;
          defaultList.status = LIST_STATUS.ACTIVE;

          defaultList = await transactionalEntityManager.save(
            List,
            defaultList
          );

          customer.email = starCustomerEmail.trim().toLowerCase();
          customer.contactEmail = starCustomerEmail.trim().toLowerCase();
        }
        if (isStarCustomer) {
          customer.stage = "star_customer";
        } else if (shouldBeStarBusiness) {
          customer.stage = customer.starCustomerDetails
            ? "star_customer"
            : "star_business";
        } else if (
          isDeviceMaker === "Yes" ||
          customer.businessDetails?.isDeviceMaker === "Yes"
        ) {
          customer.stage = customer.starCustomerDetails
            ? "star_customer"
            : "star_business";
        } else {
          customer.stage = "business";
        }

        await transactionalEntityManager.save(Customer, customer);

        return {
          customer,
          tempPassword,
          defaultList,
          isDeviceMakerChanged,
          isStarCustomerChanged,
          shouldBeStarBusiness,
        };
      }
    );

    const {
      tempPassword,
      defaultList,
      isDeviceMakerChanged: deviceMakerChanged,
      isStarCustomerChanged: starCustomerChanged,
    } = result;

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
          : ""
        }
      `;

      await sendEmail({
        to: customer.email,
        subject: "Welcome to the GTech Star Customer Portal!",
        html: message,
      });
    }

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

    const businessResponse = {
      id: finalCustomer.id,
      displayName: finalCustomer.companyName,
      companyName: finalCustomer.legalName,
      name: finalCustomer.legalName,
      legalName: finalCustomer.legalName,
      email: finalCustomer.email,
      contactEmail: finalCustomer.contactEmail,
      contactPhoneNumber: finalCustomer.contactPhoneNumber,
      stage: finalCustomer.stage,
      ...finalCustomer.businessDetails,
      check_by: finalCustomer.businessDetails?.check_by
        ? {
          id: finalCustomer.businessDetails.check_by.id,
          name: finalCustomer.businessDetails.check_by.name,
          email: finalCustomer.businessDetails.check_by.email,
        }
        : undefined,
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
      defaultList: defaultList
        ? {
          id: defaultList.id,
          name: defaultList.name,
        }
        : undefined,
      website: finalCustomer.businessDetails?.website,
      hasWebsite: !!finalCustomer.businessDetails?.website,
      phoneNumber: finalCustomer.businessDetails?.contactPhone,
      businessEmail: finalCustomer.businessDetails?.email,
      status: BUSINESS_STATUS.ACTIVE,
      source: finalCustomer.businessDetails?.businessSource,
      isDeviceMaker: finalCustomer.businessDetails?.isDeviceMaker,
      isStarCustomer: !!finalCustomer.starCustomerDetails,
      createdAt: finalCustomer.createdAt,
      updatedAt: finalCustomer.updatedAt,
    };

    let successMessage = "Business updated successfully";

    if (isStarCustomer && tempPassword) {
      successMessage =
        "Business upgraded to Star Customer successfully. Welcome email sent with credentials.";
    } else if (shouldBeStarBusiness) {
      successMessage =
        "Business automatically promoted to Star Business (Device Maker: Yes, In Series: Yes, Made In provided).";
    } else if (deviceMakerChanged) {
      successMessage =
        "Business updated successfully. Device maker status changed.";
    } else if (starCustomerChanged) {
      successMessage =
        "Business updated successfully. Star customer status changed.";
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
      displayName: customer.companyName,
      legalName: customer.legalName,
      name: customer.legalName,
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
        companyName: customer.companyName,
        displayName: customer.companyName,
        legalName: customer.legalName,
        name: customer.legalName,
        email: customer.email,
        contactEmail: customer.contactEmail,
        contactPhoneNumber: customer.contactPhoneNumber,
        stage: customer.stage,
        ...businessDetailsWithoutId, // Spread without the id
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
        customers: businesses,
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
      relations: ["starBusinessDetails"],
    });

    if (!customer) {
      return next(new ErrorHandler("Business not found", 404));
    }

    // Check for contact persons and requested items ONLY
    if (customer.starBusinessDetails) {
      const starBusinessDetails = await AppDataSource.getRepository(
        StarBusinessDetails
      ).findOne({
        where: { id: customer.starBusinessDetails.id },
        relations: ["contactPersons", "requestedItems"],
      });

      if (starBusinessDetails) {
        if (starBusinessDetails.contactPersons?.length > 0) {
          return next(
            new ErrorHandler(
              "Cannot delete business with associated contact persons",
              400
            )
          );
        }
        if (starBusinessDetails.requestedItems?.length > 0) {
          return next(
            new ErrorHandler(
              "Cannot delete business with associated item requests",
              400
            )
          );
        }
      }
    }

    // SIMPLE FOCUSED APPROACH - Just handle list_creator and delete customer
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // DISABLE CONSTRAINTS
      await queryRunner.query("SET session_replication_role = replica;");

      // 1. Delete list_creator records FIRST (this is the main blocker)
      await queryRunner.query(
        `DELETE FROM list_creator WHERE "customerId" = $1`,
        [id]
      );

      // 2. Delete customer
      await queryRunner.query(`DELETE FROM customer WHERE id = $1`, [id]);

      // RE-ENABLE CONSTRAINTS
      await queryRunner.query("SET session_replication_role = DEFAULT;");

      await queryRunner.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Business deleted successfully",
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error("Error deleting business:", error);
    return next(new ErrorHandler("Failed to delete business", 500));
  }
};
