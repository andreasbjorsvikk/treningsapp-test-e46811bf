DELETE FROM workout_sessions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date, type, duration_minutes) id
  FROM workout_sessions
  ORDER BY user_id, date, type, duration_minutes, created_at ASC
);

DELETE FROM goals
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, metric, period, target, activity_type) id
  FROM goals
  ORDER BY user_id, metric, period, target, activity_type, created_at ASC
);