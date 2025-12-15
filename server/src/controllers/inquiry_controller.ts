import { Request, Response } from "express";
import { Inquiry } from "../models/inquiry";
import { DeliveryAddress } from "../models/inquiry";
import { Customer } from "../models/customers";
import { ContactPerson } from "../models/contact_person";
import { AppDataSource } from "../config/database";
import { RequestedItem } from "../models/requested_items";

export class InquiryController {
  private inquiryRepository: any = AppDataSource.getRepository(Inquiry);
  private requestRepository: any = AppDataSource.getRepository(RequestedItem);
  private customerRepository: any = AppDataSource.getRepository(Customer);
  private contactPersonRepository: any =
    AppDataSource.getRepository(ContactPerson);
  private deliveryAddressRepository: any =
    AppDataSource.getRepository(DeliveryAddress);

  async getAllInquiries(request: Request, response: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        customerId,
        status,
        priority,
        contactPersonId,
        isAssembly,
      } = request.query;

      const queryBuilder = this.inquiryRepository
        .createQueryBuilder("inquiry")
        .leftJoinAndSelect("inquiry.customer", "customer")
        .leftJoinAndSelect("inquiry.contactPerson", "contactPerson")
        .leftJoinAndSelect("inquiry.deliveryAddress", "deliveryAddress")
        .leftJoinAndSelect("inquiry.requests", "requests")
        .orderBy("inquiry.createdAt", "DESC");

      if (customerId) {
        queryBuilder.andWhere("inquiry.customerId = :customerId", {
          customerId,
        });
      }

      if (status) {
        queryBuilder.andWhere("inquiry.status = :status", {
          status,
        });
      }

      if (priority) {
        queryBuilder.andWhere("inquiry.priority = :priority", {
          priority,
        });
      }

      if (contactPersonId) {
        queryBuilder.andWhere("inquiry.contactPersonId = :contactPersonId", {
          contactPersonId,
        });
      }

      if (isAssembly !== undefined) {
        queryBuilder.andWhere("inquiry.isAssembly = :isAssembly", {
          isAssembly: isAssembly === "true",
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [inquiries, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: inquiries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getInquiryById(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: ["customer", "contactPerson", "deliveryAddress", "requests"],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      return response.status(200).json({
        success: true,
        data: inquiry,
      });
    } catch (error) {
      console.error("Error fetching inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async createInquiry(request: Request, response: Response) {
    try {
      const {
        name,
        description,
        image,
        isAssembly,
        customerId,
        contactPersonId,
        status,
        priority,
        referenceNumber,
        requiredByDate,
        internalNotes,
        termsConditions,
        projectLink,
        assemblyInstructions,
        deliveryAddress,
        requests,
      } = request.body;

      // Basic validation
      if (!name || !customerId) {
        return response.status(400).json({
          success: false,
          message: "Missing required fields: name and customerId are required",
        });
      }

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        return response.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      let contactPerson = null;
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

      // Create delivery address if provided
      let deliveryAddressEntity = null;
      if (deliveryAddress) {
        deliveryAddressEntity =
          this.deliveryAddressRepository.create(deliveryAddress);
        await this.deliveryAddressRepository.save(deliveryAddressEntity);
      }

      // Create inquiry
      const inquiry = this.inquiryRepository.create({
        name,
        description,
        image,
        isAssembly: isAssembly || false,
        customer,
        contactPerson,
        status: status || "Draft",
        priority: priority || "Medium",
        referenceNumber,
        requiredByDate,
        internalNotes,
        termsConditions,
        projectLink,
        assemblyInstructions,
        deliveryAddress: deliveryAddressEntity,
      });

      // Save inquiry first to get ID
      const savedInquiry = await this.inquiryRepository.save(inquiry);

      // Create and save requests if provided
      if (requests && Array.isArray(requests) && requests.length > 0) {
        const requestEntities = requests.map((reqData: any) => {
          const requestItem = this.requestRepository.create({
            ...reqData,
            inquiry: savedInquiry,
          });

          // If this is the first request and no status set, use request status for inquiry
          if (!savedInquiry.status || savedInquiry.status === "Draft") {
            savedInquiry.status = reqData.status || "Draft";
          }

          return requestItem;
        });

        await this.requestRepository.save(requestEntities);

        // Update inquiry status based on first request if not already set
        if (savedInquiry.status === "Draft" && requestEntities[0]) {
          savedInquiry.status = requestEntities[0].status || "Draft";
          await this.inquiryRepository.save(savedInquiry);
        }
      }

      // Fetch complete inquiry with relations
      const completeInquiry = await this.inquiryRepository.findOne({
        where: { id: savedInquiry.id },
        relations: ["customer", "contactPerson", "deliveryAddress", "requests"],
      });

      return response.status(201).json({
        success: true,
        message: "Inquiry created successfully",
        data: completeInquiry,
      });
    } catch (error) {
      console.error("Error creating inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;
      const {
        name,
        description,
        image,
        isAssembly,
        contactPersonId,
        status,
        priority,
        referenceNumber,
        requiredByDate,
        internalNotes,
        termsConditions,
        projectLink,
        assemblyInstructions,
        deliveryAddress,
      } = request.body;

      const existingInquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: ["customer", "contactPerson", "deliveryAddress", "requests"],
      });

      if (!existingInquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      let contactPerson = null;
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

      // Handle delivery address update
      let deliveryAddressEntity = existingInquiry.deliveryAddress;
      if (deliveryAddress) {
        if (deliveryAddressEntity) {
          await this.deliveryAddressRepository.update(
            deliveryAddressEntity.id,
            deliveryAddress
          );
        } else {
          deliveryAddressEntity =
            this.deliveryAddressRepository.create(deliveryAddress);
          await this.deliveryAddressRepository.save(deliveryAddressEntity);
        }
      }

      const updateData: any = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(isAssembly !== undefined && { isAssembly }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(referenceNumber !== undefined && { referenceNumber }),
        ...(requiredByDate !== undefined && { requiredByDate }),
        ...(internalNotes !== undefined && { internalNotes }),
        ...(termsConditions !== undefined && { termsConditions }),
        ...(projectLink !== undefined && { projectLink }),
        ...(assemblyInstructions !== undefined && { assemblyInstructions }),
        ...(deliveryAddressEntity && {
          deliveryAddress: deliveryAddressEntity,
        }),
      };

      if (contactPerson !== undefined) {
        updateData.contactPerson = contactPerson;
      }

      // Apply status change logic
      if (status && status !== existingInquiry.status) {
        // If inquiry is NOT an assembly, update all request statuses
        if (!existingInquiry.isAssembly && existingInquiry.requests) {
          await Promise.all(
            existingInquiry.requests.map(async (requestItem: any) => {
              await this.requestRepository.update(requestItem.id, { status });
            })
          );
        }
        // If inquiry IS an assembly, don't update request statuses
        // (they remain independent)
      }

      await this.inquiryRepository.update(id, updateData);

      const updatedInquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: ["customer", "contactPerson", "deliveryAddress", "requests"],
      });

      return response.status(200).json({
        success: true,
        message: "Inquiry updated successfully",
        data: updatedInquiry,
      });
    } catch (error) {
      console.error("Error updating inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      await this.inquiryRepository.remove(inquiry);

      return response.status(200).json({
        success: true,
        message: "Inquiry deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getInquiriesByCustomer(request: Request, response: Response) {
    try {
      const { customerId } = request.params;
      const { page = 1, limit = 10, status, isAssembly } = request.query;

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        return response.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      const queryBuilder = this.inquiryRepository
        .createQueryBuilder("inquiry")
        .leftJoinAndSelect("inquiry.customer", "customer")
        .leftJoinAndSelect("inquiry.contactPerson", "contactPerson")
        .leftJoinAndSelect("inquiry.deliveryAddress", "deliveryAddress")
        .leftJoinAndSelect("inquiry.requests", "requests")
        .where("inquiry.customerId = :customerId", { customerId })
        .orderBy("inquiry.createdAt", "DESC");

      if (status) {
        queryBuilder.andWhere("inquiry.status = :status", {
          status,
        });
      }

      if (isAssembly !== undefined) {
        queryBuilder.andWhere("inquiry.isAssembly = :isAssembly", {
          isAssembly: isAssembly === "true",
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [inquiries, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: inquiries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching inquiries by customer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async addRequestToInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;
      const requestData = request.body;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const requestItem = this.requestRepository.create({
        ...requestData,
        inquiry,
      });

      const savedRequest = await this.requestRepository.save(requestItem);

      // Update inquiry status based on first request if not already set
      if (inquiry.status === "Draft") {
        inquiry.status = savedRequest.status || "Draft";
        await this.inquiryRepository.save(inquiry);
      }

      return response.status(201).json({
        success: true,
        message: "Request added to inquiry successfully",
        data: savedRequest,
      });
    } catch (error) {
      console.error("Error adding request to inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateRequestInInquiry(request: Request, response: Response) {
    try {
      const { id, requestId } = request.params;
      const requestData = request.body;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const existingRequest = await this.requestRepository.findOne({
        where: { id: requestId, inquiry: { id } },
      });

      if (!existingRequest) {
        return response.status(404).json({
          success: false,
          message: "Request not found in this inquiry",
        });
      }

      await this.requestRepository.update(requestId, requestData);

      const updatedRequest = await this.requestRepository.findOne({
        where: { id: requestId },
      });

      return response.status(200).json({
        success: true,
        message: "Request updated successfully",
        data: updatedRequest,
      });
    } catch (error) {
      console.error("Error updating request in inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async removeRequestFromInquiry(request: Request, response: Response) {
    try {
      const { id, requestId } = request.params;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const existingRequest = await this.requestRepository.findOne({
        where: { id: requestId, inquiry: { id } },
      });

      if (!existingRequest) {
        return response.status(404).json({
          success: false,
          message: "Request not found in this inquiry",
        });
      }

      await this.requestRepository.remove(existingRequest);

      return response.status(200).json({
        success: true,
        message: "Request removed from inquiry successfully",
      });
    } catch (error) {
      console.error("Error removing request from inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
