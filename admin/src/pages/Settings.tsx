import React, { useEffect, useState } from 'react'
import Nav from '../shared/Nav'
import { supabase } from '../supabase'
import { Settings as SettingsIcon, Save, Eye, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react'

// Plan (step-by-step):
// 1) UI-only: Maintenance banner text + preview, Save button (done)
// 2) Add DB table `app_settings` and RLS; wire save/load (now)
// 3) Add global read-only toggle
// 4) Manage item categories list
// 5) Broadcast system notice

export default function Settings() {
	const [bannerText, setBannerText] = useState('')
	const [maintenanceMode, setMaintenanceMode] = useState(false)
	const [downloadUrl, setDownloadUrl] = useState('')
	const [maintenanceLevel, setMaintenanceLevel] = useState<'banner' | 'full_lockout'>('banner')
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
				.select('maintenance_banner_text, maintenance_mode, download_url, maintenance_level')
				.eq('id', 1)
				.single()
			if (error) setError(error.message)
			if (data) {
				setBannerText(data.maintenance_banner_text || '')
				setMaintenanceMode(!!data.maintenance_mode)
				setDownloadUrl(data.download_url || '')
				setMaintenanceLevel((data.maintenance_level as any) === 'full_lockout' ? 'full_lockout' : 'banner')
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
			.update({ maintenance_banner_text: bannerText.trim(), maintenance_mode: maintenanceMode, maintenance_level: maintenanceLevel, download_url: downloadUrl.trim() || null, updated_at: new Date().toISOString() })
			.eq('id', 1)
		if (error) setError(error.message)
		setSaving(false)
		alert(error ? `Save failed: ${error.message}` : 'Settings saved')
	}

	return (
		<Nav title="Settings">
			<div className="settings-container">
				<div className="settings-header">
					<div className="settings-title">
						<SettingsIcon size={24} />
						<h1>System Settings</h1>
					</div>
					<p>Configure maintenance mode and system-wide notifications</p>
				</div>

				<div className="settings-grid">
					<div className="settings-card">
						<div className="card-header">
							<div className="card-title">
								<AlertTriangle size={20} />
								<h2>Maintenance Banner</h2>
							</div>
							<p>Configure system-wide maintenance notifications</p>
						</div>

						{loading ? (
							<div className="loading-state">
								<Loader2 size={20} className="loading-spinner" />
								<span>Loading settings...</span>
							</div>
						) : (
							<div className="card-content">
								<div className="form-group">
									<label className="form-label">Banner Text</label>
									<textarea
										className="form-textarea"
										value={bannerText}
										onChange={(e) => setBannerText(e.target.value)}
										placeholder="e.g., Scheduled maintenance at 10PM UTC - System will be temporarily unavailable"
										rows={3}
									/>
									<div className="form-hint">
										<Info size={14} />
										<span>This message will be displayed to all users when maintenance mode is enabled</span>
									</div>
								</div>

								<div className="form-group">
									<label className="form-label">Mobile Download URL (web banner)</label>
									<input
										type="url"
										className="form-input"
										placeholder="https://expo.dev/accounts/.../projects/.../builds/..."
										value={downloadUrl}
										onChange={(e) => setDownloadUrl(e.target.value)}
									/>
									<div className="form-hint">
										<Info size={14} />
										<span>Shown only on the web client as a floating “Download App” button. Leave blank to hide.</span>
									</div>
								</div>

								<div className="form-group">
									<label className="form-label">Maintenance Level</label>
									<select
										className="form-select"
										value={maintenanceLevel}
										onChange={(e) => setMaintenanceLevel((e.target.value as 'banner' | 'full_lockout'))}
									>
										<option value="banner">Banner only (app usable)</option>
										<option value="full_lockout">Full lockout (show maintenance screen)</option>
									</select>
									<div className="form-hint">
										<Info size={14} />
										<span>Choose how maintenance is applied. Toggle "Enable Maintenance Mode" to activate.</span>
									</div>
								</div>

								<div className="form-group">
									<label className="checkbox-label">
										<input
											type="checkbox"
											checked={maintenanceMode}
											onChange={(e) => setMaintenanceMode(e.target.checked)}
											className="checkbox-input"
										/>
										<span className="checkbox-custom"></span>
										<div className="checkbox-content">
											<span className="checkbox-title">Enable Maintenance Mode</span>
											<span className="checkbox-description">Show maintenance banner to all users</span>
										</div>
									</label>
								</div>

								{error && (
									<div className="error-message">
										<AlertTriangle size={16} />
										<span>{error}</span>
									</div>
								)}

								<div className="form-actions">
									<button 
										className="action-btn secondary-btn" 
										onClick={handlePreview}
									>
										<Eye size={16} />
										<span>Preview</span>
									</button>
									<button 
										className="action-btn primary-btn" 
										onClick={handleSave} 
										disabled={saving}
									>
										{saving ? <Loader2 size={16} className="loading-spinner" /> : <Save size={16} />}
										<span>{saving ? 'Saving...' : 'Save Settings'}</span>
									</button>
								</div>

								{preview && (
									<div className="preview-section">
										<div className="preview-header">
											<Eye size={16} />
											<span>Preview</span>
										</div>
										<div className="preview-content">
											<AlertTriangle size={16} />
											<span>{preview}</span>
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="settings-card">
						<div className="card-header">
							<div className="card-title">
								<CheckCircle size={20} />
								<h2>System Status</h2>
							</div>
							<p>Current system configuration</p>
						</div>
						<div className="card-content">
							<div className="status-item">
								<span className="status-label">Maintenance Mode:</span>
								<span className={`status-value ${maintenanceMode ? 'status-warning' : 'status-success'}`}>
									{maintenanceMode ? 'Enabled' : 'Disabled'}
								</span>
							</div>
							<div className="status-item">
								<span className="status-label">Banner Text:</span>
								<span className="status-value">
									{bannerText.trim() ? `${bannerText.length} characters` : 'Not set'}
								</span>
							</div>
							<div className="status-item">
								<span className="status-label">Download URL:</span>
								<span className="status-value">
									{downloadUrl.trim() ? 'Configured' : 'Not set'}
								</span>
							</div>
							<div className="status-item">
								<span className="status-label">Maintenance Level:</span>
								<span className="status-value">{maintenanceLevel === 'full_lockout' ? 'Full lockout' : 'Banner only'}</span>
							</div>
							<div className="status-item">
								<span className="status-label">Last Updated:</span>
								<span className="status-value">Just now</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Nav>
	)
} 