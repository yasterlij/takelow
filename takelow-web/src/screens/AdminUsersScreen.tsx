import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, User, Search, X, Users as UsersIcon, TrendingUp, Loader2, AlertCircle, ArrowUpCircle, ArrowDownCircle, ChevronRight, Phone, Wallet, Edit3, Check, Plus } from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { Badge, Card, CTAButton } from "../components/AuctionUI"
import { api, type ApiUser } from "../api"
import { formatCurrency, formatETB } from "../mockDataV0"

function UserDetailModal({ user, onClose, onRoleChange, onNameChange }: { user: ApiUser; onClose: () => void; onRoleChange: (id: string, role: string) => void; onNameChange: (id: string, name: string) => void }) {
  const { allBids } = useApp()
  const userBids = allBids.filter((b) => b.userId === user.id)
  const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
  const isAdmin = user.role === "admin"
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user.full_name || "")

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user.full_name) {
      setEditingName(false)
      return
    }
    try {
      await api.updateUser(user.id, { full_name: nameValue.trim() })
      onNameChange(user.id, nameValue.trim())
    } catch { /* silent */ }
    setEditingName(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-white/95 backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-base font-bold text-awash-blue">User Details</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 transition-colors"><X className="size-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`flex size-14 items-center justify-center rounded-full ${isAdmin ? "bg-awash-gold/20 text-awash-gold" : "bg-awash-blue/10 text-awash-blue"}`}>
              {isAdmin ? <Shield className="size-6" /> : <User className="size-6" />}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(user.full_name || "") } }}
                    className="flex-1 rounded-lg border border-awash-gold px-2 py-1 text-sm font-bold text-awash-blue outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="rounded-lg bg-awash-gold p-1 text-awash-blue"><Check className="size-4" /></button>
                  <button onClick={() => { setEditingName(false); setNameValue(user.full_name || "") }} className="rounded-lg border border-border p-1 text-neutral-400"><X className="size-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-bold text-awash-blue truncate">{user.full_name || "Unknown"}</p>
                  <button onClick={() => { setNameValue(user.full_name || ""); setEditingName(true) }} className="text-neutral-300 hover:text-awash-gold transition-colors"><Edit3 className="size-3.5" /></button>
                  {isAdmin && <Badge tone="orange">Admin</Badge>}
                </div>
              )}
              <p className="text-xs font-medium text-neutral-400">ID: {user.id.slice(0, 12)}...</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-50 p-3">
              <Phone className="size-3.5 text-neutral-400 mb-1" />
              <p className="text-xs font-medium text-neutral-400">Phone</p>
              <p className="text-sm font-bold text-awash-blue">{user.phone_number}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <Wallet className="size-3.5 text-neutral-400 mb-1" />
              <p className="text-xs font-medium text-neutral-400">Wallet</p>
              <p className="text-sm font-bold text-awash-blue">{formatCurrency(user.wallet_balance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-awash-blue/5 p-3 text-center">
              <p className="font-display text-lg font-extrabold text-awash-blue">{userBids.length}</p>
              <p className="text-[10px] font-medium text-neutral-400">Bids</p>
            </div>
            <div className="rounded-xl bg-awash-gold/10 p-3 text-center">
              <p className="font-display text-lg font-extrabold text-awash-gold-dark">{uniqueAuctions}</p>
              <p className="text-[10px] font-medium text-neutral-400">Auctions</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="font-display text-lg font-extrabold text-emerald-700">{user.role}</p>
              <p className="text-[10px] font-medium text-neutral-400">Role</p>
            </div>
          </div>

          <button
            onClick={() => onRoleChange(user.id, isAdmin ? "user" : "admin")}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
              isAdmin
                ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-gradient-to-r from-awash-gold to-awash-gold-light text-awash-blue shadow-lg shadow-primary/20 hover:shadow-primary/30"
            }`}
          >
            {isAdmin ? <><ArrowDownCircle className="size-4" /> Demote to User</> : <><ArrowUpCircle className="size-4" /> Promote to Admin</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function AdminUsersScreen() {
  const { go, allBids } = useApp()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 20

  const fetchUsers = () => {
    setLoading(true)
    setError(null)
    api.adminListUsers(1, 200)
      .then((res) => { setUsers(res.data); setLoading(false) })
      .catch((e) => { setError(e.message || 'Failed to load users'); setLoading(false) })
  }

  useEffect(fetchUsers, [])

  const filtered = useMemo(() => {
    let list = users
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((u) => u.full_name?.toLowerCase().includes(q) || u.phone_number?.includes(q) || u.id?.toLowerCase().includes(q))
    }
    return list
  }, [users, search])

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / perPage)

  const adminCount = users.filter((u) => u.role === "admin").length
  const totalBids = allBids.length

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.updateUser(id, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)))
      setSelectedUser((prev) => prev?.id === id ? { ...prev, role: newRole } : prev)
    } catch { /* silent */ }
  }

  const handleNameChange = (id: string, name: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, full_name: name } : u)))
    setSelectedUser((prev) => prev?.id === id ? { ...prev, full_name: name } : prev)
  }

  useEffect(() => { setPage(1) }, [search])

  return (
    <AdminLayout title="Manage Users" subtitle={`${users.length} users`}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="space-y-4"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, phone or ID..."
            className="w-full rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm py-2.5 pl-8 pr-3 text-xs font-medium outline-none transition-all placeholder:text-neutral-400/50 focus:border-awash-gold focus:bg-white focus:shadow-lg"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-awash-gold">
              <X className="size-4" />
            </button>
          )}
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-3 text-center">
              <UsersIcon className="size-5 text-awash-gold" />
              <p className="mt-1 font-display text-2xl font-extrabold text-awash-blue tabular-nums">{loading ? "..." : users.length}</p>
              <p className="text-[10px] font-medium text-neutral-400">Users</p>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-3 text-center">
              <Shield className="size-5 text-awash-gold" />
              <p className="mt-1 font-display text-2xl font-extrabold text-awash-gold-dark tabular-nums">{adminCount}</p>
              <p className="text-[10px] font-medium text-neutral-400">Admins</p>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-3 text-center">
              <TrendingUp className="size-5 text-emerald-600" />
              <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 tabular-nums">{totalBids}</p>
              <p className="text-[10px] font-medium text-neutral-400">Total Bids</p>
            </Card>
          </motion.div>
        </motion.div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Loader2 className="size-8 animate-spin opacity-30" />
            <p className="text-sm font-medium">Loading users...</p>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <AlertCircle className="size-8 opacity-30 text-red-400" />
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button onClick={fetchUsers} className="text-xs font-semibold text-awash-gold transition-colors hover:text-awash-gold-dark">Retry</button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Search className="size-8 opacity-30" />
            <p className="text-sm font-medium">{search ? "No users match your search" : "No users found"}</p>
          </motion.div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
            }}
            className="space-y-2"
          >
            {paginated.map((u) => {
              const userBids = allBids.filter((b) => b.userId === u.id)
              const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
              const isAdmin = u.role === "admin"
              return (
                <motion.div
                  key={u.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                >
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-3 text-left shadow-sm transition-all hover:border-awash-gold/30 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${isAdmin ? "bg-awash-gold/20 text-awash-gold" : "bg-awash-blue/10 text-awash-blue"}`}>
                      {isAdmin ? <Shield className="size-5" /> : <User className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-awash-blue">{u.full_name || u.phone_number}</p>
                        {isAdmin && <Badge tone="orange">Admin</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-neutral-400">{u.phone_number} · {userBids.length} bids · {uniqueAuctions} auctions</p>
                    </div>
                    <ChevronRight className="size-4 text-neutral-300" />
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {totalPages > 1 && (
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            className="mt-4 flex items-center justify-center gap-2"
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold text-awash-blue transition-colors hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-neutral-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold text-awash-blue transition-colors hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              Next
            </button>
          </motion.div>
        )}

        {users.length > 0 && (
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            className="mt-4 rounded-xl border border-border/60 bg-white/50 backdrop-blur-sm p-3 text-center"
          >
            <p className="text-xs font-medium text-neutral-400">
              Showing {paginated.length} of {filtered.length} users. Click a user to view details and manage roles.
            </p>
          </motion.div>
        )}

      <AnimatePresence>
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onRoleChange={handleRoleChange}
            onNameChange={handleNameChange}
          />
        )}
      </AnimatePresence>
      </motion.div>
    </AdminLayout>
  )
}
