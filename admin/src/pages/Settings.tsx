import React, { useEffect, useState } from 'react'
import Nav from '../shared/Nav'
import { supabase } from '../supabase'

// Plan (step-by-step):
// 1) UI-only: Maintenance banner text + preview, Save button (done)
// 2) Add DB table `app_settings` and RLS; wire save/load (now)
// 3) Add global read-only toggle
// 4) Manage item categories list
// 5) Broadcast system notice

export default function Settings() {
	const [bannerText, setBannerText] = useState('')
	const [maintenanceMode, setMaintenanceMode] = useState(false)
	const [preview, setPreview] = useState('')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string|null>(null)

	useEffect(() => {
		async function loadSettings() {
			setLoading(true)
			setError(null)
			const { data, error } = await supabase
				.from('app_settings')
				.select('maintenance_banner_text, maintenance_mode')
				.eq('id', 1)
				.single()
			if (error) setError(error.message)
			if (data) {
				setBannerText(data.maintenance_banner_text || '')
				setMaintenanceMode(!!data.maintenance_mode)
			}
			setLoading(false)
		}
		loadSettings()
	}, [])

	function handlePreview() {
		setPreview(bannerText.trim())
	}

	async function handleSave() {
		setSaving(true)
		setError(null)
		const { error } = await supabase
			.from('app_settings')
			.update({ maintenance_banner_text: bannerText.trim(), maintenance_mode: maintenanceMode, updated_at: new Date().toISOString() })
			.eq('id', 1)
		if (error) setError(error.message)
		setSaving(false)
		alert(error ? `Save failed: ${error.message}` : 'Settings saved')
	}

	return (
		<Nav title="Settings">
			<div className="card" style={{ display: 'grid', gap: 12 }}>
				<h2>Maintenance Banner</h2>
				{loading ? (
					<div>Loading...</div>
				) : (
					<>
						<label>Banner text</label>
						<input value={bannerText} onChange={(e) => setBannerText(e.target.value)} placeholder="e.g., Scheduled maintenance at 10PM UTC" />
						<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} /> Maintenance mode
						</label>
						<div style={{ display: 'flex', gap: 8 }}>
							<button onClick={handlePreview}>Preview</button>
							<button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
						</div>
						{error && <div className="error">{error}</div>}
						{preview && (
							<div className="card" style={{ background: 'var(--surface)' }}>
								<strong>Preview:</strong> {preview}
							</div>
						)}
					</>
				)}
			</div>
		</Nav>
	)
} 