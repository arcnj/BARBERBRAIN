import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthenticatorAssuranceLevels } from "@supabase/supabase-js";

interface MFAStatus {
  isEnabled: boolean;
  isVerified: boolean;
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
  loading: boolean;
}

export function useMFA() {
  const [status, setStatus] = useState<MFAStatus>({
    isEnabled: false,
    isVerified: false,
    currentLevel: null,
    nextLevel: null,
    loading: true,
  });

  const checkMFAStatus = useCallback(async () => {
    try {
      // Check assurance level
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        console.error("Error checking AAL:", aalError);
        setStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Check if user has any verified factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        console.error("Error listing factors:", factorsError);
        setStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      const hasVerifiedFactor = factorsData.totp.some((f) => f.status === "verified");
      
      // User is fully verified if current level matches next level (or next is aal1)
      const isFullyVerified = 
        aalData.currentLevel === aalData.nextLevel || 
        aalData.nextLevel === "aal1";

      setStatus({
        isEnabled: hasVerifiedFactor,
        isVerified: isFullyVerified,
        currentLevel: aalData.currentLevel,
        nextLevel: aalData.nextLevel,
        loading: false,
      });
    } catch (err) {
      console.error("MFA check error:", err);
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  // Returns true if user needs to verify MFA (has 2FA enabled but hasn't verified this session)
  const needsMFAVerification = !status.loading && status.isEnabled && !status.isVerified;

  return {
    ...status,
    needsMFAVerification,
    refreshStatus: checkMFAStatus,
  };
}
