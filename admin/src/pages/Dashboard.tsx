import React, { useEffect, useState } from 'react'
import { useSession, supabase } from '../supabase'
import Nav from '../shared/Nav'
import { BarChart3, Users, MessageSquare, FileText, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react'

export default function Dashboard() {
	const { session } = useSession()
	const [stats, setStats] = useState({ posts: 0, users: 0, comments: 0, active: 0, resolved: 0 })
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function load() {
			setLoading(true)
			const [{ count: posts }, { count: users }, { count: comments }, activeRes, resolvedRes] = await Promise.all([
				supabase.from('posts').select('*', { count: 'exact', head: true }),
				supabase.from('profiles').select('*', { count: 'exact', head: true }),
				supabase.from('comments').select('*', { count: 'exact', head: true }),
				supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
				supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
			])
			setStats({ posts: posts || 0, users: users || 0, comments: comments || 0, active: activeRes?.count || 0, resolved: resolvedRes?.count || 0 })
			setLoading(false)
		}
		load()
	}, [session])

	const statCards = [
		{
			title: 'Total Posts',
			value: stats.posts,
			icon: FileText,
			color: 'var(--primary)',
			description: 'All posts in the system'
		},
		{
			title: 'Active Posts',
			value: stats.active,
			icon: Activity,
			color: 'var(--success)',
			description: 'Posts awaiting resolution'
		},
		{
			title: 'Resolved Posts',
			value: stats.resolved,
			icon: CheckCircle,
			color: 'var(--warning)',
			description: 'Successfully resolved posts'
		},
		{
			title: 'Total Users',
			value: stats.users,
			icon: Users,
			color: 'var(--primary)',
			description: 'Registered users'
		},
		{
			title: 'Comments',
			value: stats.comments,
			icon: MessageSquare,
			color: 'var(--primary)',
			description: 'Total comments made'
		}
	]

	const resolutionRate = stats.posts > 0 ? Math.round((stats.resolved / stats.posts) * 100) : 0

	return (
		<Nav title="Dashboard">
			<div className="dashboard-container">
				{loading ? (
					<div className="loading-state">
						<div className="loading-spinner"></div>
						<p>Loading dashboard...</p>
					</div>
				) : (
					<>
						<div className="dashboard-header">
							<div className="welcome-section">
								<h1>Welcome to RECALL Admin</h1>
								<p>Monitor and manage your lost & found platform</p>
							</div>
							<div className="overview-stats">
								<div className="overview-stat">
									<TrendingUp size={20} />
									<div>
										<span className="overview-label">Resolution Rate</span>
										<span className="overview-value">{resolutionRate}%</span>
									</div>
								</div>
							</div>
						</div>

						<div className="stats-grid">
							{statCards.map((stat, index) => {
								const IconComponent = stat.icon
								return (
									<div key={index} className="stat-card">
										<div className="stat-icon" style={{ backgroundColor: stat.color }}>
											<IconComponent size={24} />
										</div>
										<div className="stat-content">
											<div className="stat-value">{stat.value.toLocaleString()}</div>
											<div className="stat-title">{stat.title}</div>
											<div className="stat-description">{stat.description}</div>
										</div>
									</div>
								)
							})}
						</div>

						<div className="dashboard-insights">
							<div className="insight-card">
								<div className="insight-header">
									<BarChart3 size={20} />
									<h3>Quick Insights</h3>
								</div>
								<div className="insight-content">
									<div className="insight-item">
										<span className="insight-label">Active vs Resolved:</span>
										<span className="insight-value">{stats.active} active, {stats.resolved} resolved</span>
									</div>
									<div className="insight-item">
										<span className="insight-label">User Engagement:</span>
										<span className="insight-value">{stats.users > 0 ? Math.round(stats.comments / stats.users) : 0} avg comments per user</span>
									</div>
									<div className="insight-item">
										<span className="insight-label">System Health:</span>
										<span className="insight-value">{resolutionRate >= 50 ? 'Good' : 'Needs Attention'}</span>
									</div>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</Nav>
	)
} 