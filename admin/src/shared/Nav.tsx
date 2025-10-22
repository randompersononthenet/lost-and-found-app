import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSession, supabase } from '../supabase'
import { useTheme } from '../theme'
import { useAppSettings } from '../appSettings'
import { Moon, Sun, Menu, X, Home, FileText, MessageSquare, Users, Settings, LogOut, ChevronLeft, ChevronRight, Flag } from 'lucide-react'

export default function Nav({ title, children }: { title: string, children: React.ReactNode }) {
	const { pathname } = useLocation()
	const { toggleTheme, isDark } = useTheme()
	const { settings } = useAppSettings()
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [confirmSignOut, setConfirmSignOut] = useState(false)

	useEffect(() => {
		if (!confirmSignOut) return
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setConfirmSignOut(false)
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [confirmSignOut])

	const navigationItems = [
		{ path: '/', label: 'Dashboard', icon: Home },
		{ path: '/posts', label: 'Posts', icon: FileText },
		{ path: '/comments', label: 'Comments', icon: MessageSquare },
		{ path: '/users', label: 'Users', icon: Users },
		{ path: '/reports', label: 'Reports', icon: Flag },
		{ path: '/settings', label: 'Settings', icon: Settings },
	]

	return (
		<div className="admin-layout">
			{/* Sidebar */}
			<aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
				<div className="sidebar-header">
					{!sidebarCollapsed && (
						<div className="brand">
							<img src="/assets/images/icon.png" alt="RECLAIM" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
							<span className="brand-text">RECLAIM</span>
						</div>
					)}
					<button 
						className="collapse-btn" 
						onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
						aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					>
						{sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
					</button>
				</div>

				<nav className="sidebar-nav">
					{navigationItems.map(({ path, label, icon: Icon }) => (
						<Link 
							key={path}
							to={path} 
							className={`nav-item ${pathname === path || (path !== '/' && pathname.startsWith(path)) ? 'active' : ''}`}
							title={sidebarCollapsed ? label : undefined}
						>
							<Icon size={20} />
							{!sidebarCollapsed && <span>{label}</span>}
						</Link>
					))}
				</nav>

				<div className="sidebar-footer">
					<button 
						className="nav-item theme-toggle" 
						onClick={toggleTheme}
						title={sidebarCollapsed ? (isDark ? 'Switch to Light' : 'Switch to Dark') : undefined}
					>
						{isDark ? <Sun size={20} /> : <Moon size={20} />}
						{!sidebarCollapsed && <span>{isDark ? 'Light' : 'Dark'}</span>}
					</button>
					<button 
						className="nav-item sign-out" 
						onClick={() => setConfirmSignOut(true)}
						title={sidebarCollapsed ? 'Sign Out' : undefined}
					>
						<LogOut size={20} />
						{!sidebarCollapsed && <span>Sign Out</span>}
					</button>
				</div>
			</aside>

			{/* Main Content */}
			<div className="main-content">
				{settings?.maintenance_mode && (
					<div className="maintenance-banner">
						{settings.maintenance_banner_text || 'Maintenance mode is active.'}
					</div>
				)}
				<main className="content">
					<div className="page-header">
						<h1>{title}</h1>
					</div>
					{children}
				</main>
			</div>

			{confirmSignOut && (
				<div
					className="modal-overlay"
					style={{
						position: 'fixed',
						inset: 0,
						backgroundColor: 'rgba(0,0,0,0.45)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
					}}
					onClick={() => setConfirmSignOut(false)}
				>
					<div
						className="modal-card"
						style={{
							width: '90%',
							maxWidth: 420,
							background: 'var(--card, #fff)',
							border: '1px solid var(--border, #e5e7eb)',
							borderRadius: 12,
							padding: 20,
							boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 style={{ marginTop: 0 }}>Sign out</h3>
						<p className="text-secondary">Are you sure you want to sign out?</p>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
							<button className="action-btn" onClick={() => setConfirmSignOut(false)}>Cancel</button>
							<button className="action-btn danger-btn" onClick={() => { setConfirmSignOut(false); supabase.auth.signOut() }}>Sign Out</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
} 