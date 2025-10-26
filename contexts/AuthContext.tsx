import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  birthday?: string;
  gender?: string;
  year_level?: string;
  section?: string;
  course?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deactivateAccount: (password: string) => Promise<void>;
  isPasswordResetFlow: boolean;
  completePasswordReset: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);

  const loadProfile = async (userId: string) => {
    if (!mounted.current) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is expected for new users
          setProfile(null);
          return;
        }
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      // Check if the caught error is the PGRST116 error and suppress it
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
        setProfile(null);
        return;
      }
      // Log other unexpected errors
      if (error) {
        console.error('Error loading profile:', error);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const parsed = Linking.parse(initialUrl);
          const type = (parsed.queryParams as any)?.type;
          const code = (parsed.queryParams as any)?.code as string | undefined;
          if (type === 'recovery' && code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) setIsPasswordResetFlow(true);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordResetFlow(true);
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        if (mounted.current) {
          setLoading(false);
        }
      }
    );

    const urlListener = Linking.addEventListener('url', async ({ url }) => {
      try {
        const parsed = Linking.parse(url);
        const type = (parsed.queryParams as any)?.type;
        const code = (parsed.queryParams as any)?.code as string | undefined;
        if (type === 'recovery' && code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) setIsPasswordResetFlow(true);
        }
      } catch (e) {}
    });

    return () => {
      subscription.unsubscribe();
      urlListener.remove();
      mounted.current = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!email.endsWith('.edu') && !email.endsWith('.edu.ph')) {
      throw new Error('Please use your educational email address (.edu or .edu.ph)');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!email.endsWith('.edu') && !email.endsWith('.edu.ph')) {
      throw new Error('Please use your educational email address (.edu or .edu.ph)');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;

    if (authData.user) {
      // Create profile and wait for it to be created
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: fullName,
        })
        .select()
        .single();

      if (error) {
        console.error('Profile creation error:', error);
        throw new Error('Failed to create user profile');
      }
      
      // Set the profile directly from the insert result
      if (data && mounted.current) {
        setProfile(data);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
    // proactively clear state; onAuthStateChange will also handle this
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    console.log('Updating profile for user:', user.id, 'with updates:', updates);

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    // Reload the profile from database to ensure we have the latest data
    await loadProfile(user.id);
  };

  const forgotPassword = async (email: string) => {
    if (!email.endsWith('.edu') && !email.endsWith('.edu.ph')) {
      throw new Error('Please use your educational email address (.edu or .edu.ph)');
    }
    const redirectTo = 'recall://auth/reset?type=recovery';
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const completePasswordReset = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsPasswordResetFlow(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('No user logged in');

    // First verify the current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (verifyError) {
      throw new Error('Current password is incorrect');
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  };

  const deactivateAccount = async (password: string) => {
    if (!user) throw new Error('No user logged in');

    // First verify the password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (verifyError) {
      throw new Error('Password is incorrect');
    }

    // Delete the user account
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      // If admin delete fails, try to delete the user profile and sign out
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut();
      } catch (deleteError) {
        throw new Error('Failed to deactivate account. Please contact support.');
      }
    } else {
      // Sign out after successful deletion
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      forgotPassword,
      changePassword,
      deactivateAccount,
      isPasswordResetFlow,
      completePasswordReset,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}