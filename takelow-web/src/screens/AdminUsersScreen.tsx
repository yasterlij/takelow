import { Shield, User } from "lucide-react"
import { useApp } from "../AppContext"
import { Badge } from "../components/AuctionUI"

export function AdminUsersScreen() {
  const { go, users, allBids } = useApp()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border bg-card px-5 pb-3 pt-12">
        <button onClick={() => go("admin-dashboard")} className="mb-2 text-xs font-semibold text-primary">&larr; Back</button>
        <h1 className="font-display text-xl font-extrabold text-navy">Manage Users</h1>
      </div>
      <div className="flex-1 space-y-3 px-5 pb-8 pt-4">
        {users.map((u) => {
          const userBids = allBids.filter((b) => b.userId === u.id)
          const isAdmin = u.role === "admin"
          return (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${isAdmin ? "bg-primary/20 text-primary" : "bg-secondary text-navy"}`}>
                {isAdmin ? <Shield className="size-5" /> : <User className="size-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-navy">{u.name}</p>
                  {isAdmin && <Badge tone="orange">Admin</Badge>}
                </div>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">{u.phone} &middot; {userBids.length} bids</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
