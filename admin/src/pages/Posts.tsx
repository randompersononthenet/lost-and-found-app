import React, { useEffect, useState } from 'react'
import { useSession, supabase } from '../supabase'
import Nav from '../shared/Nav'
import { Link } from 'react-router-dom'
import { Eye, CheckCircle, RotateCcw, Trash2, Calendar, User, FileText } from 'lucide-react'

interface Post { 
	id: string; 
	title: string; 
	status: 'active'|'resolved'|'claimed'; 
	category: 'lost'|'found'; 
	item_category?: string; 
	created_at: string; 
	user_id: string;
	profiles?: { full_name: string };
}

export default function Posts() {
	const { session } = useSession()
	const [posts, setPosts] = useState<Post[]>([])
	const [loading, setLoading] = useState(true)

	async function load() {
		setLoading(true)
		const { data } = await supabase
			.from('posts')
			.select('id,title,status,category,item_category,created_at,user_id,profiles(full_name)')
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

	function getStatusBadge(status: string) {
		const statusConfig = {
			active: { class: 'badge success', text: 'Active' },
			resolved: { class: 'badge', text: 'Resolved' },
			claimed: { class: 'badge warning', text: 'Claimed' }
		}
		const config = statusConfig[status as keyof typeof statusConfig] || { class: 'badge', text: status }
		return <span className={config.class}>{config.text}</span>
	}

	function getCategoryBadge(category: string) {
		const categoryConfig = {
			lost: { class: 'badge error', text: 'Lost' },
			found: { class: 'badge success', text: 'Found' }
		}
		const config = categoryConfig[category as keyof typeof categoryConfig] || { class: 'badge', text: category }
		return <span className={config.class}>{config.text}</span>
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	return (
		<Nav title="Posts">
			<div className="posts-container">
				{loading ? (
					<div className="loading-state">
						<div className="loading-spinner"></div>
						<p>Loading posts...</p>
					</div>
				) : posts.length === 0 ? (
					<div className="empty-state">
						<FileText size={48} color="var(--text-secondary)" />
						<h3>No posts found</h3>
						<p>There are no posts to display at the moment.</p>
					</div>
				) : (
					<div className="posts-grid">
						{posts.map(post => (
							<div key={post.id} className="post-card">
								<div className="post-header">
									<div className="post-title-section">
										<h3 className="post-title">{post.title}</h3>
										<div className="post-meta">
											<div className="meta-item">
												<User size={14} />
												<span>{post.profiles?.full_name || 'Unknown User'}</span>
											</div>
											<div className="meta-item">
												<Calendar size={14} />
												<span>{formatDate(post.created_at)}</span>
											</div>
										</div>
									</div>
									<div className="post-badges">
										{getStatusBadge(post.status)}
										{getCategoryBadge(post.category)}
									</div>
								</div>

								<div className="post-details">
									<div className="detail-row">
										<span className="detail-label">Item Type:</span>
										<span className="detail-value">{post.item_category || 'Not specified'}</span>
									</div>
								</div>

								<div className="post-actions">
									<Link to={`/posts/${post.id}`} className="action-btn view-btn">
										<Eye size={16} />
										<span>View Details</span>
									</Link>
									{post.status !== 'resolved' ? (
										<button 
											className="action-btn success-btn" 
											onClick={() => markResolved(post.id)}
										>
											<CheckCircle size={16} />
											<span>Mark Resolved</span>
										</button>
									) : (
										<button 
											className="action-btn warning-btn" 
											onClick={() => markActive(post.id)}
										>
											<RotateCcw size={16} />
											<span>Mark Active</span>
										</button>
									)}
									<button 
										className="action-btn danger-btn" 
										onClick={() => remove(post.id)}
									>
										<Trash2 size={16} />
										<span>Delete</span>
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</Nav>
	)
} 