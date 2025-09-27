import React, { useEffect, useState } from 'react'
import Nav from '../shared/Nav'
import { supabase } from '../supabase'
import { MessageSquare, Calendar, User, Trash2, Eye, FileText } from 'lucide-react'

interface Comment { 
	id: string; 
	content: string; 
	created_at: string; 
	post_id: string;
	profiles?: { full_name: string };
	posts?: { title: string };
}

export default function Comments() {
	const [comments, setComments] = useState<Comment[]>([])
	const [loading, setLoading] = useState(true)

	async function load() {
		setLoading(true)
		const { data } = await supabase
			.from('comments')
			.select('id, content, created_at, post_id, profiles(full_name), posts(title)')
			.order('created_at', { ascending: false })
		setComments(data || [])
		setLoading(false)
	}

	useEffect(() => { load() }, [])

	async function remove(id: string) {
		await supabase.from('comments').delete().eq('id', id)
		load()
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

	function truncateText(text: string, maxLength: number = 150) {
		if (text.length <= maxLength) return text
		return text.substring(0, maxLength) + '...'
	}

	return (
		<Nav title="Comments">
			<div className="comments-container">
				{loading ? (
					<div className="loading-state">
						<div className="loading-spinner"></div>
						<p>Loading comments...</p>
					</div>
				) : comments.length === 0 ? (
					<div className="empty-state">
						<MessageSquare size={48} color="var(--text-secondary)" />
						<h3>No comments found</h3>
						<p>There are no comments to display at the moment.</p>
					</div>
				) : (
					<div className="comments-grid">
						{comments.map(comment => (
							<div key={comment.id} className="comment-card">
								<div className="comment-header">
									<div className="comment-meta">
										<div className="meta-item">
											<User size={14} />
											<span>{comment.profiles?.full_name || 'Unknown User'}</span>
										</div>
										<div className="meta-item">
											<Calendar size={14} />
											<span>{formatDate(comment.created_at)}</span>
										</div>
									</div>
									<div className="comment-badge">
										<MessageSquare size={14} />
										<span>Comment</span>
									</div>
								</div>

								<div className="comment-content">
									<p>{truncateText(comment.content)}</p>
								</div>

								<div className="comment-details">
									<div className="detail-row">
										<span className="detail-label">Post:</span>
										<span className="detail-value">{comment.posts?.title || `Post ID: ${comment.post_id}`}</span>
									</div>
									<div className="detail-row">
										<span className="detail-label">Comment ID:</span>
										<span className="detail-value mono">{comment.id}</span>
									</div>
								</div>

								<div className="comment-actions">
									<button 
										className="action-btn danger-btn" 
										onClick={() => remove(comment.id)}
									>
										<Trash2 size={16} />
										<span>Delete Comment</span>
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