import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Nav from '../shared/Nav'
import { X, MapPin, Calendar } from 'lucide-react'

export default function PostDetails() {
	const { id } = useParams()
	const [post, setPost] = useState<any>(null)
	const [selectedImage, setSelectedImage] = useState<string | null>(null)
	const [imageModalVisible, setImageModalVisible] = useState(false)

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

	function openImageModal(imageUrl: string) {
		setSelectedImage(imageUrl)
		setImageModalVisible(true)
	}

	function closeImageModal() {
		setImageModalVisible(false)
		setSelectedImage(null)
	}

	if (!post) return <Nav title="Post"><div>Loading...</div></Nav>

	return (
		<Nav title="Post Details">
			<div className="card">
				<h2>{post.title}</h2>
				<div className="meta">By {post.profiles?.full_name || 'Unknown'} • {new Date(post.created_at).toLocaleString()}</div>
				<p>{post.description}</p>
				
				{/* Location and Date */}
				{(post.location || post.date_lost_found) && (
					<div style={{ margin: '16px 0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
						{post.location && (
							<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
								<MapPin size={14} />
								<span>{post.location}</span>
							</div>
						)}
						{post.date_lost_found && (
							<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
								<Calendar size={14} />
								<span>{new Date(post.date_lost_found).toLocaleDateString()}</span>
							</div>
						)}
					</div>
				)}

				{/* Images */}
				{post.images && post.images.length > 0 && (
					<div style={{ margin: '16px 0' }}>
						<h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Images ({post.images.length})</h3>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
							{post.images.map((imageUrl: string, index: number) => (
								<div
									key={index}
									onClick={() => openImageModal(imageUrl)}
									style={{
										aspectRatio: '1',
										borderRadius: '8px',
										overflow: 'hidden',
										cursor: 'pointer',
										border: '1px solid var(--border)',
										transition: 'transform 0.2s ease, box-shadow 0.2s ease'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'scale(1.02)'
										e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = 'scale(1)'
										e.currentTarget.style.boxShadow = 'none'
									}}
								>
									<img
										src={imageUrl}
										alt={`Post image ${index + 1}`}
										style={{
											width: '100%',
											height: '100%',
											objectFit: 'cover'
										}}
									/>
								</div>
							))}
						</div>
					</div>
				)}

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

			{/* Image Modal */}
			{imageModalVisible && selectedImage && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.9)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
						padding: '20px'
					}}
					onClick={closeImageModal}
				>
					<div
						style={{
							position: 'relative',
							maxWidth: '90vw',
							maxHeight: '90vh',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={closeImageModal}
							style={{
								position: 'absolute',
								top: '-40px',
								right: '0',
								background: 'rgba(255, 255, 255, 0.2)',
								border: 'none',
								borderRadius: '50%',
								width: '32px',
								height: '32px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								cursor: 'pointer',
								color: 'white'
							}}
						>
							<X size={20} />
						</button>
						<img
							src={selectedImage}
							alt="Full size post image"
							style={{
								maxWidth: '100%',
								maxHeight: '100%',
								objectFit: 'contain',
								borderRadius: '8px'
							}}
						/>
					</div>
				</div>
			)}
		</Nav>
	)
} 