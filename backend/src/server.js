import "dotenv/config";
import app from "./app.js";
import { pool } from "./config/db.js";
import { sessionStore } from "./config/session.js";

const port = Number(process.env.PORT ?? 3000);

try {
  await Promise.all([pool.query("SELECT 1"), sessionStore.onReady()]);

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
} catch (error) {
  console.error("Unable to start the API server:", error);
  process.exitCode = 1;
  await pool.end();
}
