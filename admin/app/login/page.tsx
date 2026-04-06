{
    "info": {
        "name": "Master API Collection",
        "description": "Complete API collection for Master project",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {
            "key": "BASE_URL",
            "value": "http://localhost:1000",
            "type": "string"
        }
    ],
    "item": [
        {
            "name": "1. Authentication",
            "item": [
                {
                    "name": "Login (Admin)",
                    "request": {
                        "method": "POST",
                        "header": [
                            {
                                "key": "Content-Type",
                                "value": "application/json"
                            }
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n  \"email\": \"admin@gmail.com\",\n  \"password\": \"StrongAdmin@123\"\n}"
                        },
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/auth/login",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "auth",
                                "login"
                            ]
                        }
                    }
                },
                {
                    "name": "Get Current User",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/auth/users/me",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "auth",
                                "users",
                                "me"
                            ]
                        }
                    }
                },
                {
                    "name": "Logout",
                    "request": {
                        "method": "POST",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/auth/logout",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "auth",
                                "logout"
                            ]
                        }
                    }
                },
                {
                    "name": "Refresh Token",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/auth/refresh",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "auth",
                                "refresh"
                            ]
                        }
                    }
                },
                {
                    "name": "Get All Users (Admin)",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/auth/users",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "auth",
                                "users"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "2. Customers",
            "item": [
                {
                    "name": "Get All Customers",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/customers/all",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "customers",
                                "all"
                            ]
                        }
                    }
                },
                {
                    "name": "Get Single Customer",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/customers/single/:customerId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "customers",
                                "single",
                                ":customerId"
                            ],
                            "variable": [
                                {
                                    "key": "customerId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Customer Login",
                    "request": {
                        "method": "POST",
                        "header": [
                            {
                                "key": "Content-Type",
                                "value": "application/json"
                            }
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n  \"email\": \"customer@example.com\",\n  \"password\": \"Password123!\"\n}"
                        },
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/customers/login",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "customers",
                                "login"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "3. Lists",
            "item": [
                {
                    "name": "Get All Lists (Admin)",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/lists/admin/all-lists",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "lists",
                                "admin",
                                "all-lists"
                            ]
                        }
                    }
                },
                {
                    "name": "Get List by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/lists/:listId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "lists",
                                ":listId"
                            ],
                            "variable": [
                                {
                                    "key": "listId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Create List",
                    "request": {
                        "method": "POST",
                        "header": [
                            {
                                "key": "Content-Type",
                                "value": "application/json"
                            }
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n  \"customerId\": 1,\n  \"listNumber\": \"L-2024-001\",\n  \"status\": \"active\"\n}"
                        },
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/lists/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "lists",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Customer Lists",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/lists/customer/all/:customerId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "lists",
                                "customer",
                                "all",
                                ":customerId"
                            ],
                            "variable": [
                                {
                                    "key": "customerId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Search Lists by Number",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/lists/search/:listNumber",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "lists",
                                "search",
                                ":listNumber"
                            ],
                            "variable": [
                                {
                                    "key": "listNumber",
                                    "value": "L-2024-001"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Health Check",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/lists/health",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "lists",
                                "health"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "4. Items",
            "item": [
                {
                    "name": "Get All Items",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/items/?page=1&limit=20",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "items",
                                ""
                            ],
                            "query": [
                                {
                                    "key": "page",
                                    "value": "1"
                                },
                                {
                                    "key": "limit",
                                    "value": "20"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Get Item by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/items/:id",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "items",
                                ":id"
                            ],
                            "variable": [
                                {
                                    "key": "id",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Search Items",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/items/search/quick-search?q=search_term",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "items",
                                "search",
                                "quick-search"
                            ],
                            "query": [
                                {
                                    "key": "q",
                                    "value": "search_term"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Get Item Statistics",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/items/stats/statistics",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "items",
                                "stats",
                                "statistics"
                            ]
                        }
                    }
                },
                {
                    "name": "Get Parents (Simple)",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/items/parents/simple",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "items",
                                "parents",
                                "simple"
                            ]
                        }
                    }
                },
                {
                    "name": "Get Warehouse Items",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/items/warehouse/items",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "items",
                                "warehouse",
                                "items"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "5. Contacts",
            "item": [
                {
                    "name": "Get All Contacts",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/contacts/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "contacts",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Contact Statistics",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/contacts/statistics",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "contacts",
                                "statistics"
                            ]
                        }
                    }
                },
                {
                    "name": "Get All Star Businesses",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/contacts/star-businesses/all",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "contacts",
                                "star-businesses",
                                "all"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "6. Businesses",
            "item": [
                {
                    "name": "Get All Businesses",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/businesses/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "businesses",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Business Statistics",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/businesses/statistics",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "businesses",
                                "statistics"
                            ]
                        }
                    }
                },
                {
                    "name": "Get Business by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/businesses/:id",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "businesses",
                                ":id"
                            ],
                            "variable": [
                                {
                                    "key": "id",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "7. Invoices",
            "item": [
                {
                    "name": "Get All Invoices",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/invoices/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "invoices",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Invoice by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/invoices/:id",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "invoices",
                                ":id"
                            ],
                            "variable": [
                                {
                                    "key": "id",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Get Invoices by Customer",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/invoices/customer/:customerId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "invoices",
                                "customer",
                                ":customerId"
                            ],
                            "variable": [
                                {
                                    "key": "customerId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "8. Inquiries",
            "item": [
                {
                    "name": "Get All Inquiries",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/inquiries/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "inquiries",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Inquiry by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/inquiries/:id",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "inquiries",
                                ":id"
                            ],
                            "variable": [
                                {
                                    "key": "id",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Get Inquiries by Customer",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/inquiries/customer/:customerId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "inquiries",
                                "customer",
                                ":customerId"
                            ],
                            "variable": [
                                {
                                    "key": "customerId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "9. Offers",
            "item": [
                {
                    "name": "Get All Offers",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/offers/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "offers",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Offer by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/offers/:id",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "offers",
                                ":id"
                            ],
                            "variable": [
                                {
                                    "key": "id",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Get Offers by Inquiry",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/offers/inquiry/:inquiryId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "offers",
                                "inquiry",
                                ":inquiryId"
                            ],
                            "variable": [
                                {
                                    "key": "inquiryId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                },
                {
                    "name": "Get Offer Statuses",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/offers/statuses",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "offers",
                                "statuses"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "10. Orders",
            "item": [
                {
                    "name": "Get All Orders",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/orders/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "orders",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Order by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/orders/:orderId",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "orders",
                                ":orderId"
                            ],
                            "variable": [
                                {
                                    "key": "orderId",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "11. Requested Items",
            "item": [
                {
                    "name": "Get All Requested Items",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/requested-items/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "requested-items",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get Requested Item by ID",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/requested-items/:id",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "requested-items",
                                ":id"
                            ],
                            "variable": [
                                {
                                    "key": "id",
                                    "value": "1"
                                }
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "12. Library",
            "item": [
                {
                    "name": "Get All Files",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/library/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "library",
                                ""
                            ]
                        }
                    }
                },
                {
                    "name": "Get File Statistics",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/library/stats",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "library",
                                "stats"
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "13. Categories",
            "item": [
                {
                    "name": "Get All Categories",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/v1/categories/",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "v1",
                                "categories",
                                ""
                            ]
                        }
                    }
                }
            ]
        },
        {
            "name": "14. Cron Jobs",
            "item": [
                {
                    "name": "Get Cron Status",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/cron/status",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "cron",
                                "status"
                            ]
                        }
                    }
                },
                {
                    "name": "Start Cron Jobs",
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{BASE_URL}}/api/cron/start",
                            "host": [
                                "{{BASE_URL}}"
                            ],
                            "path": [
                                "api",
                                "cron",
                                "start"
                            ]
                        }
                    }
                }
            ]
        }
    ]
}