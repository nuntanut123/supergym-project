require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./db");

async function seedAccounts() {
    try {
        const password = process.env.DEMO_PASSWORD;
        const managerEmail = process.env.MANAGER_EMAIL;

        if (!password || !managerEmail) {
            throw new Error("Missing DEMO_PASSWORD or MANAGER_EMAIL");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Create accounts for existing members
        const [members] = await db.query(
            "SELECT member_id, email FROM member"
        );

        for (const member of members) {
            await db.execute(
                `INSERT INTO user_account
                 (email, password_hash, role, member_id)
                 VALUES (?, ?, 'member', ?)
                 ON DUPLICATE KEY UPDATE user_id = user_id`,
                [member.email, passwordHash, member.member_id]
            );
        }

        // Create accounts for existing trainers
        const [trainers] = await db.query(
            "SELECT trainer_id, email FROM trainer"
        );

        for (const trainer of trainers) {
            await db.execute(
                `INSERT INTO user_account
                 (email, password_hash, role, trainer_id)
                 VALUES (?, ?, 'trainer', ?)
                 ON DUPLICATE KEY UPDATE user_id = user_id`,
                [trainer.email, passwordHash, trainer.trainer_id]
            );
        }

        // Create one demo manager account
        await db.execute(
            `INSERT INTO user_account
             (email, password_hash, role)
             VALUES (?, ?, 'manager')
             ON DUPLICATE KEY UPDATE user_id = user_id`,
            [managerEmail, passwordHash]
        );

        console.log("Demo accounts initialized successfully!");

    } catch (error) {
        console.error("Error:", error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

seedAccounts();
