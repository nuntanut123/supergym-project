const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrationFailure(error) {
  switch (error.code) {
    case "ER_NO_SUCH_TABLE": return {status: 503, message: "Registration database table is missing. Check user_account and member.", code: error.code};
    case "ER_BAD_FIELD_ERROR": return {status: 503, message: "Registration database columns do not match the application.", code: error.code};
    case "ER_NO_REFERENCED_ROW_2": return {status: 409, message: "Registration failed: linked member was not found.", code: error.code};
    case "ER_DUP_ENTRY": return {status: 409, message: "Email already exists", code: error.code};
    case "ER_ACCESS_DENIED_ERROR": return {status: 503, message: "Database permissions need attention.", code: error.code};
    case "ER_CHECK_CONSTRAINT_VIOLATED": return {status: 409, message: "Account information violates a database rule.", code: error.code};
    case "ER_SIGNAL_EXCEPTION": return {status: 409, message: "A database business rule rejected registration.", code: error.code};
    default: return {status: 500, message: "Registration failed. Check the server terminal for its error code.", code: error.code || "REGISTER_SERVER_ERROR"};
  }
}

router.post("/register", async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body || {};
  if (![firstName, lastName, email, password].every(v => typeof v === "string" && v.trim()) ||
      !emailPattern.test(email.trim()) || password.length < 8 || password.length > 72 ||
      firstName.length > 50 || lastName.length > 50 || email.length > 100 ||
      (phone != null && (typeof phone !== "string" || phone.length > 20))) {
    return res.status(400).json({message: "Enter valid details and a password of 8–72 characters"});
  }
  const normalizedEmail = email.trim().toLowerCase();
  let conn;
  try {
    conn = await db.getConnection();
    const [existingTrainer] = await conn.execute("SELECT trainer_id FROM trainer WHERE LOWER(email) = ? LIMIT 1", [normalizedEmail]);
    if (existingTrainer.length || normalizedEmail === process.env.MANAGER_EMAIL?.toLowerCase()) {
      return res.status(409).json({message: "Email already exists"});
    }
    const [tables] = await conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('member', 'trainer', 'user_account')"
    );
    if (tables.length !== 3) {
      const error = new Error("Required registration table is missing");
      error.code = "ER_NO_SUCH_TABLE";
      throw error;
    }
    const hash = await bcrypt.hash(password, 12);
    await conn.beginTransaction();
    const [result] = await conn.execute(
      "INSERT INTO member (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)",
      [firstName.trim(), lastName.trim(), normalizedEmail, phone?.trim() || null]
    );
    await conn.execute(
      "INSERT INTO user_account (email, password_hash, role, member_id) VALUES (?, ?, 'member', ?)",
      [normalizedEmail, hash, result.insertId]
    );
    await conn.commit();
    return res.status(201).json({message: "Registration successful. Please log in."});
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("Register error:", {
      code: err.code || "UNKNOWN",
      errno: err.errno,
      message: err.message
    });
    const failure = registrationFailure(err);
    return res.status(failure.status).json({message: failure.message, code: failure.code});
  } finally { if (conn) conn.release(); }
});

router.post("/login", async (req, res) => {
  const {email, password} = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({message: "Email and password are required"});
  }
  const normalizedEmail = email.trim().toLowerCase();
  const invalid = () => res.status(401).json({message: "Invalid email or password"});
  try {
    const [accounts] = await db.execute(
      "SELECT role, member_id, trainer_id, password_hash FROM user_account WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );
    if (accounts.length) {
      const a = accounts[0];
      if (!(await bcrypt.compare(password, a.password_hash))) return invalid();
      if (a.role === "manager") return res.json({user:{id:"demo-manager",name:"Manager",email:normalizedEmail,role:"manager",branch:"All branches"}});
      if (a.role === "member") {
        const [rows] = await db.execute("SELECT member_id, first_name, last_name, email FROM member WHERE member_id = ?", [a.member_id]);
        if (!rows.length) return invalid();
        const m = rows[0];
        return res.json({user:{id:String(m.member_id),name:`${m.first_name} ${m.last_name}`,email:m.email,role:"member"}});
      }
      if (a.role === "trainer") {
        const [rows] = await db.execute("SELECT trainer_id, first_name, last_name, email FROM trainer WHERE trainer_id = ?", [a.trainer_id]);
        if (!rows.length) return invalid();
        const t = rows[0];
        return res.json({user:{id:String(t.trainer_id),name:`${t.first_name} ${t.last_name}`,email:t.email,role:"trainer"}});
      }
      return invalid();
    }
    // Legacy demo accounts have no personal password; used only for local demonstration.
    if (!process.env.DEMO_PASSWORD || password !== process.env.DEMO_PASSWORD) return invalid();
    const [members] = await db.execute("SELECT member_id, first_name, last_name, email FROM member WHERE LOWER(email) = ? LIMIT 1", [normalizedEmail]);
    if (members.length) {
      const m = members[0];
      return res.json({user:{id:String(m.member_id),name:`${m.first_name} ${m.last_name}`,email:m.email,role:"member"}});
    }
    const [trainers] = await db.execute("SELECT trainer_id, first_name, last_name, email FROM trainer WHERE LOWER(email) = ? LIMIT 1", [normalizedEmail]);
    if (trainers.length) {
      const t = trainers[0];
      return res.json({user:{id:String(t.trainer_id),name:`${t.first_name} ${t.last_name}`,email:t.email,role:"trainer"}});
    }
    if (normalizedEmail === process.env.MANAGER_EMAIL?.trim().toLowerCase()) {
      return res.json({user:{id:"demo-manager",name:"Manager",email:normalizedEmail,role:"manager",branch:"All branches"}});
    }
    return invalid();
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({message:"Login failed"});
  }
});
module.exports = router;
