import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import {
  CHANGE_STATUS,
  List,
  LIST_STATUS,
  ListCreator,
  UserCreator,
  CustomerCreator,
  ListActivityLog,
  LOG_APPROVAL_STATUS,
  DELIVERY_STATUS,
} from "../models/list";
import { ListItem } from "../models/list";
import ErrorHandler from "../utils/errorHandler";
import { getConnection } from "../config/misDb";
import { Customer } from "../models/customers";
import { User } from "../models/users";

async function fetchItemData(itemId: number) {
  const connection = await getConnection();

  try {
    const [itemRows]: any = await connection.query(
      `
      SELECT 
        i.*, 
        os.cargo_id, 
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
        wi.item_no_de
      FROM items i
      LEFT JOIN order_items oi ON i.ItemID_DE = oi.ItemID_DE
      LEFT JOIN order_statuses os ON oi.master_id = os.master_id 
                                  AND oi.ItemID_DE = os.ItemID_DE
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
                status: row.cargo_status || "Open",
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
      articleName: itemData.item_name || "",
      articleNumber: itemData.ItemID_DE || "",
      itemNoDe: itemData.item_no_de || "",
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
}

async function updateLocalListItem(item: ListItem): Promise<ListItem> {
  const listItemRepository = AppDataSource.getRepository(ListItem);

  try {
    // Fetch fresh data from MIS
    const itemData = await fetchItemData(parseInt(item.itemNumber));
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
    }

    return await listItemRepository.save(item);
  } catch (error) {
    console.error(`Failed to update local item ${item.id}:`, error);
    return item;
  }
}

async function refreshListItemsDeliveryData(items: any[]) {
  if (!items || items.length === 0) return items;

  // Refresh delivery data for each item
  const refreshedItems = await Promise.all(
    items.map(async (item) => {
      try {
        const itemData = await fetchItemData(parseInt(item.itemNumber));
        return {
          ...item,
          deliveries: itemData.deliveries || {},
          articleName: itemData.articleName || item.articleName,
          articleNumber: itemData.articleNumber || item.articleNumber,
          item_no_de: itemData.itemNoDe || item.item_no_de,
          imageUrl: itemData.imageUrl || item.imageUrl,
        };
      } catch (error) {
        console.error(
          `Failed to refresh delivery data for item ${item.id}:`,
          error
        );
        return item;
      }
    })
  );

  return refreshedItems;
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

    // Create new list item
    const listItem = listItemRepository.create({
      itemNumber: itemId.toString(),
      item_no_de: itemData.itemNoDe, // Add the item_no_de field
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
      item_no_de,
    } = req.body;
    let refresh = true;
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

    // If refresh is requested, fetch fresh data from MIS first
    if (refresh) {
      const refreshedItem = await updateLocalListItem(item);
      return res.status(200).json({
        success: true,
        message: "Item refreshed successfully",
        data: refreshedItem,
      });
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

    if (trackChange("item_no_de", item_no_de, item.item_no_de)) {
      item.item_no_de = item_no_de;
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
            // Ensure critical fields are always set
            status: deliveryData.status || currentDelivery.status || "Open",
            cargoStatus:
              deliveryData.cargoStatus || currentDelivery.cargoStatus || "",
            remark: deliveryData.remark || currentDelivery.remark || "",
            shippedAt:
              deliveryData.shippedAt || currentDelivery.shippedAt || "",
            eta: deliveryData.eta || currentDelivery.eta || "",
            cargoType:
              deliveryData.cargoType || currentDelivery.cargoType || "",
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
    } = req.body;
    const userId = (req as any).user.id;

    if (!itemId || !period) {
      return next(new ErrorHandler("Item ID and period are required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    // Find item with list relation
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Initialize deliveries if not exists
    item.deliveries = item.deliveries || {};

    // Get existing delivery data for the period
    const existingDelivery = item.deliveries[period] || {};

    // Update delivery info
    item.deliveries[period] = {
      ...existingDelivery,
      quantity: quantity !== undefined ? quantity : existingDelivery.quantity,
      status: status || existingDelivery.status || "Open",
      cargoNo: existingDelivery.cargoNo || "",
      cargoStatus: cargoStatus || existingDelivery.cargoStatus,
      remark: remark || existingDelivery.remark || "",
      shippedAt: shippedAt || existingDelivery.shippedAt || "",
      eta: eta || existingDelivery.eta || "",
      cargoType: cargoType || existingDelivery.cargoType || "",
      deliveredAt:
        status === "Delivered" ? new Date() : existingDelivery.deliveredAt,
    };

    await listItemRepository.save(item);

    // Reload the list to ensure we have the latest data for logging
    const list = await listRepository.findOne({
      where: { id: item.list.id },
      relations: ["activityLogs"],
    });

    if (!list) {
      return next(new ErrorHandler("Associated list not found", 404));
    }

    // Log delivery update
    list.logActivity(
      "DELIVERY_UPDATED",
      {
        itemId: item.id,
        period,
        updates: {
          quantity,
          status,
          remark,
          cargoStatus,
          shippedAt,
          eta,
          cargoType,
        },
      },
      userId,
      "user"
    );

    await listRepository.save(list);

    return res.status(200).json({
      success: true,
      message: "Delivery information updated successfully",
      data: item.deliveries[period],
    });
  } catch (error) {
    return next(error);
  }
};
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

    // Refresh and update delivery data for all items
    if (list.items && list.items.length > 0) {
      const updatedItems = [];
      for (const item of list.items) {
        updatedItems.push(await updateLocalListItem(item));
      }
      list.items = updatedItems;
      await listRepository.save(list);
    }

    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    return next(error);
  }
};

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
        // Save the updated items back to the list
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
      relations: ["items", "customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found for this customer", 404));
    }

    // Refresh and update delivery data for all items
    if (list.items && list.items.length > 0) {
      const updatedItems = [];
      for (const item of list.items) {
        updatedItems.push(await updateLocalListItem(item));
      }
      list.items = updatedItems;
      await listRepository.save(list);
    }

    return res.status(200).json({
      success: true,
      data: list,
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

    // Find item with list relation for activity logging
    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list", "list.customer"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Verify permissions
    if (customerId) {
      // Check if the customer owns the list
      if (item.list.customer.id !== customerId) {
        return next(
          new ErrorHandler("Not authorized to delete this item", 403)
        );
      }
    }
    // Users don't need additional checks since they have admin privileges

    // Determine who is performing the action
    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";

    // Log deletion activity
    item.list.logActivity(
      "ITEM_DELETED",
      {
        itemId: item.id,
        itemName: item.articleName,
        deletedBy: performerType,
      },
      performerId,
      performerType
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

// 5. Get List with Items

export const approveListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { logId } = req.params;
    const userId = (req as any).user.id;

    if (!logId) {
      return next(new ErrorHandler("Log ID is required", 400));
    }

    const listActivityLogRepository =
      AppDataSource.getRepository(ListActivityLog);
    const log = await listActivityLogRepository.findOne({
      where: { id: logId },
      relations: ["list", "list.activityLogs"],
    });

    if (!log) {
      return next(new ErrorHandler("Activity log not found", 404));
    }

    if (log.approvalStatus !== LOG_APPROVAL_STATUS.PENDING) {
      return next(new ErrorHandler("No pending changes to approve", 400));
    }

    // Approve the activity log
    let newLog: any = await log.list.approveActivityLog(logId);
    await listActivityLogRepository.save(newLog);

    if (log.action === "CHANGE_REQUESTED" && log.changes?.itemId) {
      const listItemRepository = AppDataSource.getRepository(ListItem);
      const item = await listItemRepository.findOne({
        where: { id: log.changes.itemId },
        relations: ["list"],
      });

      if (item) {
        item.changeStatus = CHANGE_STATUS.CONFIRMED;
        item.confirmedAt = new Date();
        await listItemRepository.save(item);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Changes approved successfully",
      data: log,
    });
  } catch (error) {
    return next(error);
  }
};

export const rejectListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { logId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user.id;

    if (!logId || !reason) {
      return next(new ErrorHandler("Log ID and reason are required", 400));
    }

    const listActivityLogRepository =
      AppDataSource.getRepository(ListActivityLog);
    const log = await listActivityLogRepository.findOne({
      where: { id: logId },
      relations: ["list", "list.activityLogs"], // Ensure relations are loaded
    });

    if (!log) {
      return next(new ErrorHandler("Activity log not found", 404));
    }

    if (log.approvalStatus !== LOG_APPROVAL_STATUS.PENDING) {
      return next(new ErrorHandler("No pending changes to reject", 400));
    }

    // Reject the activity log
    log.approvalStatus = LOG_APPROVAL_STATUS.REJECTED;
    log.rejectionReason = reason;
    log.approvedAt = new Date();

    await listActivityLogRepository.save(log);

    // If this log was for a change approval, revert the corresponding list item
    if (log.action === "CHANGE_REQUESTED" && log.changes?.itemId) {
      const listItemRepository = AppDataSource.getRepository(ListItem);
      const item = await listItemRepository.findOne({
        where: { id: log.changes.itemId },
        relations: ["list"],
      });

      if (item) {
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
      }
    }

    return res.status(200).json({
      success: true,
      message: "Changes rejected successfully",
      data: log,
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
      relations: [
        "createdBy",
        "createdBy.user",
        "createdBy.customer",
        "items",
        "customer",
        "activityLogs",
      ],
    });
    return res.status(200).json({
      success: true,
      data: lists,
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
          itemNumber: item.itemNumber || item.articleNumber,
          item_no_de: item.item_no_de, // Include the item_no_de field
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

// 12. Delete List
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
    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listActivityLogRepository =
      AppDataSource.getRepository(ListActivityLog);

    const list = await listRepository.findOne({
      where: { id: listId },
      relations: ["items", "activityLogs", "customer"],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    if (customerId) {
      // Check if the customer owns the list
      if (list.customer.id !== customerId) {
        return next(
          new ErrorHandler("Not authorized to delete this list", 403)
        );
      }
    }
    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";

    if (list.items && list.items.length > 0) {
      await listItemRepository.remove(list.items);
    }

    if (list.activityLogs && list.activityLogs.length > 0) {
      await listActivityLogRepository.remove(list.activityLogs);
    }

    await listRepository.remove(list);

    return res.status(200).json({
      success: true,
      message: "List and all associated items deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// Search Lists by List Number
export const searchListsByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listNumber } = req.params;

    const listRepository = AppDataSource.getRepository(List);
    const list = await listRepository.findOne({
      where: { listNumber: listNumber },
      relations: [
        "items",
        "activityLogs",
        "customer",
        "createdBy.user",
        "createdBy.customer",
      ],
    });
    console.log(list);

    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to search lists", 500));
  }
};

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
    const customer = await customerRepository.findOne({
      where: { companyName },
      select: ["id"],
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    const listRepository = AppDataSource.getRepository(List);
    const lists = await listRepository.find({
      where: { customer: { id: customer.id } },
      relations: [
        "items",
        "customer",
        "activityLogs",
        "createdBy.user",
        "createdBy.customer",
      ],
      order: { createdAt: "DESC" },
    });

    return res.status(200).json({
      success: true,
      data: lists,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch lists by company name", 500));
  }
};
