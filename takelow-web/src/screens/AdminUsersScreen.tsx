import { useState, useMemo, useEffect } from "react"
import { Shield, User, Search, X, Users as UsersIcon, TrendingUp, Loader2, AlertCircle } from "lucide-react"
import { useApp } from "../AppContext"
import { Badge, Card } from "../components/AuctionUI"
import { api, type ApiUser } from "../api"

export function AdminUsersScreen() {
  const { go, allBids } = useApp()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.adminListUsers(1, 200)
      .then((res) => { setUsers(res.data); setLoading(false) })
      .catch((e) => { setError(e.message || 'Failed to load users'); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase().trim()
    return users.filter((u) => u.full_name?.toLowerCase().includes(q) || u.phone_number?.includes(q) || u.id?.toLowerCase().includes(q))
  }, [users, search])

  const adminCount = users.filter((u) => u.role === "admin").length
  const totalBids = allBids.length

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border bg-navy text-navy-foreground px-5 pb-3 pt-12">
        <button onClick={() => go("admin-dashboard")} className="mb-2 text-xs font-semibold hover:text-primary">← Back</button>
        <h1 className="font-display text-xl font-extrabold">Manage Users</h1>
      </div>
      <div className="flex-1 px-5 pb-8 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-xl border border-border bg-secondary py-2 pl-8 pr-3 text-xs font-medium outline-none placeholder:text-muted-foreground/50 focus:border-primary"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="items-center p-3 text-center">
            <UsersIcon className="size-5 text-primary" />
            <p className="mt-1 font-display text-2xl font-extrabold text-navy tabular-nums">{loading ? "..." : users.length}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Users</p>
          </Card>
          <Card className="items-center p-3 text-center">
            <Shield className="size-5 text-primary" />
            <p className="mt-1 font-display text-2xl font-extrabold text-primary tabular-nums">{adminCount}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Admins</p>
          </Card>
          <Card className="items-center p-3 text-center">
            <TrendingUp className="size-5 text-emerald-600" />
            <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 tabular-nums">{totalBids}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Total Bids</p>
          </Card>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-8 animate-spin opacity-30" />
            <p className="text-sm font-medium">Loading users...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <AlertCircle className="size-8 opacity-30" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button onClick={() => { setLoading(true); setError(null); api.adminListUsers(1, 200).then((r) => setUsers(r.data)).catch((e) => setError(e.message)).finally(() => setLoading(false)) }} className="text-xs font-semibold text-primary">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Search className="size-8 opacity-30" />
            <p className="text-sm font-medium">{search ? "No users match your search" : "No users found"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const userBids = allBids.filter((b) => b.userId === u.id)
              const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
              const isAdmin = u.role === "admin"
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${isAdmin ? "bg-primary/20 text-primary" : "bg-secondary text-navy"}`}>
                    {isAdmin ? <Shield className="size-5" /> : <User className="size-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-navy">{u.full_name || u.phone_number}</p>
                      {isAdmin && <Badge tone="orange">Admin</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{u.phone_number} · {userBids.length} bids · {uniqueAuctions} auctions</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
