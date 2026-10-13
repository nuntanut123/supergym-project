-- Apply AFTER the original team schema.
-- Matches the user_account table created during the tutorial.
CREATE TABLE IF NOT EXISTS user_account (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('member', 'trainer', 'manager') NOT NULL,
    member_id INT UNIQUE NULL,
    trainer_id INT UNIQUE NULL,
    FOREIGN KEY (member_id) REFERENCES member(member_id),
    FOREIGN KEY (trainer_id) REFERENCES trainer(trainer_id),
    CONSTRAINT chk_user_account_role CHECK (
        (role='member' AND member_id IS NOT NULL AND trainer_id IS NULL) OR
        (role='trainer' AND trainer_id IS NOT NULL AND member_id IS NULL) OR
        (role='manager' AND member_id IS NULL AND trainer_id IS NULL)
    )
);
