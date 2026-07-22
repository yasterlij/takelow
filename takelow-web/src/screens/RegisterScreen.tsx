import { useState, useRef } from "react"
import { Eye, EyeOff, Smartphone, Lock, User, AlertCircle, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { AwashLogo } from "../components/AuctionUI"

export function RegisterScreen() {
  const { register, go, authError } = useApp()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState("")
  const [loading, setLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const handleRegister = async () => {
    setLocalError("")
    const cleanName = name.trim()
    const cleanPhone = phone.trim()
    const cleanPw = password.trim()
    if (!cleanName) { setLocalError("Please enter your full name"); nameRef.current?.focus(); return }
    if (!cleanPhone) { setLocalError("Please enter your phone number"); phoneRef.current?.focus(); return }
    if (cleanPhone.length < 9) { setLocalError("Phone number must be at least 9 digits"); phoneRef.current?.focus(); return }
    if (!cleanPw) { setLocalError("Please enter a password"); pwRef.current?.focus(); return }
    if (cleanPw.length < 4) { setLocalError("Password must be at least 4 characters"); pwRef.current?.focus(); return }
    setLoading(true)
    const ok = await register(cleanPhone, cleanPw, cleanName)
    setLoading(false)
    if (!ok) setLocalError(authError || "Registration failed")
  }

  const displayError = localError || authError

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy to-[#0d1533] px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <AwashLogo variant="light" />
        <h1 className="mt-8 font-display text-2xl font-extrabold text-navy-foreground">Create Account</h1>
        <p className="mt-1 text-sm font-medium text-navy-foreground/60">Join TakeLow auction platform</p>

        {displayError && (
          <div className="mt-6 flex w-full max-w-xs items-center gap-2 rounded-xl bg-destructive/15 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <div className="mt-8 w-full max-w-xs space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">Full Name</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground transition-colors focus-within:border-primary/50">
              <User className="size-4.5 shrink-0 opacity-60" />
              <input ref={nameRef} value={name} onChange={(e) => { setName(e.target.value); setLocalError("") }} placeholder="Selam Tesfaye" className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30" onKeyDown={(e) => e.key === "Enter" && phoneRef.current?.focus()} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">Phone Number</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground transition-colors focus-within:border-primary/50">
              <Smartphone className="size-4.5 shrink-0 opacity-60" />
              <input ref={phoneRef} value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setLocalError("") }} placeholder="091 XXX XXXX" maxLength={10} className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30" onKeyDown={(e) => e.key === "Enter" && pwRef.current?.focus()} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">Password</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground transition-colors focus-within:border-primary/50">
              <Lock className="size-4.5 shrink-0 opacity-60" />
              <input ref={pwRef} type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setLocalError("") }} placeholder="min 4 characters" className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30" onKeyDown={(e) => e.key === "Enter" && handleRegister()} />
              <button onClick={() => setShowPw((s) => !s)} className="opacity-60" tabIndex={-1}>
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleRegister} disabled={loading} className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all active:translate-y-px disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="mt-6 text-xs font-medium text-navy-foreground/50">
          Already have an account?{" "}
          <button onClick={() => go("login")} className="font-bold text-primary">Sign In</button>
        </p>
      </div>
    </div>
  )
}
