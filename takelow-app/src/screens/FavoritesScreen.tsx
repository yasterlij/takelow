import React, { useMemo, useState, useCallback } from 'react'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl, TextInput } from 'react-native'
import { Heart, HeartOff, Search, X, Calendar, Sparkles, LogIn, ArrowRight, Clock } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, Card } from '../components/AuctionUI'
import { EmptyState } from '../components/EmptyState'
import { colors } from '../theme'
import { formatCurrency, COMING_SOON_ITEMS } from '../mockDataV0'

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

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'coming-soon' | 'closed'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshFavorites()
    } finally {
      setRefreshing(false)
    }
  }, [refreshFavorites])

  const favoriteSet = useMemo(() => new Set(favoriteAuctionIds), [favoriteAuctionIds])

  const savedAuctions = useMemo(() => {
    return auctions.filter((a) => favoriteSet.has(a.id))
  }, [auctions, favoriteSet])

  const watchedDrops = useMemo(() => {
    return COMING_SOON_ITEMS.filter((item) => favoriteSet.has(item.id))
  }, [favoriteSet])

  const totalSaved = savedAuctions.length + watchedDrops.length

  const liveAuctions = useMemo(() => savedAuctions.filter((a) => a.status !== 'closed'), [savedAuctions])
  const closedAuctions = useMemo(() => savedAuctions.filter((a) => a.status === 'closed'), [savedAuctions])

  const filteredAuctions = useMemo(() => {
    if (filterTab === 'coming-soon') return []
    let list = filterTab === 'live' ? liveAuctions : filterTab === 'closed' ? closedAuctions : savedAuctions
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.category && a.category.toLowerCase().includes(q)) ||
          (a.specSummary && a.specSummary.toLowerCase().includes(q))
      )
    }
    return list
  }, [filterTab, savedAuctions, liveAuctions, closedAuctions, searchQuery])

  const filteredDrops = useMemo(() => {
    if (filterTab === 'live' || filterTab === 'closed') return []
    let list = watchedDrops
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.specSummary.toLowerCase().includes(q)
      )
    }
    return list
  }, [filterTab, watchedDrops, searchQuery])

  const hasAnyMatches = filteredAuctions.length > 0 || filteredDrops.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Watchlist" onBack={goBack} />
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={s.headerRow}>
          <Text style={s.subtitle}>Your saved auctions & upcoming drops</Text>
          <Badge tone={totalSaved > 0 ? 'navy' : 'muted'}>{totalSaved} saved</Badge>
        </View>

        {!user ? (
          <View style={s.guestBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Sparkles size={16} color={colors.primary} />
              <Text style={s.guestBannerText}>Sign in to sync your watchlist across devices.</Text>
            </View>
            <TouchableOpacity onPress={() => go('login')} style={s.guestSignInBtn} activeOpacity={0.85}>
              <LogIn size={13} color={colors.primaryForeground} />
              <Text style={s.guestSignInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Search Bar ── */}
        <View style={s.searchBarContainer}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search saved auctions or drops..."
            placeholderTextColor={colors.mutedForeground}
            style={s.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Filter Tabs ── */}
        <View style={s.filterTabsRow}>
          {(
            [
              { id: 'all', label: `All (${totalSaved})` },
              { id: 'live', label: `Live (${liveAuctions.length})` },
              { id: 'coming-soon', label: `Drops (${watchedDrops.length})` },
              { id: 'closed', label: `Closed (${closedAuctions.length})` },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setFilterTab(tab.id)}
              style={[s.tabBtn, filterTab === tab.id && s.tabBtnActive]}
            >
              <Text style={[s.tabBtnText, filterTab === tab.id && s.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {favoritesLoading && totalSaved === 0 ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} style={s.skeletonCard}>
                <View />
              </Card>
            ))}
          </View>
        ) : totalSaved === 0 ? (
          <EmptyState
            icon="inbox"
            title="Your watchlist is empty"
            message="Tap the heart icon on live auctions or 'Notify Me' on upcoming drops to track them here before bidding closes."
            actionLabel="Browse auctions"
            onAction={() => go('auctions')}
          />
        ) : !hasAnyMatches ? (
          <EmptyState
            icon="search-x"
            title="No matching saved items"
            message="No saved auctions or drops match your current filter."
            actionLabel="Reset Filter"
            onAction={() => {
              setSearchQuery('')
              setFilterTab('all')
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {/* Watched Coming Soon Drops */}
            {filteredDrops.map((drop) => (
              <Card key={drop.id} style={[s.card, s.dropCard]}>
                <View style={s.cardRow}>
                  <View style={s.thumbWrap}>
                    {drop.images?.[0] ? (
                      <Image source={{ uri: drop.images[0] }} style={s.thumb} resizeMode="cover" />
                    ) : (
                      <Clock size={18} color={colors.mutedForeground} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.titleRow}>
                      <Text style={s.title} numberOfLines={1}>{drop.name}</Text>
                      <Badge tone="gold">Coming Soon</Badge>
                    </View>
                    <View style={s.dropTimeBadge}>
                      <Calendar size={11} color={colors.primary} />
                      <Text style={s.dropTimeText}>{drop.dropTime}</Text>
                    </View>
                    <Text style={s.meta} numberOfLines={1}>{drop.category} • {drop.specSummary}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={s.price}>Est. Fee: {formatCurrency(drop.bidFee)}</Text>
                      <Text style={s.retailPrice}>Retail {formatCurrency(drop.marketPrice)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorite(drop.id)} style={s.removeBtn} activeOpacity={0.85}>
                    <HeartOff size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            {/* Saved Real Auctions */}
            {filteredAuctions.map((auction) => (
              <Card key={auction.id} style={s.card}>
                <View style={s.cardRow}>
                  <TouchableOpacity onPress={() => selectAuction(auction.id)} style={s.rowPressable} activeOpacity={0.85}>
                    <View style={s.thumbWrap}>
                      {auction.images?.[0] ? (
                        <Image source={{ uri: auction.images[0] }} style={s.thumb} resizeMode="cover" />
                      ) : (
                        <Heart size={18} color={colors.mutedForeground} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.titleRow}>
                        <Text style={s.title} numberOfLines={1}>{auction.name}</Text>
                        <Badge tone={auction.status === 'closed' ? 'muted' : auction.status === 'ending-soon' ? 'orange' : 'green'}>
                          {auction.status === 'closed' ? 'Closed' : auction.status === 'ending-soon' ? 'Ending soon' : 'Live'}
                        </Badge>
                      </View>
                      <Text style={s.meta} numberOfLines={1}>
                        {auction.category} {auction.specSummary ? `• ${auction.specSummary}` : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text style={s.price}>Bid Fee: {formatCurrency(auction.bidFee)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>View</Text>
                          <ArrowRight size={12} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleFavorite(auction.id)} style={s.removeBtn} activeOpacity={0.85}>
                    <HeartOff size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 100, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subtitle: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.mutedForeground },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  guestBannerText: {
    fontSize: 11.5,
    color: '#854D0E',
    fontWeight: '600',
    flex: 1,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guestSignInBtnText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.foreground,
    padding: 0,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabBtnTextActive: {
    color: colors.navyForeground,
    fontWeight: '700',
  },
  skeletonCard: { height: 84 },
  card: { padding: 12, borderRadius: 16 },
  dropCard: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowPressable: { flex: 1, flexDirection: 'row', gap: 12 },
  thumbWrap: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.navy },
  dropTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  dropTimeText: { fontSize: 10, fontWeight: '700', color: '#854D0E' },
  meta: { fontSize: 11.5, fontWeight: '500', color: colors.mutedForeground },
  price: { fontSize: 12, fontWeight: '700', color: colors.primary },
  retailPrice: { fontSize: 10.5, color: colors.mutedForeground, textDecorationLine: 'line-through' },
  removeBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
})

