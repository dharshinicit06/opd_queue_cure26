-- ============================================================
-- Final Unification Migration: opd_queue as single source of truth
-- ============================================================
-- This script finalises the migration from the legacy `token` table
-- to `opd_queue` as the single queue source of truth.

-- 1. Drop the legacy token table (data preserved in backup if needed)
-- DROP TABLE IF EXISTS `token`;

-- 2. Ensure opd_queue has proper indexes
CREATE INDEX IF NOT EXISTS idx_opd_queue_patientId ON opd_queue(patientId);
CREATE INDEX IF NOT EXISTS idx_opd_queue_generatedTime ON opd_queue(generatedTime);
CREATE INDEX IF NOT EXISTS idx_opd_queue_queueStatus ON opd_queue(queueStatus);
CREATE INDEX IF NOT EXISTS idx_opd_queue_doctorId ON opd_queue(doctorId);

-- 3. Add UNIQUE constraint on patient phoneNumber (prevent duplicates)
-- If the table already has duplicates, the ALTER will fail.
-- Run a cleanup first if needed:
--   DELETE p1 FROM patient p1
--   INNER JOIN patient p2
--   WHERE p1.patientId > p2.patientId AND p1.phoneNumber = p2.phoneNumber;
-- ALTER TABLE patient ADD UNIQUE INDEX idx_patient_phone (phoneNumber);

-- 4. Ensure waiting_room reads from opd_queue (no changes needed if it already does)
-- Verify waiting_room queries reference opd_queue, not token table.

-- 5. Verify analytics queries reference opd_queue only.
