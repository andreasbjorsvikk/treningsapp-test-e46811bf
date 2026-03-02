
-- Prevent duplicate primary goal periods per user per date
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_valid_from ON primary_goal_periods (user_id, valid_from);
