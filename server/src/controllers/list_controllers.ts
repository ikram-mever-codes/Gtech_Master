import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import {
  List,
  LIST_STATUS,
  ListCreator,
  UserCreator,
  CustomerCreator,
  DELIVERY_STATUS,
  USER_ROLE,
  ListItem,
} from "../models/list";
import ErrorHandler from "../utils/errorHandler";
import { getConnection } from "../config/misDb";
import { Customer } from "../models/customers";
import { User } from "../models/users";
import { In } from "typeorm";
import { list } from "pdfkit";

async function fetchItemData(itemId: number) {
  const connection = await getConnection();

  try {
    const [itemRows]: any = await connection.query(
      `
        SELECT 
          i.*,
          os.cargo_id,
          os.status as order_status,
          oi.qty AS quantity,
          c.cargo_no,
          c.pickup_date,
          c.dep_date,
          c.cargo_status,
          c.shipped_at,
          c.eta,
          c.remark,
          c.cargo_type_id,
          ct.cargo_type,
          wi.item_name_de,
          wi.item_no_de 
              FROM items i
        LEFT JOIN order_items oi ON i.ItemID_DE = oi.ItemID_DE
        LEFT JOIN order_statuses os ON oi.master_id = os.master_id AND oi.ItemID_DE = os.ItemID_DE
        LEFT JOIN cargos c ON os.cargo_id = c.id
        LEFT JOIN cargo_types ct ON c.cargo_type_id = ct.id
        LEFT JOIN warehouse_items wi ON i.ItemID_DE = wi.ItemID_DE
        WHERE i.id = ?
        `,
      [itemId]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new ErrorHandler("Item not found in MIS database", 404);
    }

    const itemData = itemRows[0];

    const deliveryMap = new Map<
      string,
      {
        quantity: number;
        status: string;
        deliveredAt: Date;
        cargoNo: string[];
        cargoStatus: string;
        remark: string;
        shippedAt: string;
        eta: string;
        cargoType: string;
      }
    >();

    itemRows.forEach((row: any) => {
      if (row.cargo_id) {
        [row.pickup_date, row.dep_date].forEach((date: Date | null) => {
          if (date) {
            const dateKey = date.toISOString().split("T")[0];
            const quantity = Number(row.quantity) || 0;

            if (!deliveryMap.has(dateKey)) {
              deliveryMap.set(dateKey, {
                quantity,
                status: row.order_status || "Open",
                deliveredAt: date,
                cargoNo: row.cargo_no ? [row.cargo_no] : [],
                cargoStatus: row.cargo_status || "",
                remark: row.remark || "",
                shippedAt: row.shipped_at
                  ? new Date(row.shipped_at).toISOString().split("T")[0]
                  : "",
                eta: row.eta
                  ? new Date(row.eta).toISOString().split("T")[0]
                  : "",
                cargoType: row.cargo_type || "",
              });
            } else {
              const existing = deliveryMap.get(dateKey)!;
              const isUniqueDelivery = !existing.cargoNo.includes(row.cargo_no);

              deliveryMap.set(dateKey, {
                quantity: isUniqueDelivery
                  ? existing.quantity + quantity
                  : existing.quantity,
                status: existing.status,
                deliveredAt: existing.deliveredAt,
                cargoNo: row.cargo_no,
                cargoStatus: row.cargo_status || existing.cargoStatus,
                remark: row.remark || existing.remark,
                shippedAt: row.shipped_at || "N/A",
                eta: row.eta
                  ? new Date(row.eta).toISOString().split("T")[0]
                  : existing.eta,
                cargoType: row.cargo_type || existing.cargoType,
              });
            }
          }
        });
      }
    });

    const deliveries: {
      [period: string]: {
        quantity?: number;
        status: string;
        deliveredAt?: Date;
        cargoNo: string;
        cargoStatus?: string;
        remark: string;
        shippedAt: string;
        eta: string;
        cargoType: string;
      };
    } = {};

    deliveryMap.forEach((value, dateKey) => {
      const uniqueCargoNo = Array.from(new Set(value.cargoNo)).join(", ");

      deliveries[dateKey] = {
        quantity: value.quantity,
        status: value.status,
        deliveredAt: value.deliveredAt,
        cargoNo: uniqueCargoNo || "",
        cargoStatus: value.cargoStatus,
        remark: value.remark,
        shippedAt: value.shippedAt,
        eta: value.eta,
        cargoType: value.cargoType,
      };
    });

    return {
      articleName: itemData.item_name_de || "",
      articleNumber: itemData.ItemID_DE || "",
      itemNoDe: itemData.item_no_de || "",
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
}

async function updateLocalListItem(item: ListItem): Promise<ListItem> {
  const listItemRepository = AppDataSource.getRepository(ListItem);

  try {
    console.log(`Updating item ${item.id} from MIS...`);
    const itemData = await fetchItemData(parseInt(item.itemNumber));
    console.log(itemData);
    if (!itemData) {
      console.warn(`No data returned from MIS for item ${item.id}`);
      return item;
    }

    // Store original values for comparison
    const originalValues = {
      articleName: item.articleName,
      articleNumber: item.articleNumber,
      item_no_de: item.item_no_de,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    };

    // Update all fields from MIS data
    item.articleName = itemData.articleName || item.articleName;
    item.articleNumber = itemData.articleNumber || item.articleNumber;
    item.item_no_de = itemData.itemNoDe || item.item_no_de;
    item.quantity = item.quantity;
    item.imageUrl = itemData.imageUrl || item.imageUrl;

    // Check if any values actually changed
    const hasChanges =
      item.articleName !== originalValues.articleName ||
      item.articleNumber !== originalValues.articleNumber ||
      item.item_no_de !== originalValues.item_no_de ||
      item.quantity !== originalValues.quantity ||
      item.imageUrl !== originalValues.imageUrl;

    // Update deliveries if available
    if (itemData.deliveries && Object.keys(itemData.deliveries).length > 0) {
      const currentDeliveries = item.deliveries || {};
      const mergedDeliveries: any = {};

      for (const [dateKey, delivery] of Object.entries(itemData.deliveries)) {
        mergedDeliveries[dateKey] = {
          ...delivery,
          status: currentDeliveries[dateKey]?.status || delivery.status,
          cargoStatus:
            currentDeliveries[dateKey]?.cargoStatus || delivery.cargoStatus,
          remark: currentDeliveries[dateKey]?.remark || delivery.remark,
        };
      }

      item.deliveries = mergedDeliveries;
      console.log(`Updated deliveries for item ${item.id}`);
    }

    if (hasChanges) {
      console.log(`Item ${item.id} updated with new data from MIS`);
    } else {
      console.log(`Item ${item.id} already has latest data from MIS`);
    }

    return await listItemRepository.save(item);
  } catch (error) {
    console.error(`Failed to update local item ${item.id}:`, error);
    return item;
  }
}

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

// Helper function to determine user role
function getUserRole(userId?: string, customerId?: string): USER_ROLE {
  if (userId) return USER_ROLE.ADMIN;
  if (customerId) return USER_ROLE.CUSTOMER;
  return USER_ROLE.ADMIN; // Default fallback
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

    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const createdBy = await createCreator(null, customerId);

    const list = listRepository.create({
      name,
      description,
      templateType,
      customer,
      createdBy,
      status: LIST_STATUS.ACTIVE,
      activityLogs: [],
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

    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "customer"],
    });
    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    const createdBy = await createCreator(
      userId !== undefined ? userId : null,
      customerId !== undefined ? customerId : null
    );

    const itemData = await fetchItemData(itemId);
    const userRole = getUserRole(userId, customerId);
    const performerId = userId || customerId || "system";

    const listItem = listItemRepository.create({
      itemNumber: itemId.toString(),
      item_no_de: itemData.itemNoDe,
      articleName: itemData.articleName,
      articleNumber: itemData.articleNumber,
      quantity: quantity,
      interval: interval || "monthly",
      comment,
      imageUrl: itemData.imageUrl,
      list,
      createdBy,
    });

    if (itemData.deliveries && Object.keys(itemData.deliveries).length > 0) {
      const deliveries: any = { ...itemData.deliveries };
      for (const dateKey in deliveries) {
        deliveries[dateKey] = {
          ...deliveries[dateKey],
          quantity: deliveries[dateKey].quantity,
        };
      }
      listItem.deliveries = deliveries;
    }

    await listItemRepository.save(listItem);

    list.items = [...(list.items || []), listItem];

    // Add activity log using the new simplified method
    list.addActivityLog(
      `${userRole} added item ${itemData.articleName} to the list`,
      userRole,
      performerId,
      listItem.id,
      "item_added",
      null,
      itemData.articleName
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
      marked,
      deliveries,
      articleName,
      articleNumber,
      imageUrl,
      item_no_de,
    } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    console.log("Request body:", req.body);

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    // Fetch item with list and ensure relations are loaded
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list", "list.customer"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Fetch list explicitly to ensure activityLogs is loaded
    const list = await listRepository.findOne({
      where: { id: item.list.id },
      relations: ["customer", "items"],
    });

    if (!list) {
      return next(new ErrorHandler("Associated list not found", 404));
    }

    // Initialize activityLogs if null
    if (!list.activityLogs) {
      list.activityLogs = [];
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    // Track what fields actually changed
    const changedFields: string[] = [];

    // Normalize nullable fields to avoid comparison issues
    const normalizeValue = (value: any) => (value === undefined ? null : value);

    // Update fields using the item's updateField method
    if (quantity !== undefined && normalizeValue(quantity) !== item.quantity) {
      if (
        item.updateField(
          "quantity",
          normalizeValue(quantity),
          userRole,
          performerId
        )
      ) {
        changedFields.push("quantity");
      }
    }

    if (interval !== undefined && normalizeValue(interval) !== item.interval) {
      if (
        item.updateField(
          "interval",
          normalizeValue(interval),
          userRole,
          performerId
        )
      ) {
        changedFields.push("interval");
      }
    }

    if (
      articleName !== undefined &&
      normalizeValue(articleName) !== item.articleName
    ) {
      if (
        item.updateField(
          "articleName",
          normalizeValue(articleName),
          userRole,
          performerId
        )
      ) {
        changedFields.push("articleName");
      }
    }

    if (
      articleNumber !== undefined &&
      normalizeValue(articleNumber) !== item.articleNumber
    ) {
      if (
        item.updateField(
          "articleNumber",
          normalizeValue(articleNumber),
          userRole,
          performerId
        )
      ) {
        changedFields.push("articleNumber");
      }
    }

    if (imageUrl !== undefined && normalizeValue(imageUrl) !== item.imageUrl) {
      if (
        item.updateField(
          "imageUrl",
          normalizeValue(imageUrl),
          userRole,
          performerId
        )
      ) {
        changedFields.push("imageUrl");
      }
    }

    if (
      item_no_de !== undefined &&
      normalizeValue(item_no_de) !== item.item_no_de
    ) {
      if (
        item.updateField(
          "item_no_de",
          normalizeValue(item_no_de),
          userRole,
          performerId
        )
      ) {
        changedFields.push("item_no_de");
      }
    }

    if (marked !== undefined && marked !== item.marked) {
      const oldValue = item.marked;
      item.marked = marked;
      list.logFieldChange(
        "marked",
        oldValue,
        marked,
        userRole,
        performerId,
        item.id,
        item.articleName
      );
      changedFields.push("marked");
    }

    // Handle delivery updates with validation
    if (deliveries) {
      if (typeof deliveries !== "object" || Array.isArray(deliveries)) {
        return next(new ErrorHandler("Invalid deliveries format", 400));
      }
      Object.entries(deliveries).forEach(
        ([period, deliveryData]: [string, any]) => {
          if (deliveryData && typeof deliveryData === "object") {
            item.updateDelivery(period, deliveryData, userRole, performerId);
            changedFields.push(`delivery_${period}`);
          }
        }
      );
    }

    const logss: any = item.getActivityLogs();
    const existingLogIds = new Set(list.activityLogs.map((log: any) => log.id));
    const uniqueLogs = logss.filter((log: any) => !existingLogIds.has(log.id));
    list.activityLogs = [...list.activityLogs, ...uniqueLogs];

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.save(ListItem, item);
      await transactionalEntityManager.save(List, list);
    });

    return res.status(200).json({
      success: true,
      message: "List item updated successfully",
      data: item,
      changedFields: changedFields.length > 0 ? changedFields : undefined,
    });
  } catch (error) {
    console.error("Error in updateListItem:", error);
    return next(error);
  }
};

// Separate controller for updating only comments with logging
export const updateListItemComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { comment } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    console.log("Updating comment for item:", itemId);
    console.log("New comment:", comment);

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    // Fetch item with list relation
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Fetch the associated list
    const list = await listRepository.findOne({
      where: { id: item.list.id },
    });

    if (!list) {
      return next(new ErrorHandler("Associated list not found", 404));
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    // Store old comment for logging
    const oldComment = item.comment;

    // Check if comment actually changed
    if (comment === undefined || comment === item.comment) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: item,
      });
    }

    // Update the comment directly
    item.comment = comment;

    // Log the change to the list activity logs
    if (list) {
      list.logFieldChange(
        "comment",
        oldComment,
        comment,
        userRole,
        performerId,
        item.id,
        item.articleName
      );
    }

    // Save both item and list
    await listItemRepository.save(item);
    if (list) {
      await listRepository.save(list);
    }

    console.log("Comment updated successfully:", item.comment);

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return next(error);
  }
};
// 4. Update Delivery Info
export const updateDeliveryInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const {
      period,
      quantity,
      status,
      remark,
      cargoStatus,
      shippedAt,
      eta,
      cargoType,
      cargoNo,
    } = req.body;
    const userId = (req as any).user?.id;
    const userRole = USER_ROLE.ADMIN;

    if (!itemId || !period) {
      return next(new ErrorHandler("Item ID and period are required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Use the item's updateDelivery method which handles logging
    item.updateDelivery(
      period,
      {
        quantity,
        status,
        remark,
        cargoStatus,
        shippedAt,
        eta,
        cargoType,
        cargoNo,
      },
      userRole,
      userId || "system"
    );

    await listItemRepository.save(item);

    // Save the list to persist the activity logs
    const listRepository = AppDataSource.getRepository(List);
    await listRepository.save(item.list);

    return res.status(200).json({
      success: true,
      message: "Delivery information updated successfully",
      data: item.deliveries[period],
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
      relations: ["items", "customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    if (list.items && list.items.length > 0) {
      const updatedItems = [];
      for (const item of list.items) {
        updatedItems.push(await updateLocalListItem(item));
      }
      list.items = updatedItems;
      await listRepository.save(list);
    }

    // Get unacknowledged customer changes count
    const unacknowledgedChanges = list.getUnacknowledgedCustomerChanges();

    return res.status(200).json({
      success: true,
      data: {
        ...list,
        items: list.items,
        unacknowledgedChangesCount: unacknowledgedChanges.length,
        activityLogs: list.getAllActivityLogs(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 6. Get Customer Deliveries
export const getCustomerDeliveries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new ErrorHandler("Customer ID is required", 400));
    }

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
      relations: ["items"],
    });

    const allDeliveries: any[] = [];

    for (const list of lists) {
      if (list.items && list.items.length > 0) {
        const updatedItems = [];
        for (const item of list.items) {
          const updatedItem = await updateLocalListItem(item);
          updatedItems.push(updatedItem);

          if (updatedItem.deliveries) {
            Object.entries(updatedItem.deliveries).forEach(
              ([period, delivery]: [string, any]) => {
                allDeliveries.push({
                  id: updatedItem.id,
                  listId: list.id,
                  listName: list.name,
                  itemName: updatedItem.articleName,
                  articleNumber: updatedItem.articleNumber,
                  quantity: delivery.quantity || updatedItem.quantity,
                  scheduledDate: period,
                  status: delivery.status || DELIVERY_STATUS.PENDING,
                  deliveredAt: delivery.deliveredAt,
                  cargoNo: delivery.cargoNo || "",
                  cargoStatus: delivery.cargoStatus || "",
                  shippedAt: delivery.shippedAt || "",
                  eta: delivery.eta || "",
                  cargoType: delivery.cargoType || "",
                  interval: updatedItem.interval || "monthly",
                  imageUrl: updatedItem.imageUrl || null,
                });
              }
            );
          }
        }
        list.items = updatedItems;
        await listRepository.save(list);
      }
    }

    allDeliveries.sort((a, b) => {
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      return dateA.getTime() - dateB.getTime();
    });

    return res.status(200).json({
      success: true,
      data: allDeliveries,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch customer deliveries", 500));
  }
};

// 7. Get Customer List
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
      where: { id: listId, customer: { id: customerId } },
      relations: ["items", "customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found for this customer", 404));
    }

    if (list.items && list.items.length > 0) {
      const updatedItems = [];
      for (const item of list.items) {
        updatedItems.push(await updateLocalListItem(item));
      }
      list.items = updatedItems;
      await listRepository.save(list);
    }

    const unacknowledgedChanges = list.getUnacknowledgedCustomerChanges();

    return res.status(200).json({
      success: true,
      data: {
        ...list,
        items: list.items,
        unacknowledgedChangesCount: unacknowledgedChanges.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 8. Delete List Item
export const deleteListItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    if (!userId && !customerId) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list", "list.customer"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    if (customerId && item.list.customer.id !== customerId) {
      return next(new ErrorHandler("Not authorized to delete this item", 403));
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    // Log the deletion
    item.list.addActivityLog(
      `${userRole} deleted item ${item.articleName} from the list`,
      userRole,
      performerId,
      item.id,
      "item_deleted",
      item.articleName,
      null
    );

    await listItemRepository.remove(item);
    await listRepository.save(item.list);

    return res.status(200).json({
      success: true,
      message: "List item deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// 9. Acknowledge List Item Changes
export const acknowledgeListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { logIds } = req.body; // Array of log IDs to acknowledge
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Only admins can acknowledge customer changes
    if (userRole === USER_ROLE.ADMIN) {
      item.list.acknowledgeCustomerChanges(performerId, logIds);
      await listRepository.save(item.list);
    }

    return res.status(200).json({
      success: true,
      message: "Changes acknowledged successfully",
      data: item,
    });
  } catch (error) {
    return next(error);
  }
};

// 10. Reject List Item Changes (Not applicable with new schema, keeping for compatibility)
export const rejectListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { reason } = req.body;

    if (!itemId || !reason) {
      return next(new ErrorHandler("Item ID and reason are required", 400));
    }

    // With the new schema, there's no concept of rejecting changes
    // They are simply logged and can be acknowledged
    return res.status(200).json({
      success: true,
      message: "Change rejection noted in activity log",
    });
  } catch (error) {
    return next(error);
  }
};

// 11. Search Items
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

    // Check if the search query is a numeric value (potentially an ItemID_DE)
    const isNumericSearch = !isNaN(Number(q));

    try {
      let query = `
          SELECT 
            id, 
            item_name AS name,
            ItemID_DE AS articleNumber,
            photo AS imageUrl
          FROM items 
          WHERE (item_name LIKE ? 
        `;

      const params: any[] = [searchTerm];

      // If it's a numeric search, also search by ItemID_DE
      if (isNumericSearch) {
        query += ` OR ItemID_DE = ?`;
        params.push(Number(q));
      }

      query += `)
          AND photo IS NOT NULL
          AND photo != ''
          LIMIT 10`;

      const [items]: any = await connection.query(query, params);

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

// 12. Get Customer Lists
export const getCustomerLists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;
    console.log(customerId);
    if (!customerId) {
      return next(new ErrorHandler("Customer ID is required", 400));
    }

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
      relations: [
        "createdBy",
        "createdBy.user",
        "createdBy.customer",
        "items",
        "customer",
      ],
    });

    // Enhance lists with unacknowledged changes count
    const listsWithChanges = lists.map((list) => ({
      ...list,
      unacknowledgedChangesCount:
        list.getUnacknowledgedCustomerChanges().length,
    }));

    return res.status(200).json({
      success: true,
      data: listsWithChanges,
    });
  } catch (error) {
    return next(error);
  }
};

// 13. Get All Lists (Admin view)
export const getAllLists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const listRepository = AppDataSource.getRepository(List);
    const lists = await listRepository.find({
      relations: ["customer", "items", "createdBy.user", "createdBy.customer"],
    });
    const listsWithChanges = lists.map((list) => ({
      ...list,
      unacknowledgedChangesCount:
        list.getUnacknowledgedCustomerChanges().length,
    }));

    return res.status(200).json({
      success: true,
      data: listsWithChanges,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Failed to fetch lists", 500));
  }
};

// 14. Duplicate List
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

    const originalList = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "customer"],
    });

    if (!originalList) {
      return next(new ErrorHandler("List not found", 404));
    }

    const createdBy = await createCreator(
      userId !== undefined ? userId : null,
      customerId !== undefined ? customerId : null
    );

    const newList = listRepository.create({
      name: `${originalList.name} (Copy)`,
      description: originalList.description,
      templateType: originalList.templateType,
      customer: originalList.customer,
      createdBy,
      status: LIST_STATUS.DRAFTED,
      activityLogs: [],
    });

    await listRepository.save(newList);

    if (originalList.items && originalList.items.length > 0) {
      for (const item of originalList.items) {
        const newItem = listItemRepository.create({
          itemNumber: item.itemNumber || item.articleNumber,
          item_no_de: item.item_no_de,
          articleName: item.articleName,
          articleNumber: item.articleNumber,
          quantity: item.quantity,
          interval: item.interval,
          comment: item.comment,
          imageUrl: item.imageUrl,
          deliveries: item.deliveries,
          list: newList,
          createdBy,
          marked: item.marked || false,
        });
        await listItemRepository.save(newItem);
      }
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    newList.addActivityLog(
      `${userRole} duplicated list from ${originalList.name}`,
      userRole,
      performerId,
      undefined,
      "list_duplicated",
      originalList.id,
      newList.id
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

// 15. Update List
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

    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);
    const changes: string[] = [];

    if (name !== undefined && name !== list.name) {
      list.logFieldChange("name", list.name, name, userRole, performerId);
      list.name = name;
      changes.push("name");
    }

    if (description !== undefined && description !== list.description) {
      list.logFieldChange(
        "description",
        list.description,
        description,
        userRole,
        performerId
      );
      list.description = description;
      changes.push("description");
    }

    if (status !== undefined && status !== list.status) {
      list.logFieldChange("status", list.status, status, userRole, performerId);
      list.status = status;
      changes.push("status");
    }

    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: list,
      });
    }

    await listRepository.save(list);

    return res.status(200).json({
      success: true,
      message: "List updated successfully",
      data: list,
      changedFields: changes,
    });
  } catch (error) {
    return next(error);
  }
};

// 16. Delete List
export const deleteList = async (
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

    if (!userId && !customerId) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    const listRepository = AppDataSource.getRepository(List);

    const list: any = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    if (customerId && list.customer.id !== customerId) {
      return next(new ErrorHandler("Not authorized to delete this list", 403));
    }

    // Check if list has any items
    if (list.items && list.items.length > 0) {
      return next(
        new ErrorHandler(
          "Cannot delete list. List contains items. Please delete all items first.",
          400
        )
      );
    }

    // Delete the list
    await listRepository.remove(list);

    return res.status(200).json({
      success: true,
      message: "List deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// 17. Search Lists by List Number
export const searchListsByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listNumber } = req.params;

    const listRepository = AppDataSource.getRepository(List);
    const list = await listRepository.findOne({
      where: { listNumber },
      relations: ["items", "customer", "createdBy.user", "createdBy.customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    const unacknowledgedChanges = list.getUnacknowledgedCustomerChanges();

    return res.status(200).json({
      success: true,
      data: {
        ...list,
        unacknowledgedChangesCount: unacknowledgedChanges.length,
      },
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to search lists", 500));
  }
};

// 18. Get Lists by Company Name
export const getListsByCompanyName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyName } = req.params;

    if (!companyName) {
      return next(new ErrorHandler("Company name is required", 400));
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository
      .createQueryBuilder("customer")
      .where("LOWER(customer.companyName) = LOWER(:companyName)", {
        companyName,
      })
      .select(["customer.id"])
      .getOne();

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const listRepository = AppDataSource.getRepository(List);
    const lists = await listRepository.find({
      where: { customer: { id: customer.id } },
      relations: ["items", "customer", "createdBy.user", "createdBy.customer"],
      order: { createdAt: "DESC" },
    });

    const listsWithChanges = lists.map((list) => ({
      ...list,
      unacknowledgedChangesCount:
        list.getUnacknowledgedCustomerChanges().length,
    }));

    return res.status(200).json({
      success: true,
      data: listsWithChanges,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch lists by company name", 500));
  }
};

// 19. Bulk Acknowledge Changes
export const bulkAcknowledgeChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listIds, logIds } = req.body; // Now receiving multiple list IDs and optional log IDs
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
      return next(new ErrorHandler("List IDs array is required", 400));
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    // Only admins can acknowledge customer changes
    if (userRole !== USER_ROLE.ADMIN) {
      return next(
        new ErrorHandler("Only admins can acknowledge customer changes", 403)
      );
    }

    const listRepository = AppDataSource.getRepository(List);

    // Find all lists
    const lists = await listRepository.find({
      where: { id: In(listIds) },
    });

    if (lists.length === 0) {
      return next(new ErrorHandler("No lists found", 404));
    }

    let totalAcknowledgedCount = 0;
    const results = [];

    for (const list of lists) {
      const unacknowledgedBefore =
        list.getUnacknowledgedCustomerChanges().length;
      list.acknowledgeCustomerChanges(performerId, logIds);
      const unacknowledgedAfter =
        list.getUnacknowledgedCustomerChanges().length;
      const acknowledgedCount = unacknowledgedBefore - unacknowledgedAfter;

      await listRepository.save(list);

      totalAcknowledgedCount += acknowledgedCount;
      results.push({
        listId: list.id,
        acknowledgedCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Acknowledged ${totalAcknowledgedCount} changes across ${lists.length} lists`,
      data: {
        totalAcknowledgedCount,
        processedLists: lists.length,
        results,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 20. Approve List Item Changes (Not applicable with new schema)
export const approveListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // With the new schema, changes are automatically applied and logged
    // Approval is replaced by acknowledgment
    return res.status(200).json({
      success: true,
      message:
        "Changes are automatically applied. Use acknowledge endpoint for tracking.",
    });
  } catch (error) {
    return next(error);
  }
};

// 21. Fetch All Lists and Items
export const fetchAllListsAndItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shouldRefresh = true;

    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

    console.log(
      `Fetching all lists and items. Refresh from MIS: ${shouldRefresh}`
    );

    // Fetch all lists with their relationships
    const lists = await listRepository.find({
      relations: ["customer", "items", "createdBy.user", "createdBy.customer"],
      order: { createdAt: "DESC" },
    });

    console.log(`Found ${lists.length} lists`);

    let totalItems = 0;
    let refreshedItems = 0;
    let failedRefreshes = 0;

    // Process each list and its items
    for (const list of lists) {
      if (list.items && list.items.length > 0) {
        totalItems += list.items.length;
        console.log(
          `Processing list ${list.name} with ${list.items.length} items`
        );

        if (shouldRefresh) {
          const updatedItems = [];

          for (const item of list.items) {
            try {
              // Refresh item data from MIS
              const refreshedItem = await updateLocalListItem(item);
              updatedItems.push(refreshedItem);
              refreshedItems++;

              // Also update the item in the database
              await listItemRepository.save(refreshedItem);
            } catch (error) {
              console.error(`Failed to refresh item ${item.id}:`, error);
              updatedItems.push(item); // Keep the original item if refresh fails
              failedRefreshes++;
            }
          }

          list.items = updatedItems;

          // Save the updated list
          await listRepository.save(list);
        }
      }
    }

    // Enhance lists with unacknowledged changes count
    const listsWithChanges = lists.map((list) => ({
      ...list,
      unacknowledgedChangesCount:
        list.getUnacknowledgedCustomerChanges().length,
      activityLogs: list.getAllActivityLogs(),
    }));

    console.log(
      `Successfully processed ${lists.length} lists with ${totalItems} items`
    );
    if (shouldRefresh) {
      console.log(
        `Refreshed ${refreshedItems} items from MIS, ${failedRefreshes} failed`
      );
    }

    return res.status(200).json({
      success: true,
      message: shouldRefresh
        ? `Fetched all lists and refreshed ${refreshedItems} items from MIS`
        : "Fetched all lists with current data",
      data: {
        lists: listsWithChanges,
        statistics: {
          totalLists: lists.length,
          totalItems,
          refreshedItems: shouldRefresh ? refreshedItems : undefined,
          failedRefreshes: shouldRefresh ? failedRefreshes : undefined,
          refreshTimestamp: shouldRefresh
            ? new Date().toISOString()
            : undefined,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all lists and items:", error);
    return next(new ErrorHandler("Failed to fetch all lists and items", 500));
  }
};

// 22. Refresh Specific Items from MIS
export const refreshItemsFromMIS = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return next(new ErrorHandler("Array of item IDs is required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    console.log(`Refreshing ${itemIds.length} items from MIS`);

    const items = await listItemRepository.find({
      where: { id: In(itemIds) },
      relations: ["list"],
    });

    if (items.length === 0) {
      return next(
        new ErrorHandler("No items found with the provided IDs", 404)
      );
    }

    let refreshedCount = 0;
    let failedCount = 0;
    const refreshedItems = [];

    for (const item of items) {
      try {
        const refreshedItem = await updateLocalListItem(item);
        await listItemRepository.save(refreshedItem);
        refreshedItems.push(refreshedItem);
        refreshedCount++;

        // Log the refresh activity
        if (item.list) {
          item.list.addActivityLog(
            `System refreshed item ${item.articleName} from MIS`,
            USER_ROLE.ADMIN,
            "system",
            item.id,
            "item_refreshed"
          );
          await listRepository.save(item.list);
        }
      } catch (error) {
        console.error(`Failed to refresh item ${item.id}:`, error);
        failedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Refreshed ${refreshedCount} items from MIS${
        failedCount > 0 ? `, ${failedCount} failed` : ""
      }`,
      data: {
        refreshedItems,
        statistics: {
          totalRequested: itemIds.length,
          successfullyRefreshed: refreshedCount,
          failed: failedCount,
          refreshTimestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error refreshing items from MIS:", error);
    return next(new ErrorHandler("Failed to refresh items from MIS", 500));
  }
};

// 23. Get List Item with MIS Refresh
export const getListItemWithRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { refresh = "true" } = req.query;
    const shouldRefresh = refresh === "true";

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list", "list.customer"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    let refreshedItem = item;

    if (shouldRefresh) {
      try {
        refreshedItem = await updateLocalListItem(item);
        await listItemRepository.save(refreshedItem);

        // Log the refresh activity
        if (refreshedItem.list) {
          refreshedItem.list.addActivityLog(
            `System refreshed item ${refreshedItem.articleName} from MIS`,
            USER_ROLE.ADMIN,
            "system",
            refreshedItem.id,
            "item_refreshed"
          );
          await AppDataSource.getRepository(List).save(refreshedItem.list);
        }
      } catch (error) {
        console.error(`Failed to refresh item ${itemId}:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      message: shouldRefresh
        ? "Item fetched and refreshed from MIS"
        : "Item fetched",
      data: refreshedItem,
    });
  } catch (error) {
    return next(error);
  }
};

// 24. Individual Item Acknowledge Changes Controller
export const acknowledgeItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId, itemId } = req.params;
    const { logIds } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listId) {
      return next(new ErrorHandler("List ID is required", 400));
    }

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const performerId = userId || customerId || "system";
    const userRole = getUserRole(userId, customerId);

    // Only admins can acknowledge customer changes
    if (userRole !== USER_ROLE.ADMIN) {
      return next(
        new ErrorHandler("Only admins can acknowledge customer changes", 403)
      );
    }

    const listRepository = AppDataSource.getRepository(List);

    // Find the list and ensure it exists
    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["items"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    // Find the specific item within the list
    const item = list.items.find((listItem) => listItem.id === itemId);

    if (!item) {
      return next(
        new ErrorHandler("Item not found in the specified list", 404)
      );
    }

    // Get item-specific logs
    const itemLogs = list.getItemActivityLogs(itemId);
    const unacknowledgedBefore = itemLogs.filter(
      (log) => log.userRole === USER_ROLE.CUSTOMER && !log.acknowledged
    ).length;

    // Acknowledge the changes
    list.acknowledgeCustomerChanges(performerId, logIds);

    const unacknowledgedAfter = list
      .getItemActivityLogs(itemId)
      .filter(
        (log) => log.userRole === USER_ROLE.CUSTOMER && !log.acknowledged
      ).length;

    const acknowledgedCount = unacknowledgedBefore - unacknowledgedAfter;

    await listRepository.save(list);

    return res.status(200).json({
      success: true,
      message: `Successfully acknowledged ${acknowledgedCount} changes for item ${item.articleName}`,
      data: {
        itemId: item.id,
        itemNumber: item.itemNumber,
        acknowledgedCount,
        remainingUnacknowledged: unacknowledgedAfter,
      },
    });
  } catch (error) {
    return next(error);
  }
};
