import { useState } from "react"
import { Eye, EyeOff, Smartphone, Lock } from "lucide-react"
import { useApp } from "../AppContext"
import { AwashLogo } from "../components/AuctionUI"

export function LoginScreen() {
  const { login, go } = useApp()
  const [phone, setPhone] = useState("0911111111")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = () => {
    if (!phone.trim() || !pin.trim()) { setError("Please enter phone and PIN"); return }
    const ok = login(phone.trim(), pin.trim())
    if (!ok) { setError("Invalid phone or PIN"); return }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy to-[#0d1533] px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <AwashLogo variant="light" />
        <h1 className="mt-8 font-display text-2xl font-extrabold text-navy-foreground">Welcome Back</h1>
        <p className="mt-1 text-sm font-medium text-navy-foreground/60">Sign in to your Awash Mobile Money</p>

        {error && (
          <div className="mt-6 w-full max-w-xs rounded-xl bg-destructive/15 p-3 text-center text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 w-full max-w-xs space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">Phone Number</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground">
              <Smartphone className="size-4.5 shrink-0 opacity-60" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="091 XXX XXXX"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-navy-foreground/70">PIN</label>
            <div className="flex items-center gap-3 rounded-xl border border-navy-muted/30 bg-white/10 px-4 py-3 text-navy-foreground">
              <Lock className="size-4.5 shrink-0 opacity-60" />
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="****"
                maxLength={4}
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-navy-foreground/30"
              />
              <button onClick={() => setShowPin((s) => !s)} className="opacity-60">
                {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="mt-8 w-full max-w-xs rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all active:translate-y-px"
        >
          Sign In
        </button>

        <p className="mt-6 text-xs font-medium text-navy-foreground/50">
          Don't have an account?{" "}
          <button onClick={() => go("register")} className="font-bold text-primary">
            Register
          </button>
        </p>
      </div>

      <div className="pb-8 text-center text-[10px] font-medium text-navy-foreground/30">
        Admin: 0911111111 / 1234 &middot; User: 0913320001 / 0000
      </div>
    </div>
  )
}
