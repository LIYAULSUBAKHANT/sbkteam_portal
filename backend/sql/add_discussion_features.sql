CREATE TABLE IF NOT EXISTS discussion_threads (
  id INT NOT NULL AUTO_INCREMENT,
  source_type VARCHAR(30) NOT NULL DEFAULT 'general',
  source_id INT NULL,
  title VARCHAR(180) NOT NULL,
  created_by_user_id INT NULL,
  team_id INT NULL,
  context_preview TEXT NULL,
  is_locked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_discussion_threads_source (source_type, source_id),
  KEY idx_discussion_threads_created_by_user_id (created_by_user_id),
  KEY idx_discussion_threads_team_id (team_id),
  CONSTRAINT fk_discussion_threads_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_discussion_threads_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_comments (
  id INT NOT NULL AUTO_INCREMENT,
  thread_id INT NOT NULL,
  parent_comment_id INT NULL,
  author_user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_discussion_comments_thread_id (thread_id),
  KEY idx_discussion_comments_parent_comment_id (parent_comment_id),
  KEY idx_discussion_comments_author_user_id (author_user_id),
  CONSTRAINT fk_discussion_comments_thread FOREIGN KEY (thread_id) REFERENCES discussion_threads (id) ON DELETE CASCADE,
  CONSTRAINT fk_discussion_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES discussion_comments (id) ON DELETE CASCADE,
  CONSTRAINT fk_discussion_comments_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
