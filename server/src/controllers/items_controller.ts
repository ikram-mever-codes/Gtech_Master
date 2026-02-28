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
import { UserRole } from "../models/users";
import { filterDataByRole } from "../utils/dataFilter";
import { AuthorizedRequest } from "../middlewares/authorized";

export const getItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const itemRepository = AppDataSource.getRepository(Item);
    const {
      page = "1",
      limit = "50",
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

    const whereConditions: FindOptionsWhere<Item> = {};

    if (search) {
      whereConditions.item_name = ILike(`%${search}%`);
    }

    if (isActive) {
      whereConditions.isActive = isActive as string;
    }
    if (category) {
      whereConditions.cat_id = parseInt(category as string);
    }

    if (parentId) {
      whereConditions.parent_id = parseInt(parentId as string);
    }
    if (taricId) {
      whereConditions.taric_id = parseInt(taricId as string);
    }

    const relations = ["parent", "taric", "category", "supplier"];

    const totalRecords = await itemRepository.count({ where: whereConditions });

    const items = await itemRepository.find({
      where: whereConditions,
      relations,
      order: {
        [sortBy as string]: sortOrder === "DESC" ? "DESC" : "ASC",
      },
      skip,
      take: limitNum,
    });

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
      supplier_id: item.supplier_id,
      supplier_name: item.supplier?.name || null,
      weight: item.weight,
      length: item.length,
      width: item.width,
      height: item.height,
      remark: item.remark,
      model: item.model,
      painPoints: item.painPoints || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    const user = (req as AuthorizedRequest).user;
    const filteredData = filterDataByRole(
      formattedItems,
      user?.role || UserRole.STAFF,
    );

    return res.status(200).json({
      success: true,
      data: filteredData,
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

export const getItemById = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    const item = await itemRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["parent", "taric", "category", "supplier"],
    });

    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

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

    const formattedItem = {
      id: item.id,
      itemNo: `${item.id} / ${item.parent?.de_no || ""}`,
      name: item.item_name || "",
      nameCN: item.item_name_cn || "",
      ean: item.ean?.toString() || "",
      category: item.category?.name || "STD",
      model: item.model || "",
      remark: item.remark || "",
      supplier_id: item.supplier_id,
      supplier_name: item.supplier?.name || "",
      painPoints: item.painPoints || [],
      isActive: item.isActive === "Y",

      parent: {
        noDE: item.parent?.de_no || "NONE",
        nameDE: item.parent?.name_de || "NONE",
        nameEN: item.parent?.name_en || "NONE",
        isActive: item.parent?.is_active === "Y",
        isSpecialItem: item.parent?.is_NwV === "Y",
        priceEUR: 0,
        priceRMB: 0,
        isEURSpecial: item.is_eur_special === "Y",
        isRMBSpecial: item.is_rmb_special === "Y",
      },

      dimensions: {
        isbn: item.ISBN?.toString() || "1",
        weight: item.weight?.toString() || "0",
        length: item.length?.toString() || "0",
        width: item.width?.toString() || "0",
        height: item.height?.toString() || "0",
      },

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
        isNAO: warehouseItems[0]?.is_no_auto_order === "Y",
        buffer: warehouseItems[0]?.buffer?.toString() || "0",
        isSnSI: warehouseItems[0]?.is_SnSI === "Y",
        foq: item.FOQ?.toString() || "0",
        fsq: item.FSQ?.toString() || "0",
        rmbPrice: item.RMB_Price?.toString() || "0",
        isDimensionSpecial: item.is_dimension_special === "Y",
        suppCat: item.supp_cat || "",
      },

      qualityCriteria: qualityCriteria.map((qc: any) => ({
        id: qc.id,
        name: qc.name || "",
        picture: qc.picture || "",
        description: qc.description || "",
        descriptionCN: qc.description_cn || "",
      })),

      attachments: [],

      pictures: {
        shopPicture: item.photo || "",
        ebayPictures: item.pix_path_eBay || "",
      },

      nprRemarks: item.npr_remark || "",
    };

    const user = (req as AuthorizedRequest).user;
    const filteredData = filterDataByRole(
      formattedItem,
      user?.role || UserRole.STAFF,
    );

    return res.status(200).json({
      success: true,
      data: filteredData,
    });
  } catch (error) {
    return next(error);
  }
};

export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
      supplier_id,
      remark,
      model,
      isActive = "Y",
      is_qty_dividable = "Y",
      is_npr = "N",
      is_eur_special = "N",
      is_rmb_special = "N",
      painPoints = [],
    } = req.body;

    if (!item_name || !parent_id) {
      return next(
        new ErrorHandler("Item name and parent ID are required", 400),
      );
    }

    if (supplier_id) {
      const supplierRepo = AppDataSource.getRepository(Supplier);
      const supplier = await supplierRepo.findOne({ where: { id: supplier_id } });
      if (!supplier) {
        return next(new ErrorHandler("Supplier not found", 404));
      }
    }

    const parent = await parentRepository.findOne({ where: { id: parent_id } });
    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

    if (taric_id) {
      const taric = await taricRepository.findOne({ where: { id: taric_id } });
      if (!taric) {
        return next(new ErrorHandler("Taric not found", 404));
      }
    }

    if (cat_id) {
      const category = await categoryRepository.findOne({
        where: { id: cat_id },
      });
      if (!category) {
        return next(new ErrorHandler("Category not found", 404));
      }
    }

    if (ean) {
      const existingItem = await itemRepository.findOne({ where: { ean } });
      if (existingItem) {
        return next(new ErrorHandler("Item with this EAN already exists", 400));
      }
    }

    const newItem = itemRepository.create({
      item_name,
      item_name_cn,
      ean: ean ? BigInt(ean) : null,
      parent_id,
      taric_id,
      cat_id,
      supplier_id,
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
      painPoints,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await itemRepository.save(newItem);

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
        supplier_id: newItem.supplier_id,
        isActive: newItem.isActive,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    const updatableFields = [
      "item_name",
      "item_name_cn",
      "ean",
      "parent_id",
      "taric_id",
      "cat_id",
      "supplier_id",
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
      "is_dimension_special",
      "FOQ",
      "FSQ",
      "ISBN",
      "RMB_Price",
      "many_components",
      "effort_rating",
      "is_pu_item",
      "is_meter_item",
      "is_new",
      "supp_cat",
      "ItemID_DE",
      "painPoints",
    ];

    updatableFields.forEach((field) => {
      const value = req.body[field];
      if (value !== undefined) {
        if (field === "ean") {
          if (value && value.toString().trim() !== "") {
            (item as any)[field] = BigInt(value);
          } else {
            (item as any)[field] = null;
          }
        } else {
          (item as any)[field] = value;
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

export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    const item = await itemRepository.findOne({ where: { id: parseInt(id) } });
    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    const warehouseItems = await warehouseRepository.find({
      where: { item_id: parseInt(id) },
    });

    const totalStock = warehouseItems.reduce(
      (sum, wi: any) => sum + wi.stock_qty,
      0,
    );
    if (totalStock > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete item. There is stock in warehouse. Please clear stock first.",
          400,
        ),
      );
    }

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

export const toggleItemStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const bulkUpdateItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const getItemStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const itemRepository = AppDataSource.getRepository(Item);
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);

    const totalItems = await itemRepository.count();

    const activeItems = await itemRepository.count({
      where: { isActive: "Y" },
    });

    const itemsWithStock = await warehouseRepository
      .createQueryBuilder("warehouse")
      .select("COUNT(DISTINCT warehouse.item_id)", "count")
      .where("warehouse.stock_qty > 0")
      .getRawOne();

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

export const searchItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const getParents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parentRepository = AppDataSource.getRepository(Parent);

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

    const whereConditions: FindOptionsWhere<Parent> = {};

    if (search) {
      whereConditions.name_de = ILike(`%${search}%`);
    }

    if (isActive) {
      whereConditions.is_active = isActive as string;
    }
    if (supplierId) {
      whereConditions.supplier_id = parseInt(supplierId as string);
    }

    if (taricId) {
      whereConditions.taric_id = parseInt(taricId as string);
    }
    const relations = ["taric", "supplier", "items"];

    const totalRecords = await parentRepository.count({
      where: whereConditions,
    });

    const parents = await parentRepository.find({
      where: whereConditions,
      relations,
      order: {
        [sortBy as string]: sortOrder === "DESC" ? "DESC" : "ASC",
      },
      skip,
      take: limitNum,
    });

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

    const user = (req as AuthorizedRequest).user;
    const filteredData = filterDataByRole(
      formattedParents,
      user?.role || UserRole.STAFF,
    );

    return res.status(200).json({
      success: true,
      data: filteredData,
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

export const getParentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Parent ID is required", 400));
    }

    const parentRepository = AppDataSource.getRepository(Parent);
    const itemRepository = AppDataSource.getRepository(Item);

    const parent = await parentRepository.findOne({
      where: { id: parseInt(id) },
      relations: ["taric", "supplier"],
    });

    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

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

    const user = (req as AuthorizedRequest).user;
    const filteredData = filterDataByRole(
      formattedParent,
      user?.role || UserRole.STAFF,
    );

    return res.status(200).json({
      success: true,
      data: filteredData,
    });
  } catch (error) {
    return next(error);
  }
};

export const createParent = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    if (!de_no || !name_de) {
      return next(
        new ErrorHandler("DE number and German name are required", 400),
      );
    }
    const existingParent = await parentRepository.findOne({ where: { de_no } });
    if (existingParent) {
      return next(
        new ErrorHandler("Parent with this DE number already exists", 400),
      );
    }
    if (taric_id) {
      const taric = await taricRepository.findOne({ where: { id: taric_id } });
      if (!taric) {
        return next(new ErrorHandler("Taric not found", 404));
      }
    }

    if (supplier_id) {
      const supplier = await supplierRepository.findOne({
        where: { id: supplier_id },
      });
      if (!supplier) {
        return next(new ErrorHandler("Supplier not found", 404));
      }
    }

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

export const updateParent = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const deleteParent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("Parent ID is required", 400));
    }

    const parentRepository = AppDataSource.getRepository(Parent);
    const itemRepository = AppDataSource.getRepository(Item);

    const parent = await parentRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!parent) {
      return next(new ErrorHandler("Parent not found", 404));
    }

    const childItems = await itemRepository.find({
      where: { parent_id: parseInt(id) },
    });

    if (childItems.length > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete parent. It has child items. Please delete or reassign child items first.",
          400,
        ),
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

export const searchParents = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
      item_count: 0,
    }));

    return res.status(200).json({
      success: true,
      data: formattedParents,
    });
  } catch (error) {
    return next(error);
  }
};

export const getWarehouseItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const itemRepository = AppDataSource.getRepository(Item);

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

    const query = warehouseRepository.createQueryBuilder("warehouse");

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

    const totalRecords = await query.getCount();

    const warehouseItems = await query
      .orderBy(`warehouse.${sortBy}`, sortOrder === "DESC" ? "DESC" : "ASC")
      .skip(skip)
      .take(limitNum)
      .getMany();

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

export const updateWarehouseStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const getItemVariations = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const updateItemVariations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemId } = req.params;
    const variations = req.body;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    if (!Array.isArray(variations)) {
      return next(new ErrorHandler("Variations must be an array", 400));
    }

    const variationRepository = AppDataSource.getRepository(VariationValue);
    const itemRepository = AppDataSource.getRepository(Item);

    const item = await itemRepository.findOne({
      where: { id: parseInt(itemId) },
    });
    if (!item) {
      return next(new ErrorHandler("Item not found", 404));
    }

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.delete(VariationValue, {
        item_id: parseInt(itemId),
      });
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
        }),
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

export const getItemQualityCriteria = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const createQualityCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const updateQualityCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const deleteQualityCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction,
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
  next: NextFunction,
) => {
  try {
    const taricRepository = AppDataSource.getRepository(Taric);

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

    const whereConditions: FindOptionsWhere<Taric> = {};

    if (search) {
      whereConditions.code = ILike(`%${search}%`);
      whereConditions.name_de = ILike(`%${search}%`);
      whereConditions.name_en = ILike(`%${search}%`);
      whereConditions.name_cn = ILike(`%${search}%`);
    }

    if (code) {
      whereConditions.code = ILike(`%${code}%`);
    }

    if (name) {
      whereConditions.name_de = ILike(`%${name}%`);
    }

    const totalRecords = await taricRepository.count({
      where: whereConditions,
    });
    const tarics = await taricRepository.find({
      where: whereConditions,
      order: {
        [sortBy as string]: sortOrder === "DESC" ? "DESC" : "ASC",
      },
      skip,
      take: limitNum,
    });

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

export const getTaricById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ErrorHandler("TARIC ID is required", 400));
    }

    const taricRepository = AppDataSource.getRepository(Taric);
    const itemRepository = AppDataSource.getRepository(Item);
    const parentRepository = AppDataSource.getRepository(Parent);

    const taric = await taricRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!taric) {
      return next(new ErrorHandler("TARIC not found", 404));
    }

    const items = await itemRepository.find({
      where: { taric_id: parseInt(id) },
      relations: ["parent", "category"],
      take: 10,
    });

    const parents = await parentRepository.find({
      where: { taric_id: parseInt(id) },
      take: 10,
    });
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

const syncTaricToMIS = async (
  taricData: any,
  operation: "create" | "update" | "delete",
) => {
  let connection;
  try {
    connection = await pool.getConnection();

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

export const createTaric = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    if (!code) {
      return next(new ErrorHandler("TARIC code is required", 400));
    }
    const existingTaric = await taricRepository.findOne({ where: { code } });
    if (existingTaric) {
      return next(new ErrorHandler("TARIC with this code already exists", 400));
    }

    const maxIdResult = await taricRepository
      .createQueryBuilder("taric")
      .select("MAX(taric.id)", "max")
      .getRawOne();

    const nextId = (maxIdResult?.max || 0) + 1;

    const newTaric = taricRepository.create({
      id: nextId,
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
        "create",
      );
    } catch (misError: any) {
      await taricRepository.delete(newTaric.id);
      return next(
        new ErrorHandler(
          `TARIC created locally but failed to sync to MIS: ${misError.message}`,
          500,
        ),
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

export const updateTaric = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    const originalCode = taric.code;

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

    try {
      await syncTaricToMIS(
        {
          ...taric,
          originalCode,
        },
        "update",
      );
    } catch (misError: any) {
      await taricRepository.save({
        ...taric,
        code: originalCode,
        ...Object.fromEntries(
          Object.entries(req.body).map(([key, value]) => [
            key,
            (taric as any)[key],
          ]),
        ),
      });
      return next(
        new ErrorHandler(
          `TARIC updated locally but failed to sync to MIS: ${misError.message}`,
          500,
        ),
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

export const deleteTaric = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    const taric = await taricRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!taric) {
      return next(new ErrorHandler("TARIC not found", 404));
    }

    const relatedItems = await itemRepository.count({
      where: { taric_id: parseInt(id) },
    });
    const relatedParents = await parentRepository.count({
      where: { taric_id: parseInt(id) },
    });

    if (relatedItems > 0 || relatedParents > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete TARIC. It has related items or parents. Please reassign them first.",
          400,
        ),
      );
    }

    const taricCode = taric.code || null;
    if (!taricCode) {
      return next(
        new ErrorHandler("Cannot delete TARIC: code is missing", 400),
      );
    }

    await taricRepository.delete(parseInt(id));

    try {
      await syncTaricToMIS({ code: taricCode }, "delete");
    } catch (misError: any) {
      await taricRepository.save(taric);
      return next(
        new ErrorHandler(
          `TARIC deleted locally but failed to sync to MIS: ${misError.message}`,
          500,
        ),
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

export const searchTarics = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

export const getTaricStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taricRepository = AppDataSource.getRepository(Taric);
    const itemRepository = AppDataSource.getRepository(Item);
    const parentRepository = AppDataSource.getRepository(Parent);

    const totalTarics = await taricRepository.count();

    const taricsWithItems = await itemRepository
      .createQueryBuilder("item")
      .select("COUNT(DISTINCT item.taric_id)", "count")
      .where("item.taric_id IS NOT NULL")
      .getRawOne();

    const taricsWithParents = await parentRepository
      .createQueryBuilder("parent")
      .select("COUNT(DISTINCT parent.taric_id)", "count")
      .where("parent.taric_id IS NOT NULL")
      .getRawOne();

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

export const bulkUpsertTarics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tarics } = req.body;

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

    for (const taricData of tarics) {
      try {
        if (!taricData.code) {
          results.failed++;
          results.errors.push({ data: taricData, error: "Code is required" });
          continue;
        }

        let taric: any = await taricRepository.findOne({
          where: { code: taricData.code },
        });

        if (taric) {
          Object.assign(taric, taricData);
          taric.updated_at = new Date();
          results.updated++;
        } else {
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

export const exportItemsToCSV = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const itemRepository = AppDataSource.getRepository(Item);
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);
    const variationRepository = AppDataSource.getRepository(VariationValue);

    // Get all items with their relations
    const items = await itemRepository.find({
      relations: ["parent", "taric", "category"],
      order: {
        id: "ASC",
      },
    });

    // Helper function to format date
    const formatDate = (date: Date | undefined) => {
      if (!date) return "";
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    };

    // Helper function to get warehouse data for an item
    const getWarehouseData = async (itemId: number) => {
      const warehouseItems = await warehouseRepository.find({
        where: { item_id: itemId },
      });
      return warehouseItems[0] || null;
    };

    // Helper function to get variation values
    const getVariationValues = async (itemId: number) => {
      const variations = await variationRepository.find({
        where: { item_id: itemId },
      });
      return variations[0] || null;
    };

    // Generate price columns based on quantity breaks
    const getPriceColumns = (item: any) => {
      // You need to get these prices from somewhere - maybe from a pricing table
      // For now, using RMB_Price as base with some calculations
      const basePrice = item.RMB_Price || 0;
      const priceLevels = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];

      return priceLevels.map((level) => {
        // Simple volume discount logic - you should replace this with actual pricing logic
        let discount = 0;
        if (level >= 1000)
          discount = 0.3; // 30% discount for 1000+
        else if (level >= 500) discount = 0.25;
        else if (level >= 200) discount = 0.2;
        else if (level >= 100) discount = 0.15;
        else if (level >= 50) discount = 0.1;
        else if (level >= 25) discount = 0.05;

        const price = basePrice * (1 - discount);
        return price.toFixed(2).replace(".", ",");
      });
    };

    const headers = [
      "Timestamp",
      "EAN",
      "Parent No DE",
      "Item No DE",
      "Sup_cat",
      "Item Name DE",
      "Variation DE 1",
      "Value DE",
      "Variation DE 2",
      "Value DE 2",
      "Variation DE 3",
      "Value DE 3",
      "Item Name EN",
      "Item Name",
      "Variation EN 1",
      "Value EN",
      "Variation EN 2",
      "Value EN 2",
      "Variation EN 3",
      "Value EN 3",
      "Code",
      "ISBN",
      "Width",
      "Height",
      "Length",
      "Weight",
      "Shipping Weight",
      "Shipping Class",
      "Is Qty Dividable",
      "Is Stock Item",
      "FOQ",
      "FSQ",
      "MSQ",
      "MOQ Result",
      "Interval",
      "Buffer Result",
      "Price RMB",
      "Y/N",
      "Many Components",
      "Effort Rating",
      "EK Net",
      "Item Volume (dm³)",
      "Freight Costs Volume",
      "Freight Costs Weight",
      "Freight Costs",
      "Import Duty Charge (EUR)",
      "SP_eBay",
      "SP_DE_NET_1",
      "SP_DE_NET_2",
      "SP_DE_NET_5",
      "SP_DE_NET_10",
      "SP_DE_NET_25",
      "SP_DE_NET_50",
      "SP_DE_NET_100",
      "SP_DE_NET_200",
      "SP_DE_NET_500",
      "SP_DE_NET_1000",
      "SP_DE_NET_2000",
      "BulkQty_2",
      "BulkQty_5",
      "BulkQty_10",
      "BulkQty_25",
      "BulkQty_50",
      "BulkQty_100",
      "BulkQty_200",
      "BulkQty_500",
      "BulkQty_1000",
      "BulkQty_2000",
      "USt %",
      "Dummy-Bild01",
      "Image Path EAN",
      "Image Path eBay",
      "Max Quantity",
    ];

    // Generate CSV rows
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(";"));

    // Process each item
    for (const item of items) {
      try {
        const warehouseData = await getWarehouseData(item.id);
        const variationData = await getVariationValues(item.id);
        const priceColumns = getPriceColumns(item);

        // Get variations from parent
        const parent = item.parent;

        // Calculate volume in dm³ (convert from cm³ to dm³: divide by 1000)
        const volume =
          ((item.length || 0) * (item.width || 0) * (item.height || 0)) / 1000;

        // Bulk quantities
        const bulkQuantities = [2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];

        // Create row data matching CSV structure
        const rowData = [
          formatDate(item.updated_at || item.created_at || new Date()), // Timestamp
          item.ean?.toString() || "", // EAN
          parent?.de_no || "NONE", // Parent No DE
          item.ItemID_DE?.toString() || item.id.toString(), // Item No DE
          item.supp_cat || item.category?.name || "STD", // Sup_cat
          item.item_name || parent?.name_de || "", // Item Name DE
          parent?.var_de_1 || "", // Variation DE 1
          variationData?.value_de || "", // Value DE
          parent?.var_de_2 || "", // Variation DE 2
          variationData?.value_de_2 || "", // Value DE 2
          parent?.var_de_3 || "", // Variation DE 3
          variationData?.value_de_3 || "", // Value DE 3
          item.item_name_cn || parent?.name_en || "", // Item Name EN
          item.item_name || parent?.name_en || "", // Item Name
          parent?.var_en_1 || "", // Variation EN 1
          variationData?.value_en || "", // Value EN
          parent?.var_en_2 || "", // Variation EN 2
          variationData?.value_en_2 || "", // Value EN 2
          parent?.var_en_3 || "", // Variation EN 3
          variationData?.value_en_3 || "", // Value EN 3
          item.taric?.code || "", // Code
          item.ISBN?.toString() || "0", // ISBN
          (item.width || 0).toFixed(1).replace(".", ","), // Width
          (item.height || 0).toFixed(1).replace(".", ","), // Height
          (item.length || 0).toFixed(1).replace(".", ","), // Length
          (item.weight || 0).toFixed(2).replace(".", ","), // Weight
          (item.weight || 0).toFixed(4).replace(".", ","), // Shipping Weight (using same as weight)
          warehouseData?.ship_class || "1", // Shipping Class
          item.is_qty_dividable || "Y", // Is Qty Dividable
          warehouseData?.is_stock_item || "N", // Is Stock Item
          item.FOQ?.toString() || "0", // FOQ
          item.FSQ?.toString() || "0", // FSQ
          warehouseData?.msq?.toString() || "0", // MSQ
          "0", // MOQ Result (calculate if needed)
          "0", // Interval (calculate if needed)
          warehouseData?.buffer?.toString() || "0", // Buffer Result
          Number(item.RMB_Price || 0)
            .toFixed(2)
            .replace(".", ","), // Price RMB
          "Y", // Y/N (active status)
          item.many_components?.toString() || "1", // Many Components
          item.effort_rating?.toString() || "3", // Effort Rating
          Number(item.RMB_Price || 0)
            .toFixed(2)
            .replace(".", ","), // EK Net (using RMB price as base)
          volume.toFixed(2).replace(".", ","), // Item Volume (dm³)
          "0,00", // Freight Costs Volume
          "0,00", // Freight Costs Weight
          "0,00", // Freight Costs
          "0,00", // Import Duty Charge (EUR)
          Number(item.RMB_Price || 0)
            .toFixed(2)
            .replace(".", ","), // SP_eBay (placeholder)
          ...priceColumns, // SP_DE_NET_X columns (11 columns)
          ...bulkQuantities.map((qty) => qty.toString()), // BulkQty columns (10 columns)
          "19", // USt % (VAT)
          item.photo?.split("\\").pop() || "DummyPicture.jpg", // Dummy-Bild01
          item.pix_path || "", // Image Path EAN
          item.pix_path_eBay || "", // Image Path eBay
          "10000", // Max Quantity
        ];

        // Ensure rowData has exactly the same number of columns as headers
        if (rowData.length !== headers.length) {
          console.warn(
            `Row data length mismatch for item ${item.id}: ${rowData.length} vs ${headers.length}`,
          );
        }

        const formattedRow = rowData.map((value) => {
          if (value === null || value === undefined) return "";
          const stringValue = value.toString();
          // Wrap in quotes if contains semicolon, newline, or double quote
          if (
            stringValue.includes(";") ||
            stringValue.includes("\n") ||
            stringValue.includes('"')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });

        csvRows.push(formattedRow.join(";"));
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        // Continue with next item
      }
    }

    const csvContent = csvRows.join("\n");

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=updated_Item_List.csv",
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf8"));
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Add BOM for UTF-8 to handle special characters
    const bom = "\uFEFF";
    return res.status(200).send(bom + csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return next(error);
  }
};
