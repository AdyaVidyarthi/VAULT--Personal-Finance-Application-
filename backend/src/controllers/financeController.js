import { pool } from "../config/db.js";

const validAmount = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= 9999999999.99;

const transactionInput = (item) => {
  if (
    !item ||
    typeof item !== "object" ||
    typeof item.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
    Number.isNaN(Date.parse(`${item.date}T00:00:00Z`)) ||
    new Date(`${item.date}T00:00:00Z`).toISOString().slice(0, 10) !==
      item.date ||
    typeof item.description !== "string" ||
    !item.description.trim() ||
    item.description.trim().length > 200 ||
    typeof item.category !== "string" ||
    !item.category.trim() ||
    item.category.trim().length > 80 ||
    !["income", "expense"].includes(item.type) ||
    !validAmount(item.amount)
  ) {
    return null;
  }
  return {
    date: item.date,
    description: item.description.trim(),
    category: item.category.trim(),
    type: item.type,
    amount: item.amount,
  };
};

const investmentInput = (item) => {
  if (
    !item ||
    typeof item !== "object" ||
    typeof item.name !== "string" ||
    !item.name.trim() ||
    item.name.trim().length > 120 ||
    typeof item.assetClass !== "string" ||
    !item.assetClass.trim() ||
    item.assetClass.trim().length > 80 ||
    !validAmount(item.invested) ||
    typeof item.current !== "number" ||
    !Number.isFinite(item.current) ||
    item.current < 0 ||
    item.current > 9999999999.99
  ) {
    return null;
  }
  return {
    name: item.name.trim(),
    assetClass: item.assetClass.trim(),
    invested: item.invested,
    current: item.current,
  };
};

const replaceRows = async (userId, rows, table, columns, values) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`DELETE FROM ${table} WHERE user_id = ?`, [
      userId,
    ]);
    if (rows.length) {
      const placeholders = rows
        .map(() => `(${["?", ...columns.map(() => "?")].join(", ")})`)
        .join(", ");
      await connection.execute(
        `INSERT INTO ${table} (user_id, ${columns.join(", ")}) VALUES ${placeholders}`,
        rows.flatMap((row) => [userId, ...values(row)]),
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, transaction_date, description, category, type, amount FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, id DESC",
      [req.session.userId],
    );
    res.json(
      rows.map((row) => ({
        id: Number(row.id),
        date:
          row.transaction_date instanceof Date
            ? row.transaction_date.toISOString().slice(0, 10)
            : String(row.transaction_date).slice(0, 10),
        description: row.description,
        category: row.category,
        type: row.type,
        amount: Number(row.amount),
      })),
    );
  } catch (error) {
    next(error);
  }
};

export const saveTransactions = async (req, res, next) => {
  const input = req.body;
  if (!Array.isArray(input) || input.length > 1000) {
    return res
      .status(400)
      .json({ error: "Transactions must be a list of up to 1,000 entries." });
  }
  const rows = input.map(transactionInput);
  if (rows.some((row) => !row)) {
    return res
      .status(400)
      .json({ error: "One or more transactions contain invalid fields." });
  }
  try {
    await replaceRows(
      req.session.userId,
      rows,
      "transactions",
      ["transaction_date", "description", "category", "type", "amount"],
      (row) => [row.date, row.description, row.category, row.type, row.amount],
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getBudgets = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT category, monthly_limit FROM budgets WHERE user_id = ? ORDER BY category",
      [req.session.userId],
    );
    res.json(
      Object.fromEntries(
        rows.map((row) => [row.category, Number(row.monthly_limit)]),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const saveBudgets = async (req, res, next) => {
  const input = req.body;
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).length > 80
  ) {
    return res
      .status(400)
      .json({ error: "Budgets must be a category-to-amount object." });
  }
  const rows = Object.entries(input);
  if (
    rows.some(
      ([category, amount]) =>
        !category.trim() || category.length > 80 || !validAmount(amount),
    )
  ) {
    return res
      .status(400)
      .json({ error: "Budget categories and amounts are invalid." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM budgets WHERE user_id = ?", [
      req.session.userId,
    ]);
    if (rows.length) {
      await connection.execute(
        `INSERT INTO budgets (user_id, category, monthly_limit) VALUES ${rows.map(() => "(?, ?, ?)").join(", ")}`,
        rows.flatMap(([category, amount]) => [
          req.session.userId,
          category.trim(),
          amount,
        ]),
      );
    }
    await connection.commit();
    res.status(204).end();
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const getInvestments = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, asset_class, invested, current_value FROM investments WHERE user_id = ? ORDER BY id DESC",
      [req.session.userId],
    );
    res.json(
      rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        assetClass: row.asset_class,
        invested: Number(row.invested),
        current: Number(row.current_value),
      })),
    );
  } catch (error) {
    next(error);
  }
};

export const saveInvestments = async (req, res, next) => {
  const input = req.body;
  if (!Array.isArray(input) || input.length > 1000) {
    return res
      .status(400)
      .json({ error: "Investments must be a list of up to 1,000 holdings." });
  }
  const rows = input.map(investmentInput);
  if (rows.some((row) => !row)) {
    return res
      .status(400)
      .json({ error: "One or more holdings contain invalid fields." });
  }
  try {
    await replaceRows(
      req.session.userId,
      rows,
      "investments",
      ["name", "asset_class", "invested", "current_value"],
      (row) => [row.name, row.assetClass, row.invested, row.current],
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
