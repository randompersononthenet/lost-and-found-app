import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Role = 'user' | 'moderator' | 'admin' | null

interface SupabaseContextValue {
	session: Session | null
	role: Role
	client: SupabaseClient
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
	const [session, setSession] = useState<Session | null>(null)
	const [role, setRole] = useState<Role>(null)

	useEffect(() => {
		const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
		supabase.auth.getSession().then(({ data }) => setSession(data.session))
		return () => authListener.subscription.unsubscribe()
	}, [])

	useEffect(() => {
		async function fetchRole() {
			if (!session?.user) { setRole(null); return }
			const { data, error } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', session.user.id)
				.single()
			if (!error) setRole((data?.role as Role) ?? null)
		}
		fetchRole()
	}, [session])

	return (
		<SupabaseContext.Provider value={{ session, role, client: supabase }}>
			{children}
		</SupabaseContext.Provider>
	)
}

export function useSession() {
	const ctx = useContext(SupabaseContext)
	if (!ctx) throw new Error('useSession must be used within SupabaseProvider')
	return ctx
} 