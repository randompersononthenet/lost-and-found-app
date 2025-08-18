import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Nav from '../shared/Nav'

export default function PostDetails() {
	const { id } = useParams()
	const [post, setPost] = useState<any>(null)

	useEffect(() => {
		async function load() {
			const { data } = await supabase
				.from('posts')
				.select('*, profiles(full_name)')
				.eq('id', id)
				.single()
			setPost(data)
		}
		load()
	}, [id])

	async function setStatus(status: 'active'|'resolved'|'claimed') {
		await supabase.from('posts').update({ status }).eq('id', id)
		const { data } = await supabase.from('posts').select('*, profiles(full_name)').eq('id', id).single()
		setPost(data)
	}

	if (!post) return <Nav title="Post"><div>Loading...</div></Nav>

	return (
		<Nav title="Post Details">
			<div className="card">
				<h2>{post.title}</h2>
				<div className="meta">By {post.profiles?.full_name || 'Unknown'} • {new Date(post.created_at).toLocaleString()}</div>
				<p>{post.description}</p>
				<div className="chips">
					<span className="chip">{post.category}</span>
					{post.item_category && <span className="chip">{post.item_category}</span>}
					<span className="chip">{post.status}</span>
				</div>
				<div className="actions">
					<button onClick={() => setStatus('active')}>Mark Active</button>
					<button onClick={() => setStatus('resolved')}>Mark Resolved</button>
					<button onClick={() => setStatus('claimed')}>Mark Claimed</button>
				</div>
			</div>
		</Nav>
	)
} 