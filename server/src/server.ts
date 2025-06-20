import app from "./app";
import { initializeDatabase } from "./config/database";
import { getConnection } from "./config/misDb";
import ErrorHandler from "./utils/errorHandler";
const PORT = process.env.PORT || 1000;

initializeDatabase();

async function fetchItemData(itemId: number) {
  const connection = await getConnection();

  try {
    // Fetch from items table
    const [itemRows]: any = await connection.query(
      `
      SELECT i.*, os.cargo_id 
      FROM items i
      LEFT JOIN order_statuses os ON i.ItemID_DE = os.ItemID_DE
      WHERE i.id = ?
    `,
      [itemId]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new ErrorHandler("Item not found in MIS database", 404);
    }

    const itemData = itemRows[0];
    let deliveryDates: Date[] = [];

    if (itemData.cargo_id) {
      const [cargoRows]: any = await connection.query(
        `
        SELECT pickup_date, dep_date 
        FROM cargos 
        WHERE id = ?
        `,
        [itemData.cargo_id]
      );

      if (cargoRows && cargoRows.length > 0) {
        const cargoData = cargoRows[0];
        deliveryDates = [cargoData.pickup_date, cargoData.dep_date].filter(
          (date: Date | null): date is Date => date !== null
        );
      }
    }

    return {
      articleName: itemData.item_name || "",
      articleNumber: itemData.ItemID_DE || "",
      quantity: itemData.FOQ || 0,
      weight: itemData.weight,
      dimensions: {
        width: itemData.width,
        height: itemData.height,
        length: itemData.length,
      },
      deliveryDates,
    };
  } finally {
    connection.release();
  }
}

app.listen(PORT, async () => {
  const itemData = await fetchItemData(1);
  console.log(itemData);
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is running`);
});
