import mysql from "mysql2/promise";

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

const dbConfig: DatabaseConfig = {
  host:
    process.env.MIS_DB_HOST ||
    "g-tech.c5i6oqis88l0.eu-central-1.rds.amazonaws.com",
  user: process.env.MIS_DB_USER || "admin",
  password: process.env.MIS_DB_PASSWORD || "1aYgTHBvji8qaoUNbbcI",
  database: process.env.MIS_DB_NAME || "misgtech",
  port: parseInt(process.env.MIS_DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

export const getConnection = () => pool.getConnection();
