
const express = require("express");
const router = express.Router();
const db = require("../db");

// =====================================
// 1. GET ALL MEMBERS
// =====================================

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT m.*, latest.end_date, mp.plan_name,
              CASE WHEN latest.end_date IS NULL THEN 'None'
                   WHEN latest.end_date >= CURDATE() THEN 'Active'
                   ELSE 'Expired' END AS membership_status
               FROM member m
               LEFT JOIN membership latest ON latest.membership_id = (
                 SELECT ms.membership_id FROM membership ms
                 WHERE ms.member_id = m.member_id
                 ORDER BY ms.end_date DESC, ms.membership_id DESC LIMIT 1
               )
               LEFT JOIN membership_plan mp ON mp.plan_id = latest.plan_id
               ORDER BY m.member_id`
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to retrieve members"
        });
    }
});

// =====================================
// 2. GET MEMBER BY ID
// =====================================

router.get("/:id", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM member WHERE member_id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to retrieve member"
        });
    }
});

// =====================================
// 3. CREATE MEMBER
// =====================================

router.post("/", async (req, res) => {
    try {
        const { first_name, last_name, email, phone } =
            req.body;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO member
             (first_name, last_name, email, phone)
             VALUES (?, ?, ?, ?)`,
            [first_name, last_name, email, phone || null]
        );

        res.status(201).json({
            message: "Member created successfully",
            member_id: result.insertId
        });

    } catch (error) {
        console.error(error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        res.status(500).json({
            message: "Failed to create member"
        });
    }
});

// =====================================
// 4. UPDATE MEMBER
// =====================================

router.put("/:id", async (req, res) => {
    try {
        const { first_name, last_name, email, phone } =
            req.body;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        const [result] = await db.execute(
            `UPDATE member
             SET first_name = ?,
                 last_name = ?,
                 email = ?,
                 phone = ?
             WHERE member_id = ?`,
            [
                first_name,
                last_name,
                email,
                phone || null,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        res.json({
            message: "Member updated successfully"
        });

    } catch (error) {
        console.error(error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        res.status(500).json({
            message: "Failed to update member"
        });
    }
});

// =====================================
// 5. DELETE MEMBER
// =====================================

router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.execute(
            "DELETE FROM member WHERE member_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        res.json({
            message: "Member deleted successfully"
        });

    } catch (error) {
        console.error(error);

        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "Cannot delete member with related records"
            });
        }

        res.status(500).json({
            message: "Failed to delete member"
        });
    }
});

module.exports = router;
