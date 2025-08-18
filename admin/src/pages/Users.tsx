import React, { useEffect, useState } from 'react'
import Nav from '../shared/Nav'
import { useSession, supabase } from '../supabase'

type Role = 'user'|'moderator'|'admin'
interface Profile { id: string; full_name: string|null; email?: string; role: Role; disabled: boolean }

export default function Users() {
	const { role } = useSession()
	const [users, setUsers] = useState<Profile[]>([])
	const [loading, setLoading] = useState(true)

	async function load() {
		setLoading(true)
		const { data } = await supabase.from('profiles').select('id, full_name, role, disabled')
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

	if (role !== 'admin') return <Nav title="Users">Only admins can manage users.</Nav>

	return (
		<Nav title="Users">
			<table className="table">
				<thead>
					<tr>
						<th>User</th>
						<th>Role</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr><td colSpan={4}>Loading...</td></tr>
					) : users.length === 0 ? (
						<tr><td colSpan={4}>No users found.</td></tr>
					) : users.map(u => (
						<tr key={u.id}>
							<td className="mono">{u.id}</td>
							<td>
								<select value={u.role} onChange={(e) => setRole(u.id, e.target.value as Role)}>
									<option value="user">user</option>
									<option value="moderator">moderator</option>
									<option value="admin">admin</option>
								</select>
							</td>
							<td>{u.disabled ? 'disabled' : 'active'}</td>
							<td className="actions">
								{u.disabled ? (
									<button onClick={() => setDisabled(u.id, false)}>Reactivate</button>
								) : (
									<button className="danger" onClick={() => setDisabled(u.id, true)}>Deactivate</button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Nav>
	)
} 