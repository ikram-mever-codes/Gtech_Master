import { AppDataSource } from "./src/config/database";
import { Parent } from "./src/models/parents";
import { Taric } from "./src/models/tarics";
import { Item } from "./src/models/items";

async function checkData() {
    await AppDataSource.initialize();
    const parentCount = await AppDataSource.getRepository(Parent).count();
    const taricCount = await AppDataSource.getRepository(Taric).count();
    const itemCount = await AppDataSource.getRepository(Item).count();
    console.log(`Parents: ${parentCount}`);
    console.log(`Tarics: ${taricCount}`);
    console.log(`Items: ${itemCount}`);
    process.exit(0);
}

checkData();