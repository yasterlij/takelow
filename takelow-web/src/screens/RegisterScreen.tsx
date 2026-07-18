import { useState } from "react"
import { Eye, EyeOff, Smartphone, Lock, User } from "lucide-react"
import { useApp } from "../AppContext"
import { AwashLogo } from "../components/AuctionUI"

export function RegisterScreen() {
  const { register, go } = useApp()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")

  const handleRegister = () => {
    if (!name.trim() || !phone.trim() || !pin.trim()) { setError("All fields are required"); return }
    if (pin.length < 4) { setError("PIN must be 4 digits"); return }
    register(name.trim(), phone.trim(), pin.trim())
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy to-[#0d1533] px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <AwashLogo variant="light" />
        <h1 className="mt-8 font-display text-2xl font-extrabold text-navy-foreground">Create Account</h1>
        <p className="mt-1 text-sm font-medium text-navy-foreground/60">Join Awash Mobile Money</p>

        {error && (
          <div className="mt-6 w-full max-w-xs rounded-xl bg-destructive/15 p-3 text-center text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 w-full max-w-xs space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">Full Name</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground">
              <User className="size-4.5 shrink-0 opacity-60" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Selam Tesfaye" className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">Phone Number</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground">
              <Smartphone className="size-4.5 shrink-0 opacity-60" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="091 XXX XXXX" className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">PIN (4 digits)</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground">
              <Lock className="size-4.5 shrink-0 opacity-60" />
              <input type={showPin ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} placeholder="****" className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30" />
              <button onClick={() => setShowPin((s) => !s)} className="opacity-60">
                {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleRegister} className="mt-8 w-full max-w-xs rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all active:translate-y-px">
          Create Account
        </button>

        <p className="mt-6 text-xs font-medium text-navy-foreground/50">
          Already have an account?{" "}
          <button onClick={() => go("login")} className="font-bold text-primary">Sign In</button>
        </p>
      </div>
    </div>
  )
}
