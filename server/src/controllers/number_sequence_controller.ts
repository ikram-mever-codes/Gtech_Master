import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { NumberSequence, ResetPolicy } from "../models/number_sequence";

interface CreateNumberSequenceBody {
  sequenceKey: string;
  name: string;
  prefix: string;
  formatPattern?: string;
  minDigits?: number;
  resetPolicy?: ResetPolicy;
  startingNumber?: number;
  isActive?: boolean;
}

interface UpdateNumberSequenceBody {
  name?: string;
  prefix?: string;
  formatPattern?: string;
  minDigits?: number;
  resetPolicy?: ResetPolicy;
  nextRunningNo?: number;
  isActive?: boolean;
}

export class NumberSequenceController {
  private repository = AppDataSource.getRepository(NumberSequence);

  // ==========================================================================
  // CREATE
  // POST /number-sequences
  // sequenceKey is fixed at creation and never changes afterwards, since
  // other code (offer/invoice/order controllers) references it by string.
  // ==========================================================================
  async createSequence(request: Request, response: Response) {
    try {
      const body: CreateNumberSequenceBody = request.body || {};

      if (!body.sequenceKey || !body.name || !body.prefix) {
        return response.status(400).json({
          success: false,
          message: "sequenceKey, name and prefix are required",
        });
      }

      const existing = await this.repository.findOne({
        where: { sequenceKey: body.sequenceKey },
      });
      if (existing) {
        return response.status(409).json({
          success: false,
          message: `A sequence with key "${body.sequenceKey}" already exists`,
        });
      }

      const sequence = this.repository.create({
        sequenceKey: body.sequenceKey,
        name: body.name,
        prefix: body.prefix,
        formatPattern: body.formatPattern || "{prefix}{yy}{mm}-{number}",
        minDigits: body.minDigits ?? 2,
        resetPolicy: body.resetPolicy || "never",
        nextRunningNo: body.startingNumber ?? 1,
        isActive: body.isActive ?? true,
      });

      const saved = await this.repository.save(sequence);

      return response.status(201).json({
        success: true,
        message: "Number sequence created successfully",
        data: saved,
      });
    } catch (error) {
      console.error("Error creating number sequence:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================================================
  // READ - list all
  // GET /number-sequences
  // ==========================================================================
  async getAllSequences(request: Request, response: Response) {
    try {
      const sequences = await this.repository.find({
        order: { name: "ASC" },
      });

      return response.status(200).json({ success: true, data: sequences });
    } catch (error) {
      console.error("Error fetching number sequences:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ==========================================================================
  // READ - single, by sequenceKey (not id, since that's what callers know)
  // GET /number-sequences/:sequenceKey
  // ==========================================================================
  async getSequenceByKey(request: Request, response: Response) {
    try {
      const { sequenceKey } = request.params;

      const sequence = await this.repository.findOne({
        where: { sequenceKey },
      });

      if (!sequence) {
        return response
          .status(404)
          .json({ success: false, message: "Number sequence not found" });
      }

      return response.status(200).json({ success: true, data: sequence });
    } catch (error) {
      console.error("Error fetching number sequence:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ==========================================================================
  // UPDATE
  // PUT /number-sequences/:sequenceKey
  // sequenceKey and nextRunningNo are intentionally not editable here.
  // Changing sequenceKey would break every entity that references it, and
  // nextRunningNo must only ever move forward through getNextNumber, never
  // via manual edit, or two people could get the same number.
  // ==========================================================================
  async updateSequence(request: Request, response: Response) {
    try {
      const { sequenceKey } = request.params;
      const body: UpdateNumberSequenceBody = request.body || {};

      const sequence = await this.repository.findOne({
        where: { sequenceKey },
      });

      if (!sequence) {
        return response
          .status(404)
          .json({ success: false, message: "Number sequence not found" });
      }

      const updatableFields: (keyof UpdateNumberSequenceBody)[] = [
        "name",
        "prefix",
        "formatPattern",
        "minDigits",
        "resetPolicy",
        "nextRunningNo",
        "isActive",
      ];

      updatableFields.forEach((field) => {
        if (body[field] !== undefined) {
          (sequence as any)[field] = body[field];
        }
      });

      const updated = await this.repository.save(sequence);

      return response.status(200).json({
        success: true,
        message: "Number sequence updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating number sequence:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ==========================================================================
  // DEACTIVATE (soft delete)
  // DELETE /number-sequences/:sequenceKey
  // A sequence is never hard-deleted: entities created under it still
  // reference its key/prefix, and reusing a running number would break
  // uniqueness. Deactivating just stops getNextNumber from issuing new ones.
  // ==========================================================================
  async deactivateSequence(request: Request, response: Response) {
    try {
      const { sequenceKey } = request.params;

      const sequence = await this.repository.findOne({
        where: { sequenceKey },
      });

      if (!sequence) {
        return response
          .status(404)
          .json({ success: false, message: "Number sequence not found" });
      }

      sequence.isActive = false;
      await this.repository.save(sequence);

      return response.status(200).json({
        success: true,
        message: "Number sequence deactivated successfully",
      });
    } catch (error) {
      console.error("Error deactivating number sequence:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}
