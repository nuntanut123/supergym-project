

-- 1. ดูรายชื่อสมาชิกทั้งหมดพร้อมข้อมูลแพ็กเกจและวันหมดอายุสมาชิก
SELECT m.member_id, m.first_name, m.last_name, mp.plan_name, ms.start_date, ms.end_date
FROM member m
JOIN membership ms ON m.member_id = ms.member_id
JOIN membership_plan mp ON ms.plan_id = mp.plan_id;

-- 2. คำนวณยอดชำระเงินรวมทั้งหมด (Total Revenue) แยกตามแพ็กเกจ
-- NOTE: payment/membership ไม่มี branch_id จึงยังแยกรายได้ตามสาขาอย่างถูกต้องไม่ได้
SELECT mp.plan_name, SUM(p.amount) AS total_revenue
FROM payment p
JOIN membership ms ON p.membership_id = ms.membership_id
JOIN membership_plan mp ON ms.plan_id = mp.plan_id
GROUP BY mp.plan_name;

-- 3. ตรวจสอบรอบคลาสสอน (Class Session) พร้อมชื่อคลาส ชื่อเทรนเนอร์ และสาขา
SELECT cs.session_id, fc.class_name, CONCAT(t.first_name, ' ', t.last_name) AS trainer_name, 
       b.branch_name, cs.session_date, cs.capacity
FROM class_session cs
JOIN fitness_class fc ON cs.class_id = fc.class_id
JOIN trainer t ON cs.trainer_id = t.trainer_id
JOIN branch b ON cs.branch_id = b.branch_id;

-- 4. นับจำนวนการจองคลาส (Class Bookings) ในแต่ละรอบ เพื่อดูความหนาแน่น
SELECT cs.session_id, fc.class_name, cs.capacity, COUNT(cb.booking_id) AS total_booked
FROM class_session cs
JOIN fitness_class fc ON cs.class_id = fc.class_id
LEFT JOIN class_booking cb ON cs.session_id = cb.session_id AND cb.status = 'Confirmed'
GROUP BY cs.session_id, fc.class_name, cs.capacity;

-- 5. ตรวจสอบประวัติการซ่อมบำรุงอุปกรณ์และค่าใช้จ่ายทั้งหมด
SELECT mr.maintenance_id, e.equipment_name, b.branch_name, mr.maintenance_date, mr.cost, mr.status
FROM maintenance_record mr
JOIN equipment e ON mr.equipment_id = e.equipment_id
JOIN branch b ON e.branch_id = b.branch_id;

-- 6. ตรวจสอบความเชี่ยวชาญ (Specialization) ของเทรนเนอร์แต่ละคน
SELECT CONCAT(t.first_name, ' ', t.last_name) AS trainer_name, 
       s.specialization_name, ts.certified_date
FROM trainer t
JOIN trainer_specialization ts ON t.trainer_id = ts.trainer_id
JOIN specialization s ON ts.specialization_id = s.specialization_id;

-- 7. ตรวจสอบข้อมูลเทรนเนอร์ประจำ (Full-time Trainer) พร้อมเงินเดือนและสาขา
SELECT CONCAT(t.first_name, ' ', t.last_name) AS trainer_name, 
       b.branch_name, ft.contract_start_date, ft.monthly_salary
FROM full_time_trainer ft
JOIN trainer t ON ft.trainer_id = t.trainer_id
JOIN branch b ON t.branch_id = b.branch_id;

-- 8. ตรวจสอบข้อมูลเทรนเนอร์พาร์ทไทม์ (Part-time Trainer) พร้อมอัตราค่าจ้าง
SELECT CONCAT(t.first_name, ' ', t.last_name) AS trainer_name, 
       b.branch_name, pt.hourly_rate, pt.weekly_work_hours
FROM part_time_trainer pt
JOIN trainer t ON pt.trainer_id = t.trainer_id
JOIN branch b ON t.branch_id = b.branch_id;

-- 9. ค้นหาอุปกรณ์ทั้งหมดที่อยู่ในแต่ละสาขาและสถานะปัจจุบัน
SELECT b.branch_name, e.equipment_name, e.purchase_date, e.status
FROM equipment e
JOIN branch b ON e.branch_id = b.branch_id;

-- 10. สรุปจำนวนสมาชิกที่สมัครในแต่ละแพ็กเกจ (Membership Plan)
SELECT mp.plan_name, COUNT(ms.membership_id) AS total_members
FROM membership_plan mp
LEFT JOIN membership ms ON mp.plan_id = ms.plan_id
GROUP BY mp.plan_name;