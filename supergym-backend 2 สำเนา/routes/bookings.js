
const express = require("express");
const router = express.Router();
const db = require("../db");

// ======================================
// 1. HELPER FUNCTIONS
// ======================================

const validId = (id) =>
    /^[1-9]\d*$/.test(String(id));

const validStatus = (status) =>
    ["Confirmed", "Cancelled", "Pending"].includes(status);

const validBooking = (data) =>
    Number.isSafeInteger(data.member_id) &&
    data.member_id > 0 &&
    Number.isSafeInteger(data.session_id) &&
    data.session_id > 0 &&
    validStatus(data.status);

// Database error handling
function handleError(error, res) {
    console.error("Booking error:", error);

    if (error.sqlState === "45000") {
        return res.status(409).json({
            message: error.sqlMessage ||
                "Business rule violation"
        });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            message: "Member or session does not exist"
        });
    }

    if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
        return res.status(400).json({
            message: "Invalid booking status"
        });
    }

    res.status(500).json({
        message: "Booking database operation failed"
    });
}

// Check existing active booking
async function hasActiveBooking(memberId, sessionId, excludeId = null) {
    const [rows] = await db.execute(
        `SELECT booking_id
         FROM class_booking
         WHERE member_id = ?
           AND session_id = ?
           AND status IN ('Confirmed', 'Pending')
           AND (? IS NULL OR booking_id <> ?)
         LIMIT 1`,
        [memberId, sessionId, excludeId, excludeId]
    );

    return rows.length > 0;
}

// ======================================
// 2. GET ALL BOOKINGS
// ======================================

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT cb.*,
                   CONCAT(m.first_name, ' ', m.last_name)
                     AS member_name,
                   fc.class_name,
                   cs.session_date,
                   cs.capacity
            FROM class_booking cb
            JOIN member m
              ON cb.member_id = m.member_id
            JOIN class_session cs
              ON cb.session_id = cs.session_id
            JOIN fitness_class fc
              ON cs.class_id = fc.class_id
            ORDER BY cb.booking_id
        `);

        res.json(rows);

    } catch (error) {
        handleError(error, res);
    }
});

// ======================================
// 3. GET BOOKING BY ID
// ======================================

router.get("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid booking ID"
        });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM class_booking WHERE booking_id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json(rows[0]);

    } catch (error) {
        handleError(error, res);
    }
});

// ======================================
// 4. CREATE BOOKING
// ======================================

router.post("/", async (req, res) => {
    const {
        member_id,
        session_id,
        status = "Confirmed"
    } = req.body;

    if (!validBooking({member_id, session_id, status})) {
        return res.status(400).json({
            message: "Invalid booking information"
        });
    }

    try {
        if (status !== "Cancelled" &&
            await hasActiveBooking(member_id, session_id)) {
            return res.status(409).json({
                message: "Member already has an active booking"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO class_booking
             (member_id, session_id, booking_date, status)
             VALUES (?, ?, NOW(), ?)`,
            [member_id, session_id, status]
        );

        res.status(201).json({
            message: "Booking created successfully",
            booking_id: result.insertId
        });

    } catch (error) {
        handleError(error, res);
    }
});

// ======================================
// 5. UPDATE BOOKING
// ======================================

router.put("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid booking ID"
        });
    }

    const { member_id, session_id, status } = req.body;

    if (!validBooking({member_id, session_id, status})) {
        return res.status(400).json({
            message: "Invalid booking information"
        });
    }

    try {
        const [existing] = await db.execute(
            "SELECT booking_id FROM class_booking WHERE booking_id = ?",
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        if (status !== "Cancelled" &&
            await hasActiveBooking(member_id, session_id, req.params.id)) {
            return res.status(409).json({
                message: "Member already has an active booking"
            });
        }

        await db.execute(
            `UPDATE class_booking
             SET member_id = ?, session_id = ?, status = ?
             WHERE booking_id = ?`,
            [member_id, session_id, status, req.params.id]
        );

        res.json({
            message: "Booking updated successfully"
        });

    } catch (error) {
        handleError(error, res);
    }
});

// ======================================
// 6. CANCEL BOOKING
// ======================================

router.patch("/:id/cancel", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid booking ID"
        });
    }

    try {
        const [result] = await db.execute(
            `UPDATE class_booking
             SET status = 'Cancelled'
             WHERE booking_id = ?`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json({
            message: "Booking cancelled successfully"
        });

    } catch (error) {
        handleError(error, res);
    }
});

// ======================================
// 7. DELETE BOOKING
// ======================================

router.delete("/:id", async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid booking ID"
        });
    }

    try {
        const [result] = await db.execute(
            "DELETE FROM class_booking WHERE booking_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json({
            message: "Booking deleted successfully"
        });

    } catch (error) {
        handleError(error, res);
    }
});

module.exports = router;
