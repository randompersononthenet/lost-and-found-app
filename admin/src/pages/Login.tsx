import React, { useState } from 'react'
import { useSession, supabase } from '../supabase'
import { LogIn } from 'lucide-react'
import { Navigate } from 'react-router-dom'

export default function Login() {
	const { session } = useSession()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	if (session) return <Navigate to="/" replace />

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setError(null)
		const { error } = await supabase.auth.signInWithPassword({ email, password })
		if (error) setError(error.message)
		setLoading(false)
	}

	return (
		<div className="centered">
			<form className="card" onSubmit={handleLogin}>
				<div style={{ textAlign: 'center', marginBottom: '24px' }}>
					<img 
						src="/assets/images/icon.png" 
						alt="RECALL Logo" 
						style={{ 
							width: '64px', 
							height: '64px', 
							marginBottom: '16px',
							borderRadius: '12px'
						}} 
					/>
					<h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: 'var(--text)' }}>RECALL</h1>
					<p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '14px' }}>Lost & Found Admin Panel</p>
				</div>
				<label>Email</label>
				<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				<label>Password</label>
				<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
				{error && <div className="error">{error}</div>}
				<button className="primary" type="submit" disabled={loading}>
					<LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
				</button>
			</form>
		</div>
	)
} 