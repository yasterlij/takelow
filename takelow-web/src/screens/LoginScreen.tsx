import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Lock,
  AlertCircle,
  Loader2,
  LogOut,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../AppContext";
import { AwashLogo } from "../components/AuctionUI";
import { FormField, FormPasswordInput } from "../components/FormField";
import { useForm } from "../hooks/useForm";
import { loginSchema, type LoginValues } from "../lib/validation";

const SESSION_END_MESSAGES: Record<string, string> = {
  idle: "Your session ended because you were inactive. Please sign in to continue.",
  absolute: "Your session expired after 12 hours. Please sign in again.",
  "refresh-failed": "Your session has expired. Please sign in again.",
  expired: "Your session has expired. Please sign in again.",
};

const STAT_ITEMS = [
  { value: "24/7", label: "Secure access" },
  { value: "3x", label: "Faster sign in" },
  { value: "256-bit", label: "Encrypted sessions" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function BrandPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#07111f] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.16, 0.26, 0.16] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(200,166,66,0.85) 0%, transparent 68%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.07, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-[-90px] right-[-80px] h-[380px] w-[380px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,112,255,0.38) 0%, transparent 72%)",
          }}
        />
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-1/2 right-10 h-32 w-32 rounded-full border border-white/10"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute top-1/3 left-16 h-20 w-20 rounded-full border border-[#C8A642]/20"
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.05]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="login-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <AwashLogo variant="light" size={42} />
      </motion.div>

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 grid gap-4 sm:grid-cols-3"
        >
          {STAT_ITEMS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm"
            >
              <div className="font-display text-xl font-bold text-white">
                {s.value}
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/42">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}

export function LoginScreen() {
  const { login, go, authError, sessionEndReason } = useApp();
  const phoneRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const form = useForm<LoginValues>(loginSchema, {
    phone_number: "",
    password: "",
  });

  const onSubmit = async (values: LoginValues) => {
    const ok = await login(values.phone_number, values.password);
    if (!ok) {
      form.setErrors({ _form: "Invalid phone number or password" } as any);
    }
  };

  const displayError = (form.errors as any)._form || authError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-screen flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-[#f5f7fb]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(200,166,66,0.18)_0%,transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,43,92,0.16)_0%,transparent_68%)] blur-3xl" />
      </div>

      <div className="hidden lg:block lg:w-[48%] xl:w-[45%] lg:flex-shrink-0 lg:order-2">
        <BrandPanel />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center self-stretch px-6 py-12 lg:order-1 lg:px-12 xl:px-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 lg:hidden"
        >
          <AwashLogo variant="dark" size={38} />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <AnimatePresence>
            {sessionEndReason && SESSION_END_MESSAGES[sessionEndReason] && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-start gap-3 rounded-2xl border border-[#C8A642]/30 bg-[#FFF8E7] p-4 text-sm text-[#08111f] shadow-sm"
              >
                <LogOut className="mt-0.5 size-4 shrink-0 text-[#C8A642]" />
                <span className="leading-snug">
                  {SESSION_END_MESSAGES[sessionEndReason]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/8 p-3.5 text-[13px] font-semibold text-destructive shadow-sm"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{displayError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={itemVariants}
            className="rounded-[1.75rem] border border-white/70 bg-white/90 p-7 shadow-[0_18px_60px_rgba(8,17,31,0.08)] backdrop-blur-xl sm:p-8"
          >
            <div className="space-y-5">
              <FormField
                label="Phone Number"
                error={form.errors.phone_number}
                touched={form.touched.phone_number}
                icon={<Smartphone className="size-4" />}
                hint="Use the phone number linked to your account"
              >
                <input
                  id="login-phone"
                  ref={phoneRef}
                  value={form.values.phone_number}
                  onChange={(e) => {
                    form.handleChange(
                      "phone_number",
                      e.target.value.replace(/\D/g, ""),
                    );
                    form.setErrors({} as any);
                  }}
                  onBlur={() => form.handleBlur("phone_number")}
                  onKeyDown={(e) => e.key === "Enter" && pwRef.current?.focus()}
                  placeholder="091 XXX XXXX"
                  maxLength={15}
                  autoComplete="tel"
                  inputMode="numeric"
                  className={`w-full rounded-2xl border bg-[#f8fafc] px-4 py-3 pl-11 text-sm font-medium text-[#08111f] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:bg-white focus:ring-2 ${
                    form.errors.phone_number && form.touched.phone_number
                      ? "border-destructive/50 focus:border-destructive focus:ring-destructive/15"
                      : "border-border/60 focus:border-awash-blue/60 focus:ring-awash-blue/15"
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
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <FormPasswordInput
                    id="login-password"
                    ref={pwRef}
                    theme="light"
                    hasIcon
                    value={form.values.password}
                    onChange={(e) => {
                      form.handleChange("password", e.target.value);
                      form.setErrors({} as any);
                    }}
                    onBlur={() => form.handleBlur("password")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && form.handleSubmit(onSubmit)
                    }
                    invalid={!!form.errors.password && !!form.touched.password}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`bg-[#f8fafc] pl-11 transition-all duration-200 focus:bg-white ${
                      form.errors.password && form.touched.password
                        ? "focus:ring-destructive/15"
                        : "focus:ring-awash-blue/15"
                    }`}
                  />
                </div>
              </FormField>
            </div>

            <motion.button
              onClick={() => form.handleSubmit(onSubmit)}
              disabled={form.isSubmitting}
              whileTap={{ scale: 0.975 }}
              className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-awash-blue via-awash-blue-dark to-[#0b3970] py-3.5 text-[16px] font-semibold tracking-[-0.01em] text-white shadow-[0_14px_36px_rgba(0,43,92,0.22)] transition-colors duration-200 hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-awash-blue/35"
            >
              {form.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {form.isSubmitting ? "Signing in…" : "Sign In"}
            </motion.button>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-center text-[13px] text-neutral-500"
          >
            Don't have an account?{" "}
            <button
              onClick={() => go("register")}
              className="font-semibold text-awash-blue hover:underline focus-visible:outline-none"
            >
              Register
            </button>
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex items-center justify-center gap-2 text-[11px] text-neutral-400"
          >
            <ShieldCheck className="size-4 text-[#C8A642]" />
            <span>Secure sign in</span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
