
const express = require("express");
const router = express.Router();
const db = require("../db");

const validId = (id) =>
    /^[1-9]\d*$/.test(String(id));

// Validate session information
function validSession(data) {
    const datePattern =
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

    return (
        Number.isInteger(data.class_id) &&
        data.class_id > 0 &&
        Number.isInteger(data.trainer_id) &&
        data.trainer_id > 0 &&
        Number.isInteger(data.branch_id) &&
        data.branch_id > 0 &&
        Number.isInteger(data.capacity) &&
        data.capacity > 0 &&
        typeof data.session_date === "string" &&
        datePattern.test(data.session_date)
    );
}

// Handle database errors and business rules
function handleError(error, res) {
    console.error(error);

    if (error.sqlState === "45000") {
        return res.status(409).json({
            message: error.sqlMessage
        });
    }

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
            message: "Session has related records"
        });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2" ||
        error.code === "ER_TRUNCATED_WRONG_VALUE" ||
        error.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" ||
        error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
        return res.status(400).json({
            message: "Invalid session information"
        });
    }

    res.status(500).json({
        message: "Database operation failed"
    });
}

// 1. GET ALL SESSIONS
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT cs.*,
                   fc.class_name,
                   CONCAT(t.first_name, ' ', t.last_name)
                     AS trainer_name,
                   b.branch_name,
                   (SELECT COUNT(*)
                    FROM class_booking cb
                    WHERE cb.session_id = cs.session_id
                      AND cb.status = 'Confirmed')
                     AS booked_count
            FROM class_session cs
            JOIN fitness_class fc ON cs.class_id = fc.class_id
            JOIN trainer t ON cs.trainer_id = t.trainer_id
            JOIN branch b ON cs.branch_id = b.branch_id
            ORDER BY cs.session_date
        `);

        res.json(rows);
    } catch (error) {
        handleError(error, res);
    }
});

// 2. GET SESSION BY ID
router.get("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: "Invalid session ID" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM class_session WHERE session_id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Session not found"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        handleError(error, res);
    }
});

// 3. CREATE SESSION
router.post("/", async (req, res) => {
    if (!validSession(req.body)) {
        return res.status(400).json({
            message: "Invalid session information"
        });
    }

    const {
        class_id, trainer_id, branch_id,
        session_date, capacity
    } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO class_session
             (class_id, trainer_id, branch_id,
              session_date, capacity)
             VALUES (?, ?, ?, ?, ?)`,
            [
                class_id, trainer_id, branch_id,
                session_date, capacity
            ]
        );

        res.status(201).json({
            message: "Session created successfully",
            session_id: result.insertId
        });
    } catch (error) {
        handleError(error, res);
    }
});

// 4. UPDATE SESSION
router.put("/:id", async (req, res) => {
    if (!validId(req.params.id) || !validSession(req.body)) {
        return res.status(400).json({
            message: "Invalid session information or ID"
        });
    }

    const {
        class_id, trainer_id, branch_id,
        session_date, capacity
    } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE class_session
             SET class_id = ?, trainer_id = ?,
                 branch_id = ?, session_date = ?,
                 capacity = ?
             WHERE session_id = ?`,
            [
                class_id, trainer_id, branch_id,
                session_date, capacity, req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Session not found"
            });
        }

        res.json({
            message: "Session updated successfully"
        });
    } catch (error) {
        handleError(error, res);
    }
});

// 5. DELETE SESSION
router.delete("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: "Invalid session ID" });
    }

    try {
        const [result] = await db.execute(
            "DELETE FROM class_session WHERE session_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Session not found"
            });
        }

        res.json({
            message: "Session deleted successfully"
        });
    } catch (error) {
        handleError(error, res);
    }
});

module.exports = router;
