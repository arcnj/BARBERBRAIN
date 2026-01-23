import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session, AuthenticatorAssuranceLevels } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "barber" | "customer";

interface MFAInfo {
  isEnabled: boolean;
  isVerified: boolean;
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  mfa: MFAInfo;
  needsMFAVerification: boolean;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMFAStatus: () => Promise<void>;
}

interface SignUpMetadata {
  full_name: string;
  phone?: string;
  birth_date?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfa, setMFA] = useState<MFAInfo>({
    isEnabled: false,
    isVerified: false,
    currentLevel: null,
    nextLevel: null,
  });

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role:", error);
        return null;
      }

      return data?.role as AppRole | null;
    } catch (err) {
      console.error("Error in fetchUserRole:", err);
      return null;
    }
  };

  const checkMFAStatus = useCallback(async () => {
    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        console.error("Error checking AAL:", aalError);
        return;
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        console.error("Error listing factors:", factorsError);
        return;
      }

      const hasVerifiedFactor = factorsData.totp.some((f) => f.status === "verified");
      
      const isFullyVerified = 
        aalData.currentLevel === aalData.nextLevel || 
        aalData.nextLevel === "aal1";

      setMFA({
        isEnabled: hasVerifiedFactor,
        isVerified: isFullyVerified,
        currentLevel: aalData.currentLevel,
        nextLevel: aalData.nextLevel,
      });
    } catch (err) {
      console.error("MFA check error:", err);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch role and MFA status with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
            checkMFAStatus();
          }, 0);
        } else {
          setRole(null);
          setMFA({
            isEnabled: false,
            isVerified: false,
            currentLevel: null,
            nextLevel: null,
          });
        }

        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRole(session.user.id).then(setRole);
        checkMFAStatus();
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkMFAStatus]);

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata.full_name,
          phone: metadata.phone,
          birth_date: metadata.birth_date,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // After sign in, check MFA status
    if (!error) {
      await checkMFAStatus();
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setMFA({
      isEnabled: false,
      isVerified: false,
      currentLevel: null,
      nextLevel: null,
    });
  };

  // Check if user needs MFA verification (only for admin/barber roles)
  const needsMFAVerification = 
    !loading && 
    user !== null && 
    mfa.isEnabled && 
    !mfa.isVerified && 
    (role === "admin" || role === "barber");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        mfa,
        needsMFAVerification,
        signUp,
        signIn,
        signOut,
        refreshMFAStatus: checkMFAStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
