import React, { useMemo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, RefreshControl, TextInput } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Flame, ShieldCheck, Trophy, Sparkles, PiggyBank, Search, X, SlidersHorizontal, Heart, ArrowUpDown } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge } from '../components/AuctionUI'
import { SmartImage } from '../components/SmartImage'
import { useCountdown } from '../components/Countdown'
import { SkeletonCard } from '../components/SkeletonLoader'
import { EmptyState } from '../components/EmptyState'
import { buildAuctionCategoryOptions } from '../lib/auctionCategories'
import type { Auction } from '../mockDataV0'
import { formatCurrency, formatCountdown } from '../mockDataV0'
import { colors } from '../theme'

const CARD_W = Dimensions.get('window').width - 16 * 2

type SortOption = 'ending-soon' | 'bids-desc' | 'fee-asc' | 'price-desc' | 'price-asc'

function AuctionImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <SmartImage uri={src} alt={alt} style={s.cardImgWrap} resizeMode="cover" />
  )
}

function TimePill({ seconds, endingSoon }: { seconds: number; endingSoon: boolean }) {
  const t = useCountdown(seconds)
  const { d, h, m, s: secStr } = formatCountdown(t)
  const urgent = endingSoon || (t > 0 && t < 3600)
  return (
    <View style={[s.timePill, { backgroundColor: urgent ? colors.primary + '20' : colors.navy }]}>
      <Text style={[s.timePillText, { color: urgent ? colors.primary : '#fff' }]}>
        {d !== '00' ? `${parseInt(d)}d ` : ''}{h}:{m}:{secStr}
      </Text>
    </View>
  )
}

export function AuctionCard({
  auction,
  onOpen,
  onToggleFavorite,
  isFav,
}: {
  auction: Auction
  onOpen: () => void
  onToggleFavorite?: () => void
  isFav?: boolean
}) {
  const endingSoon = auction.status === 'ending-soon'
  const isClosed = auction.status === 'closed'
  const bidProgress = auction.maxBid ? Math.min(auction.totalBids / auction.maxBid, 1) : 0
  const publicCode = auction.publicCode || auction.id.slice(0, 6).toUpperCase()

  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.85} style={s.card}>
      <View style={s.cardImgOuter}>
        <AuctionImage src={auction.images?.[0]} alt={auction.name} />
        <LinearGradient
          colors={['rgba(0,43,92,0.1)', 'transparent', 'rgba(200,166,66,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={s.cardImgTop}>
          {isClosed ? (
            <Badge tone="muted">Closed</Badge>
          ) : endingSoon ? (
            <Badge tone="orange"><Flame size={10} /> Ending Soon</Badge>
          ) : (
            <Badge tone="green">Live</Badge>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={s.codeBadge}><Text style={s.codeBadgeText}>{publicCode}</Text></View>
            {onToggleFavorite && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.()
                  onToggleFavorite()
                }}
                style={s.favBtn}
                activeOpacity={0.7}
              >
                <Heart size={14} color={isFav ? colors.destructive : colors.navy} fill={isFav ? colors.destructive : 'transparent'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <Text style={s.cardName} numberOfLines={2}>{auction.name}</Text>
        {auction.specSummary ? <Text style={s.cardSpec} numberOfLines={2}>{auction.specSummary}</Text> : null}
        {auction.marketPrice > 0 ? (
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground, textDecorationLine: 'line-through' }}>
            {formatCurrency(auction.marketPrice)}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <View style={s.feeTag}><Text style={s.feeTagText}>Bid Fee: {formatCurrency(auction.bidFee)}</Text></View>
          <View style={s.bidderBadge}>
            <Text style={s.bidderBadgeText}>{auction.totalBids || auction.bidders} bidders</Text>
          </View>
        </View>
        <View style={s.viewSpecsBar}><Text style={s.viewSpecsText}>View more specs</Text></View>
        <View style={{ alignItems: 'center', marginTop: 2 }}>
          {isClosed ? (
            <View style={[s.timePill, { backgroundColor: colors.muted + '40' }]}>
              <Text style={[s.timePillText, { color: colors.mutedForeground }]}>
                {auction.winning_bid_amount != null ? `Won at ${formatCurrency(auction.winning_bid_amount)}` : 'Ended'}
              </Text>
            </View>
          ) : (
            <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
          )}
        </View>
      </View>
      {!isClosed && auction.maxBid && (
        <View style={{ paddingHorizontal: 10, paddingTop: 6 }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ width: `${bidProgress * 100}%`, height: '100%', borderRadius: 2, backgroundColor: bidProgress > 0.8 ? colors.primary : colors.emerald500 }} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
}

const loveItems = [
  { icon: Trophy, label: 'Win premium products for the lowest price' },
  { icon: ShieldCheck, label: 'Fair & transparent — lowest unique bid wins' },
  { icon: Sparkles, label: 'Simple, secure and trusted payments' },
  { icon: PiggyBank, label: 'Big savings, big rewards' },
]

export function AuctionsScreen() {
  const { goBack, selectAuction, auctions, auctionsLoading, refreshAuctions, isFavorite, toggleFavorite } = useApp()
  const [category, setCategory] = useState('All')
  const [showClosed, setShowClosed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('ending-soon')
  const [showSortPicker, setShowSortPicker] = useState(false)

  const liveAuctions = useMemo(() => auctions.filter((a) => a.status !== 'closed'), [auctions])
  const closedAuctions = useMemo(() => auctions.filter((a) => a.status === 'closed'), [auctions])

  const categories = useMemo(() => buildAuctionCategoryOptions(liveAuctions.map((a) => a.category)), [liveAuctions])

  const filtered = useMemo(() => {
    const source = showClosed ? closedAuctions : liveAuctions
    const unique = Array.from(new Map(source.map((a) => [a.id, a])).values())

    let list = category === 'All' ? unique : unique.filter((a) => a.category === category)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.publicCode && a.publicCode.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))
      )
    }

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'ending-soon':
          return a.timeLeft - b.timeLeft
        case 'bids-desc':
          return (b.totalBids || b.bidders || 0) - (a.totalBids || a.bidders || 0)
        case 'fee-asc':
          return a.bidFee - b.bidFee
        case 'price-desc':
          return b.marketPrice - a.marketPrice
        case 'price-asc':
          return a.marketPrice - b.marketPrice
        default:
          return 0
      }
    })
  }, [category, showClosed, liveAuctions, closedAuctions, searchQuery, sortBy])

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshAuctions()
    setRefreshing(false)
  }, [refreshAuctions])

  const sortLabels: Record<SortOption, string> = {
    'ending-soon': 'Ending Soonest',
    'bids-desc': 'Most Bids',
    'fee-asc': 'Lowest Bid Fee',
    'price-desc': 'Highest Value',
    'price-asc': 'Lowest Value',
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar title="Live Auctions" onBack={goBack} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Search Bar ── */}
        <View style={s.searchBarContainer}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search auctions by name, brand, code..."
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

        {auctionsLoading && auctions.length === 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} style={{ width: CARD_W }} imageHeight={CARD_W * 0.75} />)}
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={s.pageTitle}>{showClosed ? 'Closed Auctions' : 'Reverse Auctions'}</Text>
                <Text style={s.pageSub}>{showClosed ? 'Recently ended auctions' : 'Lowest unique bid wins. Bid low, be unique!'}</Text>
              </View>
              <Badge tone={showClosed ? 'muted' : 'green'}>
                <View style={[s.greenDot, { backgroundColor: showClosed ? colors.mutedForeground : colors.emerald500 }]} />
                {' '}{filtered.length} {showClosed ? 'Closed' : 'Active'}
              </Badge>
            </View>

            {/* ── Live / Closed Status Switch & Sort Toggle ── */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowClosed(false)}
                  style={[s.chip, !showClosed ? { backgroundColor: colors.navy, borderColor: colors.navy } : { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[s.chipText, !showClosed ? { color: colors.navyForeground } : { color: colors.mutedForeground }]}>Live</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowClosed(true)}
                  style={[s.chip, showClosed ? { backgroundColor: colors.navy, borderColor: colors.navy } : { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[s.chipText, showClosed ? { color: colors.navyForeground } : { color: colors.mutedForeground }]}>Closed ({closedAuctions.length})</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setShowSortPicker((prev) => !prev)}
                style={s.sortBtn}
                activeOpacity={0.8}
              >
                <ArrowUpDown size={13} color={colors.navy} />
                <Text style={s.sortBtnText}>{sortLabels[sortBy]}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Sort Options Dropdown / Chips ── */}
            {showSortPicker && (
              <View style={s.sortOptionsBox}>
                <Text style={s.sortOptionsTitle}>Sort By:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(['ending-soon', 'bids-desc', 'fee-asc', 'price-desc', 'price-asc'] as SortOption[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => {
                        setSortBy(opt)
                        setShowSortPicker(false)
                      }}
                      style={[s.sortChip, sortBy === opt && s.sortChipActive]}
                    >
                      <Text style={[s.sortChipText, sortBy === opt && s.sortChipTextActive]}>{sortLabels[opt]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Category Chips ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 }}>
              {categories.map((c) => {
                const active = c === category
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[s.chip, active ? { backgroundColor: colors.navy, borderColor: colors.navy } : { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[s.chipText, active ? { color: colors.navyForeground } : { color: colors.mutedForeground }]}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {filtered.length === 0 ? (
              <EmptyState
                icon="search-x"
                title="No Auctions Found"
                message={searchQuery ? `No auctions matching "${searchQuery}". Try changing your search or category.` : "There are no auctions in this category right now."}
                actionLabel={searchQuery || category !== 'All' ? "Clear Filters" : undefined}
                onAction={() => {
                  setSearchQuery('')
                  setCategory('All')
                }}
              />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {filtered.map((a) => (
                  <AuctionCard
                    key={a.id}
                    auction={a}
                    onOpen={() => selectAuction(a.id)}
                    isFav={isFavorite(a.id)}
                    onToggleFavorite={() => toggleFavorite(a.id)}
                  />
                ))}
              </View>
            )}

            <View style={s.loveBox}>
              <Text style={s.loveTitle}>Why customers love TakeLow</Text>
              {loveItems.map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <View style={s.loveIcon}><item.icon size={16} color={colors.primary} /></View>
                  <Text style={s.loveText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function StatusBarCustom() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyForeground }}>9:41</Text>
    </View>
  )
}

const s = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 8,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
    padding: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  sortOptionsBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  sortOptionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sortChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
  sortChipTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  card: {
    width: CARD_W,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImgOuter: { width: '100%', height: CARD_W * 0.75, position: 'relative' },
  cardImgWrap: { width: '100%', height: '100%' },
  cardImgTop: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeBadge: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 7, paddingVertical: 3 },
  codeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.awashBlue, letterSpacing: 0.8 },
  favBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardSpec: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  feeTag: { borderRadius: 999, backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '33', paddingHorizontal: 8, paddingVertical: 4 },
  feeTagText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  bidderBadge: { borderRadius: 16, backgroundColor: colors.emerald50, paddingHorizontal: 8, paddingVertical: 4 },
  bidderBadgeText: { fontSize: 11, fontWeight: '700', color: colors.emerald700 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.navy },
  viewSpecsBar: { marginTop: 2, borderRadius: 10, backgroundColor: colors.awashBlue + '0D', paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
  viewSpecsText: { fontSize: 11, fontWeight: '700', color: colors.awashBlue, textTransform: 'uppercase', letterSpacing: 1 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  timePillText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pageTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  pageSub: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald500 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  loveBox: { marginTop: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary + '99', padding: 16 },
  loveTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  loveIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  loveText: { fontSize: 12, fontWeight: '500', color: colors.navy + 'CC', flex: 1 },
})
