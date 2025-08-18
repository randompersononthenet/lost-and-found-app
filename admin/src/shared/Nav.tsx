import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSession, supabase } from '../supabase'
import { useTheme } from '../theme'
import { useAppSettings } from '../appSettings'
import { Moon, Sun } from 'lucide-react'

export default function Nav({ title, children }: { title: string, children: React.ReactNode }) {
	const { pathname } = useLocation()
	const { toggleTheme, isDark } = useTheme()
	const { settings } = useAppSettings()
	return (
		<div>
			<header className="topbar">
				<nav>
					<Link to="/" className={pathname === '/' ? 'active' : ''}>Dashboard</Link>
					<Link to="/posts" className={pathname.startsWith('/posts') ? 'active' : ''}>Posts</Link>
					<Link to="/comments" className={pathname === '/comments' ? 'active' : ''}>Comments</Link>
					<Link to="/users" className={pathname === '/users' ? 'active' : ''}>Users</Link>
					<Link to="/settings" className={pathname === '/settings' ? 'active' : ''}>Settings</Link>
				</nav>
				<div className="spacer" />
				<button onClick={toggleTheme} aria-label="Toggle theme">
					{isDark ? <Sun size={16} /> : <Moon size={16} />}
					{isDark ? 'Light' : 'Dark'}
				</button>
				<button onClick={() => supabase.auth.signOut()}>Sign Out</button>
			</header>
			{settings?.maintenance_mode && (
				<div style={{ background: 'var(--warning)', color: '#111', padding: 8, textAlign: 'center' }}>
					{settings.maintenance_banner_text || 'Maintenance mode is active.'}
				</div>
			)}
			<main className="container">
				<h1>{title}</h1>
				{children}
			</main>
		</div>
	)
} 