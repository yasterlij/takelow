import { useMemo, useState } from "react"
import { ArrowLeft, Heart, HeartOff, Search, X, Clock, Calendar, Sparkles, LogIn } from "lucide-react"
import { useApp } from "../AppContext"
import { Badge, Card, CTAButton } from "../components/AuctionUI"
import { EmptyState } from "../components/EmptyState"
import { formatCurrency, COMING_SOON_ITEMS, type ComingSoonItem } from "../mockDataV0"

export function FavoritesScreen() {
  const {
    go,
    goBack,
    user,
    auctions,
    favoriteAuctionIds,
    favoritesLoading,
    refreshFavorites,
    selectAuction,
    toggleFavorite,
  } = useApp()

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "live" | "coming-soon" | "closed">("all")

  // Combine saved auctions and watched coming soon drops
  const favoriteSet = useMemo(() => new Set(favoriteAuctionIds), [favoriteAuctionIds])

  const savedAuctions = useMemo(() => {
    return auctions.filter((a) => favoriteSet.has(a.id))
  }, [auctions, favoriteSet])

  const watchedDrops = useMemo(() => {
    return COMING_SOON_ITEMS.filter((item) => favoriteSet.has(item.id))
  }, [favoriteSet])

  const totalSaved = savedAuctions.length + watchedDrops.length

  const liveAuctions = useMemo(() => savedAuctions.filter((a) => a.status !== "closed"), [savedAuctions])
  const closedAuctions = useMemo(() => savedAuctions.filter((a) => a.status === "closed"), [savedAuctions])

  // Filter based on active tab and search
  const filteredAuctions = useMemo(() => {
    if (activeTab === "coming-soon") return []
    let list = activeTab === "live" ? liveAuctions : activeTab === "closed" ? closedAuctions : savedAuctions
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.category && a.category.toLowerCase().includes(q)) ||
          (a.specSummary && a.specSummary.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeTab, savedAuctions, liveAuctions, closedAuctions, search])

  const filteredDrops = useMemo(() => {
    if (activeTab === "live" || activeTab === "closed") return []
    let list = watchedDrops
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.specSummary.toLowerCase().includes(q)
      )
    }
    return list
  }, [activeTab, watchedDrops, search])

  const hasAnyMatches = filteredAuctions.length > 0 || filteredDrops.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 text-awash-blue shadow-sm transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">Watchlist & Favorites</h1>
            <p className="text-sm font-medium text-neutral-500">
              Your saved auctions and watched upcoming drops to revisit quickly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={totalSaved > 0 ? "navy" : "muted"}>
            {totalSaved} {totalSaved === 1 ? "saved item" : "saved items"}
          </Badge>
          <CTAButton variant="outline" onClick={refreshFavorites}>
            Refresh
          </CTAButton>
        </div>
      </div>

      {/* ── Guest Login Banner ── */}
      {!user && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>Sign in to sync your saved watchlist across mobile and web devices.</span>
          </div>
          <button
            onClick={() => go("login")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground transition-all hover:bg-[#B89A38] active:scale-95 shrink-0"
          >
            <LogIn className="size-3.5" /> Sign In
          </button>
        </div>
      )}

      {/* ── Search Bar & Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved auctions or drops..."
            className="w-full rounded-xl border border-border/70 bg-white pl-10 pr-9 py-2 text-xs font-medium text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl overflow-x-auto text-xs font-semibold text-neutral-600">
          {(
            [
              { id: "all", label: `All (${totalSaved})` },
              { id: "live", label: `Live (${liveAuctions.length})` },
              { id: "coming-soon", label: `Coming Soon (${watchedDrops.length})` },
              { id: "closed", label: `Closed (${closedAuctions.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-awash-blue shadow-sm font-bold"
                  : "hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {favoritesLoading && totalSaved === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="h-4 w-36 animate-pulse rounded bg-neutral-200" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
            </Card>
          ))}
        </div>
      ) : totalSaved === 0 ? (
        <EmptyState
          icon="inbox"
          title="Your watchlist is empty"
          message="Tap the heart icon on live auctions or 'Notify Me' on upcoming drops to track them here before bidding closes."
          actionLabel="Browse Live Auctions"
          onAction={() => go("auctions")}
        />
      ) : !hasAnyMatches ? (
        <EmptyState
          icon="search-x"
          title="No matching saved items"
          message="No saved auctions or drops match your current filter."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch("")
            setActiveTab("all")
          }}
        />
      ) : (
        <div className="grid gap-4">
          {/* Watched Upcoming Drops */}
          {filteredDrops.map((drop) => (
            <Card
              key={drop.id}
              className="p-4 border-l-4 border-l-primary hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 relative">
                  {drop.images?.[0] ? (
                    <img
                      src={drop.images[0]}
                      alt={drop.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Clock className="size-6 text-neutral-300" />
                  )}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-bold text-awash-blue">{drop.name}</p>
                    <Badge tone="gold">Coming Soon</Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Calendar className="size-3" /> {drop.dropTime}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-neutral-500">{drop.category} • {drop.specSummary}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="font-semibold text-foreground">
                      Est. Bid Fee {formatCurrency(drop.bidFee)}
                    </span>
                    <span className="text-neutral-400 line-through">
                      Retail {formatCurrency(drop.marketPrice)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleFavorite(drop.id)}
                  title="Remove from Watchlist"
                  className="rounded-xl border border-border/60 p-2 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-red-500"
                >
                  <HeartOff className="size-4" />
                </button>
              </div>
            </Card>
          ))}

          {/* Saved Real Auctions */}
          {filteredAuctions.map((auction) => (
            <Card key={auction.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => selectAuction(auction.id)}
                  className="flex min-w-0 flex-1 items-start gap-4 text-left"
                >
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                    {auction.images?.[0] ? (
                      <img
                        src={auction.images[0]}
                        alt={auction.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Heart className="size-5 text-neutral-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-bold text-awash-blue">{auction.name}</p>
                      <Badge
                        tone={
                          auction.status === "closed"
                            ? "muted"
                            : auction.status === "ending-soon"
                            ? "orange"
                            : "green"
                        }
                      >
                        {auction.status === "closed"
                          ? "Closed"
                          : auction.status === "ending-soon"
                          ? "Ending soon"
                          : "Live"}
                      </Badge>
                      {auction.publicCode && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                          {auction.publicCode}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-neutral-500">
                      {auction.category} {auction.specSummary ? `• ${auction.specSummary}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="font-semibold text-foreground">
                        Bid fee {formatCurrency(auction.bidFee)}
                      </span>
                      {auction.marketPrice > 0 && (
                        <span className="text-neutral-400 line-through">
                          Retail {formatCurrency(auction.marketPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => toggleFavorite(auction.id)}
                  title="Remove from favorites"
                  className="rounded-xl border border-border/60 p-2 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-red-500"
                >
                  <HeartOff className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
