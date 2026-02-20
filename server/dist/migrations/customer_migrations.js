"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateExistingCustomers = void 0;
// scripts/migrateExistingCustomers.ts
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const star_customer_details_1 = require("../models/star_customer_details");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const migrateExistingCustomers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.AppDataSource.initialize();
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const starCustomerDetailsRepository = database_1.AppDataSource.getRepository(star_customer_details_1.StarCustomerDetails);
        // Get all existing customers WITHOUT invalid relations
        const existingCustomers = yield customerRepository.find();
        console.log(`Found ${existingCustomers.length} customers to migrate`);
        let migratedCount = 0;
        let errorCount = 0;
        for (const customer of existingCustomers) {
            try {
                console.log(`Migrating customer: ${customer.companyName} (${customer.id})`);
                // Check if customer already has starCustomerDetails
                const existingStarDetails = yield starCustomerDetailsRepository.findOne({
                    where: { customer: { id: customer.id } },
                });
                if (existingStarDetails) {
                    console.log(`Customer ${customer.companyName} already migrated, skipping...`);
                    continue;
                }
                // Handle missing password - generate a temporary one
                let password = customer.password;
                let shouldNotifyPassword = false;
                if (!password) {
                    console.warn(`Customer ${customer.companyName} has no password, generating temporary one`);
                    const tempPassword = crypto_1.default.randomBytes(8).toString("hex");
                    password = yield bcryptjs_1.default.hash(tempPassword, 10);
                    shouldNotifyPassword = true;
                    // In a real scenario, you'd want to email this temp password to the customer
                }
                // Create starCustomerDetails from existing customer data
                const starCustomerDetails = starCustomerDetailsRepository.create({
                    customer: customer,
                    taxNumber: customer.taxNumber || "",
                    password: password,
                    isEmailVerified: customer.isEmailVerified || false,
                    emailVerificationCode: customer.emailVerificationCode,
                    emailVerificationExp: customer.emailVerificationExp,
                    isPhoneVerified: customer.isPhoneVerified || false,
                    phoneVerificationCode: customer.phoneVerificationCode,
                    phoneVerificationExp: customer.phoneVerificationExp,
                    accountVerificationStatus: customer.accountVerificationStatus || "pending",
                    verificationRemark: customer.verificationRemark,
                    deliveryAddressLine1: customer.deliveryAddressLine1,
                    deliveryAddressLine2: customer.deliveryAddressLine2,
                    deliveryPostalCode: customer.deliveryPostalCode,
                    deliveryCity: customer.deliveryCity,
                    deliveryCountry: customer.deliveryCountry,
                    resetPasswordToken: customer.resetPasswordToken,
                    resetPasswordExp: customer.resetPasswordExp,
                });
                // Save star customer details
                yield starCustomerDetailsRepository.save(starCustomerDetails);
                // Update customer stage based on existing data
                if (customer.accountVerificationStatus === "verified") {
                    customer.stage = "star_customer";
                }
                else {
                    customer.stage = "business";
                }
                // Link the starCustomerDetails to customer
                customer.starCustomerDetails = starCustomerDetails;
                yield customerRepository.save(customer);
                migratedCount++;
                console.log(`✅ Successfully migrated customer: ${customer.companyName}`);
                if (shouldNotifyPassword) {
                    console.log(`⚠️  Customer ${customer.companyName} needs password reset notification`);
                }
            }
            catch (customerError) {
                errorCount++;
                console.error(`❌ Failed to migrate customer ${customer.companyName}:`, customerError);
            }
        }
        console.log(`\nMigration Summary:`);
        console.log(`✅ Successfully migrated: ${migratedCount} customers`);
        console.log(`❌ Failed: ${errorCount} customers`);
        console.log(`📊 Total processed: ${existingCustomers.length} customers`);
        if (errorCount > 0) {
            console.log(`\n⚠️  Some customers failed to migrate. Check logs above.`);
        }
        else {
            console.log(`\n🎉 Migration completed successfully!`);
        }
        yield database_1.AppDataSource.destroy();
    }
    catch (error) {
        console.error("🚨 Migration failed:", error);
        yield database_1.AppDataSource.destroy();
        process.exit(1);
    }
});
exports.migrateExistingCustomers = migrateExistingCustomers;
// Run migration if called directly
if (require.main === module) {
    (0, exports.migrateExistingCustomers)();
}
