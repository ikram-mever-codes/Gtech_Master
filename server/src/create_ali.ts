
import { AppDataSource } from "./config/database";
import { User, UserRole } from "./models/users";
import bcrypt from "bcryptjs";

async function createAli() {
    try {
        await AppDataSource.initialize();
        const userRepository = AppDataSource.getRepository(User);

        const existingAli = await userRepository.findOne({ where: { email: "ali@gmail.com" } });
        if (existingAli) {
            console.log("User Ali already exists");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash("ali123", 10);
        const ali = userRepository.create({
            name: "Ali",
            email: "ali@gmail.com",
            password: hashedPassword,
            role: UserRole.SALES,
            isEmailVerified: true,
            assignedResources: ["Products", "Orders"]
        });

        await userRepository.save(ali);
        console.log("User Ali created successfully");
        process.exit(0);
    } catch (error) {
        console.error("Error creating user:", error);
        process.exit(1);
    }
}

createAli();
