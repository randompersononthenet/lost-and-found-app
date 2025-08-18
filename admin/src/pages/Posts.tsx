import React, { useEffect, useState } from 'react'
import { useSession, supabase } from '../supabase'
import Nav from '../shared/Nav'
import { Link } from 'react-router-dom'

interface Post { id: string; title: string; status: 'active'|'resolved'|'claimed'; category: 'lost'|'found'; item_category?: string; created_at: string; user_id: string }

export default function Posts() {
	const { session } = useSession()
	const [posts, setPosts] = useState<Post[]>([])
	const [loading, setLoading] = useState(true)

	async function load() {
		setLoading(true)
		const { data } = await supabase
			.from('posts')
			.select('id,title,status,category,item_category,created_at,user_id')
			.order('created_at', { ascending: false })
		setPosts(data || [])
		setLoading(false)
	}

	useEffect(() => { load() }, [session])

	async function markResolved(id: string) {
		await supabase.from('posts').update({ status: 'resolved' }).eq('id', id)
		load()
	}
	async function markActive(id: string) {
		await supabase.from('posts').update({ status: 'active' }).eq('id', id)
		load()
	}
	async function remove(id: string) {
		await supabase.from('posts').delete().eq('id', id)
		load()
	}

	return (
		<Nav title="Posts">
			<table className="table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Status</th>
						<th>Category</th>
						<th>Item Type</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr><td colSpan={5}>Loading...</td></tr>
					) : posts.length === 0 ? (
						<tr><td colSpan={5}>No posts found.</td></tr>
					) : posts.map(p => (
						<tr key={p.id}>
							<td><Link to={`/posts/${p.id}`}>{p.title}</Link></td>
							<td>{p.status}</td>
							<td>{p.category}</td>
							<td>{p.item_category || '-'}</td>
							<td className="actions">
								{p.status !== 'resolved' ? (
									<button onClick={() => markResolved(p.id)}>Mark Resolved</button>
								) : (
									<button onClick={() => markActive(p.id)}>Mark Active</button>
								)}
								<button className="danger" onClick={() => remove(p.id)}>Delete</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Nav>
	)
} 