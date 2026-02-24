
export interface ResourceConfig {
    name: string;
    description: string;
    actions: string[];
    adminOnly?: boolean; // Only ADMIN role can access this resource
    salesOnly?: boolean; // Only SALES can access (not PURCHASING)
    purchasingRestricted?: boolean; // PURCHASING has limited access
}

export const availableResources: ResourceConfig[] = [
    {
        name: "Dashboard",
        description: "Access to main dashboard and overview data",
        actions: ["view", "export"],
        adminOnly: false,
    },
    {
        name: "Users",
        description: "Manage user accounts and permissions",
        actions: ["create", "read", "update", "delete"],
        adminOnly: true, // Only ADMIN can manage users
    },
    {
        name: "Items",
        description: "Manage product catalog, items, and inventory",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
    },
    {
        name: "Scheduled Items",
        description: "Manage scheduled items and lists - PURCHASING sees technical data only",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        purchasingRestricted: true, // PURCHASING: technical data only, no customer info
    },
    {
        name: "Bussinesses",
        description: "Manage business accounts and companies",
        actions: ["create", "read", "update", "delete"],
        adminOnly: true, // Only ADMIN can see and manage businesses
    },
    {
        name: "Contacts",
        description: "Manage contact persons and relationships",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true, // Only SALES and ADMIN can access
    },
    {
        name: "Customers",
        description: "Manage customer accounts and profiles - SALES ONLY",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true, // SALES can access, PURCHASING cannot
    },
    {
        name: "Inquiries",
        description: "Manage customer inquiries and requests",
        actions: ["create", "read", "update", "delete", "convert"],
        adminOnly: false,
        salesOnly: true, // SALES can see full inquiries, PURCHASING sees requests only
    },
    {
        name: "Requests",
        description: "Technical requests data - PURCHASING can access (no customer info)",
        actions: ["read", "update"],
        adminOnly: false,
        purchasingRestricted: true, // PURCHASING: technical data only
    },
    {
        name: "Offers",
        description: "Manage price offers and quotations - SALES ONLY",
        actions: ["create", "read", "update", "delete", "generate_pdf"],
        adminOnly: false,
        salesOnly: true, // Only SALES and ADMIN can access offers
    },
    {
        name: "Invoices",
        description: "Manage invoices and billing - SALES ONLY",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true, // Only SALES and ADMIN can access invoices
    },
    {
        name: "Library",
        description: "Manage file library and documents",
        actions: ["upload", "read", "update", "delete"],
        adminOnly: false,
    },
    {
        name: "Orders",
        description: "Manage customer orders and processing - SALES ONLY",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true, // Only SALES and ADMIN can access orders
    },
    {
        name: "Suppliers",
        description: "Manage supplier data - PURCHASING ONLY (hidden from SALES)",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        purchasingRestricted: false,
    },
];

