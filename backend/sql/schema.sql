CREATE TABLE IF NOT EXISTS roles (
  id INT NOT NULL AUTO_INCREMENT,
  role_key VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_role_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  lead_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teams_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  role_id INT NOT NULL,
  team_id INT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_initials VARCHAR(10) NULL,
  points INT NOT NULL DEFAULT 0,
  activity_points INT NOT NULL DEFAULT 0,
  reward_points INT NOT NULL DEFAULT 0,
  cgpa DECIMAL(4,2) NULL,
  joined_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  roll_number VARCHAR(50) NULL,
  department VARCHAR(150) NULL,
  position VARCHAR(150) NULL,
  special_lab VARCHAR(150) NULL,
  primary_skill TEXT NULL,
  primary_skill_1 VARCHAR(150) NULL,
  primary_skill_2 VARCHAR(150) NULL,
  secondary_skill TEXT NULL,
  secondary_skill_1 VARCHAR(150) NULL,
  secondary_skill_2 VARCHAR(150) NULL,
  special_skill TEXT NULL,
  special_skill_1 VARCHAR(150) NULL,
  special_skill_2 VARCHAR(150) NULL,
  linkedin VARCHAR(255) NULL,
  github VARCHAR(255) NULL,
  leetcode VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  KEY idx_users_team_id (team_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id),
  CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE teams
  ADD CONSTRAINT fk_teams_lead_user
  FOREIGN KEY (lead_user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS projects (
  id INT NOT NULL AUTO_INCREMENT,
  team_id INT NOT NULL,
  created_by_user_id INT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Planning',
  progress INT NOT NULL DEFAULT 0,
  deadline DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_team_id (team_id),
  KEY idx_projects_created_by_user_id (created_by_user_id),
  CONSTRAINT fk_projects_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id INT NOT NULL AUTO_INCREMENT,
  project_id INT NOT NULL,
  assigned_to_user_id INT NOT NULL,
  created_by_user_id INT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
  due_date DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_project_id (project_id),
  KEY idx_tasks_assigned_to_user_id (assigned_to_user_id),
  KEY idx_tasks_created_by_user_id (created_by_user_id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assigned_user FOREIGN KEY (assigned_to_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_skill_assignments (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  skill_id INT NULL,
  assigned_by_user_id INT NULL,
  skill_name VARCHAR(150) NOT NULL,
  level VARCHAR(50) NOT NULL DEFAULT 'Beginner',
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  assigned_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_weekly_skill_assignments_user_id (user_id),
  KEY idx_weekly_skill_assignments_skill_id (skill_id),
  KEY idx_weekly_skill_assignments_assigned_by_user_id (assigned_by_user_id),
  CONSTRAINT fk_weekly_skill_assignments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_weekly_skill_assignments_skill FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE SET NULL,
  CONSTRAINT fk_weekly_skill_assignments_assigned_by_user FOREIGN KEY (assigned_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id INT NOT NULL AUTO_INCREMENT,
  author_user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  target_type VARCHAR(20) NOT NULL DEFAULT 'all',
  target_team_id INT NULL,
  target_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_author_user_id (author_user_id),
  KEY idx_announcements_target_team_id (target_team_id),
  KEY idx_announcements_target_user_id (target_user_id),
  CONSTRAINT fk_announcements_author_user FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_announcements_target_team FOREIGN KEY (target_team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_announcements_target_user FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_reactions (
  id INT NOT NULL AUTO_INCREMENT,
  announcement_id INT NOT NULL,
  user_id INT NOT NULL,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_announcement_reactions_unique (announcement_id, user_id, reaction_type),
  KEY idx_announcement_reactions_announcement_id (announcement_id),
  KEY idx_announcement_reactions_user_id (user_id),
  KEY idx_announcement_reactions_type (reaction_type),
  CONSTRAINT fk_announcement_reactions_announcement FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE,
  CONSTRAINT fk_announcement_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminders (
  id INT NOT NULL AUTO_INCREMENT,
  created_by_user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  remind_at DATETIME NOT NULL,
  target_type VARCHAR(20) NOT NULL DEFAULT 'all',
  target_team_id INT NULL,
  target_user_id INT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reminders_created_by_user_id (created_by_user_id),
  KEY idx_reminders_target_team_id (target_team_id),
  KEY idx_reminders_target_user_id (target_user_id),
  CONSTRAINT fk_reminders_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reminders_target_team FOREIGN KEY (target_team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_reminders_target_user FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_id (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(100) NULL,
  target_id INT NULL,
  target_label VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_logs_user_id (user_id),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id, role_key, display_name) VALUES
  (1, 'captain', 'Captain'),
  (2, 'vice_captain', 'Vice Captain'),
  (3, 'manager', 'Manager'),
  (4, 'strategist', 'Strategist'),
  (5, 'member', 'Member')
ON DUPLICATE KEY UPDATE
  role_key = VALUES(role_key),
  display_name = VALUES(display_name);
