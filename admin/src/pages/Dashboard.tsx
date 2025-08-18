import React, { useEffect, useState } from 'react'
import { useSession, supabase } from '../supabase'
import Nav from '../shared/Nav'

export default function Dashboard() {
	const { session } = useSession()
	const [stats, setStats] = useState({ posts: 0, users: 0, comments: 0, active: 0, resolved: 0 })

	useEffect(() => {
		async function load() {
			const [{ count: posts }, { count: users }, { count: comments }, activeRes, resolvedRes] = await Promise.all([
				supabase.from('posts').select('*', { count: 'exact', head: true }),
				supabase.from('profiles').select('*', { count: 'exact', head: true }),
				supabase.from('comments').select('*', { count: 'exact', head: true }),
				supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
				supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
			])
			setStats({ posts: posts || 0, users: users || 0, comments: comments || 0, active: activeRes?.count || 0, resolved: resolvedRes?.count || 0 })
		}
		load()
	}, [session])

	return (
		<Nav title="Dashboard">
			<div className="grid">
				<div className="stat"><div className="stat-label">Total Posts</div><div className="stat-value">{stats.posts}</div></div>
				<div className="stat"><div className="stat-label">Active</div><div className="stat-value">{stats.active}</div></div>
				<div className="stat"><div className="stat-label">Resolved</div><div className="stat-value">{stats.resolved}</div></div>
				<div className="stat"><div className="stat-label">Users</div><div className="stat-value">{stats.users}</div></div>
				<div className="stat"><div className="stat-label">Comments</div><div className="stat-value">{stats.comments}</div></div>
			</div>
		</Nav>
	)
} 