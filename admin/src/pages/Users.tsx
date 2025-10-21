import React, { useEffect, useState } from 'react'
import Nav from '../shared/Nav'
import { useSession, supabase } from '../supabase'
import { Users as UsersIcon, Shield, UserCheck, UserX, Crown, User as UserIcon, Calendar, FileText } from 'lucide-react'

type Role = 'user'|'moderator'|'admin'
interface Profile { 
	id: string; 
	full_name: string|null; 
	email?: string; 
	role: Role; 
	disabled: boolean;
	created_at?: string;
}

export default function Users() {
	const { role } = useSession()
	const [users, setUsers] = useState<Profile[]>([])
	const [loading, setLoading] = useState(true)
	const [inviteOpen, setInviteOpen] = useState(false)
	const [inviteEmail, setInviteEmail] = useState('')
	const [inviteLoading, setInviteLoading] = useState(false)
	const [inviteMessage, setInviteMessage] = useState<string>('')

	async function load() {
		setLoading(true)
		const { data } = await supabase.from('profiles').select('id, full_name, role, disabled, created_at').order('created_at', { ascending: false })
		setUsers((data as any) || [])
		setLoading(false)
	}
	useEffect(() => { load() }, [])

	async function setDisabled(id: string, disabled: boolean) {
		await supabase.from('profiles').update({ disabled }).eq('id', id)
		load()
	}
	async function setRole(id: string, role: Role) {
		await supabase.from('profiles').update({ role }).eq('id', id)
		load()
	}

	function getRoleBadge(role: Role) {
		const roleConfig = {
			admin: { class: 'badge error', text: 'Admin', icon: Crown },
			moderator: { class: 'badge warning', text: 'Moderator', icon: Shield },
			user: { class: 'badge', text: 'User', icon: UserIcon }
		}
		const config = roleConfig[role] || { class: 'badge', text: role, icon: UserIcon }
		const IconComponent = config.icon
		return (
			<span className={config.class}>
				<IconComponent size={12} />
				<span>{config.text}</span>
			</span>
		)
	}

	function getStatusBadge(disabled: boolean) {
		if (disabled) {
			return <span className="badge error"><UserX size={12} /><span>Disabled</span></span>
		}
		return <span className="badge success"><UserCheck size={12} /><span>Active</span></span>
	}

	function formatDate(dateString: string) {
		if (!dateString) return 'Unknown'
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	async function inviteUser() {
		setInviteMessage('')
		if (!inviteEmail.trim()) { setInviteMessage('Please enter an email.'); return }
		setInviteLoading(true)
		try {
			const redirectTo = `${window.location.origin}/admin`
			const { error } = await supabase.auth.signInWithOtp({
				email: inviteEmail.trim(),
				options: { emailRedirectTo: redirectTo }
			})
			if (error) throw error
			setInviteMessage('Invitation sent. The user will receive a sign-in link via email.')
			setInviteEmail('')
		} catch (e: any) {
			setInviteMessage(e?.message || 'Failed to send invitation.')
		} finally {
			setInviteLoading(false)
		}
	}

	if (role !== 'admin') return <Nav title="Users">Only admins can manage users.</Nav>

	return (
		<Nav title="Users">
			<div className="users-container">
				<div className="page-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
					<button className="action-btn success-btn" onClick={() => { setInviteOpen(true); setInviteMessage(''); }}>
						<span style={{ marginRight: 6 }}>+ Add User</span>
					</button>
				</div>

				{inviteOpen && (
					<div className="modal-overlay">
						<div className="modal-card">
							<h3 style={{ marginTop: 0 }}>Invite User</h3>
							<p className="text-secondary" style={{ marginTop: 0 }}>Send a magic link to let the user complete registration.</p>
							<label className="selector-label" htmlFor="invite-email">Email</label>
							<input
								id="invite-email"
								type="email"
								placeholder="name@example.com"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								className="text-input"
								style={{ width: '100%', marginBottom: 12 }}
							/>
							{inviteMessage && (<div style={{ marginBottom: 12 }} className="text-secondary">{inviteMessage}</div>)}
							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
								<button className="action-btn" onClick={() => setInviteOpen(false)} disabled={inviteLoading}>Cancel</button>
								<button className="action-btn success-btn" onClick={inviteUser} disabled={inviteLoading}>
									{inviteLoading ? 'Sending...' : 'Send Invite'}
								</button>
							</div>
						</div>
					</div>
				)}
				{loading ? (
					<div className="loading-state">
						<div className="loading-spinner"></div>
						<p>Loading users...</p>
					</div>
				) : users.length === 0 ? (
					<div className="empty-state">
						<UsersIcon size={48} color="var(--text-secondary)" />
						<h3>No users found</h3>
						<p>There are no users to display at the moment.</p>
					</div>
				) : (
					<div className="users-grid">
						{users.map(user => (
							<div key={user.id} className="user-card">
								<div className="user-header">
									<div className="user-info">
										<div className="user-avatar">
											<UserIcon size={20} />
										</div>
										<div className="user-details">
											<h3 className="user-name">{user.full_name || 'Unnamed User'}</h3>
											<div className="user-meta">
												<div className="meta-item">
													<Calendar size={14} />
													<span>Joined {formatDate(user.created_at || '')}</span>
												</div>
											</div>
										</div>
									</div>
									<div className="user-badges">
										{getRoleBadge(user.role)}
										{getStatusBadge(user.disabled)}
									</div>
								</div>

								<div className="user-details-section">
									<div className="detail-row">
										<span className="detail-label">User ID:</span>
										<span className="detail-value mono">{user.id}</span>
									</div>
									{user.email && (
										<div className="detail-row">
											<span className="detail-label">Email:</span>
											<span className="detail-value">{user.email}</span>
										</div>
									)}
								</div>

								<div className="user-actions">
									<div className="role-selector">
										<label className="selector-label">Role:</label>
										<select 
											value={user.role} 
											onChange={(e) => setRole(user.id, e.target.value as Role)}
											className="role-select"
										>
											<option value="user">User</option>
											<option value="moderator">Moderator</option>
											<option value="admin">Admin</option>
										</select>
									</div>
									{user.disabled ? (
										<button 
											className="action-btn success-btn" 
											onClick={() => setDisabled(user.id, false)}
										>
											<UserCheck size={16} />
											<span>Reactivate</span>
										</button>
									) : (
										<button 
											className="action-btn danger-btn" 
											onClick={() => setDisabled(user.id, true)}
										>
											<UserX size={16} />
											<span>Deactivate</span>
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</Nav>
	)
} 