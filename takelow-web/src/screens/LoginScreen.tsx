import { useState, useRef } from "react"
import { Eye, EyeOff, Smartphone, Lock, AlertCircle, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { AwashLogo } from "../components/AuctionUI"

export function LoginScreen() {
  const { login, go, authError } = useApp()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState("")
  const [loading, setLoading] = useState(false)
  const phoneRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const handleLogin = async () => {
    setLocalError("")
    const clean = phone.trim()
    if (!clean) { setLocalError("Please enter your phone number"); phoneRef.current?.focus(); return }
    if (clean.length < 9) { setLocalError("Phone number must be at least 9 digits"); phoneRef.current?.focus(); return }
    if (!password.trim()) { setLocalError("Please enter your password"); pwRef.current?.focus(); return }
    setLoading(true)
    const ok = await login(clean, password.trim())
    setLoading(false)
    if (!ok) setLocalError(authError || "Unable to sign in. Please check your phone number and password.")
  }

  const displayError = localError || authError

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="animate-float-rotate"><AwashLogo variant="light" /></div>
        <h1 className="mt-8 font-display text-2xl font-extrabold text-white">Welcome Back</h1>
        <p className="mt-1 text-sm font-medium text-white/60">Sign in to your TakeLow account</p>

        {displayError && (
          <div className="mt-6 flex w-full max-w-xs items-center gap-2 rounded-xl bg-destructive/20 backdrop-blur-sm border border-destructive/30 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <div className="mt-8 w-full max-w-xs space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/70">Phone Number</label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-4 py-3 text-white transition-colors focus-within:border-awash-gold/50 focus-within:bg-white/15">
              <Smartphone className="size-4.5 shrink-0 text-white/60" />
              <input
                ref={phoneRef}
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setLocalError("") }}
                placeholder="091 XXX XXXX"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/30 text-white"
                maxLength={10}
                onKeyDown={(e) => e.key === "Enter" && pwRef.current?.focus()}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/70">Password</label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-4 py-3 text-white transition-colors focus-within:border-awash-gold/50 focus-within:bg-white/15">
              <Lock className="size-4.5 shrink-0 text-white/60" />
              <input
                ref={pwRef}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLocalError("") }}
                placeholder="password"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/30 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button onClick={() => setShowPw((s) => !s)} className="text-white/60 hover:text-white" tabIndex={-1}>
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light py-3.5 text-sm font-bold text-awash-blue shadow-lg shadow-primary/30 transition-all hover:shadow-primary/40 active:translate-y-px disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="mt-6 text-xs font-medium text-white/50">
          Don't have an account?{" "}
          <button onClick={() => go("register")} className="font-bold text-awash-gold hover:text-awash-gold-light transition-colors">
            Register
          </button>
        </p>
      </div>
    </div>
  )
}
