import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smartphone, Lock, AlertCircle, Loader2, Sparkles } from "lucide-react"
import { useApp } from "../AppContext"
import { AwashLogo } from "../components/AuctionUI"
import { FormField, FormPasswordInput } from "../components/FormField"
import { useForm } from "../hooks/useForm"
import { loginSchema, type LoginValues } from "../lib/validation"

export function LoginScreen() {
  const { login, go, authError } = useApp()
  const phoneRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const form = useForm<LoginValues>(loginSchema, {
    phone_number: "",
    password: "",
  })

  const onSubmit = async (values: LoginValues) => {
    const ok = await login(values.phone_number, values.password)
    if (!ok) {
      form.setErrors({ _form: "Invalid phone number or password" } as any)
    }
  }

  const displayError = (form.errors as any)._form || authError

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] px-6">
      {/* Decorative orbs */}
      <motion.div
        animate={{ y: [0, -30, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-20 top-10 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 40, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-24 bottom-10 size-80 rounded-full bg-awash-blue-light/20 blur-3xl"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="animate-float-rotate"
        >
          <AwashLogo variant="light" size={40} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 text-center"
        >
          <h1 className="font-display text-2xl font-extrabold text-white">Welcome Back</h1>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm font-medium text-white/60">
            <Sparkles className="size-3.5 text-primary" />
            Sign in to your TakeLow account
          </p>
        </motion.div>

        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 flex w-full max-w-xs items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/15 p-3 text-xs font-semibold text-destructive backdrop-blur-sm"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{displayError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 w-full max-w-xs space-y-4"
        >
          <FormField
            label="Phone Number"
            error={form.errors.phone_number}
            touched={form.touched.phone_number}
            icon={<Smartphone className="size-4" />}
            hint="Enter your 10-digit phone number"
          >
            <input
              ref={phoneRef}
              value={form.values.phone_number}
              onChange={(e) => {
                form.handleChange("phone_number", e.target.value.replace(/\D/g, ""))
                form.setErrors({} as any)
              }}
              onBlur={() => form.handleBlur("phone_number")}
              onKeyDown={(e) => e.key === "Enter" && pwRef.current?.focus()}
              placeholder="091 XXX XXXX"
              maxLength={15}
              className={`w-full rounded-xl border bg-white/10 px-4 py-3 pl-11 text-sm font-medium text-white outline-none transition-all backdrop-blur-sm placeholder:text-white/30 focus:bg-white/15 ${
                form.errors.phone_number && form.touched.phone_number
                  ? "border-destructive/60 focus:border-destructive"
                  : "border-white/10 focus:border-awash-gold/50"
              }`}
            />
          </FormField>

          <FormField
            label="Password"
            error={form.errors.password}
            touched={form.touched.password}
            icon={<Lock className="size-4" />}
          >
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/60" />
              <FormPasswordInput
                ref={pwRef}
                theme="dark"
                hasIcon
                value={form.values.password}
                onChange={(e) => {
                  form.handleChange("password", e.target.value)
                  form.setErrors({} as any)
                }}
                onBlur={() => form.handleBlur("password")}
                onKeyDown={(e) => e.key === "Enter" && form.handleSubmit(onSubmit)}
                invalid={!!form.errors.password && !!form.touched.password}
                placeholder="Enter your password"
                className="pl-11"
              />
            </div>
          </FormField>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          onClick={() => form.handleSubmit(onSubmit)}
          disabled={form.isSubmitting}
          whileTap={{ scale: 0.98 }}
          className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light py-3.5 text-sm font-bold text-awash-blue shadow-lg shadow-primary/30 transition-all hover:shadow-primary/40 disabled:opacity-60"
        >
          {form.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {form.isSubmitting ? "Signing in…" : "Sign In"}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-xs font-medium text-white/50"
        >
          Don't have an account?{" "}
          <button onClick={() => go("register")} className="font-bold text-awash-gold transition-colors hover:text-awash-gold-light">
            Register
          </button>
        </motion.p>
      </div>
    </div>
  )
}
