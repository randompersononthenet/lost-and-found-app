-- Reports table for post moderation
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 
    'inappropriate_content', 
    'harassment', 
    'fake_post', 
    'wrong_category', 
    'duplicate', 
    'other'
  )),
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'resolved')) DEFAULT 'pending',
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_action TEXT CHECK (admin_action IN ('no_action', 'post_removed', 'post_hidden', 'user_warned', 'user_suspended')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_admin_id ON reports(admin_id);

-- Row Level Security (RLS) policies for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can update their own reports (only description before review)
CREATE POLICY "Users can update own pending reports" ON reports
  FOR UPDATE USING (
    auth.uid() = reporter_id AND 
    status = 'pending' AND 
    reviewed_at IS NULL
  );

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all reports
CREATE POLICY "Admins can update all reports" ON reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to create notification when a post is reported
CREATE OR REPLACE FUNCTION create_report_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all admins about the new report
  INSERT INTO notifications (
    user_id,
    title,
    body,
    type,
    data,
    post_id
  )
  SELECT 
    p.id,
    'New Post Report',
    'A post has been reported and needs review',
    'system',
    jsonb_build_object(
      'report_id', NEW.id,
      'post_id', NEW.post_id,
      'reporter_id', NEW.reporter_id,
      'reason', NEW.reason
    ),
    NEW.post_id
  FROM profiles p
  WHERE p.role = 'admin';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report notifications
CREATE TRIGGER trigger_report_notification
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION create_report_notification();

-- Function to create notification when a report is reviewed
CREATE OR REPLACE FUNCTION create_report_review_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed from pending to reviewed/resolved
  IF OLD.status = 'pending' AND NEW.status IN ('reviewed', 'resolved') THEN
    -- Notify the reporter about the review
    INSERT INTO notifications (
      user_id,
      title,
      body,
      type,
      data,
      post_id
    ) VALUES (
      NEW.reporter_id,
      'Report Reviewed',
      CASE 
        WHEN NEW.admin_action = 'no_action' THEN 'Your report has been reviewed. No action was taken.'
        WHEN NEW.admin_action = 'post_removed' THEN 'Your report has been reviewed. The post has been removed.'
        WHEN NEW.admin_action = 'post_hidden' THEN 'Your report has been reviewed. The post has been hidden.'
        WHEN NEW.admin_action = 'user_warned' THEN 'Your report has been reviewed. The user has been warned.'
        WHEN NEW.admin_action = 'user_suspended' THEN 'Your report has been reviewed. The user has been suspended.'
        ELSE 'Your report has been reviewed.'
      END,
      'system',
      jsonb_build_object(
        'report_id', NEW.id,
        'post_id', NEW.post_id,
        'admin_action', NEW.admin_action,
        'admin_notes', NEW.admin_notes
      ),
      NEW.post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report review notifications
CREATE TRIGGER trigger_report_review_notification
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION create_report_review_notification();

-- Update notifications table to include 'report' type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('comment', 'message', 'system', 'report'));

-- Add report_count to posts table for quick reference
ALTER TABLE posts ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;

-- Function to update report count
CREATE OR REPLACE FUNCTION update_post_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET report_count = report_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET report_count = GREATEST(report_count - 1, 0) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update report count
CREATE TRIGGER trigger_update_report_count
  AFTER INSERT OR DELETE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_post_report_count();

-- Add function to check if user has already reported a post
CREATE OR REPLACE FUNCTION has_user_reported_post(user_uuid UUID, post_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reports 
    WHERE reporter_id = user_uuid AND post_id = post_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Add function to get report statistics for admins
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  reviewed_reports BIGINT,
  resolved_reports BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_reports,
    COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed_reports,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_reports
  FROM reports;
END;
$$ LANGUAGE plpgsql;
