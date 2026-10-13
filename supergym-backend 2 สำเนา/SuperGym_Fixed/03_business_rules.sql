USE supergym;
-- Run after 01_schema.sql and 02_sample_data.sql on a clean database.
-- MySQL 8.0.16+ required for CHECK enforcement.
DELIMITER //

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

DROP TRIGGER IF EXISTS session_bi//
CREATE TRIGGER session_bi BEFORE INSERT ON class_session FOR EACH ROW
BEGIN
 CALL validate_session(NULL,NEW.class_id,NEW.trainer_id,NEW.session_date);
END//
DROP TRIGGER IF EXISTS session_bu//
CREATE TRIGGER session_bu BEFORE UPDATE ON class_session FOR EACH ROW
BEGIN
 CALL validate_session(OLD.session_id,NEW.class_id,NEW.trainer_id,NEW.session_date);
 IF NEW.capacity < (SELECT COUNT(*) FROM class_booking WHERE session_id=OLD.session_id AND status='Confirmed') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR16: capacity below confirmed bookings';
 END IF;
END//

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
DROP TRIGGER IF EXISTS booking_bi//
CREATE TRIGGER booking_bi BEFORE INSERT ON class_booking FOR EACH ROW
BEGIN
 CALL validate_booking(NEW.session_id,NEW.status,NULL);
END//
DROP TRIGGER IF EXISTS booking_bu//
CREATE TRIGGER booking_bu BEFORE UPDATE ON class_booking FOR EACH ROW
BEGIN
 CALL validate_booking(NEW.session_id,NEW.status,OLD.booking_id);
END//

DROP TRIGGER IF EXISTS fulltime_bi//
CREATE TRIGGER fulltime_bi BEFORE INSERT ON full_time_trainer FOR EACH ROW
BEGIN
 IF EXISTS(SELECT 1 FROM part_time_trainer WHERE trainer_id=NEW.trainer_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR20: trainer already part-time';
 END IF;
END//
DROP TRIGGER IF EXISTS fulltime_bu//
CREATE TRIGGER fulltime_bu BEFORE UPDATE ON full_time_trainer FOR EACH ROW
BEGIN
 IF EXISTS(SELECT 1 FROM part_time_trainer WHERE trainer_id=NEW.trainer_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR20: trainer already part-time';
 END IF;
END//
DROP TRIGGER IF EXISTS parttime_bi//
CREATE TRIGGER parttime_bi BEFORE INSERT ON part_time_trainer FOR EACH ROW
BEGIN
 IF EXISTS(SELECT 1 FROM full_time_trainer WHERE trainer_id=NEW.trainer_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR20: trainer already full-time';
 END IF;
END//
DROP TRIGGER IF EXISTS parttime_bu//
CREATE TRIGGER parttime_bu BEFORE UPDATE ON part_time_trainer FOR EACH ROW
BEGIN
 IF EXISTS(SELECT 1 FROM full_time_trainer WHERE trainer_id=NEW.trainer_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR20: trainer already full-time';
 END IF;
END//

-- Protect BR18 when existing class requirements or trainer certifications change.
DROP TRIGGER IF EXISTS fitness_class_bu//
CREATE TRIGGER fitness_class_bu BEFORE UPDATE ON fitness_class FOR EACH ROW
BEGIN
 IF NEW.specialization_id<>OLD.specialization_id AND EXISTS (
  SELECT 1 FROM class_session cs WHERE cs.class_id=OLD.class_id
  AND NOT EXISTS (SELECT 1 FROM trainer_specialization ts WHERE ts.trainer_id=cs.trainer_id AND ts.specialization_id=NEW.specialization_id)
 ) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR18: change would invalidate assigned trainers';
 END IF;
END//
DROP TRIGGER IF EXISTS trainer_specialization_bd//
CREATE TRIGGER trainer_specialization_bd BEFORE DELETE ON trainer_specialization FOR EACH ROW
BEGIN
 IF EXISTS (SELECT 1 FROM class_session cs JOIN fitness_class fc ON fc.class_id=cs.class_id
  WHERE cs.trainer_id=OLD.trainer_id AND fc.specialization_id=OLD.specialization_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR18: certification required by assigned session';
 END IF;
END//
DROP TRIGGER IF EXISTS trainer_specialization_bu//
CREATE TRIGGER trainer_specialization_bu BEFORE UPDATE ON trainer_specialization FOR EACH ROW
BEGIN
 IF (NEW.trainer_id<>OLD.trainer_id OR NEW.specialization_id<>OLD.specialization_id)
 AND EXISTS (SELECT 1 FROM class_session cs JOIN fitness_class fc ON fc.class_id=cs.class_id
  WHERE cs.trainer_id=OLD.trainer_id AND fc.specialization_id=OLD.specialization_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BR18: certification required by assigned session';
 END IF;
END//
DELIMITER ;
