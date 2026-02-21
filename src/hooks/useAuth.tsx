import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/database';
import type { PermissionType } from '@/hooks/usePermissions';

// Permissions are always loaded from the database - no hardcoded bypass

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  permissions: PermissionType[];
  isLoading: boolean;
  isRoleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  // Fetch role and permissions in parallel
  const fetchUserData = useCallback(async (userId: string) => {
    setIsRoleLoading(true);
    try {
      // Parallel fetch of role and permissions
      const [roleResult, permissionsResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_permissions')
          .select('permission')
          .eq('user_id', userId),
      ]);

      const userRole = roleResult.data?.role ?? null;
      setRole(userRole);

      // Use explicit permissions from the database for all users
      const userPermissions = (permissionsResult.data || []).map(
        (p) => p.permission as PermissionType
      );
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRole(null);
      setPermissions([]);
    } finally {
      setIsRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip if this is the INITIAL_SESSION event — getSession handles it
        if (event === 'INITIAL_SESSION') return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsRoleLoading(true);
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setPermissions([]);
          setIsRoleLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialSessionHandled = true;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsRoleLoading(true);
        await fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, permissions, isLoading, isRoleLoading, signIn, signUp, signOut }}>
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
