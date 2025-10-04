import React, { useState, useEffect } from 'react'
import { useSession, supabase } from '../supabase'
import { useTheme } from '../theme'
import Nav from '../shared/Nav'
import { Flag, Eye, CheckCircle, XCircle, Clock, User, FileText, Calendar, AlertTriangle, MessageSquare } from 'lucide-react'

interface Report {
  id: string
  reporter_id: string
  post_id: string
  reason: string
  description?: string
  status: 'pending' | 'reviewed' | 'resolved'
  admin_id?: string
  admin_action?: string
  admin_notes?: string
  created_at: string
  reviewed_at?: string
  resolved_at?: string
  profiles_reporter: {
    full_name: string
    email: string
  }
  profiles_admin?: {
    full_name: string
  }
  posts: {
    id: string
    title: string
    description: string
    category: string
    status: string
    user_id: string
    profiles: {
      full_name: string
    }
  }
}

export default function Reports() {
  const { role } = useSession()
  const { colors } = useTheme()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [adminAction, setAdminAction] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all')

  useEffect(() => {
    if (role === 'admin') {
      loadReports()
    }
  }, [role, filterStatus])

  const loadReports = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles_reporter:profiles!reports_reporter_id_fkey(full_name, email),
          profiles_admin:profiles!reports_admin_id_fkey(full_name),
          posts:posts!reports_post_id_fkey(
            id,
            title,
            description,
            category,
            status,
            user_id,
            profiles:profiles!posts_user_id_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading reports:', error)
        return
      }

      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewReport = (report: Report) => {
    setSelectedReport(report)
    setAdminAction(report.admin_action || '')
    setAdminNotes(report.admin_notes || '')
    setModalVisible(true)
  }

  const submitReview = async () => {
    if (!selectedReport || !adminAction) return

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'reviewed',
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          admin_action: adminAction,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReport.id)

      if (error) {
        console.error('Error updating report:', error)
        return
      }

      // If action is to remove or hide post, update the post
      if (adminAction === 'post_removed' || adminAction === 'post_hidden') {
        const postStatus = adminAction === 'post_removed' ? 'archived' : 'active'
        await supabase
          .from('posts')
          .update({ status: postStatus })
          .eq('id', selectedReport.post_id)
      }

      setModalVisible(false)
      setSelectedReport(null)
      loadReports()
    } catch (error) {
      console.error('Error submitting review:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color={colors.warning} />
      case 'reviewed':
        return <CheckCircle size={16} color={colors.success} />
      case 'resolved':
        return <XCircle size={16} color={colors.textSecondary} />
      default:
        return <Clock size={16} color={colors.textSecondary} />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    }

    switch (status) {
      case 'pending':
        return { ...baseStyle, backgroundColor: colors.warning + '20', color: colors.warning }
      case 'reviewed':
        return { ...baseStyle, backgroundColor: colors.success + '20', color: colors.success }
      case 'resolved':
        return { ...baseStyle, backgroundColor: colors.textSecondary + '20', color: colors.textSecondary }
      default:
        return { ...baseStyle, backgroundColor: colors.textSecondary + '20', color: colors.textSecondary }
    }
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: 'Spam',
      inappropriate_content: 'Inappropriate Content',
      harassment: 'Harassment',
      fake_post: 'Fake Post',
      wrong_category: 'Wrong Category',
      duplicate: 'Duplicate Post',
      other: 'Other',
    }
    return labels[reason] || reason
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      no_action: 'No Action',
      post_removed: 'Post Removed',
      post_hidden: 'Post Hidden',
      user_warned: 'User Warned',
      user_suspended: 'User Suspended',
    }
    return labels[action] || action
  }

  if (role !== 'admin') {
    return (
      <Nav title="Reports">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <AlertTriangle size={48} color={colors.error} style={{ marginBottom: '16px' }} />
          <h2 style={{ color: colors.error, marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: colors.textSecondary }}>You need admin privileges to view reports.</p>
        </div>
      </Nav>
    )
  }

  if (loading) {
    return (
      <Nav title="Reports">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ color: colors.textSecondary, marginTop: '16px' }}>Loading reports...</p>
        </div>
      </Nav>
    )
  }

  return (
    <Nav title="Reports">
      <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: colors.text, marginBottom: '8px' }}>Reports Management</h1>
        <p style={{ color: colors.textSecondary }}>Review and manage reported posts</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${colors.border}` }}>
          {[
            { value: 'all', label: 'All Reports' },
            { value: 'pending', label: 'Pending' },
            { value: 'reviewed', label: 'Reviewed' },
            { value: 'resolved', label: 'Resolved' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                color: filterStatus === filter.value ? colors.primary : colors.textSecondary,
                borderBottom: filterStatus === filter.value ? `2px solid ${colors.primary}` : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
        {reports.map((report) => (
          <div
            key={report.id}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '20px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary
              e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}20`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getStatusIcon(report.status)}
                <span style={getStatusBadge(report.status)}>{report.status}</span>
              </div>
              <button
                onClick={() => handleReviewReport(report)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: colors.card,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Eye size={16} />
                Review
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ color: colors.text, marginBottom: '4px', fontSize: '16px', fontWeight: '600' }}>
                {report.posts.title}
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
                by {report.posts.profiles.full_name}
              </p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Flag size={14} color={colors.textSecondary} />
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                  {getReasonLabel(report.reason)}
                </span>
              </div>
              {report.description && (
                <p style={{ color: colors.textSecondary, fontSize: '13px', marginLeft: '22px' }}>
                  {report.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: colors.textSecondary }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={12} />
                <span>{report.profiles_reporter.full_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                <span>{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {report.admin_action && (
              <div style={{ marginTop: '12px', padding: '8px', backgroundColor: colors.background, borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <CheckCircle size={12} color={colors.success} />
                  <span style={{ color: colors.success, fontSize: '12px', fontWeight: '500' }}>
                    {getActionLabel(report.admin_action)}
                  </span>
                </div>
                {report.admin_notes && (
                  <p style={{ color: colors.textSecondary, fontSize: '11px', marginLeft: '16px' }}>
                    {report.admin_notes}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Flag size={48} color={colors.textSecondary} style={{ marginBottom: '16px' }} />
          <h3 style={{ color: colors.text, marginBottom: '8px' }}>No Reports Found</h3>
          <p style={{ color: colors.textSecondary }}>
            {filterStatus === 'all' ? 'No reports have been submitted yet.' : `No ${filterStatus} reports found.`}
          </p>
        </div>
      )}

      {/* Review Modal */}
      {modalVisible && selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <h2 style={{ color: colors.text, marginBottom: '20px' }}>Review Report</h2>

            {/* Post Details */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: colors.background, borderRadius: '8px' }}>
              <h3 style={{ color: colors.text, marginBottom: '8px' }}>{selectedReport.posts.title}</h3>
              <p style={{ color: colors.textSecondary, marginBottom: '8px' }}>{selectedReport.posts.description}</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: colors.textSecondary }}>
                <span>Category: {selectedReport.posts.category}</span>
                <span>Status: {selectedReport.posts.status}</span>
                <span>Author: {selectedReport.posts.profiles.full_name}</span>
              </div>
            </div>

            {/* Report Details */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: colors.text, marginBottom: '8px' }}>Report Details</h4>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: colors.text }}>Reason:</strong>
                <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>
                  {getReasonLabel(selectedReport.reason)}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: colors.text }}>Reporter:</strong>
                <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>
                  {selectedReport.profiles_reporter.full_name}
                </span>
              </div>
              {selectedReport.description && (
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.text }}>Description:</strong>
                  <p style={{ color: colors.textSecondary, marginTop: '4px' }}>
                    {selectedReport.description}
                  </p>
                </div>
              )}
            </div>

            {/* Admin Action */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: colors.text, fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Admin Action
              </label>
              <select
                value={adminAction}
                onChange={(e) => setAdminAction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontSize: '14px',
                }}
              >
                <option value="">Select an action</option>
                <option value="no_action">No Action</option>
                <option value="post_removed">Remove Post</option>
                <option value="post_hidden">Hide Post</option>
                <option value="user_warned">Warn User</option>
                <option value="user_suspended">Suspend User</option>
              </select>
            </div>

            {/* Admin Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: colors.text, fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about the review decision..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalVisible(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={!adminAction || actionLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: adminAction ? colors.primary : colors.textSecondary,
                  color: colors.card,
                  cursor: adminAction ? 'pointer' : 'not-allowed',
                  opacity: adminAction ? 1 : 0.6,
                }}
              >
                {actionLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Nav>
  )
}
