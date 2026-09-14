import React, { useMemo, useState, useCallback } from 'react'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl, TextInput } from 'react-native'
import { Heart, HeartOff, Search, X, Gavel, ArrowRight } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, Card, CTAButton } from '../components/AuctionUI'
import { EmptyState } from '../components/EmptyState'
import { colors } from '../theme'
import { formatCurrency } from '../mockDataV0'

export function FavoritesScreen() {
  const {
    go,
    goBack,
    auctions,
    favoriteAuctionIds,
    favoritesLoading,
    refreshFavorites,
    selectAuction,
    toggleFavorite,
  } = useApp()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'closed'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshFavorites()
    } finally {
      setRefreshing(false)
    }
  }, [refreshFavorites])

  const favorites = useMemo(() => {
    const favoriteSet = new Set(favoriteAuctionIds)
    let list = auctions.filter((auction) => favoriteSet.has(auction.id))

    if (filterTab === 'live') {
      list = list.filter((a) => a.status !== 'closed')
    } else if (filterTab === 'closed') {
      list = list.filter((a) => a.status === 'closed')
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q))
      )
    }

    return list
  }, [auctions, favoriteAuctionIds, filterTab, searchQuery])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <AppBar title="Watchlist" onBack={goBack} />
      </View>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={s.headerRow}>
          <Text style={s.subtitle}>Your saved auctions to revisit quickly</Text>
          <Badge tone={favoriteAuctionIds.length > 0 ? 'navy' : 'muted'}>{favoriteAuctionIds.length} saved</Badge>
        </View>

        {/* ── Search Bar ── */}
        <View style={s.searchBarContainer}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search saved auctions..."
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
          {(['all', 'live', 'closed'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilterTab(tab)}
              style={[s.tabBtn, filterTab === tab && s.tabBtnActive]}
            >
              <Text style={[s.tabBtnText, filterTab === tab && s.tabBtnTextActive]}>
                {tab === 'all' ? `All (${favoriteAuctionIds.length})` : tab === 'live' ? 'Live Only' : 'Closed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {favoritesLoading && favoriteAuctionIds.length === 0 ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} style={s.skeletonCard}>
                <View />
              </Card>
            ))}
          </View>
        ) : favoriteAuctionIds.length === 0 ? (
          <EmptyState icon="inbox" title="No favorites yet" message="Save auctions you want to track so you can come back before bidding closes." actionLabel="Browse auctions" onAction={() => go('auctions')} />
        ) : favorites.length === 0 ? (
          <EmptyState icon="search-x" title="No matching favorites" message="No saved auctions match your filter." actionLabel="Reset Filter" onAction={() => { setSearchQuery(''); setFilterTab('all') }} />
        ) : (
          <View style={{ gap: 10 }}>
            {favorites.map((auction) => (
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
                      <Text style={s.meta}>{auction.category}</Text>
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
    gap: 8,
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabBtnTextActive: {
    color: colors.navyForeground,
    fontWeight: '700',
  },
  skeletonCard: { height: 84 },
  card: { padding: 12, borderRadius: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowPressable: { flex: 1, flexDirection: 'row', gap: 12 },
  thumbWrap: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  price: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  removeBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
})
