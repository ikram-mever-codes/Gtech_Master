import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import {
  CHANGE_STATUS,
  DELIVERY_STATUS,
  List,
  LIST_STATUS,
  ListCreator,
  UserCreator,
  CustomerCreator,
} from "../models/list";
import { ListItem } from "../models/list";
import ErrorHandler from "../utils/errorHandler";
import { getConnection } from "../config/misDb";
import { Customer } from "../models/customers";
import { User } from "../models/users";

// Helper function to fetch item data from MIS database
async function fetchItemData(itemId: number) {
  const connection = await getConnection();

  try {
    // Fetch item data with cargo information
    const [itemRows]: any = await connection.query(
      `
      SELECT 
        i.*, 
        os.cargo_id, 
        oi.qty AS quantity,  -- Fetch quantity from order_items
        c.cargo_no,
        c.pickup_date, 
        c.dep_date
      FROM items i
      LEFT JOIN order_items oi ON i.ItemID_DE = oi.ItemID_DE
      LEFT JOIN order_statuses os ON oi.master_id = os.master_id 
                                  AND oi.ItemID_DE = os.ItemID_DE
      LEFT JOIN cargos c ON os.cargo_id = c.id
      WHERE i.id = ?
    `,
      [itemId]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new ErrorHandler("Item not found in MIS database", 404);
    }

    const itemData = itemRows[0];

    // Create map to track unique delivery dates and their details
    const deliveryMap = new Map<
      string,
      {
        quantity: number;
        status: DELIVERY_STATUS;
        deliveredAt: Date;
        cargoNo: string[];
      }
    >();

    // Process all rows to collect delivery information
    itemRows.forEach((row: any) => {
      if (row.cargo_id) {
        // Process both pickup and departure dates
        [row.pickup_date, row.dep_date].forEach((date: Date | null) => {
          if (date) {
            const dateKey = date.toISOString().split("T")[0];
            const quantity = row.quantity || 0; // Directly use numeric value

            if (!deliveryMap.has(dateKey)) {
              deliveryMap.set(dateKey, {
                quantity,
                status: DELIVERY_STATUS.PENDING,
                deliveredAt: date,
                cargoNo: row.cargo_no ? [row.cargo_no] : [],
              });
            } else {
              const existing = deliveryMap.get(dateKey)!;
              deliveryMap.set(dateKey, {
                quantity: existing.quantity + quantity,
                status: existing.status,
                deliveredAt: existing.deliveredAt,
                cargoNo: row.cargo_no
                  ? [...existing.cargoNo, row.cargo_no]
                  : existing.cargoNo,
              });
            }
          }
        });
      }
    });

    // Convert to the required deliveries format
    const deliveries: {
      [period: string]: {
        quantity?: number;
        status: DELIVERY_STATUS;
        deliveredAt?: Date;
        cargoNo: string;
      };
    } = {};

    deliveryMap.forEach((value, dateKey) => {
      // Deduplicate cargo numbers and join into a string
      const uniqueCargoNo = Array.from(new Set(value.cargoNo)).join(", ");

      deliveries[dateKey] = {
        quantity: value.quantity,
        status: value.status,
        deliveredAt: value.deliveredAt,
        cargoNo: uniqueCargoNo || "",
      };
    });

    return {
      articleName: itemData.item_name || "",
      articleNumber: itemData.ItemID_DE || "",
      quantity: itemData.FOQ || 0,
      weight: itemData.weight,
      imageUrl: itemData.photo || null,
      dimensions: {
        width: itemData.width,
        height: itemData.height,
        length: itemData.length,
      },
      deliveries,
    };
  } finally {
    connection.release();
  }
} // Helper to create creator entity
async function createCreator(userId: string | null, customerId: string | null) {
  if (userId) {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
    });
    if (!user) throw new ErrorHandler("User not found", 404);

    const creator = new UserCreator();
    creator.user = user;
    return creator;
  } else if (customerId) {
    const customer = await AppDataSource.getRepository(Customer).findOne({
      where: { id: customerId },
    });
    if (!customer) throw new ErrorHandler("Customer not found", 404);

    const creator = new CustomerCreator();
    creator.customer = customer;
    return creator;
  }
  throw new ErrorHandler("Creator information missing", 400);
}

// 1. Create New List
export const createList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, templateType, customerId } = req.body;
    const userId = (req as any).user?.id;
    if (!name || !customerId) {
      return next(new ErrorHandler("Name and customer ID are required", 400));
    }

    const listRepository = AppDataSource.getRepository(List);
    const customerRepository = AppDataSource.getRepository(Customer);

    // Verify customer exists
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // Create creator entity
    const createdBy = await createCreator(null, customerId);

    const list = listRepository.create({
      name,
      description,
      templateType,
      customer,
      createdBy,
      status: LIST_STATUS.ACTIVE,
    });

    await listRepository.save(list);

    return res.status(201).json({
      success: true,
      message: "List created successfully",
      data: list,
    });
  } catch (error) {
    return next(error);
  }
};
// 2. Add List Item
export const addListItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId, itemId, quantity, interval, comment } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listId || !itemId) {
      return next(new ErrorHandler("List ID and Item ID are required", 400));
    }

    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

    // Verify list exists
    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "customer"],
    });
    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    // Create creator entity
    const createdBy = await createCreator(
      userId !== undefined ? userId : null,
      customerId !== undefined ? customerId : null
    );

    // Fetch item data from MIS database
    const itemData = await fetchItemData(itemId);

    // Calculate total item quantity (user input or FOQ default)
    const totalQuantity = quantity || itemData.quantity;

    // Create new list item
    const listItem = listItemRepository.create({
      itemNumber: itemId.toString(),
      articleName: itemData.articleName,
      articleNumber: itemData.articleNumber,
      quantity: totalQuantity,
      interval: interval || "monthly",
      comment,
      imageUrl: itemData.imageUrl,
      list,
      createdBy,
    });

    if (itemData.deliveries && Object.keys(itemData.deliveries).length > 0) {
      const deliveries = { ...itemData.deliveries };

      const deliveryCount = Object.keys(deliveries).length;
      const quantityPerDelivery = totalQuantity / deliveryCount;

      for (const dateKey in deliveries) {
        deliveries[dateKey] = {
          ...deliveries[dateKey],
          quantity: quantityPerDelivery,
        };
      }

      listItem.deliveries = deliveries;
    }

    await listItemRepository.save(listItem);

    list.items = [...(list.items || []), listItem];
    await listRepository.save(list);

    list.logActivity(
      "ITEM_ADDED",
      {
        itemId: listItem.id,
        itemName: itemData.articleName,
      },
      userId ? userId : customerId,
      userId ? "user" : "customer"
    );
    await listRepository.save(list);

    return res.status(201).json({
      success: true,
      message: "Item added to list successfully",
      data: listItem,
    });
  } catch (error) {
    return next(error);
  }
};

// 3. Update List Item
// 3. Update List Item
export const updateListItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const {
      quantity,
      interval,
      comment,
      marked,
      deliveries,
      articleName,
      articleNumber,
      imageUrl,
    } = req.body;

    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    // Find item with list relation for activity logging
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list", "list.items"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Verify list exists
    const list = await listRepository.findOne({
      where: { id: item.list.id },
      relations: ["customer"],
    });
    if (!list) {
      return next(new ErrorHandler("Associated list not found", 404));
    }

    // Store original values and track changes
    const changes: Record<string, any> = {};
    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";

    // Helper function to track changes
    const trackChange = (field: string, newValue: any, currentValue: any) => {
      if (newValue !== undefined && newValue !== currentValue) {
        changes[field] = { from: currentValue, to: newValue };
        item.originalValues = {
          ...(item.originalValues || {}),
          [field]: currentValue,
        };
        item.changeStatus = CHANGE_STATUS.PENDING;
        item.changedAt = new Date();
        item.changedById = performerId;
        item.changedByType = performerType;
        return true;
      }
      return false;
    };

    // Update fields if they are provided and different
    if (trackChange("quantity", quantity, item.quantity)) {
      item.quantity = quantity;
    }

    if (trackChange("interval", interval, item.interval)) {
      item.interval = interval;
    }

    if (trackChange("comment", comment, item.comment)) {
      item.comment = comment;
    }

    if (trackChange("articleName", articleName, item.articleName)) {
      item.articleName = articleName;
    }

    if (trackChange("articleNumber", articleNumber, item.articleNumber)) {
      item.articleNumber = articleNumber;
    }

    if (trackChange("imageUrl", imageUrl, item.imageUrl)) {
      item.imageUrl = imageUrl;
    }

    if (marked !== undefined) {
      item.marked = marked;
    }

    // Update deliveries if provided
    if (deliveries) {
      item.deliveries = item.deliveries || {};

      Object.entries(deliveries).forEach(
        ([period, deliveryData]: [string, any]) => {
          const currentDelivery = item.deliveries[period] || {};

          item.deliveries[period] = {
            ...currentDelivery,
            ...deliveryData,
            // Ensure status is always set
            status:
              deliveryData.status ||
              currentDelivery.status ||
              DELIVERY_STATUS.PENDING,
          };
        }
      );
    }

    await listItemRepository.save(item);

    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      list.logActivity(
        "ITEM_UPDATED",
        {
          itemId: item.id,
          itemName: item.articleName,
          changes,
        },
        performerId,
        performerType,
        true
      );
      await listRepository.save(list);
    }

    return res.status(200).json({
      success: true,
      message: "List item updated successfully",
      data: item,
    });
  } catch (error) {
    return next(error);
  }
};

// 4. Delete List Item
export const deleteListItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const userId = (req as any).user.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Log deletion activity
    item.list.logActivity(
      "ITEM_DELETED",
      { itemId: item.id, itemDetails: item },
      userId,
      "user"
    );

    await listItemRepository.remove(item);

    return res.status(200).json({
      success: true,
      message: "List item deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// 5. Get List with Items
export const getListWithItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId } = req.params;

    if (!listId) {
      return next(new ErrorHandler("List ID is required", 400));
    }

    const listRepository = AppDataSource.getRepository(List);
    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "activityLogs", "customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    return next(error);
  }
};

// 6. Approve List Item Changes
export const approveListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const userId = (req as any).user.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    if (item.changeStatus !== CHANGE_STATUS.PENDING) {
      return next(new ErrorHandler("No pending changes to approve", 400));
    }

    // Approve changes
    item.changeStatus = CHANGE_STATUS.CONFIRMED;
    item.confirmedAt = new Date();

    await listItemRepository.save(item);

    // Log approval activity
    item.list.logActivity(
      "CHANGE_APPROVED",
      { itemId: item.id },
      userId,
      "user"
    );

    return res.status(200).json({
      success: true,
      message: "Item changes approved successfully",
      data: item,
    });
  } catch (error) {
    return next(error);
  }
};

// 7. Reject List Item Changes
export const rejectListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user.id;

    if (!itemId || !reason) {
      return next(new ErrorHandler("Item ID and reason are required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    if (item.changeStatus !== CHANGE_STATUS.PENDING) {
      return next(new ErrorHandler("No pending changes to reject", 400));
    }

    // Revert to original values
    if (item.originalValues) {
      if (item.originalValues.quantity !== undefined) {
        item.quantity = item.originalValues.quantity;
      }
      if (item.originalValues.interval !== undefined) {
        item.interval = item.originalValues.interval;
      }
      if (item.originalValues.comment !== undefined) {
        item.comment = item.originalValues.comment;
      }
    }

    item.changeStatus = CHANGE_STATUS.REJECTED;
    item.confirmedAt = new Date();
    item.originalValues = {};

    await listItemRepository.save(item);

    // Log rejection activity
    item.list.logActivity(
      "CHANGE_REJECTED",
      { itemId: item.id, reason },
      userId,
      "user"
    );

    return res.status(200).json({
      success: true,
      message: "Item changes rejected successfully",
      data: item,
    });
  } catch (error) {
    return next(error);
  }
};

// 8. Update Delivery Information
export const updateDeliveryInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { period, quantity, status, notes } = req.body;
    const userId = (req as any).user.id;

    if (!itemId || !period) {
      return next(new ErrorHandler("Item ID and period are required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const item: any = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Initialize deliveries if not exists
    item.deliveries = item.deliveries || {};

    // Update delivery info
    item.deliveries[period] = {
      quantity:
        quantity !== undefined ? quantity : item.deliveries[period]?.quantity,
      status:
        status || item.deliveries[period]?.status || DELIVERY_STATUS.PENDING,
      notes: notes !== undefined ? notes : item.deliveries[period]?.notes,
      deliveredAt:
        status === DELIVERY_STATUS.DELIVERED ? new Date() : undefined,
    };

    await listItemRepository.save(item);

    // Log delivery update
    item.list.logActivity(
      "DELIVERY_UPDATED",
      { itemId: item.id, period, updates: req.body },
      userId,
      "user"
    );

    return res.status(200).json({
      success: true,
      message: "Delivery information updated successfully",
      data: item.deliveries[period],
    });
  } catch (error) {
    return next(error);
  }
};

// 9. Search Items
export const searchItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return next(new ErrorHandler("Search query is required", 400));
    }

    const connection = await getConnection();
    const searchTerm = `%${q}%`;

    try {
      const [items]: any = await connection.query(
        `SELECT 
          id, 
          item_name AS name,
          ItemID_DE AS articleNumber,
          photo AS imageUrl
         FROM items 
         WHERE item_name LIKE ? 
         AND photo IS NOT NULL
         AND photo != ''
         LIMIT 10`,
        [searchTerm]
      );

      const results = items.map((item: any) => ({
        ...item,
        imageUrl: item.imageUrl,
      }));

      return res.status(200).json({
        success: true,
        data: results,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    return next(error);
  }
};

export const getCustomerLists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new ErrorHandler("Customer ID is required", 400));
    }

    // Validate customer exists
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const listRepository = AppDataSource.getRepository(List);
    const lists = await listRepository.find({
      where: { customer: { id: customerId } },
      relations: ["createdBy", "createdBy.user", "createdBy.customer", "items"],
    });
    return res.status(200).json({
      success: true,
      data: lists,
    });
  } catch (error) {
    return next(error);
  }
};

// Get a single list for a customer with full details
export const getCustomerList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId, listId } = req.params;

    if (!customerId || !listId) {
      return next(
        new ErrorHandler("Customer ID and List ID are required", 400)
      );
    }

    const listRepository = AppDataSource.getRepository(List);
    const list = await listRepository.findOne({
      where: {
        id: listId,
        customer: { id: customerId },
      },
      relations: [
        "items",
        "activityLogs",
        "customer",
        "createdBy.user",
        "createdBy.customer",
      ],
    });

    if (!list) {
      return next(new ErrorHandler("List not found for this customer", 404));
    }

    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllLists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const listRepository = AppDataSource.getRepository(List);
    const lists = await listRepository.find({
      relations: [
        "customer",
        "items",
        "createdBy.user",
        "createdBy.customer",
        "activityLogs",
      ],
      order: { createdAt: "DESC" },
    });

    return res.status(200).json({
      success: true,
      data: lists,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch lists", 500));
  }
};

// 10. Duplicate List
export const duplicateList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId } = req.params;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listId) {
      return next(new ErrorHandler("List ID is required", 400));
    }

    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

    // Get the original list with items
    const originalList = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "customer"],
    });

    if (!originalList) {
      return next(new ErrorHandler("List not found", 404));
    }

    // Create creator entity
    const createdBy = await createCreator(
      userId !== undefined ? userId : null,
      customerId !== undefined ? customerId : null
    );

    // Create new list with "(Copy)" suffix
    const newList = listRepository.create({
      name: `${originalList.name} (Copy)`,
      description: originalList.description,
      templateType: originalList.templateType,
      customer: originalList.customer,
      createdBy,
      status: LIST_STATUS.DRAFTED,
    });

    await listRepository.save(newList);

    // Duplicate all items from the original list
    if (originalList.items && originalList.items.length > 0) {
      for (const item of originalList.items) {
        const newItem = listItemRepository.create({
          itemNumber: item.itemNumber || item.articleNumber, // Ensure itemNumber is set
          articleName: item.articleName,
          articleNumber: item.articleNumber,
          quantity: item.quantity,
          interval: item.interval,
          comment: item.comment,
          imageUrl: item.imageUrl,
          deliveries: item.deliveries,
          list: newList,
          createdBy,
          // Copy other necessary fields
          marked: item.marked || false,
          changeStatus: item.changeStatus || CHANGE_STATUS.CONFIRMED,
          originalValues: item.originalValues || null,
        });
        await listItemRepository.save(newItem);
      }
    }

    // Log activity
    newList.logActivity(
      "LIST_DUPLICATED",
      {
        originalListId: originalList.id,
        originalListName: originalList.name,
      },
      userId ? userId : customerId,
      userId ? "user" : "customer"
    );
    await listRepository.save(newList);

    return res.status(201).json({
      success: true,
      message: "List duplicated successfully",
      data: newList,
    });
  } catch (error) {
    return next(error);
  }
};

// 11. Update List
export const updateList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId } = req.params;
    const { name, description, status } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listId) {
      return next(new ErrorHandler("List ID is required", 400));
    }

    const listRepository = AppDataSource.getRepository(List);

    // Get the existing list
    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    // Track changes
    const changes: Record<string, any> = {};
    if (name !== undefined && name !== list.name) {
      changes.name = { from: list.name, to: name };
      list.name = name;
    }

    if (description !== undefined && description !== list.description) {
      changes.description = { from: list.description, to: description };
      list.description = description;
    }

    if (status !== undefined && status !== list.status) {
      changes.status = { from: list.status, to: status };
      list.status = status;
    }

    // If no changes were made
    if (Object.keys(changes).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: list,
      });
    }

    await listRepository.save(list);

    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      list.logActivity(
        "LIST_UPDATED",
        {
          changes,
        },
        userId ? userId : customerId,
        userId ? "user" : "customer"
      );
      await listRepository.save(list);
    }

    return res.status(200).json({
      success: true,
      message: "List updated successfully",
      data: list,
    });
  } catch (error) {
    return next(error);
  }
};
