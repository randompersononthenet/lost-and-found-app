import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

interface AppSettings {
	maintenance_banner_text: string | null
	maintenance_mode: boolean
}

interface Ctx {
	settings: AppSettings | null
	refresh: () => Promise<void>
}

const AppSettingsContext = createContext<Ctx | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
	const [settings, setSettings] = useState<AppSettings | null>(null)

	async function refresh() {
		const { data } = await supabase
			.from('app_settings')
			.select('maintenance_banner_text, maintenance_mode')
			.eq('id', 1)
			.single()
		setSettings(data as any)
	}

	useEffect(() => { refresh() }, [])

	return (
		<AppSettingsContext.Provider value={{ settings, refresh }}>
			{children}
		</AppSettingsContext.Provider>
	)
}

export function useAppSettings() {
	const ctx = useContext(AppSettingsContext)
	if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider')
	return ctx
} 