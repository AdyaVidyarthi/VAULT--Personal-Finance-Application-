import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";

export const SESSION_MAX_AGE_MS = Number(
  process.env.SESSION_MAX_AGE_MS ?? 30 * 60 * 1000,
);
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set to a random value of at least 32 characters.",
  );
}

const MySQLStore = MySQLStoreFactory(session);
export const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME,
  supportBigNumbers: true,
  bigNumberStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: SESSION_MAX_AGE_MS,
  createDatabaseTable: true,
  schema: {
    tableName: "sessions",
  },
});

export const sessionMiddleware = session({
  name: "finance.sid",
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
  },
});
