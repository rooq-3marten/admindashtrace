import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModalA11y } from '../../lib/useModalA11y';
import {
  ShieldCheck,
  ArrowRight,
  Tree,
  Package,
  Users,
} from '@phosphor-icons/react';

interface LandingPageProps {
  onSuccessLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSuccessLogin }) => {
  const { signInWithGoogle, isLoading, isAuthenticated, userProfile, signOut, authErrorMessage } = useAuth();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const legalRef = useModalA11y<HTMLDivElement>(activeLegalDoc !== null, () => setActiveLegalDoc(null));

  // Administrators sign in with Google only. Access is decided by the server after sign-in.
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      if (onSuccessLogin) onSuccessLogin();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FBFCFB] text-[#1A2E23]">
      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL: Deep Green Brand Space (#1A4D2E) — NO LOGO, JUST GREEN
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full md:w-1/2 lg:w-7/12 bg-[#1A4D2E] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle hand-drawn agricultural line illustration at 15% opacity */}
        <div className="absolute inset-0 pointer-events-none opacity-15 overflow-hidden">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 800 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Gentle soil contour lines */}
            <path d="M-100 650 Q 200 580 500 660 T 900 640" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="6 6" />
            <path d="M-100 700 Q 150 630 450 710 T 900 690" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="6 6" />
            <path d="M-100 750 Q 250 680 550 760 T 900 740" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="6 6" />
            
            {/* Grain & Sesame crop stalks */}
            <g transform="translate(140, 520)">
              <path d="M 0 100 Q 10 40 0 0" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M 0 30 Q -20 15 -10 0" stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M 0 50 Q 20 35 15 20" stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M 0 70 Q -20 55 -12 40" stroke="#FFFFFF" strokeWidth="1.2" />
            </g>
            <g transform="translate(220, 500)">
              <path d="M 0 120 Q -8 50 0 0" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M 0 35 Q 20 20 15 5" stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M 0 60 Q -20 45 -15 30" stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M 0 85 Q 22 70 18 55" stroke="#FFFFFF" strokeWidth="1.2" />
            </g>
            <g transform="translate(300, 530)">
              <path d="M 0 90 Q 6 35 0 0" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M 0 25 Q -18 12 -8 0" stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M 0 50 Q 18 38 12 25" stroke="#FFFFFF" strokeWidth="1.2" />
            </g>
            {/* Transport cargo silhouette */}
            <path d="M 560 620 L 640 620 L 660 640 L 680 640 L 680 660 L 560 660 Z" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="590" cy="662" r="8" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="655" cy="662" r="8" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Brand Space Header (No Logo Image - Just the Color and Typography) */}
        <div className="relative z-10 space-y-2">
          <div className="font-serif font-bold text-3xl sm:text-4xl lg:text-[48px] tracking-tight leading-tight text-white">
            TraceHarvest
          </div>
          <p className="text-base sm:text-lg text-white/70 max-w-lg font-light leading-relaxed">
            Farm-to-export traceability for Nigerian agriculture
          </p>
        </div>

        {/* Value Proposition Lines with subtle organic icons */}
        <div className="relative z-10 my-10 space-y-5 max-w-lg">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-white/10 text-white shrink-0 mt-0.5">
              <Package size={20} weight="regular" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Verify every batch from farm to port
              </h4>
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                Connect smallholder GPS polygons, farm logbooks, and inland weighbridge manifests directly to ocean bills of lading.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-white/10 text-white shrink-0 mt-0.5">
              <ShieldCheck size={20} weight="regular" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Prevent export rejections with compliance data
              </h4>
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                Automated NAFDAC Pre-Harvest Interval (PHI) count and Copernicus Sentinel-2 EUDR Annex II deforestation due diligence.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-white/10 text-white shrink-0 mt-0.5">
              <Users size={20} weight="regular" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Empower smallholder farmers with digital records
              </h4>
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                Field agents sync offline across Kano, Benue, and Jigawa corridors to guarantee fair market access and immutable identity.
              </p>
            </div>
          </div>
        </div>

        {/* Real Exporter Testimonial & Footer */}
        <div className="relative z-10 pt-6 border-t border-white/15 space-y-4">
          <blockquote className="text-xs sm:text-sm text-white/85 italic leading-relaxed">
            &ldquo;TraceHarvest helped us prove the quality of our sesame to buyers in Japan. We haven&apos;t had a rejected shipment since.&rdquo;
          </blockquote>
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>— Anonymous agricultural exporter, Kano</span>
            
            {/* Subtle Nigerian flag accent */}
            <div className="flex items-center gap-1.5" title="Made in Nigeria">
              <span className="text-[11px] font-medium tracking-wider uppercase">Nigeria</span>
              <div className="flex h-2.5 w-4 overflow-hidden rounded-[1px] border border-white/20">
                <span className="w-1/3 bg-[#008751]" />
                <span className="w-1/3 bg-white" />
                <span className="w-1/3 bg-[#008751]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL: Authentication Form (Clean, Warm White, Human)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-white flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Greeting */}
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-2xl sm:text-[28px] text-[#1A2E23] tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-[#5A6B60]">
              Sign in to your TraceHarvest admin account
            </p>
          </div>

          {/* Active Session Notification (if user is already logged in) */}
          {isAuthenticated && userProfile && (
            <div className="p-4 rounded-xl bg-[#EEF5F1] border border-[#B8D4C2] text-[#1A4D2E] space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2D6A4F]">Active Workday Session</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#1A4D2E] font-medium">
                  {userProfile.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#1A2E23]">
                Signed in as <strong>{userProfile.displayName}</strong> ({userProfile.email})
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSuccessLogin && onSuccessLogin()}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>Proceed to Control Center</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="py-2 px-3 rounded-lg border border-[#D1DBD5] bg-white hover:bg-[#F7F9F7] text-xs font-medium text-[#5A6B60] transition cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {(authErrorMessage || errorMsg) && (
            <div role="alert" className="p-3.5 rounded-lg bg-[#FDEEEC] border border-[#FCA5A5] text-[#A63A2E] text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A63A2E] mt-1.5 shrink-0" />
              <p className="leading-relaxed">{authErrorMessage || errorMsg}</p>
            </div>
          )}

          {/* Google sign-in (the only administrator sign-in method) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isLoading}
              aria-busy={isSubmitting || isLoading}
              className="w-full h-12 rounded-lg border border-[#D1DBD5] bg-white hover:bg-[#F7F9F7] active:scale-[0.99] text-sm font-semibold text-[#1A2E23] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4D2E]"
            >
              <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSubmitting || isLoading ? 'Signing in…' : 'Sign in with Google'}</span>
            </button>
            <p className="text-xs text-[#5A6B60] leading-relaxed text-center">
              Only authorised TraceHarvest administrator accounts can open the control center.
            </p>
          </div>

          {/* Legal / Terms Footer */}
          <div className="pt-4 text-center text-xs text-[#8A968E] leading-relaxed">
            By signing in, you agree to our{' '}
            <button
              type="button"
              onClick={() => setActiveLegalDoc('terms')}
              className="text-[#5A6B60] underline hover:text-[#1A2E23] cursor-pointer"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => setActiveLegalDoc('privacy')}
              className="text-[#5A6B60] underline hover:text-[#1A2E23] cursor-pointer"
            >
              Privacy Policy
            </button>.
          </div>
        </div>
      </div>

      {/* Legal & Compliance Modal */}
      {activeLegalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            ref={legalRef}
            role="dialog"
            aria-modal="true"
            aria-label={activeLegalDoc === 'terms' ? 'Terms of Service' : 'Privacy and Data Governance Policy'}
            className="w-full max-w-lg bg-white rounded-xl border border-[#E5EBE7] shadow-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1A2E23]">
                {activeLegalDoc === 'terms' ? 'Terms of Service — TraceHarvest' : 'Privacy & Data Governance Policy'}
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveLegalDoc(null)}
                className="text-[#5A6B60] hover:text-[#1A2E23] text-sm p-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A4D2E]"
              >
                ✕
              </button>
            </div>

            {activeLegalDoc === 'terms' ? (
              <div className="space-y-3 text-xs text-[#5A6B60] leading-relaxed">
                <p>
                  <strong>1. Purpose & Authority:</strong> TraceHarvest operates as a unified agricultural traceability compliance control center under Nigerian export standards (NAQS / NAFDAC) and European Union Deforestation Regulation (EUDR Regulation 2023/1115).
                </p>
                <p>
                  <strong>2. Single-Window Verification:</strong> Digital signatures, SHA-256 cryptographic hashes, and export phytosanitary records submitted or audited within this platform constitute statutory documentation for international trade.
                </p>
                <p>
                  <strong>3. Operator Accountability:</strong> Authorized administrative users, compliance officers, and field fleet managers must ensure accurate GPS polygon delineation and chemical application logging without deliberate falsification.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[#5A6B60] leading-relaxed">
                <p>
                  <strong>1. Farmer Data Protection:</strong> Personal records, phone numbers, and landholding coordinates for smallholder farmers across Kano, Benue, and Jigawa are secured with access control and restricted to statutory export certification.
                </p>
                <p>
                  <strong>2. Satellite Geospatial Verification:</strong> Farm coordinates are verified against Copernicus Sentinel-2 multispectral baseline data solely to substantiate deforestation-free provenance.
                </p>
                <p>
                  <strong>3. Retention & Audit Logs:</strong> All field synchronizations, weighbridge manifests, and pesticide compliance decisions are retained for statutory customs audit trails.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLegalDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
