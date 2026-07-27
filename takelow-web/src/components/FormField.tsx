import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react"
import { forwardRef, useState } from "react"
import { AlertCircle, Eye, EyeOff, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type FieldProps = {
  label: string
  error?: string
  touched?: boolean
  icon?: ReactNode
  hint?: string
  children: ReactNode
}

export function FormField({ label, error, touched, icon, hint, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-neutral-600">{label}</label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            {icon}
          </span>
        )}
        {children}
      </div>
      <AnimatePresence>
        {error && touched && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-destructive"
          >
            <AlertCircle className="size-3 shrink-0" />
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-[11px] font-medium text-neutral-400">{hint}</p>
        )}
      </AnimatePresence>
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
  hasIcon?: boolean
}

export function FormInput({ invalid, hasIcon, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-medium text-foreground outline-none transition-all duration-300 focus:bg-white focus:shadow-lg focus:shadow-primary/5 ${
        hasIcon ? "pl-11" : ""
      } ${
        invalid
          ? "border-destructive/60 focus:border-destructive focus:ring-2 focus:ring-destructive/20"
          : "border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
      } ${className}`}
    />
  )
}

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
  hasIcon?: boolean
  theme?: "light" | "dark"
}

export const FormPasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function FormPasswordInput({ invalid, hasIcon, theme = "light", className = "", ...props }, ref) {
  const [show, setShow] = useState(false)
  const isDark = theme === "dark"
  return (
    <div className="relative">
      <input
        ref={ref}
        {...props}
        type={show ? "text" : "password"}
        className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-all duration-300 ${
          hasIcon ? "pl-11 pr-11" : "pr-11"
        } ${
          isDark
            ? "border-white/10 bg-white/10 text-white backdrop-blur-sm placeholder:text-white/30 focus-within:border-awash-gold/50 focus-within:bg-white/15"
            : "border-border/60 bg-white/80 text-foreground backdrop-blur-sm placeholder:text-neutral-400 focus:bg-white"
        } ${
          invalid
            ? isDark
              ? "border-destructive/70"
              : "border-destructive/60 focus:ring-2 focus:ring-destructive/20"
            : !isDark
              ? "focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              : ""
        } ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
          isDark ? "text-white/60 hover:text-white" : "text-neutral-400 hover:text-neutral-600"
        }`}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
  }
)

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export function FormTextarea({ invalid, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-medium text-foreground outline-none transition-all duration-300 focus:bg-white focus:shadow-lg focus:shadow-primary/5 ${
        invalid
          ? "border-destructive/60 focus:border-destructive focus:ring-2 focus:ring-destructive/20"
          : "border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
      } ${className}`}
    />
  )
}
