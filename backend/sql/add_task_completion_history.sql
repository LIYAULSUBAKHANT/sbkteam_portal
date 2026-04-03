ALTER TABLE tasks
  ADD COLUMN completed_at DATETIME NULL AFTER due_date;
