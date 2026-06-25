-- Queue Status Migration: Standardize to Waiting, Serving, Completed
-- Renames InProgress -> Serving, Done -> Completed

UPDATE opd_queue SET queueStatus = 'Serving' WHERE queueStatus = 'InProgress';
UPDATE opd_queue SET queueStatus = 'Completed' WHERE queueStatus = 'Done';
