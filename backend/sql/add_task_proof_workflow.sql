ALTER TABLE tasks
  ADD COLUMN proof_type VARCHAR(50) NULL AFTER completed_at,
  ADD COLUMN proof_link VARCHAR(500) NULL AFTER proof_type,
  ADD COLUMN proof_note TEXT NULL AFTER proof_link,
  ADD COLUMN proof_submitted_at DATETIME NULL AFTER proof_note,
  ADD COLUMN proof_review_feedback TEXT NULL AFTER proof_submitted_at,
  ADD COLUMN proof_reviewed_by_user_id INT NULL AFTER proof_review_feedback,
  ADD COLUMN proof_reviewed_at DATETIME NULL AFTER proof_reviewed_by_user_id,
  ADD KEY idx_tasks_proof_reviewed_by_user_id (proof_reviewed_by_user_id),
  ADD CONSTRAINT fk_tasks_proof_reviewed_by_user FOREIGN KEY (proof_reviewed_by_user_id) REFERENCES users (id) ON DELETE SET NULL;
