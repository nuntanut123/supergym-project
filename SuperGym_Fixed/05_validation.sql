

-- Expected 14 tables and three sessions. Read-only validation.
SELECT 'tables' AS metric, COUNT(*) AS total FROM information_schema.tables WHERE table_schema='supergym'
UNION ALL SELECT 'members',COUNT(*) FROM member
UNION ALL SELECT 'sessions',COUNT(*) FROM class_session
UNION ALL SELECT 'bookings',COUNT(*) FROM class_booking;

-- BR4: trainers without a specialization (should return 0 rows)
SELECT t.trainer_id FROM trainer t LEFT JOIN trainer_specialization ts ON ts.trainer_id=t.trainer_id
GROUP BY t.trainer_id HAVING COUNT(ts.specialization_id)=0;

-- BR12: memberships without payment (should return 0 rows)
SELECT m.membership_id FROM membership m LEFT JOIN payment p ON p.membership_id=m.membership_id
GROUP BY m.membership_id HAVING COUNT(p.payment_id)=0;

-- BR20: trainers in both subtypes (should return 0 rows)
SELECT f.trainer_id FROM full_time_trainer f JOIN part_time_trainer p USING(trainer_id);

-- BR16: sessions over capacity (should return 0 rows)
SELECT cs.session_id,cs.capacity,COUNT(cb.booking_id) confirmed_count
FROM class_session cs LEFT JOIN class_booking cb ON cb.session_id=cs.session_id AND cb.status='Confirmed'
GROUP BY cs.session_id,cs.capacity HAVING COUNT(cb.booking_id)>cs.capacity;

-- BR17: overlapping sessions (should return 0 rows)
SELECT a.session_id first_session,b.session_id second_session,a.trainer_id
FROM class_session a JOIN class_session b ON a.trainer_id=b.trainer_id AND a.session_id<b.session_id
JOIN fitness_class fa ON fa.class_id=a.class_id JOIN fitness_class fb ON fb.class_id=b.class_id
WHERE a.session_date < DATE_ADD(b.session_date, INTERVAL fb.duration MINUTE)
AND b.session_date < DATE_ADD(a.session_date, INTERVAL fa.duration MINUTE);

-- BR18: invalid trainer assignments (should return 0 rows)
SELECT cs.session_id FROM class_session cs JOIN fitness_class fc ON fc.class_id=cs.class_id
LEFT JOIN trainer_specialization ts ON ts.trainer_id=cs.trainer_id AND ts.specialization_id=fc.specialization_id
WHERE ts.trainer_id IS NULL;

-- Payments whose member does not match the associated membership (should return 0 rows)
SELECT p.payment_id FROM payment p JOIN membership ms ON ms.membership_id=p.membership_id WHERE p.member_id<>ms.member_id;
