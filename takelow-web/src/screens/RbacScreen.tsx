import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Shield,
  Crown,
  Briefcase,
  Users,
  Wrench,
  Microscope,
  Eye,
  User,
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { api, type ApiAccessDecision, type ApiRbacOverride } from "../api"
import { toast } from "../store/toast.store"

const ROLES = [
  { role: "CEO", level: 1, icon: Crown, color: "from-purple-500 to-indigo-600", desc: "Full executive system ownership and ultimate approval authority" },
  { role: "CXO", level: 2, icon: Briefcase, color: "from-blue-500 to-cyan-600", desc: "Division-level operations, policy management, and governance" },
  { role: "Director", level: 3, icon: Users, color: "from-emerald-500 to-teal-600", desc: "Departmental auctions, financial settlements, and product approvals" },
  { role: "Manager", level: 4, icon: Wrench, color: "from-amber-500 to-orange-600", desc: "Section operations, active monitor moderation, and winner extension" },
  { role: "Expert", level: 5, icon: Microscope, color: "from-cyan-500 to-blue-600", desc: "Functional dispute investigations, audit verification, and analysis" },
  { role: "Specialist", level: 6, icon: Eye, color: "from-indigo-500 to-purple-600", desc: "Module specific task fulfillment, user assistance, and KYC review" },
  { role: "Analyst", level: 7, icon: User, color: "from-neutral-500 to-neutral-700", desc: "Read-only financial and engagement telemetry reporting" },
]

export function RbacScreen() {
  const [tab, setTab] = useState<"roles" | "overrides" | "access">("roles")
  const [overrides, setOverrides] = useState<ApiRbacOverride[]>([])
  const [accessDecisions, setAccessDecisions] = useState<ApiAccessDecision[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ovRes, accRes] = await Promise.allSettled([
        api.adminGetRbacOverrides(),
        api.adminGetAccessDecisions(1, 50),
      ])
      if (ovRes.status === "fulfilled" && Array.isArray(ovRes.value)) setOverrides(ovRes.value)
      if (accRes.status === "fulfilled" && accRes.value) {
        const list = Array.isArray(accRes.value) ? accRes.value : accRes.value.decisions || []
        setAccessDecisions(list)
      }
    } catch {
      toast("Failed to load RBAC telemetry", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <AdminLayout
      title="Roles & Access Control"
      subtitle="Enterprise role hierarchy, fine-grained permission overrides, and CASL policy auditing"
      actions={
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-neutral-50 shadow-sm"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* Navigation tabs */}
        <div className="flex items-center gap-2">
          {[
            { key: "roles", label: "Role Hierarchy", icon: Crown },
            { key: "overrides", label: "Permission Overrides", icon: KeyRound },
            { key: "access", label: "Access Audit Log", icon: Eye },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white text-neutral-600 hover:text-foreground border border-border/60"
              }`}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "roles" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r, i) => (
              <motion.div
                key={r.role}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${r.color} opacity-10 blur-md transition group-hover:opacity-20`} />
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${r.color} p-2.5 text-white shadow-sm`}>
                  <r.icon className="size-4" />
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-foreground">{r.role}</h3>
                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{r.desc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold text-neutral-600">
                    Tier {r.level}
                  </span>
                  <span className="text-xs font-semibold text-primary">Active Hierarchy</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "overrides" && (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-white p-12 text-center text-neutral-400 shadow-sm">
                <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                Loading permission overrides...
              </div>
            ) : overrides.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-white p-12 text-center text-neutral-400 shadow-sm">
                <KeyRound className="mx-auto size-8 text-neutral-300 mb-2" />
                No active custom permission overrides configured. Standard hierarchy policies apply.
              </div>
            ) : (
              overrides.map((o) => (
                <div key={o.id} className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                          {o.role}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          o.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                        }`}>
                          {o.active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                          {o.active ? "Active" : "Expired"}
                        </span>
                      </div>
                      <h4 className="mt-2 font-display text-sm font-bold text-foreground">User ID: {o.user_id}</h4>
                      <p className="mt-1 text-xs text-neutral-500">{o.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(o.permissions || {}).map(([subject, actions]) => (
                          <span key={subject} className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-700">
                            {subject}: {actions.join(", ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "access" && (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
            <div className="border-b border-border/60 bg-neutral-50/80 px-4 py-3">
              <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                Policy Enforcement Audit Trail
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 bg-neutral-50/50 font-semibold text-neutral-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource / Subject</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                        Loading access logs...
                      </td>
                    </tr>
                  ) : accessDecisions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        No authorization access decisions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    accessDecisions.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                          {log.user_id ? log.user_id.slice(0, 12) : "System"}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{log.action}</td>
                        <td className="px-4 py-3 text-neutral-700">{log.subject}</td>
                        <td className="px-4 py-3">
                          {log.granted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="size-3" /> Allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive border border-destructive/20">
                              <XCircle className="size-3" /> Denied
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-400">
                          {new Date(log.timestamp).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}