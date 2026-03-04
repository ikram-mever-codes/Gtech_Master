// scripts/migrateExistingCustomers.ts
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { StarCustomerDetails } from "../models/star_customer_details";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const migrateExistingCustomers = async () => {
  try {
    await AppDataSource.initialize();

    const customerRepository = AppDataSource.getRepository(Customer);
    const starCustomerDetailsRepository =
      AppDataSource.getRepository(StarCustomerDetails);

    const existingCustomers = await customerRepository.find();

    console.log(`Found ${existingCustomers.length} customers to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const customer of existingCustomers) {
      try {
        console.log(
          `Migrating customer: ${customer.companyName} (${customer.id})`
        );

        const existingStarDetails = await starCustomerDetailsRepository.findOne(
          {
            where: { customer: { id: customer.id } },
          }
        );

        if (existingStarDetails) {
          console.log(
            `Customer ${customer.companyName} already migrated, skipping...`
          );
          continue;
        }

        let password = (customer as any).password;
        let shouldNotifyPassword = false;

        if (!password) {
          console.warn(
            `Customer ${customer.companyName} has no password, generating temporary one`
          );
          const tempPassword = crypto.randomBytes(8).toString("hex");
          password = await bcrypt.hash(tempPassword, 10);
          shouldNotifyPassword = true;
        }

        const starCustomerDetails = starCustomerDetailsRepository.create({
          customer: customer,
          taxNumber: (customer as any).taxNumber || "",
          password: password,
          isEmailVerified: (customer as any).isEmailVerified || false,
          emailVerificationCode: (customer as any).emailVerificationCode,
          emailVerificationExp: (customer as any).emailVerificationExp,
          isPhoneVerified: (customer as any).isPhoneVerified || false,
          phoneVerificationCode: (customer as any).phoneVerificationCode,
          phoneVerificationExp: (customer as any).phoneVerificationExp,
          accountVerificationStatus:
            (customer as any).accountVerificationStatus || "pending",
          verificationRemark: (customer as any).verificationRemark,
          deliveryAddressLine1: (customer as any).deliveryAddressLine1,
          deliveryAddressLine2: (customer as any).deliveryAddressLine2,
          deliveryPostalCode: (customer as any).deliveryPostalCode,
          deliveryCity: (customer as any).deliveryCity,
          deliveryCountry: (customer as any).deliveryCountry,
          resetPasswordToken: (customer as any).resetPasswordToken,
          resetPasswordExp: (customer as any).resetPasswordExp,
        });

        await starCustomerDetailsRepository.save(starCustomerDetails);

        if ((customer as any).accountVerificationStatus === "verified") {
          customer.stage = "star_customer";
        } else {
          customer.stage = "business";
        }

        customer.starCustomerDetails = starCustomerDetails;
        await customerRepository.save(customer);

        migratedCount++;
        console.log(
          `✅ Successfully migrated customer: ${customer.companyName}`
        );

        if (shouldNotifyPassword) {
          console.log(
            `⚠️  Customer ${customer.companyName} needs password reset notification`
          );
        }
      } catch (customerError) {
        errorCount++;
        console.error(
          `❌ Failed to migrate customer ${customer.companyName}:`,
          customerError
        );
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} customers`);
    console.log(`❌ Failed: ${errorCount} customers`);
    console.log(`📊 Total processed: ${existingCustomers.length} customers`);

    if (errorCount > 0) {
      console.log(`\n⚠️  Some customers failed to migrate. Check logs above.`);
    } else {
      console.log(`\n🎉 Migration completed successfully!`);
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error("🚨 Migration failed:", error);
    await AppDataSource.destroy();
    process.exit(1);
  }
};

if (require.main === module) {
  migrateExistingCustomers();
}
