-- 1. CREATE Database
CREATE DATABASE IF NOT EXISTS supergym;
USE supergym;

-- 2. (Independent Tables)
CREATE TABLE branch (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    opening_hours VARCHAR(100)
);

CREATE TABLE specialization (
    specialization_id INT AUTO_INCREMENT PRIMARY KEY,
    specialization_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE membership_plan (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    duration INT NOT NULL CHECK (duration > 0), -- months
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    description TEXT
);

CREATE TABLE fitness_class (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(50),
    duration INT NOT NULL CHECK (duration > 0), -- minutes
    specialization_id INT NOT NULL,
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id)
);

CREATE TABLE member (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20)
);

CREATE TABLE trainer (
    trainer_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
);

-- 3.Subtype(Dependent Tables)
CREATE TABLE full_time_trainer (
    trainer_id INT PRIMARY KEY,
    contract_start_date DATE NOT NULL,
    monthly_salary DECIMAL(10, 2) NOT NULL CHECK (monthly_salary > 0),
    FOREIGN KEY (trainer_id) REFERENCES trainer(trainer_id) ON DELETE CASCADE
);

CREATE TABLE part_time_trainer (
    trainer_id INT PRIMARY KEY,
    contract_start_date DATE NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate > 0),
    weekly_work_hours INT NOT NULL CHECK (weekly_work_hours > 0),
    FOREIGN KEY (trainer_id) REFERENCES trainer(trainer_id) ON DELETE CASCADE
);

CREATE TABLE trainer_specialization (
    trainer_id INT,
    specialization_id INT,
    certified_date DATE,
    PRIMARY KEY (trainer_id, specialization_id),
    FOREIGN KEY (trainer_id) REFERENCES trainer(trainer_id) ON DELETE CASCADE,
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id) ON DELETE CASCADE
);

CREATE TABLE membership (
    membership_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT chk_membership_dates CHECK (end_date > start_date),
    FOREIGN KEY (member_id) REFERENCES member(member_id),
    FOREIGN KEY (plan_id) REFERENCES membership_plan(plan_id)
);

CREATE TABLE class_session (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    trainer_id INT NOT NULL,
    branch_id INT NOT NULL,
    session_date DATETIME NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    FOREIGN KEY (class_id) REFERENCES fitness_class(class_id),
    FOREIGN KEY (trainer_id) REFERENCES trainer(trainer_id),
    FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
);

CREATE TABLE equipment (
    equipment_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    equipment_name VARCHAR(100) NOT NULL,
    purchase_date DATE,
    status VARCHAR(50) DEFAULT 'Available',
    FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
);

CREATE TABLE payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    membership_id INT NOT NULL,
    payment_date DATETIME NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    FOREIGN KEY (member_id) REFERENCES member(member_id),
    FOREIGN KEY (membership_id) REFERENCES membership(membership_id)
);

CREATE TABLE maintenance_record (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    maintenance_date DATE NOT NULL,
    cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0),
    status VARCHAR(50),
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
);

CREATE TABLE class_booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    session_id INT NOT NULL,
    booking_date DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
    CONSTRAINT chk_booking_status CHECK (status IN ('Confirmed','Cancelled','Pending')),
    FOREIGN KEY (member_id) REFERENCES member(member_id),
    FOREIGN KEY (session_id) REFERENCES class_session(session_id)
);


CREATE TABLE user_account (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('member', 'trainer', 'manager') NOT NULL,
    member_id INT UNIQUE NULL,
    trainer_id INT UNIQUE NULL,
    FOREIGN KEY (member_id)
        REFERENCES member(member_id),
    FOREIGN KEY (trainer_id)
        REFERENCES trainer(trainer_id),
    CONSTRAINT chk_user_account_role
    CHECK (
        (role = 'member'
         AND member_id IS NOT NULL
         AND trainer_id IS NULL)
        OR
        (role = 'trainer'
         AND trainer_id IS NOT NULL
         AND member_id IS NULL)
        OR
        (role = 'manager'
         AND member_id IS NULL
         AND trainer_id IS NULL)
    )
);
