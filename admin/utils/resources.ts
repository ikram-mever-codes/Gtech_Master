
export interface ResourceConfig {
    name: string;
    description: string;
    actions: string[];
    adminOnly?: boolean;
    salesOnly?: boolean;
    purchasingRestricted?: boolean;
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
        adminOnly: true,
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
        purchasingRestricted: true,
    },
    {
        name: "Bussinesses",
        description: "Manage business accounts and companies",
        actions: ["create", "read", "update", "delete"],
        adminOnly: true,
    },
    {
        name: "Contacts",
        description: "Manage contact persons and relationships",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true,
    },
    {
        name: "Customers",
        description: "Manage customer accounts and profiles - SALES ONLY",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true,
    },
    {
        name: "Inquiries",
        description: "Manage customer inquiries and requests",
        actions: ["create", "read", "update", "delete", "convert"],
        adminOnly: false,
        salesOnly: true,
    },
    {
        name: "Requests",
        description: "Technical requests data - PURCHASING can access (no customer info)",
        actions: ["read", "update"],
        adminOnly: false,
        purchasingRestricted: true,
    },
    {
        name: "Offers",
        description: "Manage price offers and quotations - SALES ONLY",
        actions: ["create", "read", "update", "delete", "generate_pdf"],
        adminOnly: false,
        salesOnly: true,
    },
    {
        name: "Invoices",
        description: "Manage invoices and billing - SALES ONLY",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        salesOnly: true,
    },
    {
        name: "Library",
        description: "Manage file library and documents",
        actions: ["upload", "read", "update", "delete"],
        adminOnly: false,
    },
    {
        name: "Orders",
        description: "Manage customer orders and processing",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
    },
    {
        name: "Suppliers",
        description: "Manage supplier data - PURCHASING ONLY (hidden from SALES)",
        actions: ["create", "read", "update", "delete"],
        adminOnly: false,
        purchasingRestricted: false,
    },
];

