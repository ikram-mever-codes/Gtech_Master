import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/users";

(async () => {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);

  const hashedPassword = await bcrypt.hash("Password123", 10);

  const user = userRepo.create({
    name: "Sayed",
    email: "sayed@test.com",
    password: hashedPassword,
    role: UserRole.ADMIN,
    isEmailVerified: true
  });

  await userRepo.save(user);

  console.log("User created:", user);
})();
