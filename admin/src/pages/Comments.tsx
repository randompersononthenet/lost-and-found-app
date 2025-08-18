import React, { useEffect, useState } from 'react'
import Nav from '../shared/Nav'
import { supabase } from '../supabase'

interface Comment { id: string; content: string; created_at: string; post_id: string }

export default function Comments() {
	const [comments, setComments] = useState<Comment[]>([])
	const [loading, setLoading] = useState(true)

	async function load() {
		setLoading(true)
		const { data } = await supabase
			.from('comments')
			.select('id, content, created_at, post_id')
			.order('created_at', { ascending: false })
		setComments(data || [])
		setLoading(false)
	}

	useEffect(() => { load() }, [])

	async function remove(id: string) {
		await supabase.from('comments').delete().eq('id', id)
		load()
	}

	return (
		<Nav title="Comments">
			<table className="table">
				<thead>
					<tr>
						<th>Comment</th>
						<th>Post</th>
						<th>Created</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr><td colSpan={4}>Loading...</td></tr>
					) : comments.length === 0 ? (
						<tr><td colSpan={4}>No comments found.</td></tr>
					) : comments.map(c => (
						<tr key={c.id}>
							<td className="truncate">{c.content}</td>
							<td className="mono">{c.post_id}</td>
							<td>{new Date(c.created_at).toLocaleString()}</td>
							<td className="actions"><button className="danger" onClick={() => remove(c.id)}>Delete</button></td>
						</tr>
					))}
				</tbody>
			</table>
		</Nav>
	)
} 