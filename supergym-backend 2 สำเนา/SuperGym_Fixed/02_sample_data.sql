USE supergym;

-- 1. add (Branch)
INSERT INTO branch (branch_name, location, phone, opening_hours) VALUES
('Supergym Chiang Mai Main', 'Nimman Road, Chiang Mai', '053-123456', '06:00 - 23:00'),
('Supergym Pattaya Branch', 'Pattaya Sai 2 Road, Chonburi', '038-987654', '06:00 - 23:00'),
('Supergym Bangkok Branch', 'Sukhumvit Road, Bangkok', '02-1112223', '06:00 - 24:00');

-- 2. add (Specialization)
INSERT INTO specialization (specialization_name, description) VALUES
('Yoga', 'Flexibility, balance, and mental relaxation training'),
('Weight Training', 'Muscle building and strength conditioning'),
('Cardio & HIIT', 'High-intensity interval training and fat burning'),
('Pilates', 'Core strength and posture alignment');

-- 3. add (Membership Plan)
INSERT INTO membership_plan (plan_name, duration, price, description) VALUES
('Monthly Standard', 1, 1500.00, 'Standard gym access for 1 month'),
('Quarterly Pro', 3, 4000.00, 'Gym access plus class sessions for 3 months'),
('Annual VIP', 12, 12000.00, 'All-inclusive access for 1 year with unlimited perks');

-- 4. add (Fitness Class)
INSERT INTO fitness_class (class_name, description, difficulty_level, duration, specialization_id) VALUES
('Power Yoga', 'Dynamic yoga flow for strength and flexibility', 'Intermediate', 60, 1),
('Advanced Bodybuilding', 'Heavy weight lifting and muscle hypertrophy', 'Advanced', 90, 2),
('Extreme Cardio HIIT', 'Fast-paced calorie burning workout', 'Beginner', 45, 3),
('Core Pilates Mat', 'Strengthening abdominal and back muscles', 'Beginner', 60, 4);

-- 5. add (Member)
INSERT INTO member (first_name, last_name, email, phone) VALUES
('Somchai', 'Jaidee', 'somchai.j@email.com', '081-2345678'),
('Suda', 'Rukying', 'suda.r@email.com', '089-8765432'),
('John', 'Doe', 'john.doe@email.com', '085-5554433');

-- 6. add (Trainer)
INSERT INTO trainer (branch_id, first_name, last_name, email, phone) VALUES
(1, 'Alex', 'Mercer', 'alex.m@supergym.com', '082-1112233'),
(1, 'Sarah', 'Connor', 'sarah.c@supergym.com', '083-2223344'),
(2, 'David', 'Beck', 'david.b@supergym.com', '084-3334455');

-- 7. add subtype (Full-time & Part-time)
INSERT INTO full_time_trainer (trainer_id, contract_start_date, monthly_salary) VALUES
(1, '2024-01-15', 35000.00),
(2, '2023-06-01', 40000.00);

INSERT INTO part_time_trainer (trainer_id, contract_start_date, hourly_rate, weekly_work_hours) VALUES
(3, '2025-03-10', 300.00, 20);

-- 8. add (Trainer Specialization)
INSERT INTO trainer_specialization (trainer_id, specialization_id, certified_date) VALUES
(1, 2, '2023-05-10'), -- Alex เชี่ยวชาญ Weight Training
(1, 3, '2023-08-15'), -- Alex เชี่ยวชาญ Cardio & HIIT
(2, 1, '2022-11-20'), -- Sarah เชี่ยวชาญ Yoga
(3, 4, '2024-01-05'); -- David เชี่ยวชาญ Pilates

-- 9. add (Membership)
INSERT INTO membership (member_id, plan_id, start_date, end_date) VALUES
(1, 3, '2026-01-01', '2027-01-01'),
(2, 2, '2026-05-01', '2026-08-01'),
(3, 1, '2026-09-01', '2026-10-01');

-- 10. add (Class Session)
INSERT INTO class_session (class_id, trainer_id, branch_id, session_date, capacity) VALUES
(1, 2, 1, '2026-10-15 10:00:00', 15),
(2, 1, 1, '2026-10-15 14:00:00', 10),
(3, 1, 2, '2026-10-16 17:00:00', 20);

-- 11. add (Equipment)
INSERT INTO equipment (branch_id, equipment_name, purchase_date, status) VALUES
(1, 'Treadmill Pro X', '2024-02-10', 'Available'),
(1, 'Olympic Bench Press', '2024-02-10', 'Available'),
(2, 'Dumbbell Set (5-50kg)', '2025-01-15', 'Available');

-- 12. add (Payment)
INSERT INTO payment (member_id, membership_id, payment_date, amount) VALUES
(1, 1, '2026-01-01 09:30:00', 12000.00),
(2, 2, '2026-05-01 11:15:00', 4000.00),
(3, 3, '2026-09-01 14:00:00', 1500.00);

-- 13. add (Maintenance Record)
INSERT INTO maintenance_record (equipment_id, maintenance_date, cost, status) VALUES
(1, '2026-06-12', 1500.00, 'Completed'),
(2, '2026-07-20', 800.00, 'Completed');

-- 14. add (Class Booking)
INSERT INTO class_booking (member_id, session_id, booking_date, status) VALUES
(1, 1, '2026-10-12 08:00:00', 'Confirmed'),
(2, 1, '2026-10-12 09:00:00', 'Confirmed'),
(3, 2, '2026-10-13 10:00:00', 'Confirmed');