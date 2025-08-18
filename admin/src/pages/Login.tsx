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
				<h1>Admin Login</h1>
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