import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { SESSION_MAX_AGE_MS } from "../config/session.js";
import { isValidEmail, publicUser } from "../utlis/validators.js";

const getExpiresAt = () =>
  new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (normalizedName.length < 1 || normalizedName.length > 100) {
      return res
        .status(400)
        .json({ error: "Name must be between 1 and 100 characters." });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and no more than 72 bytes.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [normalizedName, normalizedEmail, passwordHash],
    );
    const user = {
      id: result.insertId,
      name: normalizedName,
      email: normalizedEmail,
      created_at: new Date(),
    };

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);
      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.status(201).json({
          user: publicUser(user),
          session: {
            expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
          },
        });
      });
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!isValidEmail(normalizedEmail) || typeof password !== "string") {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);
      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.status(200).json({
          user: publicUser(user),
          session: {
            expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
          },
        });
      });
    });
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1",
      [req.session.userId],
    );
    const user = rows[0];

    if (!user) {
      req.session.destroy((sessionError) => {
        if (sessionError) return next(sessionError);
        res.clearCookie("finance.sid");
        res.status(401).json({ error: "Authentication required." });
      });
      return;
    }

    res.status(200).json({
      user: publicUser(user),
      session: { expiresAt: getExpiresAt() },
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("finance.sid");
    res.status(204).end();
  });
};
