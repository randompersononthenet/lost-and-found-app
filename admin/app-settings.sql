-- App-wide settings table and RLS policies

-- Create table
CREATE TABLE IF NOT EXISTS app_settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	maintenance_banner_text TEXT,
	maintenance_mode BOOLEAN DEFAULT FALSE,
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a single row exists
INSERT INTO app_settings (id, maintenance_banner_text, maintenance_mode)
SELECT 1, NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE id = 1);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read (mobile/admin), only admin can update
DROP POLICY IF EXISTS app_settings_select_all ON app_settings;
CREATE POLICY app_settings_select_all ON app_settings
	FOR SELECT
	USING (true);

DROP POLICY IF EXISTS app_settings_update_admin_only ON app_settings;
CREATE POLICY app_settings_update_admin_only ON app_settings
	FOR UPDATE
	USING (is_admin());

-- Optional: prevent inserts/deletes except by admin
DROP POLICY IF EXISTS app_settings_insert_admin_only ON app_settings;
CREATE POLICY app_settings_insert_admin_only ON app_settings
	FOR INSERT
	WITH CHECK (is_admin());

DROP POLICY IF EXISTS app_settings_delete_admin_only ON app_settings;
CREATE POLICY app_settings_delete_admin_only ON app_settings
	FOR DELETE
	USING (is_admin()); 