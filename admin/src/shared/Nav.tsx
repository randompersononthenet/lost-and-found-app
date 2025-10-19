import React, { useState } from 'react'
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
						onClick={() => supabase.auth.signOut()}
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
		</div>
	)
} 