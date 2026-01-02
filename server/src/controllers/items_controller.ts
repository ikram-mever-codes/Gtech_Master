// src/controllers/itemManagementController.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Item } from "../models/items";
import { Parent } from "../models/parents";
import { Taric } from "../models/tarics";
import { Category } from "../models/categories";
import { VariationValue } from "../models/variation_values";
import { WarehouseItem } from "../models/warehouse_items";
import { OrderItem } from "../models/order_items";
import { ItemQuality } from "../models/item_qualities";
import { Supplier } from "../models/suppliers";
import {
  Like,
  Between,
  FindOptionsWhere,
  In,
  Not,
  IsNull,
  ILike,
} from "typeorm";
import ErrorHandler from "../utils/errorHandler";
import { pool } from "../config/misDb";

export const getItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemRepository = AppDataSource.getRepository(Item);

    // Get query parameters
    const {
      page = "1",
      limit = "30",
      search = "",
      status = "",
      category = "",
      supplier = "",
      isActive = "",
      sortBy = "created_at",
      sortOrder = "DESC",
      parentId,
      taricId,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where conditions
    const whereConditions: FindOptionsWhere<Item> = {};

    // Search across multiple fields
    if (search) {
      whereConditions.item_name = ILike(`%${search}%`);
    }

    // Filter by status/active
    if (isActive) {
      whereConditions.isActive = isActive as string;
    }

    // Filter by category
    if (category) {
      whereConditions.cat_id = parseInt(category as string);
    }

    // Filter by parent
    if (parentId) {
      whereConditions.parent_id = parseInt(parentId as string);
    }

    // Filter by taric
    if (taricId) {
      whereConditions.taric_id = parseInt(taricId as string);
    }

    // Build relations
    const relations = ["parent", "taric", "category"];

    // Get total count
    const totalRecords = await itemRepository.count({ where: whereConditions });

    // Get paginated items
    const items = await itemRepository.find({
      where: whereConditions,
      relations,
      order: {
        [sortBy as string]: sortOrder === "DESC" ? "DESC" : "ASC",
      },
      skip,
      take: limitNum,
    });

    // Format response
    const formattedItems = items.map((item) => ({
      id: item.id,
      de_no: item.parent?.de_no || null,
      name_de: item.parent?.name_de || null,
      name_en: item.parent?.name_en || null,
      name_cn: item.parent?.name_cn || null,
      item_name: item.item_name,
      item_name_cn: item.item_name_cn,
      ean: item.ean,
      is_active: item.isActive,
      parent_id: item.parent_id,
      taric_id: item.taric_id,
      category_id: item.cat_id,
      category: item.category?.name || null,
      weight: item.weight,
      length: item.length,
      width: item.width,
      height: item.height,
      remark: item.remark,
      model: item.model,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: formattedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get item by ID
export const getItemById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const itemRepository = AppDataSource.getRepository(Item);
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const variationRepository = AppDataSource.getRepository(VariationValue);
    const qualityRepository = AppDataSource.getRepository(ItemQuality);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);

    // Get item with relations
    const item = await itemRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["parent", "taric", "category"],
    });

    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    // Get related data
    const warehouseItems = await warehouseRepository.find({
      where: { item_id: parseInt(id) },
    });

    const variationValues = await variationRepository.find({
      where: { item_id: parseInt(id) },
    });

    const qualityCriteria = await qualityRepository.find({
      where: { item_id: parseInt(id) },
    });

    // const orderItems = await orderItemRepository.find({
    //   where: { item: parseInt(id) },
    //   relations: ["order"],
    // });

    // Format response based on your frontend structure
    const formattedItem = {
      id: item.id,
      itemNo: `${item.id} / ${item.parent?.de_no || ""}`,
      name: item.item_name || "",
      nameCN: item.item_name_cn || "",
      ean: item.ean?.toString() || "",
      category: item.category?.name || "STD",
      model: item.model || "",
      remark: item.remark || "",
      isActive: item.isActive === "Y",

      // Parent details
      parent: {
        noDE: item.parent?.de_no || "NONE",
        nameDE: item.parent?.name_de || "NONE",
        nameEN: item.parent?.name_en || "NONE",
        isActive: item.parent?.is_active === "Y",
        isSpecialItem: item.parent?.is_NwV === "Y",
        priceEUR: 0, // You'll need to add this to your model
        priceRMB: 0, // You'll need to add this to your model
        isEURSpecial: item.is_eur_special === "Y",
        isRMBSpecial: item.is_rmb_special === "Y",
      },

      // Dimensions
      dimensions: {
        isbn: item.ISBN?.toString() || "1",
        weight: item.weight?.toString() || "0",
        length: item.length?.toString() || "0",
        width: item.width?.toString() || "0",
        height: item.height?.toString() || "0",
      },

      // Variations
      variationsDE: {
        variations: [
          item.parent?.var_de_1,
          item.parent?.var_de_2,
          item.parent?.var_de_3,
        ].filter(Boolean),
        values: variationValues.map((v) => v.value_de).filter(Boolean),
      },
      variationsEN: {
        variations: [
          item.parent?.var_en_1,
          item.parent?.var_en_2,
          item.parent?.var_en_3,
        ].filter(Boolean),
        values: variationValues.map((v) => v.value_en).filter(Boolean),
      },

      // Others
      others: {
        taricCode: item.taric?.code || "",
        isQTYdiv: item.is_qty_dividable === "Y",
        mc: item.many_components?.toString() || "0",
        er: item.effort_rating?.toString() || "0",
        isMeter: item.is_meter_item === 1,
        isPU: item.is_pu_item === 1,
        isNPR: item.is_npr === "Y",
        isNew: item.is_new === "Y",
        warehouseItem: warehouseItems[0]?.id?.toString() || "",
        idDE: item.ItemID_DE?.toString() || "",
        noDE: item.parent_no_de || "",
        nameDE: item.parent?.name_de || "",
        nameEN: item.parent?.name_en || "",
        isActive: item.isActive === "Y",
        isStock: warehouseItems.some((wi: any) => wi.stock_qty > 0),
        qty: warehouseItems
          .reduce((sum, wi: any) => sum + wi.stock_qty, 0)
          .toString(),
        msq: warehouseItems[0]?.msq?.toString() || "0",
        isNAO: false,
        buffer: warehouseItems[0]?.buffer?.toString() || "0",
        isSnSI: false,
      },

      // Quality criteria
      qualityCriteria: qualityCriteria.map((qc: any) => ({
        id: qc.id,
        name: qc.name || "",
        picture: qc.picture || "",
        description: qc.description || "",
        descriptionCN: qc.description_cn || "",
      })),

      // Attachments
      attachments: [],

      // Pictures
      pictures: {
        shopPicture: item.photo || "",
        ebayPictures: item.pix_path_eBay || "",
      },

      // NPR Remarks
      nprRemarks: item.npr_remark || "",
    };

    return res.status(200).json({
      success: true,
      data: formattedItem,
    });
  } catch (error) {
    return next(error);
  }
};

// Create new item
export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemRepository: any = AppDataSource.getRepository(Item);
    const parentRepository = AppDataSource.getRepository(Parent);
    const taricRepository = AppDataSource.getRepository(Taric);
    const categoryRepository = AppDataSource.getRepository(Category);

    const {
      item_name,
      item_name_cn,
      ean,
      parent_id,
      taric_id,
      cat_id,
      weight,
      length,
      width,
      height,
      remark,
      model,
      isActive = "Y",
      is_qty_dividable = "Y",
      is_npr = "N",
      is_eur_special = "N",
      is_rmb_special = "N",
    } = req.body;

    // Validate required fields
    if (!item_name || !parent_id) {
      return next(
        new ErrorHandler("Item name and parent ID are required", 400)
      );
    }

    // Check if parent exists
    const parent = await parentRepository.findOne({ where: { id: parent_id } });
    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

    // Check if taric exists
    if (taric_id) {
      const taric = await taricRepository.findOne({ where: { id: taric_id } });
      if (!taric) {
        return next(new ErrorHandler("Taric not found", 404));
      }
    }

    // Check if category exists
    if (cat_id) {
      const category = await categoryRepository.findOne({
        where: { id: cat_id },
      });
      if (!category) {
        return next(new ErrorHandler("Category not found", 404));
      }
    }

    // Check if EAN already exists
    if (ean) {
      const existingItem = await itemRepository.findOne({ where: { ean } });
      if (existingItem) {
        return next(new ErrorHandler("Item with this EAN already exists", 400));
      }
    }

    // Create new item
    const newItem = itemRepository.create({
      item_name,
      item_name_cn,
      ean: ean ? BigInt(ean) : null,
      parent_id,
      taric_id,
      cat_id,
      weight: weight ? parseFloat(weight) : null,
      length: length ? parseFloat(length) : 0,
      width: width ? parseFloat(width) : null,
      height: height ? parseFloat(height) : null,
      remark,
      model,
      isActive,
      is_qty_dividable,
      is_npr,
      is_eur_special,
      is_rmb_special,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await itemRepository.save(newItem);

    // Create warehouse entry for the item
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const warehouseItem = warehouseRepository.create({
      item_id: newItem.id,
      item_no_de: parent.de_no,
      item_name_de: item_name,
      item_name_en: item_name,
      stock_qty: 0,
      msq: 0,
      buffer: 0,
      is_active: "Y",
      is_stock_item: "N",
      created_at: new Date(),
    });

    await warehouseRepository.save(warehouseItem);

    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: {
        id: newItem.id,
        item_name: newItem.item_name,
        ean: newItem.ean,
        parent_id: newItem.parent_id,
        isActive: newItem.isActive,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Update item
export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const itemRepository = AppDataSource.getRepository(Item);

    if (!id) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const item = await itemRepository.findOne({ where: { id: parseInt(id) } });
    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    // Update fields
    const updatableFields = [
      "item_name",
      "item_name_cn",
      "ean",
      "parent_id",
      "taric_id",
      "cat_id",
      "weight",
      "length",
      "width",
      "height",
      "remark",
      "model",
      "isActive",
      "is_qty_dividable",
      "is_npr",
      "is_eur_special",
      "is_rmb_special",
      "note",
      "photo",
      "pix_path",
      "pix_path_eBay",
      "npr_remark",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "ean" && req.body[field]) {
          (item as any)[field] = BigInt(req.body[field]);
        } else {
          (item as any)[field] = req.body[field];
        }
      }
    });

    item.updated_at = new Date();

    await itemRepository.save(item);

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: {
        id: item.id,
        item_name: item.item_name,
        isActive: item.isActive,
        updated_at: item.updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Delete item
export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const itemRepository = AppDataSource.getRepository(Item);
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const variationRepository = AppDataSource.getRepository(VariationValue);
    const qualityRepository = AppDataSource.getRepository(ItemQuality);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);

    // Check if item exists
    const item = await itemRepository.findOne({ where: { id: parseInt(id) } });
    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    // Check if there's stock in warehouse
    const warehouseItems = await warehouseRepository.find({
      where: { item_id: parseInt(id) },
    });

    const totalStock = warehouseItems.reduce(
      (sum, wi: any) => sum + wi.stock_qty,
      0
    );
    if (totalStock > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete item. There is stock in warehouse. Please clear stock first.",
          400
        )
      );
    }

    // Use transaction to delete all related data
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.delete(WarehouseItem, {
        item_id: parseInt(id),
      });
      await transactionalEntityManager.delete(VariationValue, {
        item_id: parseInt(id),
      });
      await transactionalEntityManager.delete(ItemQuality, {
        item_id: parseInt(id),
      });
      await transactionalEntityManager.delete(Item, parseInt(id));
    });

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// Toggle item status
export const toggleItemStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!id) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    if (isActive === undefined) {
      return next(new ErrorHandler("Status is required", 400));
    }

    const itemRepository = AppDataSource.getRepository(Item);
    const item = await itemRepository.findOne({ where: { id: parseInt(id) } });

    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    item.isActive = isActive ? "Y" : "N";
    item.updated_at = new Date();

    await itemRepository.save(item);

    return res.status(200).json({
      success: true,
      message: `Item ${isActive ? "activated" : "deactivated"} successfully`,
      data: {
        id: item.id,
        isActive: item.isActive,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Bulk update items
export const bulkUpdateItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new ErrorHandler("Item IDs are required", 400));
    }

    if (!updates || typeof updates !== "object") {
      return next(new ErrorHandler("Updates object is required", 400));
    }

    const itemRepository = AppDataSource.getRepository(Item);

    const updatedItems = [];
    for (const id of ids) {
      const item = await itemRepository.findOne({
        where: { id: parseInt(id) },
      });
      if (item) {
        Object.keys(updates).forEach((key) => {
          if (key in item && key !== "id") {
            (item as any)[key] = updates[key];
          }
        });
        item.updated_at = new Date();
        await itemRepository.save(item);
        updatedItems.push(item);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${updatedItems.length} items updated successfully`,
      data: {
        count: updatedItems.length,
        items: updatedItems.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          isActive: item.isActive,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get item statistics
export const getItemStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemRepository = AppDataSource.getRepository(Item);
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);

    // Total items count
    const totalItems = await itemRepository.count();

    // Active items count
    const activeItems = await itemRepository.count({
      where: { isActive: "Y" },
    });

    // Items with stock
    const itemsWithStock = await warehouseRepository
      .createQueryBuilder("warehouse")
      .select("COUNT(DISTINCT warehouse.item_id)", "count")
      .where("warehouse.stock_qty > 0")
      .getRawOne();

    // Items by category
    const itemsByCategory = await itemRepository
      .createQueryBuilder("item")
      .leftJoin("item.category", "category")
      .select("category.name", "category")
      .addSelect("COUNT(item.id)", "count")
      .groupBy("category.name")
      .orderBy("count", "DESC")
      .getRawMany();

    return res.status(200).json({
      success: true,
      data: {
        totalItems,
        activeItems,
        inactiveItems: totalItems - activeItems,
        itemsWithStock: parseInt(itemsWithStock.count) || 0,
        itemsByCategory,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Search items by name or EAN
export const searchItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q, limit = "10" } = req.query;

    if (!q) {
      return next(new ErrorHandler("Search query is required", 400));
    }

    const itemRepository = AppDataSource.getRepository(Item);
    const searchTerm = `%${q}%`;

    const items = await itemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.parent", "parent")
      .leftJoinAndSelect("item.category", "category")
      .where("item.item_name ILIKE :search", { search: searchTerm })
      .orWhere("item.item_name_cn ILIKE :search", { search: searchTerm })
      .orWhere("item.ean::text ILIKE :search", { search: searchTerm })
      .orWhere("parent.name_de ILIKE :search", { search: searchTerm })
      .orWhere("parent.name_en ILIKE :search", { search: searchTerm })
      .orderBy("item.created_at", "DESC")
      .take(parseInt(limit as string))
      .getMany();

    const formattedItems = items.map((item) => ({
      id: item.id,
      de_no: item.parent?.de_no || null,
      name_de: item.parent?.name_de || null,
      name_en: item.parent?.name_en || null,
      item_name: item.item_name,
      ean: item.ean,
      category: item.category?.name || null,
      is_active: item.isActive,
    }));

    return res.status(200).json({
      success: true,
      data: formattedItems,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// PARENTS CONTROLLERS
// ============================================

// Get all parents with pagination and filters
export const getParents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parentRepository = AppDataSource.getRepository(Parent);

    // Get query parameters
    const {
      page = "1",
      limit = "30",
      search = "",
      status = "",
      isActive = "",
      sortBy = "created_at",
      sortOrder = "DESC",
      supplierId,
      taricId,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where conditions
    const whereConditions: FindOptionsWhere<Parent> = {};

    // Search across multiple fields
    if (search) {
      whereConditions.name_de = ILike(`%${search}%`);
    }

    // Filter by status/active
    if (isActive) {
      whereConditions.is_active = isActive as string;
    }

    // Filter by supplier
    if (supplierId) {
      whereConditions.supplier_id = parseInt(supplierId as string);
    }

    // Filter by taric
    if (taricId) {
      whereConditions.taric_id = parseInt(taricId as string);
    }

    // Build relations
    const relations = ["taric", "supplier", "items"];

    // Get total count
    const totalRecords = await parentRepository.count({
      where: whereConditions,
    });

    // Get paginated parents
    const parents = await parentRepository.find({
      where: whereConditions,
      relations,
      order: {
        [sortBy as string]: sortOrder === "DESC" ? "DESC" : "ASC",
      },
      skip,
      take: limitNum,
    });

    // Format response
    const formattedParents = parents.map((parent) => ({
      id: parent.id,
      de_no: parent.de_no,
      name_de: parent.name_de,
      name_en: parent.name_en,
      name_cn: parent.name_cn,
      is_active: parent.is_active,
      taric_id: parent.taric_id,
      supplier_id: parent.supplier_id,
      supplier: parent.supplier
        ? {
            id: parent.supplier.id,
            name: parent.supplier.name,
          }
        : null,
      item_count: parent.items?.length || 0,
      created_at: parent.created_at,
      updated_at: parent.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: formattedParents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get parent by ID
export const getParentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Parent ID is required", 400));
    }

    const parentRepository = AppDataSource.getRepository(Parent);
    const itemRepository = AppDataSource.getRepository(Item);

    // Get parent with relations
    const parent = await parentRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["taric", "supplier"],
    });

    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

    // Get child items
    const items = await itemRepository.find({
      where: { parent_id: parseInt(id) },
      relations: ["category"],
    });

    const formattedItems = items.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      item_name_cn: item.item_name_cn,
      ean: item.ean,
      is_active: item.isActive,
      category: item.category?.name || null,
      created_at: item.created_at,
    }));

    // Format response
    const formattedParent = {
      id: parent.id,
      de_no: parent.de_no,
      name_de: parent.name_de,
      name_en: parent.name_en,
      name_cn: parent.name_cn,
      is_active: parent.is_active,
      taric: parent.taric
        ? {
            id: parent.taric.id,
            code: parent.taric.code,
            name_de: parent.taric.name_de,
          }
        : null,
      supplier: parent.supplier
        ? {
            id: parent.supplier.id,
            name: parent.supplier.name,
            contact_person: parent.supplier.contact_person,
          }
        : null,
      variations: {
        de: [parent.var_de_1, parent.var_de_2, parent.var_de_3].filter(Boolean),
        en: [parent.var_en_1, parent.var_en_2, parent.var_en_3].filter(Boolean),
      },
      is_NwV: parent.is_NwV === "Y",
      parent_rank: parent.parent_rank,
      is_var_unilingual: parent.is_var_unilingual === "Y",
      items: formattedItems,
      item_count: items.length,
      created_at: parent.created_at,
      updated_at: parent.updated_at,
    };

    return res.status(200).json({
      success: true,
      data: formattedParent,
    });
  } catch (error) {
    return next(error);
  }
};

// Create new parent
export const createParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parentRepository = AppDataSource.getRepository(Parent);
    const taricRepository = AppDataSource.getRepository(Taric);
    const supplierRepository = AppDataSource.getRepository(Supplier);

    const {
      de_no,
      name_de,
      name_en,
      name_cn,
      taric_id,
      supplier_id,
      var_de_1,
      var_de_2,
      var_de_3,
      var_en_1,
      var_en_2,
      var_en_3,
      is_NwV = "N",
      is_var_unilingual = "N",
      is_active = "Y",
    } = req.body;

    // Validate required fields
    if (!de_no || !name_de) {
      return next(
        new ErrorHandler("DE number and German name are required", 400)
      );
    }

    // Check if DE number already exists
    const existingParent = await parentRepository.findOne({ where: { de_no } });
    if (existingParent) {
      return next(
        new ErrorHandler("Parent with this DE number already exists", 400)
      );
    }

    // Check if taric exists
    if (taric_id) {
      const taric = await taricRepository.findOne({ where: { id: taric_id } });
      if (!taric) {
        return next(new ErrorHandler("Taric not found", 404));
      }
    }

    // Check if supplier exists
    if (supplier_id) {
      const supplier = await supplierRepository.findOne({
        where: { id: supplier_id },
      });
      if (!supplier) {
        return next(new ErrorHandler("Supplier not found", 404));
      }
    }

    // Create new parent
    const newParent = parentRepository.create({
      de_no,
      name_de,
      name_en,
      name_cn,
      taric_id,
      supplier_id,
      var_de_1,
      var_de_2,
      var_de_3,
      var_en_1,
      var_en_2,
      var_en_3,
      is_NwV,
      is_var_unilingual,
      is_active,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await parentRepository.save(newParent);

    return res.status(201).json({
      success: true,
      message: "Parent created successfully",
      data: {
        id: newParent.id,
        de_no: newParent.de_no,
        name_de: newParent.name_de,
        is_active: newParent.is_active,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Update parent
export const updateParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const parentRepository = AppDataSource.getRepository(Parent);

    if (!id) {
      return next(new ErrorHandler("Parent ID is required", 400));
    }

    const parent = await parentRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

    // Update fields
    const updatableFields = [
      "de_no",
      "name_de",
      "name_en",
      "name_cn",
      "taric_id",
      "supplier_id",
      "var_de_1",
      "var_de_2",
      "var_de_3",
      "var_en_1",
      "var_en_2",
      "var_en_3",
      "is_NwV",
      "is_var_unilingual",
      "is_active",
      "parent_rank",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (parent as any)[field] = req.body[field];
      }
    });

    parent.updated_at = new Date();

    await parentRepository.save(parent);

    return res.status(200).json({
      success: true,
      message: "Parent updated successfully",
      data: {
        id: parent.id,
        de_no: parent.de_no,
        name_de: parent.name_de,
        is_active: parent.is_active,
        updated_at: parent.updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Delete parent
export const deleteParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Parent ID is required", 400));
    }

    const parentRepository = AppDataSource.getRepository(Parent);
    const itemRepository = AppDataSource.getRepository(Item);

    // Check if parent exists
    const parent = await parentRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

    // Check if parent has child items
    const childItems = await itemRepository.find({
      where: { parent_id: parseInt(id) },
    });

    if (childItems.length > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete parent. It has child items. Please delete or reassign child items first.",
          400
        )
      );
    }

    await parentRepository.delete(parseInt(id));

    return res.status(200).json({
      success: true,
      message: "Parent deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// Search parents by name or DE number
export const searchParents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q, limit = "10" } = req.query;

    if (!q) {
      return next(new ErrorHandler("Search query is required", 400));
    }

    const parentRepository = AppDataSource.getRepository(Parent);
    const searchTerm = `%${q}%`;

    const parents = await parentRepository
      .createQueryBuilder("parent")
      .where("parent.name_de ILIKE :search", { search: searchTerm })
      .orWhere("parent.name_en ILIKE :search", { search: searchTerm })
      .orWhere("parent.de_no ILIKE :search", { search: searchTerm })
      .orderBy("parent.created_at", "DESC")
      .take(parseInt(limit as string))
      .getMany();

    const formattedParents = parents.map((parent) => ({
      id: parent.id,
      de_no: parent.de_no,
      name_de: parent.name_de,
      name_en: parent.name_en,
      is_active: parent.is_active,
      item_count: 0, // You might want to fetch this separately
    }));

    return res.status(200).json({
      success: true,
      data: formattedParents,
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// WAREHOUSE ITEMS CONTROLLERS
// ============================================

// Get warehouse items
export const getWarehouseItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const itemRepository = AppDataSource.getRepository(Item);

    // Get query parameters
    const {
      page = "1",
      limit = "30",
      search = "",
      hasStock = "",
      isStockItem = "",
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = warehouseRepository.createQueryBuilder("warehouse");

    // Apply filters
    if (search) {
      query
        .where("warehouse.item_name_de ILIKE :search", {
          search: `%${search}%`,
        })
        .orWhere("warehouse.item_name_en ILIKE :search", {
          search: `%${search}%`,
        })
        .orWhere("warehouse.item_no_de ILIKE :search", {
          search: `%${search}%`,
        });
    }

    if (hasStock === "true") {
      query.andWhere("warehouse.stock_qty > 0");
    } else if (hasStock === "false") {
      query.andWhere("warehouse.stock_qty = 0");
    }

    if (isStockItem) {
      query.andWhere("warehouse.is_stock_item = :isStockItem", { isStockItem });
    }

    // Get total count
    const totalRecords = await query.getCount();

    // Apply pagination and sorting
    const warehouseItems = await query
      .orderBy(`warehouse.${sortBy}`, sortOrder === "DESC" ? "DESC" : "ASC")
      .skip(skip)
      .take(limitNum)
      .getMany();

    // Format response
    const formattedItems = warehouseItems.map((warehouse) => ({
      id: warehouse.id,
      item_id: warehouse.item_id,
      item_no_de: warehouse.item_no_de,
      item_name_de: warehouse.item_name_de,
      item_name_en: warehouse.item_name_en,
      stock_qty: warehouse.stock_qty,
      msq: warehouse.msq,
      buffer: warehouse.buffer,
      is_active: warehouse.is_active,
      is_stock_item: warehouse.is_stock_item,
      //   parent_de_no: warehouse.ite?.parent?.de_no || null,
      //   parent_name_de: warehouse.item?.parent?.name_de || null,
      created_at: warehouse.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: formattedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Update warehouse item stock
export const updateWarehouseStock = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { stock_qty, msq, buffer, is_stock_item } = req.body;

    if (!id) {
      return next(new ErrorHandler("Warehouse item ID is required", 400));
    }

    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const warehouseItem = await warehouseRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!warehouseItem) {
      return next(new ErrorHandler("Warehouse item not found", 404));
    }

    // Update fields
    if (stock_qty !== undefined) {
      if (stock_qty < 0) {
        return next(new ErrorHandler("Stock quantity cannot be negative", 400));
      }
      warehouseItem.stock_qty = stock_qty;
    }

    if (msq !== undefined) {
      warehouseItem.msq = msq;
    }

    if (buffer !== undefined) {
      warehouseItem.buffer = buffer;
    }

    if (is_stock_item !== undefined) {
      warehouseItem.is_stock_item = is_stock_item;
    }

    warehouseItem.updated_at = new Date();
    await warehouseRepository.save(warehouseItem);

    return res.status(200).json({
      success: true,
      message: "Warehouse stock updated successfully",
      data: {
        id: warehouseItem.id,
        stock_qty: warehouseItem.stock_qty,
        msq: warehouseItem.msq,
        buffer: warehouseItem.buffer,
        is_stock_item: warehouseItem.is_stock_item,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// VARIATION VALUES CONTROLLERS
// ============================================

// Get variation values for an item
export const getItemVariations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const variationRepository = AppDataSource.getRepository(VariationValue);
    const variations = await variationRepository.find({
      where: { item_id: parseInt(itemId) },
      order: { created_at: "ASC" },
    });

    const formattedVariations = variations.map((variation) => ({
      id: variation.id,
      item_id: variation.item_id,
      value_de: variation.value_de,
      value_de_2: variation.value_de_2,
      value_de_3: variation.value_de_3,
      value_en: variation.value_en,
      value_en_2: variation.value_en_2,
      value_en_3: variation.value_en_3,
      created_at: variation.created_at,
      updated_at: variation.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: formattedVariations,
    });
  } catch (error) {
    return next(error);
  }
};

// Create or update variation values
export const updateItemVariations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const variations = req.body; // Array of variation objects

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    if (!Array.isArray(variations)) {
      return next(new ErrorHandler("Variations must be an array", 400));
    }

    const variationRepository = AppDataSource.getRepository(VariationValue);
    const itemRepository = AppDataSource.getRepository(Item);

    // Check if item exists
    const item = await itemRepository.findOne({
      where: { id: parseInt(itemId) },
    });
    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    // Use transaction for batch operations
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Delete existing variations for this item
      await transactionalEntityManager.delete(VariationValue, {
        item_id: parseInt(itemId),
      });

      // Create new variations
      const newVariations = variations.map((variation) =>
        variationRepository.create({
          item_id: parseInt(itemId),
          value_de: variation.value_de,
          value_de_2: variation.value_de_2,
          value_de_3: variation.value_de_3,
          value_en: variation.value_en,
          value_en_2: variation.value_en_2,
          value_en_3: variation.value_en_3,
          created_at: new Date(),
          updated_at: new Date(),
        })
      );

      if (newVariations.length > 0) {
        await transactionalEntityManager.save(VariationValue, newVariations);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Variation values updated successfully",
      data: {
        item_id: parseInt(itemId),
        count: variations.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================
// QUALITY CRITERIA CONTROLLERS
// ============================================

// Get quality criteria for an item
export const getItemQualityCriteria = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const qualityRepository = AppDataSource.getRepository(ItemQuality);
    const criteria = await qualityRepository.find({
      where: { item_id: parseInt(itemId) },
      order: { created_at: "ASC" },
    });

    return res.status(200).json({
      success: true,
      data: criteria,
    });
  } catch (error) {
    return next(error);
  }
};

// Create quality criteria
export const createQualityCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { name, picture, description, description_cn } = req.body;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    if (!name) {
      return next(new ErrorHandler("Criterion name is required", 400));
    }

    const qualityRepository: any = AppDataSource.getRepository(ItemQuality);
    const itemRepository = AppDataSource.getRepository(Item);

    // Check if item exists
    const item = await itemRepository.findOne({
      where: { id: parseInt(itemId) },
    });
    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    const newCriterion = qualityRepository.create({
      item_id: parseInt(itemId),
      name,
      picture,
      description,
      description_cn,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await qualityRepository.save(newCriterion);

    return res.status(201).json({
      success: true,
      message: "Quality criterion created successfully",
      data: newCriterion,
    });
  } catch (error) {
    return next(error);
  }
};

// Update quality criterion
export const updateQualityCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, picture, description, description_cn } = req.body;

    if (!id) {
      return next(new ErrorHandler("Criterion ID is required", 400));
    }

    const qualityRepository = AppDataSource.getRepository(ItemQuality);
    const criterion = await qualityRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!criterion) {
      return next(new ErrorHandler("Quality criterion not found", 404));
    }

    // Update fields
    if (name !== undefined) criterion.name = name;
    if (picture !== undefined) criterion.picture = picture;
    if (description !== undefined) criterion.description = description;
    // if (description_cn !== undefined) criterion.description_cn = description_cn;

    criterion.updated_at = new Date();
    await qualityRepository.save(criterion);

    return res.status(200).json({
      success: true,
      message: "Quality criterion updated successfully",
      data: criterion,
    });
  } catch (error) {
    return next(error);
  }
};

// Delete quality criterion
export const deleteQualityCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Criterion ID is required", 400));
    }

    const qualityRepository = AppDataSource.getRepository(ItemQuality);
    const criterion = await qualityRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!criterion) {
      return next(new ErrorHandler("Quality criterion not found", 404));
    }

    await qualityRepository.delete(parseInt(id));

    return res.status(200).json({
      success: true,
      message: "Quality criterion deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllTarics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taricRepository = AppDataSource.getRepository(Taric);

    // Get query parameters
    const {
      page = "1",
      limit = "30",
      search = "",
      code = "",
      name = "",
      sortBy = "id",
      sortOrder = "ASC",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where conditions
    const whereConditions: FindOptionsWhere<Taric> = {};

    // Search across multiple fields
    if (search) {
      whereConditions.code = ILike(`%${search}%`);
      whereConditions.name_de = ILike(`%${search}%`);
      whereConditions.name_en = ILike(`%${search}%`);
      whereConditions.name_cn = ILike(`%${search}%`);
    }

    // Filter by specific fields
    if (code) {
      whereConditions.code = ILike(`%${code}%`);
    }

    if (name) {
      whereConditions.name_de = ILike(`%${name}%`);
    }

    // Get total count
    const totalRecords = await taricRepository.count({
      where: whereConditions,
    });

    // Get paginated tarics
    const tarics = await taricRepository.find({
      where: whereConditions,
      order: {
        [sortBy as string]: sortOrder === "DESC" ? "DESC" : "ASC",
      },
      skip,
      take: limitNum,
    });

    // Format response
    const formattedTarics = tarics.map((taric) => ({
      id: taric.id,
      code: taric.code,
      name_de: taric.name_de,
      name_en: taric.name_en,
      name_cn: taric.name_cn,
      description_de: taric.description_de,
      description_en: taric.description_en,
      reguler_artikel: taric.reguler_artikel,
      duty_rate: taric.duty_rate,
      item_count: taric.items?.length || 0,
      parent_count: taric.parents?.length || 0,
      created_at: taric.created_at,
      updated_at: taric.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: formattedTarics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get taric by ID with relationships
export const getTaricById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("TARIC ID is required", 400));
    }

    const taricRepository = AppDataSource.getRepository(Taric);
    const itemRepository = AppDataSource.getRepository(Item);
    const parentRepository = AppDataSource.getRepository(Parent);

    // Get taric with relations
    const taric = await taricRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!taric) {
      return next(new ErrorHandler("TARIC not found", 404));
    }

    // Get related items
    const items = await itemRepository.find({
      where: { taric_id: parseInt(id) },
      relations: ["parent", "category"],
      take: 10, // Limit to 10 items for preview
    });

    // Get related parents
    const parents = await parentRepository.find({
      where: { taric_id: parseInt(id) },
      take: 10, // Limit to 10 parents for preview
    });

    // Format response
    const formattedTaric = {
      id: taric.id,
      code: taric.code,
      name_de: taric.name_de,
      name_en: taric.name_en,
      name_cn: taric.name_cn,
      description_de: taric.description_de,
      description_en: taric.description_en,
      reguler_artikel: taric.reguler_artikel,
      duty_rate: taric.duty_rate,
      created_at: taric.created_at,
      updated_at: taric.updated_at,
      items: items.map((item) => ({
        id: item.id,
        item_name: item.item_name,
        item_name_cn: item.item_name_cn,
        ean: item.ean,
        parent: item.parent?.name_de || null,
        category: item.category?.name || null,
      })),
      parents: parents.map((parent) => ({
        id: parent.id,
        de_no: parent.de_no,
        name_de: parent.name_de,
        name_en: parent.name_en,
      })),
      statistics: {
        total_items: await itemRepository.count({
          where: { taric_id: parseInt(id) },
        }),
        total_parents: await parentRepository.count({
          where: { taric_id: parseInt(id) },
        }),
      },
    };

    return res.status(200).json({
      success: true,
      data: formattedTaric,
    });
  } catch (error) {
    return next(error);
  }
};
// MIS database connection helper functions
const syncTaricToMIS = async (
  taricData: any,
  operation: "create" | "update" | "delete"
) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Helper function to convert undefined to null
    const convertUndefinedToNull = (value: any) => {
      return value === undefined ? null : value;
    };

    if (operation === "create") {
      const query = `
        INSERT INTO tarics   
        (code, reguler_artikel, duty_rate, name_de, description_de, name_en, description_en, name_cn, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        convertUndefinedToNull(taricData.code),
        convertUndefinedToNull(taricData.reguler_artikel) || "Y",
        convertUndefinedToNull(taricData.duty_rate) || 0,
        convertUndefinedToNull(taricData.name_de),
        convertUndefinedToNull(taricData.description_de),
        convertUndefinedToNull(taricData.name_en),
        convertUndefinedToNull(taricData.description_en),
        convertUndefinedToNull(taricData.name_cn),
        convertUndefinedToNull(taricData.created_at) || new Date(),
        convertUndefinedToNull(taricData.updated_at) || new Date(),
      ]);
    } else if (operation === "update") {
      const query = `
        UPDATE taric SET
          code = ?,
          reguler_artikel = ?,
          duty_rate = ?,
          name_de = ?,
          description_de = ?,
          name_en = ?,
          description_en = ?,
          name_cn = ?,
          updated_at = ?
        WHERE code = ?
      `;

      await connection.execute(query, [
        convertUndefinedToNull(taricData.code),
        convertUndefinedToNull(taricData.reguler_artikel) || "Y",
        convertUndefinedToNull(taricData.duty_rate) || 0,
        convertUndefinedToNull(taricData.name_de),
        convertUndefinedToNull(taricData.description_de),
        convertUndefinedToNull(taricData.name_en),
        convertUndefinedToNull(taricData.description_en),
        convertUndefinedToNull(taricData.name_cn),
        convertUndefinedToNull(taricData.updated_at) || new Date(),
        convertUndefinedToNull(taricData.originalCode) ||
          convertUndefinedToNull(taricData.code),
      ]);
    } else if (operation === "delete") {
      const query = `DELETE FROM tarics WHERE code = ?`;
      await connection.execute(query, [convertUndefinedToNull(taricData.code)]);
    }
  } catch (error: any) {
    console.error("Error syncing to MIS database:", error);
    throw new Error(`Failed to sync TARIC to MIS: ${error.message}`);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Create TARIC with MIS sync
// Create TARIC with MIS sync and ID generation
export const createTaric = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let connection;
  try {
    const taricRepository = AppDataSource.getRepository(Taric);

    const {
      code,
      name_de,
      name_en,
      name_cn,
      description_de,
      description_en,
      reguler_artikel = "Y",
      duty_rate = 0,
    } = req.body;

    // Validate required fields
    if (!code) {
      return next(new ErrorHandler("TARIC code is required", 400));
    }

    // Check if code already exists
    const existingTaric = await taricRepository.findOne({ where: { code } });
    if (existingTaric) {
      return next(new ErrorHandler("TARIC with this code already exists", 400));
    }

    // Find the highest ID to generate the next ID
    const maxIdResult = await taricRepository
      .createQueryBuilder("taric")
      .select("MAX(taric.id)", "max")
      .getRawOne();

    const nextId = (maxIdResult?.max || 0) + 1;

    // Create new taric in local database
    const newTaric = taricRepository.create({
      id: nextId, // Set the generated ID
      code,
      name_de,
      name_en,
      name_cn,
      description_de,
      description_en,
      reguler_artikel,
      duty_rate,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await taricRepository.save(newTaric);

    // Sync to MIS database (MIS has AUTO_INCREMENT for id, so we don't need to pass id)
    try {
      await syncTaricToMIS(
        {
          id: nextId,
          code,
          name_de,
          name_en,
          name_cn,
          description_de,
          description_en,
          reguler_artikel,
          duty_rate,
          created_at: newTaric.created_at,
          updated_at: newTaric.updated_at,
        },
        "create"
      );
    } catch (misError: any) {
      // Rollback local creation if MIS sync fails
      await taricRepository.delete(newTaric.id);
      return next(
        new ErrorHandler(
          `TARIC created locally but failed to sync to MIS: ${misError.message}`,
          500
        )
      );
    }

    return res.status(201).json({
      success: true,
      message: "TARIC created successfully and synced to MIS",
      data: {
        id: newTaric.id,
        code: newTaric.code,
        name_de: newTaric.name_de,
        name_en: newTaric.name_en,
        duty_rate: newTaric.duty_rate,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Update TARIC with MIS sync
export const updateTaric = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let connection;
  try {
    const { id } = req.params;
    const taricRepository = AppDataSource.getRepository(Taric);

    if (!id) {
      return next(new ErrorHandler("TARIC ID is required", 400));
    }

    const taric = await taricRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!taric) {
      return next(new ErrorHandler("TARIC not found", 404));
    }

    // Store original code for MIS update
    const originalCode = taric.code;

    // Update fields
    const updatableFields = [
      "code",
      "name_de",
      "name_en",
      "name_cn",
      "description_de",
      "description_en",
      "reguler_artikel",
      "duty_rate",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (taric as any)[field] = req.body[field];
      }
    });

    taric.updated_at = new Date();

    await taricRepository.save(taric);

    // Sync to MIS database
    try {
      await syncTaricToMIS(
        {
          ...taric,
          originalCode, // Pass original code for the WHERE clause
        },
        "update"
      );
    } catch (misError: any) {
      // Rollback local update if MIS sync fails
      await taricRepository.save({
        ...taric,
        code: originalCode,
        ...Object.fromEntries(
          Object.entries(req.body).map(([key, value]) => [
            key,
            (taric as any)[key],
          ])
        ),
      });
      return next(
        new ErrorHandler(
          `TARIC updated locally but failed to sync to MIS: ${misError.message}`,
          500
        )
      );
    }

    return res.status(200).json({
      success: true,
      message: "TARIC updated successfully and synced to MIS",
      data: {
        id: taric.id,
        code: taric.code,
        name_de: taric.name_de,
        updated_at: taric.updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Delete TARIC with MIS sync
// Delete TARIC with MIS sync
export const deleteTaric = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let connection;
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("TARIC ID is required", 400));
    }

    const taricRepository = AppDataSource.getRepository(Taric);
    const itemRepository = AppDataSource.getRepository(Item);
    const parentRepository = AppDataSource.getRepository(Parent);

    // Check if taric exists
    const taric = await taricRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!taric) {
      return next(new ErrorHandler("TARIC not found", 404));
    }

    // Check if taric has related items
    const relatedItems = await itemRepository.count({
      where: { taric_id: parseInt(id) },
    });

    // Check if taric has related parents
    const relatedParents = await parentRepository.count({
      where: { taric_id: parseInt(id) },
    });

    if (relatedItems > 0 || relatedParents > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete TARIC. It has related items or parents. Please reassign them first.",
          400
        )
      );
    }

    // Store code for MIS deletion - ensure it's not undefined
    const taricCode = taric.code || null;
    if (!taricCode) {
      return next(
        new ErrorHandler("Cannot delete TARIC: code is missing", 400)
      );
    }

    // Delete from local database first
    await taricRepository.delete(parseInt(id));

    // Sync to MIS database
    try {
      await syncTaricToMIS({ code: taricCode }, "delete");
    } catch (misError: any) {
      // If MIS deletion fails, restore local record
      await taricRepository.save(taric);
      return next(
        new ErrorHandler(
          `TARIC deleted locally but failed to sync to MIS: ${misError.message}`,
          500
        )
      );
    }

    return res.status(200).json({
      success: true,
      message: "TARIC deleted successfully and synced from MIS",
    });
  } catch (error) {
    return next(error);
  }
};

// Search tarics by code or name
export const searchTarics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q, limit = "20" } = req.query;

    if (!q) {
      return next(new ErrorHandler("Search query is required", 400));
    }

    const taricRepository = AppDataSource.getRepository(Taric);
    const searchTerm = `%${q}%`;

    const tarics = await taricRepository
      .createQueryBuilder("taric")
      .where("taric.code ILIKE :search", { search: searchTerm })
      .orWhere("taric.name_de ILIKE :search", { search: searchTerm })
      .orWhere("taric.name_en ILIKE :search", { search: searchTerm })
      .orWhere("taric.name_cn ILIKE :search", { search: searchTerm })
      .orderBy("taric.code", "ASC")
      .take(parseInt(limit as string))
      .getMany();

    const formattedTarics = tarics.map((taric) => ({
      id: taric.id,
      code: taric.code,
      name_de: taric.name_de,
      name_en: taric.name_en,
      name_cn: taric.name_cn,
      duty_rate: taric.duty_rate,
    }));

    return res.status(200).json({
      success: true,
      data: formattedTarics,
    });
  } catch (error) {
    return next(error);
  }
};

// Get taric statistics
export const getTaricStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taricRepository = AppDataSource.getRepository(Taric);
    const itemRepository = AppDataSource.getRepository(Item);
    const parentRepository = AppDataSource.getRepository(Parent);

    // Total tarics count
    const totalTarics = await taricRepository.count();

    // Tarics with items count
    const taricsWithItems = await itemRepository
      .createQueryBuilder("item")
      .select("COUNT(DISTINCT item.taric_id)", "count")
      .where("item.taric_id IS NOT NULL")
      .getRawOne();

    // Tarics with parents count
    const taricsWithParents = await parentRepository
      .createQueryBuilder("parent")
      .select("COUNT(DISTINCT parent.taric_id)", "count")
      .where("parent.taric_id IS NOT NULL")
      .getRawOne();

    // Top tarics by item count
    const topTaricsByItems = await taricRepository
      .createQueryBuilder("taric")
      .leftJoin("taric.items", "item")
      .select("taric.id", "id")
      .addSelect("taric.code", "code")
      .addSelect("taric.name_de", "name_de")
      .addSelect("COUNT(item.id)", "item_count")
      .groupBy("taric.id")
      .orderBy("item_count", "DESC")
      .take(10)
      .getRawMany();

    // Top tarics by parent count
    const topTaricsByParents = await taricRepository
      .createQueryBuilder("taric")
      .leftJoin("taric.parents", "parent")
      .select("taric.id", "id")
      .addSelect("taric.code", "code")
      .addSelect("taric.name_de", "name_de")
      .addSelect("COUNT(parent.id)", "parent_count")
      .groupBy("taric.id")
      .orderBy("parent_count", "DESC")
      .take(10)
      .getRawMany();

    return res.status(200).json({
      success: true,
      data: {
        totalTarics,
        taricsWithItems: parseInt(taricsWithItems.count) || 0,
        taricsWithParents: parseInt(taricsWithParents.count) || 0,
        taricsWithoutRelations:
          totalTarics - (parseInt(taricsWithItems.count) || 0),
        topTaricsByItems,
        topTaricsByParents,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Bulk create/update tarics
export const bulkUpsertTarics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tarics } = req.body; // Array of taric objects

    if (!tarics || !Array.isArray(tarics) || tarics.length === 0) {
      return next(new ErrorHandler("TARICS array is required", 400));
    }

    const taricRepository = AppDataSource.getRepository(Taric);
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each taric
    for (const taricData of tarics) {
      try {
        if (!taricData.code) {
          results.failed++;
          results.errors.push({ data: taricData, error: "Code is required" });
          continue;
        }

        // Check if taric exists by code
        let taric: any = await taricRepository.findOne({
          where: { code: taricData.code },
        });

        if (taric) {
          // Update existing taric
          Object.assign(taric, taricData);
          taric.updated_at = new Date();
          results.updated++;
        } else {
          // Create new taric
          taric = taricRepository.create({
            ...taricData,
            created_at: new Date(),
            updated_at: new Date(),
          });
          results.created++;
        }

        await taricRepository.save(taric);
      } catch (error) {
        results.failed++;
        results.errors.push({
          data: taricData,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk TARIC operation completed",
      data: results,
    });
  } catch (error) {
    return next(error);
  }
};
