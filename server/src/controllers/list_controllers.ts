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
  CHANGE_ORIGIN,
  createListItemDTOForRole,
  getOriginFromUserType,
} from "../models/list";
import { ListItem } from "../models/list";
import ErrorHandler from "../utils/errorHandler";
import { getConnection } from "../config/misDb";
import { Customer } from "../models/customers";
import { User } from "../models/users";
import { In } from "typeorm";

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
        wi.item_no_de -- 👈 Added item_no_de here
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
    item.quantity = itemData.quantity || item.quantity;
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
    const userType = userId ? "user" : "customer";
    const origin = getOriginFromUserType(userType);

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
      changeStatus: CHANGE_STATUS.CONFIRMED,
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

    const performerId = userId ? userId : customerId;
    list.logActivity(
      "ITEM_ADDED",
      {
        itemId: listItem.id,
        itemName: itemData.articleName,
        origin,
      },
      performerId,
      userType
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

// 3. Update List Item with bidirectional change tracking
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
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list", "list.items"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    const list = await listRepository.findOne({
      where: { id: item.list.id },
      relations: ["customer"],
    });
    if (!list) {
      return next(new ErrorHandler("Associated list not found", 404));
    }

    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";
    const origin = getOriginFromUserType(performerType);
    const changes: Record<string, any> = {};

    // Update fields with change tracking
    if (quantity !== undefined && quantity !== item.quantity) {
      item.updateField(
        "quantity",
        quantity,
        performerId,
        performerType,
        origin
      );
      changes.quantity = { from: item.originalValues?.quantity, to: quantity };
    }

    if (interval !== undefined && interval !== item.interval) {
      item.updateField(
        "interval",
        interval,
        performerId,
        performerType,
        origin
      );
      changes.interval = { from: item.originalValues?.interval, to: interval };
    }

    if (comment !== undefined && comment !== item.comment) {
      item.addComment(comment, performerId, performerType, origin);
      changes.comment = { from: item.originalValues?.comment, to: comment };
    }

    if (articleName !== undefined && articleName !== item.articleName) {
      item.updateField(
        "articleName",
        articleName,
        performerId,
        performerType,
        origin
      );
      changes.articleName = {
        from: item.originalValues?.articleName,
        to: articleName,
      };
    }

    if (articleNumber !== undefined && articleNumber !== item.articleNumber) {
      item.updateField(
        "articleNumber",
        articleNumber,
        performerId,
        performerType,
        origin
      );
      changes.articleNumber = {
        from: item.originalValues?.articleNumber,
        to: articleNumber,
      };
    }

    if (imageUrl !== undefined && imageUrl !== item.imageUrl) {
      item.updateField(
        "imageUrl",
        imageUrl,
        performerId,
        performerType,
        origin
      );
      changes.imageUrl = { from: item.originalValues?.imageUrl, to: imageUrl };
    }

    if (item_no_de !== undefined && item_no_de !== item.item_no_de) {
      item.updateField(
        "item_no_de",
        item_no_de,
        performerId,
        performerType,
        origin
      );
      changes.item_no_de = {
        from: item.originalValues?.item_no_de,
        to: item_no_de,
      };
    }

    if (marked !== undefined) {
      item.marked = marked;
    }

    if (deliveries) {
      item.deliveries = item.deliveries || {};
      Object.entries(deliveries).forEach(
        ([period, deliveryData]: [string, any]) => {
          const currentDelivery = item.deliveries[period] || {};
          item.deliveries[period] = {
            ...currentDelivery,
            ...deliveryData,
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

    if (Object.keys(changes).length > 0) {
      list.logActivity(
        "ITEM_UPDATED",
        {
          itemId: item.id,
          itemName: item.articleName,
          changes,
          origin,
        },
        performerId,
        performerType,
        true
      );
      await listRepository.save(list);
    }

    const role = getOriginFromUserType(performerType);
    return res.status(200).json({
      success: true,
      message: "List item updated successfully",
      data: createListItemDTOForRole(item, role),
    });
  } catch (error) {
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
    } = req.body;
    const userId = (req as any).user.id;
    const userType = "user";
    const origin = CHANGE_ORIGIN.ADMIN;

    if (!itemId || !period) {
      return next(new ErrorHandler("Item ID and period are required", 400));
    }

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    item.deliveries = item.deliveries || {};
    const existingDelivery = item.deliveries[period] || {};

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

    const list = await listRepository.findOne({
      where: { id: item.list.id },
      relations: ["activityLogs"],
    });

    if (!list) {
      return next(new ErrorHandler("Associated list not found", 404));
    }

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
        origin,
      },
      userId,
      userType
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

// 5. Get List with Items (with role-based change tracking)
export const getListWithItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId } = req.params;
    const userType = (req as any).user?.type || (req as any).customer?.type;
    const role = getOriginFromUserType(userType);

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

    if (list.items && list.items.length > 0) {
      const updatedItems = [];
      for (const item of list.items) {
        updatedItems.push(await updateLocalListItem(item));
      }
      list.items = updatedItems;
      await listRepository.save(list);
    }

    // Enhance items with role-based change information
    const itemsWithChanges = list.items.map((item) =>
      createListItemDTOForRole(item, role)
    );

    return res.status(200).json({
      success: true,
      data: {
        ...list,
        items: itemsWithChanges,
        pendingChangesCount: list.getItemsWithPendingChanges().length,
        changesNeedingAcknowledgment:
          list.getChangesForAcknowledgment(role).length,
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
    const userType = "customer";
    const role = CHANGE_ORIGIN.CUSTOMER;

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

    const itemsWithChanges = list.items.map((item) =>
      createListItemDTOForRole(item, role)
    );

    return res.status(200).json({
      success: true,
      data: {
        ...list,
        items: itemsWithChanges,
        changesNeedingAcknowledgment:
          list.getChangesForAcknowledgment(role).length,
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

    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";
    const origin = getOriginFromUserType(performerType);

    item.list.logActivity(
      "ITEM_DELETED",
      {
        itemId: item.id,
        itemName: item.articleName,
        deletedBy: performerType,
        origin,
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

// 9. Acknowledge List Item Changes
export const acknowledgeListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { acknowledgeComments } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";
    const origin = getOriginFromUserType(performerType);

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

    const item = await listItemRepository.findOne({
      where: { id: itemId },
      relations: ["list"],
    });

    if (!item) {
      return next(new ErrorHandler("List item not found", 404));
    }

    // Acknowledge changes
    if (item.changeStatus === CHANGE_STATUS.PENDING) {
      item.confirmChange(performerId, performerType);
    }

    // Acknowledge comments if requested
    if (acknowledgeComments && item.hasUnacknowledgedComments()) {
      item.acknowledgeCommentsFromOrigin(
        origin === CHANGE_ORIGIN.ADMIN
          ? CHANGE_ORIGIN.CUSTOMER
          : CHANGE_ORIGIN.ADMIN,
        performerId,
        performerType,
        origin
      );
    }

    await listItemRepository.save(item);

    // Log acknowledgment activity
    item.list.logActivity(
      "CHANGES_ACKNOWLEDGED",
      {
        itemId: item.id,
        itemName: item.articleName,
        acknowledgedChanges: item.getChangedFields(),
        acknowledgedComments: acknowledgeComments,
      },
      performerId,
      performerType
    );
    await listRepository.save(item.list);

    return res.status(200).json({
      success: true,
      message: "Changes acknowledged successfully",
      data: createListItemDTOForRole(item, origin),
    });
  } catch (error) {
    return next(error);
  }
};

// 10. Reject List Item Changes
export const rejectListItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!itemId || !reason) {
      return next(new ErrorHandler("Item ID and reason are required", 400));
    }

    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";

    const listItemRepository = AppDataSource.getRepository(ListItem);
    const listRepository = AppDataSource.getRepository(List);

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

    item.rejectChange(performerId, performerType);
    await listItemRepository.save(item);

    // Log rejection activity
    item.list.logActivity(
      "CHANGES_REJECTED",
      {
        itemId: item.id,
        itemName: item.articleName,
        reason,
        rejectedChanges: item.getChangedFields(),
      },
      performerId,
      performerType
    );
    await listRepository.save(item.list);

    return res.status(200).json({
      success: true,
      message: "Changes rejected successfully",
      data: item,
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
    const userType = "customer";
    const role = CHANGE_ORIGIN.CUSTOMER;
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
        "activityLogs",
      ],
    });

    // Enhance lists with change information
    const listsWithChanges = lists.map((list) => ({
      ...list,
      items:
        list.items?.map((item) => createListItemDTOForRole(item, role)) || [],
      pendingChangesCount: list.getItemsWithPendingChanges().length,
      changesNeedingAcknowledgment:
        list.getChangesForAcknowledgment(role).length,
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
    const userType = "user";
    const role = CHANGE_ORIGIN.ADMIN;

    const listRepository = AppDataSource.getRepository(List);
    const lists = await listRepository.find({
      relations: [
        "customer",
        "items",
        "createdBy.user",
        "createdBy.customer",
        "activityLogs",
      ],
    });

    const listsWithChanges = lists.map((list) => ({
      ...list,
      items:
        list.items?.map((item) => createListItemDTOForRole(item, role)) || [],
      pendingChangesCount: list.getItemsWithPendingChanges().length,
      changesNeedingAcknowledgment:
        list.getChangesForAcknowledgment(role).length,
    }));

    return res.status(200).json({
      success: true,
      data: listsWithChanges,
    });
  } catch (error) {
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
          changeStatus: CHANGE_STATUS.CONFIRMED,
          originalValues: undefined,
        });
        await listItemRepository.save(newItem);
      }
    }

    const performerId = userId ? userId : customerId;
    const performerType = userId ? "user" : "customer";
    newList.logActivity(
      "LIST_DUPLICATED",
      {
        originalListId: originalList.id,
        originalListName: originalList.name,
      },
      performerId,
      performerType
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

    if (Object.keys(changes).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: list,
      });
    }

    await listRepository.save(list);

    if (Object.keys(changes).length > 0) {
      const performerId = userId ? userId : customerId;
      const performerType = userId ? "user" : "customer";
      list.logActivity("LIST_UPDATED", { changes }, performerId, performerType);
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

    if (customerId && list.customer.id !== customerId) {
      return next(new ErrorHandler("Not authorized to delete this list", 403));
    }

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

// 17. Search Lists by List Number
export const searchListsByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listNumber } = req.params;
    const userType = (req as any).user?.type || (req as any).customer?.type;
    const role = getOriginFromUserType(userType);

    const listRepository = AppDataSource.getRepository(List);
    const list = await listRepository.findOne({
      where: { listNumber },
      relations: [
        "items",
        "activityLogs",
        "customer",
        "createdBy.user",
        "createdBy.customer",
      ],
    });

    if (!list) {
      return next(new ErrorHandler("List not found", 404));
    }

    // Enhance items with role-based change information
    const itemsWithChanges = list.items.map((item) =>
      createListItemDTOForRole(item, role)
    );

    return res.status(200).json({
      success: true,
      data: {
        ...list,
        items: itemsWithChanges,
        pendingChangesCount: list.getItemsWithPendingChanges().length,
        changesNeedingAcknowledgment:
          list.getChangesForAcknowledgment(role).length,
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
    const userType = "user";
    const role = CHANGE_ORIGIN.ADMIN;

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
      relations: [
        "items",
        "customer",
        "activityLogs",
        "createdBy.user",
        "createdBy.customer",
      ],
      order: { createdAt: "DESC" },
    });

    // Enhance lists with change information for admin view
    const listsWithChanges = lists.map((list) => ({
      ...list,
      items:
        list.items?.map((item) => createListItemDTOForRole(item, role)) || [],
      pendingChangesCount: list.getItemsWithPendingChanges().length,
      changesNeedingAcknowledgment:
        list.getChangesForAcknowledgment(role).length,
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
    const { listIds } = req.body; // Now receiving multiple list IDs
    const { itemIds, acknowledgeComments } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
      return next(new ErrorHandler("List IDs array is required", 400));
    }

    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";
    const origin = getOriginFromUserType(performerType);

    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

    // Find all lists with their items
    const lists = await listRepository.find({
      where: { id: In(listIds) },
      relations: ["items"],
    });

    if (lists.length === 0) {
      return next(new ErrorHandler("No lists found", 404));
    }

    // Check if any requested lists were not found
    const foundListIds = lists.map((list) => list.id);
    const missingListIds = listIds.filter((id) => !foundListIds.includes(id));

    if (missingListIds.length > 0) {
      console.warn(`Some lists not found: ${missingListIds.join(", ")}`);
    }

    let totalAcknowledgedCount = 0;
    const results = [];

    for (const list of lists) {
      const itemsToAcknowledge = itemIds
        ? list.items.filter((item) => itemIds.includes(item.id))
        : list.items;

      let acknowledgedCount = 0;

      for (const item of itemsToAcknowledge) {
        if (item.changeStatus === CHANGE_STATUS.PENDING) {
          item.confirmChange(performerId, performerType);
          acknowledgedCount++;
        }

        if (acknowledgeComments && item.hasUnacknowledgedComments()) {
          item.acknowledgeCommentsFromOrigin(
            origin === CHANGE_ORIGIN.ADMIN
              ? CHANGE_ORIGIN.CUSTOMER
              : CHANGE_ORIGIN.ADMIN,
            performerId,
            performerType,
            origin
          );
        }
      }

      if (acknowledgedCount > 0) {
        await listItemRepository.save(itemsToAcknowledge);

        // Log bulk acknowledgment activity for each list
        list.logActivity(
          "BULK_CHANGES_ACKNOWLEDGED",
          {
            acknowledgedItems: itemsToAcknowledge.map((item) => item.id),
            acknowledgedCount,
            acknowledgeComments,
          },
          performerId,
          performerType
        );
        await listRepository.save(list);
      }

      totalAcknowledgedCount += acknowledgedCount;
      results.push({
        listId: list.id,
        acknowledgedCount,
        totalItems: list.items.length,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Acknowledged changes across ${lists.length} lists for ${totalAcknowledgedCount} items total`,
      data: {
        totalAcknowledgedCount,
        processedLists: lists.length,
        missingLists: missingListIds,
        results,
      },
    });
  } catch (error) {
    return next(error);
  }
};
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

export const fetchAllListsAndItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shouldRefresh = true;
    const userType = (req as any).user?.type || (req as any).customer?.type;
    const role = getOriginFromUserType(userType);

    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

    console.log(
      `Fetching all lists and items. Refresh from MIS: ${shouldRefresh}`
    );

    // Fetch all lists with their relationships
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

    // Enhance lists with role-based change information
    const listsWithChanges = lists.map((list) => ({
      ...list,
      items:
        list.items?.map((item) => createListItemDTOForRole(item, role)) || [],
      pendingChangesCount: list.getItemsWithPendingChanges().length,
      changesNeedingAcknowledgment:
        list.getChangesForAcknowledgment(role).length,
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

// 21. Refresh Specific Items from MIS
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
          item.list.logActivity(
            "ITEM_REFRESHED_FROM_MIS",
            {
              itemId: item.id,
              itemName: item.articleName,
              refreshedAt: new Date(),
            },
            "system", // System user
            "user"
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

// 22. Get List Item with MIS Refresh
export const getListItemWithRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemId } = req.params;
    const { refresh = "true" } = req.query;
    const shouldRefresh = refresh === "true";
    const userType = (req as any).user?.type || (req as any).customer?.type;
    const role = getOriginFromUserType(userType);

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
          refreshedItem.list.logActivity(
            "ITEM_REFRESHED_FROM_MIS",
            {
              itemId: refreshedItem.id,
              itemName: refreshedItem.articleName,
              refreshedAt: new Date(),
            },
            "system", // System user
            "user"
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
      data: createListItemDTOForRole(refreshedItem, role),
    });
  } catch (error) {
    return next(error);
  }
};

// Individual Item Acknowledge Changes Controller
export const acknowledgeItemChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listId, itemId } = req.params;
    const { acknowledgeComments } = req.body;
    const userId = (req as any).user?.id;
    const customerId = (req as any).customer?.id;

    if (!listId) {
      return next(new ErrorHandler("List ID is required", 400));
    }

    if (!itemId) {
      return next(new ErrorHandler("Item ID is required", 400));
    }

    const performerId = userId || customerId;
    const performerType = userId ? "user" : "customer";
    const origin = getOriginFromUserType(performerType);

    const listRepository = AppDataSource.getRepository(List);
    const listItemRepository = AppDataSource.getRepository(ListItem);

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

    let changeAcknowledged = false;
    let commentsAcknowledged = false;

    // Acknowledge pending changes if any
    if (item.changeStatus === CHANGE_STATUS.PENDING) {
      item.confirmChange(performerId, performerType);
      changeAcknowledged = true;
    }

    // Acknowledge comments if requested and there are unacknowledged comments
    if (acknowledgeComments && item.hasUnacknowledgedComments()) {
      item.acknowledgeCommentsFromOrigin(
        origin === CHANGE_ORIGIN.ADMIN
          ? CHANGE_ORIGIN.CUSTOMER
          : CHANGE_ORIGIN.ADMIN,
        performerId,
        performerType,
        origin
      );
      commentsAcknowledged = true;
    }

    // Save the item changes
    await listItemRepository.save(item);

    // Log the acknowledgment activity on the list
    list.logActivity(
      "ITEM_CHANGES_ACKNOWLEDGED",
      {
        itemId: item.id,
        itemNumber: item.itemNumber,
        articleName: item.articleName,
        changeAcknowledged,
        commentsAcknowledged,
        acknowledgeComments,
      },
      performerId,
      performerType
    );

    await listRepository.save(list);

    // Prepare response message
    const actions = [];
    if (changeAcknowledged) actions.push("changes");
    if (commentsAcknowledged) actions.push("comments");

    const message =
      actions.length > 0
        ? `Successfully acknowledged ${actions.join(" and ")} for item ${
            item.itemNumber
          }`
        : "No pending changes or comments to acknowledge";

    return res.status(200).json({
      success: true,
      message,
      data: {
        itemId: item.id,
        itemNumber: item.itemNumber,
        changeAcknowledged,
        commentsAcknowledged,
        currentChangeStatus: item.changeStatus,
        hasUnacknowledgedComments: item.hasUnacknowledgedComments(),
      },
    });
  } catch (error) {
    return next(error);
  }
};
