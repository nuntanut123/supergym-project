
const express = require("express");
const router = express.Router();
const db = require("../db");

// Validate numeric IDs
const validId = (id) =>
    /^[1-9]\d*$/.test(String(id));

// Check class information
function validClass(data) {
    return (
        typeof data.class_name === "string" &&
        data.class_name.trim().length > 0 &&
        data.class_name.length <= 100 &&
        Number.isInteger(data.duration) &&
        data.duration > 0 &&
        Number.isInteger(data.specialization_id) &&
        data.specialization_id > 0
    );
}

// Handle database errors
function handleError(error, res) {
    console.error(error);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
            message: "Class has related records"
        });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            message: "Invalid specialization ID"
        });
    }

    if (error.sqlState === "45000" ||
        error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
        return res.status(409).json({
            message: error.sqlMessage || "Business rule violation"
        });
    }

    res.status(500).json({
        message: "Database operation failed"
    });
}

// 1. GET ALL CLASSES
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT fc.*, s.specialization_name
            FROM fitness_class fc
            JOIN specialization s
              ON fc.specialization_id = s.specialization_id
            ORDER BY fc.class_id
        `);

        res.json(rows);
    } catch (error) {
        handleError(error, res);
    }
});

// 2. GET CLASS BY ID
router.get("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: "Invalid class ID" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM fitness_class WHERE class_id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Class not found"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        handleError(error, res);
    }
});

// 3. CREATE CLASS
router.post("/", async (req, res) => {
    if (!validClass(req.body)) {
        return res.status(400).json({
            message: "Invalid class information"
        });
    }

    const {
        class_name, description, difficulty_level,
        duration, specialization_id
    } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO fitness_class
             (class_name, description, difficulty_level,
              duration, specialization_id)
             VALUES (?, ?, ?, ?, ?)`,
            [
                class_name,
                description || null,
                difficulty_level || null,
                duration,
                specialization_id
            ]
        );

        res.status(201).json({
            message: "Class created successfully",
            class_id: result.insertId
        });
    } catch (error) {
        handleError(error, res);
    }
});

// 4. UPDATE CLASS
router.put("/:id", async (req, res) => {
    if (!validId(req.params.id) || !validClass(req.body)) {
        return res.status(400).json({
            message: "Invalid class information or ID"
        });
    }

    const {
        class_name, description, difficulty_level,
        duration, specialization_id
    } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE fitness_class
             SET class_name = ?, description = ?,
                 difficulty_level = ?, duration = ?,
                 specialization_id = ?
             WHERE class_id = ?`,
            [
                class_name,
                description || null,
                difficulty_level || null,
                duration,
                specialization_id,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Class not found"
            });
        }

        res.json({ message: "Class updated successfully" });
    } catch (error) {
        handleError(error, res);
    }
});

// 5. DELETE CLASS
router.delete("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: "Invalid class ID" });
    }

    try {
        const [result] = await db.execute(
            "DELETE FROM fitness_class WHERE class_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Class not found"
            });
        }

        res.json({ message: "Class deleted successfully" });
    } catch (error) {
        handleError(error, res);
    }
});

module.exports = router;
