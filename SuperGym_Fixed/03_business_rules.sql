-- สคริปต์นี้ไม่มี TRIGGER (Clever Cloud ไม่ให้สร้าง trigger เพราะติด error 1419)
-- มีเฉพาะ STORED PROCEDURE ซึ่งสร้างได้ปกติ
-- ต้อง CALL procedure ก่อน INSERT/UPDATE/DELETE เอง (ดูตัวอย่างท้ายไฟล์)

DELIMITER //

-- ===== BR17 / BR18: ตรวจ session =====
-- INSERT: p_session_id = NULL | UPDATE: ส่ง session_id เดิม
DROP PROCEDURE IF EXISTS validate_session//
CREATE PROCEDURE validate_session(IN p_session_id INT, IN p_class_id INT, IN p_trainer_id INT, IN p_start DATETIME)
BEGIN
 DECLARE v_matches INT DEFAULT 0;
 DECLARE v_duration INT DEFAULT 0;
 SELECT COUNT(*) INTO v_matches FROM trainer_specialization ts
 JOIN fitness_class fc ON fc.specialization_id=ts.specialization_id
 WHERE ts.trainer_id=p_trainer_id AND fc.class_id=p_class_id;
 IF v_matches=0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR18: trainer specialization does not match class';
 END IF;
 SELECT duration INTO v_duration FROM fitness_class WHERE class_id=p_class_id;
 SELECT COUNT(*) INTO v_matches FROM class_session cs
 JOIN fitness_class fc ON fc.class_id=cs.class_id
 WHERE cs.trainer_id=p_trainer_id AND (p_session_id IS NULL OR cs.session_id<>p_session_id)
 AND p_start < DATE_ADD(cs.session_date, INTERVAL fc.duration MINUTE)
 AND cs.session_date < DATE_ADD(p_start, INTERVAL v_duration MINUTE);
 IF v_matches>0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR17: overlapping trainer sessions';
 END IF;
END//

-- ===== BR16: ตรวจ capacity ตอนแก้ session =====
DROP PROCEDURE IF EXISTS validate_session_capacity//
CREATE PROCEDURE validate_session_capacity(IN p_session_id INT, IN p_new_capacity INT)
BEGIN
 IF p_new_capacity < (SELECT COUNT(*) FROM class_booking WHERE session_id=p_session_id AND status='Confirmed') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR16: capacity below confirmed bookings';
 END IF;
END//

-- ===== BR16: ตรวจการจอง =====
-- INSERT: p_exclude_id = NULL | UPDATE: ส่ง booking_id เดิม
DROP PROCEDURE IF EXISTS validate_booking//
CREATE PROCEDURE validate_booking(IN p_session_id INT, IN p_status VARCHAR(50), IN p_exclude_id INT)
BEGIN
 DECLARE v_capacity INT;
 DECLARE v_booked INT DEFAULT 0;
 IF p_status='Confirmed' THEN
  SELECT capacity INTO v_capacity FROM class_session WHERE session_id=p_session_id;
  SELECT COUNT(*) INTO v_booked FROM class_booking
  WHERE session_id=p_session_id AND status='Confirmed'
  AND (p_exclude_id IS NULL OR booking_id<>p_exclude_id);
  IF v_booked>=v_capacity THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR16: class session at capacity';
  END IF;
 END IF;
END//

-- ===== BR20: เทรนเนอร์เป็นได้อย่างเดียว (full หรือ part) =====
-- p_type = 'full' (จะเพิ่มใน full_time_trainer) หรือ 'part' (part_time_trainer)
DROP PROCEDURE IF EXISTS validate_trainer_type//
CREATE PROCEDURE validate_trainer_type(IN p_trainer_id INT, IN p_type VARCHAR(10))
BEGIN
 IF p_type='full' AND EXISTS(SELECT 1 FROM part_time_trainer WHERE trainer_id=p_trainer_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR20: trainer already part-time';
 END IF;
 IF p_type='part' AND EXISTS(SELECT 1 FROM full_time_trainer WHERE trainer_id=p_trainer_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR20: trainer already full-time';
 END IF;
END//

-- ===== BR18: เรียกก่อน UPDATE fitness_class ที่เปลี่ยน specialization =====
DROP PROCEDURE IF EXISTS validate_class_specialization_change//
CREATE PROCEDURE validate_class_specialization_change(IN p_class_id INT, IN p_new_spec INT)
BEGIN
 IF EXISTS (
  SELECT 1 FROM class_session cs WHERE cs.class_id=p_class_id
  AND NOT EXISTS (SELECT 1 FROM trainer_specialization ts
                  WHERE ts.trainer_id=cs.trainer_id AND ts.specialization_id=p_new_spec)
 ) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR18: change would invalidate assigned trainers';
 END IF;
END//

-- ===== BR18: เรียกก่อน DELETE/UPDATE trainer_specialization =====
DROP PROCEDURE IF EXISTS validate_specialization_removal//
CREATE PROCEDURE validate_specialization_removal(IN p_trainer_id INT, IN p_spec_id INT)
BEGIN
 IF EXISTS (SELECT 1 FROM class_session cs JOIN fitness_class fc ON fc.class_id=cs.class_id
  WHERE cs.trainer_id=p_trainer_id AND fc.specialization_id=p_spec_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR18: certification required by assigned session';
 END IF;
END//

DELIMITER ;

