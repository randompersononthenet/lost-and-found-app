import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { SupabaseProvider, useSession } from './supabase'
import { ThemeProvider } from './theme'
import { AppSettingsProvider } from './appSettings'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import PostDetails from './pages/PostDetails'
import Comments from './pages/Comments'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'
import './styles.css'

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
	const { session, role } = useSession()
	if (!session) return <Navigate to="/login" replace />
	if (requireAdmin && role !== 'admin') return <Navigate to="/" replace />
	return <>{children}</>
}

const router = createBrowserRouter([
	{ path: '/login', element: <Login /> },
	{ path: '/', element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
	{ path: '/posts', element: <ProtectedRoute><Posts /></ProtectedRoute> },
	{ path: '/posts/:id', element: <ProtectedRoute><PostDetails /></ProtectedRoute> },
	{ path: '/comments', element: <ProtectedRoute><Comments /></ProtectedRoute> },
	{ path: '/users', element: <ProtectedRoute requireAdmin><Users /></ProtectedRoute> },
	{ path: '/settings', element: <ProtectedRoute requireAdmin><Settings /></ProtectedRoute> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<ThemeProvider>
			<SupabaseProvider>
				<AppSettingsProvider>
					<RouterProvider router={router} />
				</AppSettingsProvider>
			</SupabaseProvider>
		</ThemeProvider>
	</React.StrictMode>
) 