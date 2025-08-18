import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type ThemeColors = {
	primary: string
	secondary: string
	accent: string
	background: string
	surface: string
	card: string
	text: string
	textSecondary: string
	border: string
	success: string
	warning: string
	error: string
}

type ThemeContextValue = {
	isDark: boolean
	colors: ThemeColors
	toggleTheme: () => void
}

const lightColors: ThemeColors = {
	primary: '#3B82F6',
	secondary: '#8B5CF6',
	accent: '#F97316',
	background: '#FFFFFF',
	surface: '#F8FAFC',
	card: '#FFFFFF',
	text: '#1F2937',
	textSecondary: '#6B7280',
	border: '#E5E7EB',
	success: '#10B981',
	warning: '#F59E0B',
	error: '#EF4444',
}

const darkColors: ThemeColors = {
	primary: '#3B82F6',
	secondary: '#8B5CF6',
	accent: '#F97316',
	background: '#0F172A',
	surface: '#1E293B',
	card: '#334155',
	text: '#F1F5F9',
	textSecondary: '#94A3B8',
	border: '#475569',
	success: '#10B981',
	warning: '#F59E0B',
	error: '#EF4444',
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyCssVariables(colors: ThemeColors, isDark: boolean) {
	const r = document.documentElement
	r.setAttribute('data-theme', isDark ? 'dark' : 'light')
	r.style.setProperty('--primary', colors.primary)
	r.style.setProperty('--secondary', colors.secondary)
	r.style.setProperty('--accent', colors.accent)
	r.style.setProperty('--background', colors.background)
	r.style.setProperty('--surface', colors.surface)
	r.style.setProperty('--card', colors.card)
	r.style.setProperty('--text', colors.text)
	r.style.setProperty('--text-secondary', colors.textSecondary)
	r.style.setProperty('--border', colors.border)
	r.style.setProperty('--success', colors.success)
	r.style.setProperty('--warning', colors.warning)
	r.style.setProperty('--error', colors.error)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [isDark, setIsDark] = useState(false)

	useEffect(() => {
		const saved = localStorage.getItem('admin-theme')
		if (saved === 'dark') setIsDark(true)
	}, [])

	const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark])

	useEffect(() => {
		applyCssVariables(colors, isDark)
		localStorage.setItem('admin-theme', isDark ? 'dark' : 'light')
	}, [colors, isDark])

	function toggleTheme() {
		setIsDark((v) => !v)
	}

	return (
		<ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}

export function useTheme() {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
	return ctx
} 