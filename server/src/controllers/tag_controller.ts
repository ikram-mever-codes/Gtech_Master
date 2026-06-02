import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Tag, TagCategory, TagColor } from "../models/tags";
import { Customer } from "../models/customers";
import { ContactPerson } from "../models/contact_person";
import { Inquiry } from "../models/inquiry";
import { RequestedItem } from "../models/requested_items";
import { Item } from "../models/items";

const entityMap: Record<string, { repo: any; relation: string }> = {
  company: { repo: Customer, relation: "tags" },
  contact: { repo: ContactPerson, relation: "tags" },
  inquiry: { repo: Inquiry, relation: "tags" },
  request_item: { repo: RequestedItem, relation: "tags" },
  item: { repo: Item, relation: "tags" },
};

export const getAllTags = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const tagRepo = AppDataSource.getRepository(Tag);

    let whereClause: any = {};
    if (category) {
      whereClause.category = category as any;
    }

    const tags = await tagRepo.find({
      where: whereClause,
      order: { name: "ASC" },
    });

    return res.status(200).json({ data: tags });
  } catch (error: any) {
    console.error("Error fetching tags:", error);
    return res.status(500).json({ message: "Failed to fetch tags", error: error.message });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { name, category, color } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: "Name and Category are required." });
    }

    if (!Object.values(TagCategory).includes(category)) {
      return res.status(400).json({ message: `Invalid category. Allowed: ${Object.values(TagCategory).join(", ")}` });
    }

    if (color && !Object.values(TagColor).includes(color)) {
      return res.status(400).json({ message: `Invalid color. Allowed: ${Object.values(TagColor).join(", ")}` });
    }

    const tagRepo = AppDataSource.getRepository(Tag);

    const existing = await tagRepo.findOne({
      where: { name, category },
    });

    if (existing) {
      return res.status(400).json({ message: `Tag "${name}" already exists in category "${category}".` });
    }

    const tag = tagRepo.create({
      name,
      category,
      color: color || TagColor.GRAY,
    });

    await tagRepo.save(tag);

    return res.status(201).json({ message: "Tag created successfully", data: tag });
  } catch (error: any) {
    console.error("Error creating tag:", error);
    return res.status(500).json({ message: "Failed to create tag", error: error.message });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, color } = req.body;

    const tagRepo = AppDataSource.getRepository(Tag);
    const tag = await tagRepo.findOne({ where: { id } });

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    if (category && !Object.values(TagCategory).includes(category)) {
      return res.status(400).json({ message: `Invalid category. Allowed: ${Object.values(TagCategory).join(", ")}` });
    }

    if (color && !Object.values(TagColor).includes(color)) {
      return res.status(400).json({ message: `Invalid color. Allowed: ${Object.values(TagColor).join(", ")}` });
    }

    if ((name && name !== tag.name) || (category && category !== tag.category)) {
      const checkName = name || tag.name;
      const checkCategory = category || tag.category;
      const existing = await tagRepo.findOne({
        where: { name: checkName, category: checkCategory },
      });
      if (existing && existing.id !== tag.id) {
        return res.status(400).json({ message: `Tag "${checkName}" already exists in category "${checkCategory}".` });
      }
    }

    if (name) tag.name = name;
    if (category) tag.category = category;
    if (color) tag.color = color;

    await tagRepo.save(tag);

    return res.status(200).json({ message: "Tag updated successfully", data: tag });
  } catch (error: any) {
    console.error("Error updating tag:", error);
    return res.status(500).json({ message: "Failed to update tag", error: error.message });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tagRepo = AppDataSource.getRepository(Tag);
    const tag = await tagRepo.findOne({ where: { id } });

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    await tagRepo.remove(tag);
    return res.status(200).json({ message: "Tag deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting tag:", error);
    return res.status(500).json({ message: "Failed to delete tag", error: error.message });
  }
};

export const syncEntityTags = async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, tagIds } = req.body;

    if (!entityId || !entityType || !Array.isArray(tagIds)) {
      return res.status(400).json({ message: "Invalid parameters. Required: entityId, entityType, tagIds (array)" });
    }

    const config = entityMap[entityType];
    if (!config) {
      return res.status(400).json({ message: `Unsupported entity type: ${entityType}` });
    }

    const entityRepo = AppDataSource.getRepository(config.repo);
    const tagRepo = AppDataSource.getRepository(Tag);

    const entity: any = await entityRepo.findOne({
      where: { id: entityId },
      relations: [config.relation],
    });

    if (!entity) {
      return res.status(404).json({ message: `Entity of type ${entityType} with ID ${entityId} not found` });
    }

    let tags: Tag[] = [];
    if (tagIds.length > 0) {
      const { In } = require("typeorm");
      tags = await tagRepo.find({
        where: {
          id: In(tagIds),
        },
      });
    }

    entity[config.relation] = tags;
    await entityRepo.save(entity);

    return res.status(200).json({ message: "Tags synced successfully", data: entity });
  } catch (error: any) {
    console.error("Error syncing entity tags:", error);
    return res.status(500).json({ message: "Failed to sync tags", error: error.message });
  }
};
