// controllers/businessController.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import {
  Business,
  BUSINESS_STATUS,
  BUSINESS_SOURCE,
} from "../models/bussiness";
import ErrorHandler from "../utils/errorHandler";
import { In, Like } from "typeorm";

export const bulkImportBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let transactionFailed = false;

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

    const businessRepository = AppDataSource.getRepository(Business);

    // Initialize results with more detailed tracking
    const results = {
      total: businesses.length,
      imported: 0,
      skippedInvalidData: 0,
      duplicates: 0,
      errors: 0,
      errorsList: [] as Array<{ business: string; error: string }>,
      startTime: new Date(),
      endTime: null as Date | null,
    };

    const businessesToSave: Business[] = [];
    const seenWebsites = new Set<string>();
    const seenGoogleIds = new Set<string>();

    // Process each business with relaxed validation
    for (let i = 0; i < businesses.length; i++) {
      const businessData = businesses[i];

      try {
        // Skip completely invalid entries (no name or address)
        if (!businessData.name || !businessData.address) {
          results.skippedInvalidData++;
          results.errorsList.push({
            business: `Business at index ${i}`,
            error: "Missing required fields: name and address are required",
          });
          continue;
        }

        // Normalize website for duplicate checking (allow businesses without websites)
        const normalizedWebsite = businessData.website
          ? businessData.website.trim().toLowerCase()
          : null;

        // Check for duplicates in current batch by website
        if (normalizedWebsite && seenWebsites.has(normalizedWebsite)) {
          results.duplicates++;
          continue;
        }

        // Check for duplicates in current batch by Google Place ID
        if (
          businessData.googlePlaceId &&
          seenGoogleIds.has(businessData.googlePlaceId)
        ) {
          results.duplicates++;
          continue;
        }

        // Check for duplicates in database (only if we have identifiers)
        let existingBusiness = null;
        if (normalizedWebsite || businessData.googlePlaceId) {
          const whereConditions: any[] = [];
          if (normalizedWebsite) {
            whereConditions.push({ website: normalizedWebsite });
          }
          if (businessData.googlePlaceId) {
            whereConditions.push({ googlePlaceId: businessData.googlePlaceId });
          }

          existingBusiness = await businessRepository.findOne({
            where: whereConditions,
          });
        }

        if (existingBusiness) {
          results.duplicates++;
          continue;
        }

        // Create new business entity - ALLOW BUSINESSES WITHOUT WEBSITES
        const business = new Business();

        // Required fields
        business.name = businessData.name.trim();
        business.address = businessData.address.trim();

        // Website is optional - set hasWebsite based on whether website exists
        business.website = normalizedWebsite;
        business.hasWebsite = !!normalizedWebsite; // This will be true if website exists, false otherwise

        // Set source from import parameter or from business data
        business.source = businessData.source || source;

        // Optional fields with proper sanitization
        business.description = businessData.description
          ? businessData.description.trim()
          : null;
        business.city = businessData.city ? businessData.city.trim() : null;
        business.state = businessData.state ? businessData.state.trim() : null;
        business.country = businessData.country
          ? businessData.country.trim()
          : null;
        business.postalCode = businessData.postalCode
          ? businessData.postalCode.trim()
          : null;
        business.latitude = sanitizeNumber(businessData.latitude);
        business.longitude = sanitizeNumber(businessData.longitude);
        business.phoneNumber = businessData.phoneNumber
          ? businessData.phoneNumber.trim()
          : null;
        business.email = businessData.email
          ? businessData.email.trim().toLowerCase()
          : null;
        business.googlePlaceId = businessData.googlePlaceId
          ? businessData.googlePlaceId.trim()
          : null;
        business.googleMapsUrl = businessData.googleMapsUrl
          ? businessData.googleMapsUrl.trim()
          : null;
        business.reviewCount = sanitizeInteger(businessData.reviewCount);
        business.averageRating = sanitizeRating(businessData.averageRating);
        business.category = businessData.category
          ? businessData.category.trim()
          : null;
        business.additionalCategories = Array.isArray(
          businessData.additionalCategories
        )
          ? businessData.additionalCategories
              .map((cat: string) => cat.trim())
              .filter(Boolean)
          : [];

        // Sanitize social media
        business.socialMedia = sanitizeSocialMedia(businessData.socialMedia);

        // Sanitize business hours
        business.businessHours = sanitizeBusinessHours(
          businessData.businessHours
        );

        // Set status based on whether website exists
        business.status = business.hasWebsite
          ? BUSINESS_STATUS.ACTIVE
          : BUSINESS_STATUS.NO_WEBSITE;

        business.lastVerifiedAt = new Date();

        // Add to tracking sets (only if we have identifiers)
        if (normalizedWebsite) {
          seenWebsites.add(normalizedWebsite);
        }
        if (business.googlePlaceId) {
          seenGoogleIds.add(business.googlePlaceId);
        }

        businessesToSave.push(business);
        results.imported++;

        console.log(`Prepared business for import: ${business.name}`, {
          hasWebsite: business.hasWebsite,
          website: business.website,
          source: business.source,
        });
      } catch (error: any) {
        results.errors++;
        results.errorsList.push({
          business: businessData?.name || `Business at index ${i}`,
          error: error.message || "Unknown processing error",
        });
        console.error(`Error processing business at index ${i}:`, error);
      }
    }

    // Save all businesses in a transaction with better error handling
    if (businessesToSave.length > 0) {
      try {
        console.log(
          `Attempting to save ${businessesToSave.length} businesses to database...`
        );

        await AppDataSource.transaction(async (transactionalEntityManager) => {
          // Save in chunks to avoid parameter limits
          const CHUNK_SIZE = 50; // Reduced chunk size for better debugging
          for (let i = 0; i < businessesToSave.length; i += CHUNK_SIZE) {
            const chunk = businessesToSave.slice(i, i + CHUNK_SIZE);
            console.log(
              `Saving chunk ${Math.floor(i / CHUNK_SIZE) + 1} with ${
                chunk.length
              } businesses`
            );

            const savedChunk = await transactionalEntityManager.save(
              Business,
              chunk
            );
            console.log(
              `Successfully saved chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`,
              savedChunk.length,
              "businesses"
            );
          }
        });

        console.log(
          `Transaction completed successfully. Saved ${businessesToSave.length} businesses.`
        );
      } catch (transactionError: any) {
        transactionFailed = true;
        console.error("Transaction error details:", transactionError);
        throw new Error(`Transaction failed: ${transactionError.message}`);
      }
    } else {
      console.log("No businesses to save after processing.");
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

    // Debug: Log what happened to each business
    console.log("Detailed import breakdown:");
    businesses.forEach((biz, index) => {
      const hasName = !!biz.name;
      const hasAddress = !!biz.address;
      const hasWebsite = !!biz.website;
      console.log(
        `Business ${index}: ${
          biz.name
        } - name:${hasName} address:${hasAddress} website:${hasWebsite} source:${
          biz.source || source
        }`
      );
    });

    return res.status(200).json({
      success: true,
      message: "Bulk import completed",
      data: results,
    });
  } catch (error: any) {
    console.error("Critical error in bulk import:", error);

    const errorMessage = transactionFailed
      ? "Database transaction failed during import"
      : "Failed to import businesses";

    return next(
      new ErrorHandler(
        `${errorMessage}: ${error.message}`,
        transactionFailed ? 500 : 400
      )
    );
  }
};

// 2. Create Single Business
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
      source = BUSINESS_SOURCE.MANUAL, // Default to MANUAL for single creation
    } = req.body;

    if (!name || !address) {
      return next(new ErrorHandler("Name and address are required", 400));
    }

    const businessRepository = AppDataSource.getRepository(Business);

    // Check for duplicates
    if (website) {
      const existingBusiness = await businessRepository.findOne({
        where: { website },
      });
      if (existingBusiness) {
        return next(
          new ErrorHandler("Business with this website already exists", 400)
        );
      }
    }

    if (googlePlaceId) {
      const existingBusiness = await businessRepository.findOne({
        where: { googlePlaceId },
      });
      if (existingBusiness) {
        return next(
          new ErrorHandler(
            "Business with this Google Place ID already exists",
            400
          )
        );
      }
    }

    const business = businessRepository.create({
      name,
      address,
      website: website || null,
      hasWebsite: !!website,
      description: description || null,
      city: city || null,
      state: state || null,
      country: country || null,
      postalCode: postalCode || null,
      latitude: latitude || null,
      longitude: longitude || null,
      phoneNumber: phoneNumber || null,
      email: email || null,
      googlePlaceId: googlePlaceId || null,
      googleMapsUrl: googleMapsUrl || null,
      reviewCount: reviewCount || null,
      averageRating: averageRating || null,
      category: category || null,
      additionalCategories: additionalCategories || [],
      socialMedia: socialMedia || null,
      businessHours: businessHours || null,
      source: source,
      status: BUSINESS_STATUS.ACTIVE,
      lastVerifiedAt: new Date(),
    });

    await businessRepository.save(business);

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      data: business,
    });
  } catch (error) {
    return next(error);
  }
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
      postalCode, // Add postalCode
      category,
      city,
      country,
      hasWebsite,
      status,
      source,
      minRating, // Add minRating
      maxRating, // Add maxRating
      verified, // Add verified
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const businessRepository = AppDataSource.getRepository(Business);
    const queryBuilder = businessRepository.createQueryBuilder("business");

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        "(business.name LIKE :search OR business.description LIKE :search OR business.address LIKE :search OR business.email LIKE :search OR business.phoneNumber LIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Add postal code filter - exact match for precision
    if (postalCode) {
      queryBuilder.andWhere("business.postalCode = :postalCode", {
        postalCode: postalCode.toString().trim().toUpperCase(),
      });
    }

    if (category) {
      queryBuilder.andWhere("business.category = :category", { category });
    }

    if (city) {
      queryBuilder.andWhere("business.city = :city", { city });
    }

    if (country) {
      queryBuilder.andWhere("business.country = :country", { country });
    }

    if (hasWebsite !== undefined) {
      queryBuilder.andWhere("business.hasWebsite = :hasWebsite", {
        hasWebsite: hasWebsite === "true",
      });
    }

    if (status) {
      queryBuilder.andWhere("business.status = :status", { status });
    }

    if (source) {
      queryBuilder.andWhere("business.source = :source", { source });
    }

    // Add rating filters
    if (minRating !== undefined) {
      const minRatingNum = parseFloat(minRating as string);
      if (!isNaN(minRatingNum)) {
        queryBuilder.andWhere("business.averageRating >= :minRating", {
          minRating: minRatingNum,
        });
      }
    }

    if (maxRating !== undefined) {
      const maxRatingNum = parseFloat(maxRating as string);
      if (!isNaN(maxRatingNum)) {
        queryBuilder.andWhere("business.averageRating <= :maxRating", {
          maxRating: maxRatingNum,
        });
      }
    }

    // Add both rating filters together for range
    if (minRating !== undefined && maxRating !== undefined) {
      const minRatingNum = parseFloat(minRating as string);
      const maxRatingNum = parseFloat(maxRating as string);
      if (!isNaN(minRatingNum) && !isNaN(maxRatingNum)) {
        queryBuilder.andWhere(
          "business.averageRating BETWEEN :minRating AND :maxRating",
          {
            minRating: minRatingNum,
            maxRating: maxRatingNum,
          }
        );
      }
    }

    // Add verified filter (based on lastVerifiedAt)
    if (verified !== undefined) {
      const isVerified = verified === "true";
      if (isVerified) {
        queryBuilder.andWhere("business.lastVerifiedAt IS NOT NULL");
        // Optional: Only consider verified if verified within last 30 days
        // const thirtyDaysAgo = new Date();
        // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // queryBuilder.andWhere("business.lastVerifiedAt >= :thirtyDaysAgo", { thirtyDaysAgo });
      } else {
        queryBuilder.andWhere("business.lastVerifiedAt IS NULL");
      }
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const businesses = await queryBuilder
      .orderBy("business.createdAt", "DESC")
      .skip(skip)
      .take(limitNum)
      .getMany();

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

// 4. Get Business by ID
export const getBusinessById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const businessRepository = AppDataSource.getRepository(Business);
    const business = await businessRepository.findOne({
      where: { id },
    });

    if (!business) {
      return next(new ErrorHandler("Business not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    return next(error);
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

    const businessRepository = AppDataSource.getRepository(Business);
    const business = await businessRepository.findOne({
      where: { id },
    });

    if (!business) {
      return next(new ErrorHandler("Business not found", 404));
    }

    // Check for duplicate website if website is being updated
    if (updateData.website && updateData.website !== business.website) {
      const existingBusiness = await businessRepository.findOne({
        where: { website: updateData.website },
      });
      if (existingBusiness && existingBusiness.id !== id) {
        return next(
          new ErrorHandler("Business with this website already exists", 400)
        );
      }
      updateData.hasWebsite = !!updateData.website;
    }

    // Check for duplicate googlePlaceId if being updated
    if (
      updateData.googlePlaceId &&
      updateData.googlePlaceId !== business.googlePlaceId
    ) {
      const existingBusiness = await businessRepository.findOne({
        where: { googlePlaceId: updateData.googlePlaceId },
      });
      if (existingBusiness && existingBusiness.id !== id) {
        return next(
          new ErrorHandler(
            "Business with this Google Place ID already exists",
            400
          )
        );
      }
    }

    // Update lastVerifiedAt if any contact info is updated
    if (updateData.website || updateData.phoneNumber || updateData.email) {
      updateData.lastVerifiedAt = new Date();
    }

    await businessRepository.update(id, updateData);

    // Fetch updated business
    const updatedBusiness = await businessRepository.findOne({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: updatedBusiness,
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

    const businessRepository = AppDataSource.getRepository(Business);
    const business = await businessRepository.findOne({
      where: { id },
    });

    if (!business) {
      return next(new ErrorHandler("Business not found", 404));
    }

    await businessRepository.remove(business);

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

    const businessRepository = AppDataSource.getRepository(Business);

    const result = await businessRepository.delete(ids);

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

    const businessRepository = AppDataSource.getRepository(Business);

    // Haversine formula for distance calculation in kilometers
    const businesses = await businessRepository
      .createQueryBuilder("business")
      .where("business.latitude IS NOT NULL")
      .andWhere("business.longitude IS NOT NULL")
      .select([
        "business",
        `(6371 * acos(cos(radians(${lat})) * cos(radians(business.latitude)) * cos(radians(business.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(business.latitude)))) as distance`,
      ])
      .having("distance < :radius", { radius: rad })
      .orderBy("distance", "ASC")
      .limit(lim)
      .getRawMany();

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
    const businessRepository = AppDataSource.getRepository(Business);

    const totalBusinesses = await businessRepository.count();
    const businessesWithWebsite = await businessRepository.count({
      where: { hasWebsite: true },
    });
    const businessesWithoutWebsite = await businessRepository.count({
      where: { hasWebsite: false },
    });

    // Count by status
    const statusCounts = await businessRepository
      .createQueryBuilder("business")
      .select("business.status, COUNT(*) as count")
      .groupBy("business.status")
      .getRawMany();

    // Count by country
    const countryCounts = await businessRepository
      .createQueryBuilder("business")
      .select("business.country, COUNT(*) as count")
      .where("business.country IS NOT NULL")
      .groupBy("business.country")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();

    // Count by source
    const sourceCounts = await businessRepository
      .createQueryBuilder("business")
      .select("business.source, COUNT(*) as count")
      .groupBy("business.source")
      .orderBy("count", "DESC")
      .getRawMany();

    return res.status(200).json({
      success: true,
      data: {
        total: totalBusinesses,
        withWebsite: businessesWithWebsite,
        withoutWebsite: businessesWithoutWebsite,
        byStatus: statusCounts,
        topCountries: countryCounts,
        bySource: sourceCounts,
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

    if (!status || !Object.values(BUSINESS_STATUS).includes(status)) {
      return next(new ErrorHandler("Valid status is required", 400));
    }

    const businessRepository = AppDataSource.getRepository(Business);

    const result = await businessRepository.update(ids, { status });

    return res.status(200).json({
      success: true,
      message: `Updated status for ${result.affected} businesses`,
      data: {
        updatedCount: result.affected,
      },
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to update business status", 500));
  }
};

// Helper functions (keep these the same)
function sanitizeNumber(value: any): any {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function sanitizeInteger(value: any): any {
  if (value === null || value === undefined) return null;
  const num = parseInt(value);
  return isNaN(num) ? null : num;
}

function sanitizeRating(value: any): any {
  const num = sanitizeNumber(value);
  return num !== null && num >= 0 && num <= 5 ? Number(num.toFixed(2)) : null;
}

function sanitizeSocialMedia(socialMedia: any): any {
  if (!socialMedia || typeof socialMedia !== "object") return null;

  const sanitized: any = {};
  const platforms = ["facebook", "instagram", "linkedin", "twitter"];

  platforms.forEach((platform) => {
    if (socialMedia[platform] && typeof socialMedia[platform] === "string") {
      sanitized[platform] = socialMedia[platform].trim();
    }
  });

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function sanitizeBusinessHours(hours: any): any {
  if (!hours || typeof hours !== "object") return null;

  const sanitized: any = {};
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  days.forEach((day) => {
    if (hours[day] && typeof hours[day] === "string") {
      sanitized[day] = hours[day].trim();
    }
  });

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
