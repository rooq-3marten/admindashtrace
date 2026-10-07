import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  CheckCircle,
  Eye,
  EyeSlash,
  ArrowRight,
  Lock,
  EnvelopeSimple,
  Tree,
  Package,
  Users,
} from '@phosphor-icons/react';

interface LandingPageProps {
  onSuccessLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSuccessLogin }) => {
  const { loginWithCredentials, loginDemo, isLoading, isAuthenticated, userProfile, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await loginWithCredentials(email.trim(), password, rememberMe);
      if (success) {
        if (onSuccessLogin) onSuccessLogin();
      } else {
        setErrorMsg("That email or password doesn't match our records. Try again.");
      }
    } catch (err) {
      setErrorMsg("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async (role: 'super_admin' | 'compliance_officer' | 'fleet_manager') => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginDemo(role);
      if (onSuccessLogin) onSuccessLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setIsForgotModalOpen(false);
      setForgotEmail('');
    }, 2500);
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
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-[#FDEEEC] border border-[#FCA5A5] text-[#A63A2E] text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A63A2E] mt-1.5 shrink-0" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2E23]">
                Email address
              </label>
              <div className="relative">
                <EnvelopeSimple className="w-4 h-4 text-[#8A968E] absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@traceharvest.com"
                  autoComplete="email"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E5EBE7] bg-[#FBFCFB] text-[#1A2E23] placeholder-[#8A968E] focus:outline-none focus:border-[#1A4D2E] focus:ring-1 focus:ring-[#1A4D2E] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#1A2E23]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-medium text-[#1A4D2E] hover:underline cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A968E] absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-[#E5EBE7] bg-[#FBFCFB] text-[#1A2E23] placeholder-[#8A968E] focus:outline-none focus:border-[#1A4D2E] focus:ring-1 focus:ring-[#1A4D2E] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#8A968E] hover:text-[#1A2E23] cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#D1DBD5] text-[#1A4D2E] focus:ring-[#1A4D2E] cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-[#5A6B60] select-none cursor-pointer">
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full h-12 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] active:scale-[0.99] text-white font-medium text-sm transition-all cursor-pointer shadow-warm-card flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-[#E5EBE7] w-full" />
            <span className="bg-white px-3 text-xs text-[#8A968E] font-medium uppercase tracking-wider absolute">
              Quick access for reviewers
            </span>
          </div>

          {/* Direct Role Access Shortcuts (Guarantees seamless user testing) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDemoSignIn('super_admin')}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-lg border border-[#E5EBE7] bg-[#F7F9F7] hover:bg-[#EEF5F1] hover:border-[#1A4D2E] text-xs font-medium text-[#1A2E23] transition-all flex items-center justify-between cursor-pointer"
            >
              <span>Sign in as <strong>Super Admin</strong> (Shekoni Farooq)</span>
              <span className="text-[11px] font-mono text-[#1A4D2E]">HQ Oversight →</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSignIn('compliance_officer')}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-lg border border-[#E5EBE7] bg-[#F7F9F7] hover:bg-[#EEF5F1] hover:border-[#1A4D2E] text-xs font-medium text-[#1A2E23] transition-all flex items-center justify-between cursor-pointer"
            >
              <span>Sign in as <strong>Compliance Officer</strong> (Dr. Fatima Bello)</span>
              <span className="text-[11px] font-mono text-[#1A4D2E]">NAFDAC PHI →</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSignIn('fleet_manager')}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-lg border border-[#E5EBE7] bg-[#F7F9F7] hover:bg-[#EEF5F1] hover:border-[#1A4D2E] text-xs font-medium text-[#1A2E23] transition-all flex items-center justify-between cursor-pointer"
            >
              <span>Sign in as <strong>Fleet Manager</strong> (Kabir Garba)</span>
              <span className="text-[11px] font-mono text-[#1A4D2E]">Field Operations →</span>
            </button>
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

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl border border-[#E5EBE7] shadow-xl p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1A2E23]">
              Reset your password
            </h3>
            <p className="text-xs text-[#5A6B60] leading-relaxed">
              Enter the email address registered with your TraceHarvest admin account. We will send you an authorized verification link.
            </p>

            {forgotSuccess ? (
              <div className="p-3 rounded-lg bg-[#EEF5F1] border border-[#B8D4C2] text-[#1A4D2E] text-xs flex items-center gap-2">
                <CheckCircle size={16} />
                <span>Reset instructions sent. Please check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@traceharvest.com"
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-[#E5EBE7] bg-[#FBFCFB] text-[#1A2E23] focus:outline-none focus:border-[#1A4D2E]"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5EBE7] text-xs font-medium text-[#5A6B60] hover:bg-[#F7F9F7] cursor-pointer"
                  >
                    Never mind
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white text-xs font-semibold cursor-pointer"
                  >
                    Send reset link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Legal & Compliance Modal */}
      {activeLegalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-xl border border-[#E5EBE7] shadow-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1A2E23]">
                {activeLegalDoc === 'terms' ? 'Terms of Service — TraceHarvest' : 'Privacy & Data Governance Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveLegalDoc(null)}
                className="text-[#8A968E] hover:text-[#1A2E23] text-sm p-1 cursor-pointer"
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
