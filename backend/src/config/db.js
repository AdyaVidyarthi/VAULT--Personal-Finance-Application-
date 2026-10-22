import mysql from "mysql2/promise";

const requiredVariables = ["DB_HOST", "DB_USER", "DB_NAME"];
for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`${variable} must be configured in the backend environment.`);
  }
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME,
  supportBigNumbers: true,
  bigNumberStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
