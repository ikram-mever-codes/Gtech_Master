import { Request, Response } from "express";
import { RequestedItem } from "../models/requested_items";
import { StarBusinessDetails } from "../models/star_business_details";
import { ContactPerson } from "../models/contact_person";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";

export class RequestedItemController {
  private requestedItemRepository = AppDataSource.getRepository(RequestedItem);
  private businessRepository = AppDataSource.getRepository(StarBusinessDetails);
  private contactPersonRepository = AppDataSource.getRepository(ContactPerson);

  async getAllRequestedItems(request: Request, response: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        businessId,
        status,
        priority,
        contactPersonId,
      } = request.query;

      const queryBuilder = this.requestedItemRepository
        .createQueryBuilder("requestedItem")
        .leftJoinAndSelect("requestedItem.business", "starBusiness")
        .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
        .orderBy("requestedItem.createdAt", "DESC");

      if (businessId) {
        queryBuilder.andWhere("requestedItem.businessId = :businessId", {
          businessId,
        });
      }

      if (status) {
        queryBuilder.andWhere("requestedItem.requestStatus = :status", {
          status,
        });
      }

      if (priority) {
        queryBuilder.andWhere("requestedItem.priority = :priority", {
          priority,
        });
      }

      if (contactPersonId) {
        queryBuilder.andWhere(
          "requestedItem.contactPersonId = :contactPersonId",
          {
            contactPersonId,
          }
        );
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      const customerRepository = AppDataSource.getRepository(Customer);

      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const customer = await customerRepository.findOne({
            where: { starBusinessDetails: { id: item.businessId } },
            relations: ["starBusinessDetails"],
          });

          return {
            ...item,
            business: {
              ...item.business,
              customer: customer
                ? {
                    id: customer.id,
                    companyName: customer.companyName,
                    legalName: customer.legalName,
                    email: customer.email,
                    contactEmail: customer.contactEmail,
                    contactPhoneNumber: customer.contactPhoneNumber,
                    stage: customer.stage,
                    avatar: customer.avatar,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                  }
                : null,
            },
          };
        })
      );

      return response.status(200).json({
        success: true,
        data: enrichedItems,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching requested items:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  async getRequestedItemById(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const item = await this.requestedItemRepository.findOne({
        where: { id },
        relations: ["business", "contactPerson"],
      });

      if (!item) {
        return response.status(404).json({
          success: false,
          message: "Requested item not found",
        });
      }

      return response.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      console.error("Error fetching requested item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async createRequestedItem(request: Request, response: Response) {
    try {
      const {
        businessId,
        contactPersonId,
        extraNote,
        itemName,
        material,
        specification,
        extraItems,
        extraItemsDescriptions,
        qty,
        asanaLink,
        interval,
        sampleQty,
        expectedDelivery,
        priority,
        requestStatus,
        comment,
      } = request.body;

      console.log("Received contactPersonId:", contactPersonId); // Debug log

      // Basic validation
      if (!businessId || !itemName || !qty) {
        return response.status(400).json({
          success: false,
          message:
            "Missing required fields: businessId, itemName, and qty are required",
        });
      }

      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });

      if (!business) {
        return response.status(404).json({
          success: false,
          message: "Business not found",
        });
      }

      let contactPerson: any = null;
      if (contactPersonId) {
        contactPerson = await this.contactPersonRepository.findOne({
          where: { id: contactPersonId },
        });

        if (!contactPerson) {
          return response.status(404).json({
            success: false,
            message: "Contact person not found",
          });
        }
      }

      const requestedItem = this.requestedItemRepository.create({
        business: business,
        contactPerson: contactPerson,
        contactPersonId: contactPersonId || null,
        itemName,
        material,
        asanaLink,
        extraNote,
        specification,
        extraItems: extraItems || "NO",
        extraItemsDescriptions,
        qty,
        interval: interval || "Monatlich",
        sampleQty,
        expectedDelivery,
        priority: priority || "Normal",
        requestStatus: requestStatus || "open",
        comment,
      });

      const savedItem: any = await this.requestedItemRepository.save(
        requestedItem
      );

      const itemWithRelations = await this.requestedItemRepository.findOne({
        where: { id: savedItem.id },
        relations: ["business", "contactPerson"],
      });

      return response.status(201).json({
        success: true,
        message: "Requested item created successfully",
        data: itemWithRelations,
      });
    } catch (error) {
      console.error("Error creating requested item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateRequestedItem(request: Request, response: Response) {
    try {
      const { id } = request.params;
      const {
        contactPersonId,
        itemName,
        material,
        specification,
        extraItems,
        extraNote,
        extraItemsDescriptions,
        qty,
        asanaLink,
        interval,
        sampleQty,
        expectedDelivery,
        priority,
        requestStatus,
        comment,
      } = request.body;

      const existingItem = await this.requestedItemRepository.findOne({
        where: { id },
        relations: ["business", "contactPerson"],
      });

      if (!existingItem) {
        return response.status(404).json({
          success: false,
          message: "Requested item not found",
        });
      }

      let contactPerson: ContactPerson | null = null;
      if (contactPersonId) {
        contactPerson = await this.contactPersonRepository.findOne({
          where: { id: contactPersonId },
        });

        if (!contactPerson) {
          return response.status(404).json({
            success: false,
            message: "Contact person not found",
          });
        }
      }

      const updateData: any = {
        ...(itemName && { itemName }),
        ...(extraNote !== "" && { extraNote }),
        ...(asanaLink !== "" && { asanaLink }),
        ...(material !== undefined && { material }),
        ...(specification !== undefined && { specification }),
        ...(extraItems && { extraItems }),
        ...(extraItemsDescriptions !== undefined && { extraItemsDescriptions }),
        ...(qty && { qty }),
        ...(interval && { interval }),
        ...(sampleQty !== undefined && { sampleQty }),
        ...(expectedDelivery !== undefined && { expectedDelivery }),
        ...(priority && { priority }),
        ...(requestStatus && { requestStatus }),
        ...(comment !== undefined && { comment }),
      };

      if (contactPerson) {
        updateData.contactPerson = contactPerson;
      }

      await this.requestedItemRepository.update(id, updateData);

      const updatedItem = await this.requestedItemRepository.findOne({
        where: { id },
        relations: ["business", "contactPerson"],
      });

      return response.status(200).json({
        success: true,
        message: "Requested item updated successfully",
        data: updatedItem,
      });
    } catch (error) {
      console.error("Error updating requested item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteRequestedItem(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const item = await this.requestedItemRepository.findOne({
        where: { id },
      });

      if (!item) {
        return response.status(404).json({
          success: false,
          message: "Requested item not found",
        });
      }

      await this.requestedItemRepository.remove(item);

      return response.status(200).json({
        success: true,
        message: "Requested item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting requested item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getRequestedItemsByBusiness(request: Request, response: Response) {
    try {
      const { businessId } = request.params;
      const { page = 1, limit = 10, status, priority } = request.query;

      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });

      if (!business) {
        return response.status(404).json({
          success: false,
          message: "Business not found",
        });
      }

      const queryBuilder = this.requestedItemRepository
        .createQueryBuilder("requestedItem")
        .leftJoinAndSelect("requestedItem.business", "business")
        .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
        .where("requestedItem.businessId = :businessId", { businessId })
        .orderBy("requestedItem.createdAt", "DESC");

      if (status) {
        queryBuilder.andWhere("requestedItem.requestStatus = :status", {
          status,
        });
      }

      if (priority) {
        queryBuilder.andWhere("requestedItem.priority = :priority", {
          priority,
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching requested items by business:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
