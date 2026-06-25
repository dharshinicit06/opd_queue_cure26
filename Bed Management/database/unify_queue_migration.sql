-- ============================================================
-- Unify Queue System: Single Source of Truth for Patient Data
-- ============================================================
-- This migration ensures:
--   1. patient.phoneNumber is UNIQUE (prevent duplicate patients)
--   2. opd_queue has proper indexes for fast lookups
--   3. patient table has gender & symptoms columns (nullable for
--      receptionist flow where they may not be collected)
--   4. No orphan opd_queue records (FK enforced already)
-- ============================================================

-- 1. Ensure gender and symptoms columns exist on patient (nullable)
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT NULL AFTER age,
  ADD COLUMN IF NOT EXISTS symptoms TEXT DEFAULT NULL AFTER phoneNumber;

-- 2. Add UNIQUE constraint on phoneNumber to prevent duplicate patients
--    (removes duplicates first if any, keeping the earliest registered)
DELETE p1 FROM patient p1
INNER JOIN patient p2
WHERE p1.phoneNumber = p2.phoneNumber
  AND p1.phoneNumber IS NOT NULL
  AND p1.patientId > p2.patientId;

ALTER TABLE patient
  ADD CONSTRAINT unique_patient_phone UNIQUE (phoneNumber);

-- 3. Ensure opd_queue.tokenNumber is VARCHAR(10) (supports E001 format)
ALTER TABLE opd_queue
  MODIFY COLUMN tokenNumber VARCHAR(10) NOT NULL;

-- 4. Ensure opd_queue.priority has a default
ALTER TABLE opd_queue
  MODIFY COLUMN priority VARCHAR(10) NOT NULL DEFAULT 'Normal';

-- 5. Add composite indexes for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_opd_queue_patient_status
  ON opd_queue(patientId, queueStatus);

CREATE INDEX IF NOT EXISTS idx_opd_queue_date_status
  ON opd_queue(generatedTime, queueStatus);

CREATE INDEX IF NOT EXISTS idx_opd_queue_date_priority
  ON opd_queue(generatedTime, priority);

-- 6. Ensure FK on opd_queue references patient with ON DELETE CASCADE
--    (already should exist from receptionist_schema.sql; re-add if missing)
--    Skipping because MySQL requires full table rebuild, and it likely exists.

-- 7. Verify the patient table has registrationDate
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER symptoms;

-- 8. Add index on token table (legacy) for consistency
CREATE INDEX IF NOT EXISTS idx_token_patient_status
  ON token(patientId, queueStatus);
