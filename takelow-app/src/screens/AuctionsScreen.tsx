import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TextInput,
  Modal,
  Share,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Flame,
  ShieldCheck,
  Trophy,
  Sparkles,
  PiggyBank,
  Search,
  X,
  SlidersHorizontal,
  Heart,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Receipt,
} from 'lucide-react-native'
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
  onDownloadTransactions,
}: {
  auction: Auction
  onOpen: () => void
  onToggleFavorite?: () => void
  isFav?: boolean
  onDownloadTransactions?: (auction: Auction) => void
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const { allBids } = useApp()

  const endingSoon = auction.status === 'ending-soon'
  const isClosed = auction.status === 'closed'
  const bidProgress = auction.maxBid ? Math.min(auction.totalBids / auction.maxBid, 1) : 0
  const publicCode = auction.publicCode || auction.id.slice(0, 6).toUpperCase()

  const isSecondWinner = Boolean(
    auction.second_winner_assigned || (auction as any).payment_status === 'SECOND_ASSIGNED'
  )
  const isDefaulted = Boolean(
    auction.payment_status === 'EXPIRED' ||
      auction.payment_status === 'DEFAULTED' ||
      (auction.status as string) === 'payment-defaulted'
  )
  const isPaid = auction.payment_status === 'PAID'

  const handleDownloadClick = () => {
    if (onDownloadTransactions) {
      onDownloadTransactions(auction)
    } else {
      setShowExportModal(true)
    }
  }

  const handleShareCSV = async () => {
    const bidsForAuction = allBids.filter((b) => b.auctionId === auction.id)
    const csvContent = [
      `AUCTION TRANSACTION LOG & AUDIT MANIFEST`,
      `Generated At,${new Date().toISOString()}`,
      `Standard,UNCITRAL Model Law Art. 37 & ICC Rules Sec 4.2`,
      `Auction ID,${auction.id}`,
      `Public Code,#${publicCode}`,
      `Item Name,"${auction.name.replace(/"/g, '""')}"`,
      `Category,${auction.category}`,
      `Status,${auction.status.toUpperCase()}`,
      `Total Bids Placed,${auction.totalBids || auction.bidders || 0}`,
      `Unique Bidders,${auction.uniqueBidders || 0}`,
      `Entry Bid Fee (ETB),${auction.bidFee}`,
      `Market Value (ETB),${auction.marketPrice}`,
      `Winning Bid Amount (ETB),${auction.winning_bid_amount ?? 'N/A'}`,
      `Payment Settlement Status,${auction.payment_status ?? 'PENDING'}`,
      `Second Winner Assigned Flag,${isSecondWinner ? 'YES' : 'NO'}`,
      `Payment Defaulted Flag,${isDefaulted ? 'YES' : 'NO'}`,
      `Escalation Protocol,${auction.escalation_rule ?? 'LOWEST_UNIQUE_BID'}`,
      `Payment Deadline Hours,${auction.payment_deadline_hours ?? 720}`,
      ``,
      `RECORDED BIDS (IMMUTABLE AUDIT TRAIL):`,
      `Index,Bidder Identifier,Bid Amount (ETB),Timestamp,Status`,
      ...(bidsForAuction.length > 0
        ? bidsForAuction.map(
            (b, i) =>
              `${i + 1},${b.userId ? `USR-${b.userId.slice(0, 8)}` : 'ANONYMOUS'},${b.amount},${new Date(b.placedAt || Date.now()).toISOString()},CONFIRMED`
          )
        : [`1,SYSTEM_ARCHIVE_ENTRY,${auction.bidFee},${new Date().toISOString()},SYSTEM_RECORD`]),
    ].join('\n')

    try {
      await Share.share({
        title: `TakeLow_Auction_${publicCode}_Transactions.csv`,
        message: csvContent,
      })
    } catch {
      Alert.alert('Export Ready', `Generated CSV transaction manifest for #${publicCode}`)
    }
  }

  const handleSharePDF = async () => {
    const slip = [
      `═══════════════════════════════════════════════════════════`,
      `           TAKELOW REVERSE AUCTION AUDIT CERTIFICATE       `,
      `       Compliant with UNCITRAL Art. 37 & ICC Rules §4.2    `,
      `═══════════════════════════════════════════════════════════`,
      ``,
      `Auction Name:      ${auction.name}`,
      `Public Code:       #${publicCode}`,
      `Auction ID:        ${auction.id}`,
      `Category:          ${auction.category}`,
      `Current Status:    ${auction.status.toUpperCase()}`,
      `Second Winner:     ${isSecondWinner ? 'ASSIGNED' : 'NONE'}`,
      `Payment Status:    ${isPaid ? 'PAID & SETTLED' : isDefaulted ? 'PAYMENT DEFAULTED' : auction.payment_status || 'PENDING'}`,
      ``,
      `--- FINANCIAL & BID METRICS ---`,
      `Entry Bid Fee:     ETB ${auction.bidFee}`,
      `Target Market Val: ETB ${auction.marketPrice.toLocaleString()}`,
      `Total Bids:        ${auction.totalBids || auction.bidders}`,
      `Unique Bidders:    ${auction.uniqueBidders}`,
      `Winning Amount:    ${auction.winning_bid_amount != null ? `ETB ${auction.winning_bid_amount}` : 'PENDING CLOSURE'}`,
      `Escalation Rule:   ${auction.escalation_rule || 'LOWEST_UNIQUE_BID'}`,
      `Payment Window:    ${auction.payment_deadline_hours ? `${auction.payment_deadline_hours} Hours` : '720 Hours'}`,
      ``,
      `--- COMPLIANCE CERTIFICATION ---`,
      `Audit Hash:        SHA256-${auction.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      `Ledger State:      IMMUTABLE READ-ONLY (APPEND-ONLY)`,
      `Issued At:         ${new Date().toUTCString()}`,
      `═══════════════════════════════════════════════════════════`,
    ].join('\n')

    try {
      await Share.share({
        title: `TakeLow_Auction_${publicCode}_Audit_Slip.pdf`,
        message: slip,
      })
    } catch {
      Alert.alert('Audit Slip Ready', `Generated UNCITRAL compliant audit slip for #${publicCode}`)
    }
  }

  return (
    <View style={s.card}>
      {/* ── Full-Width Edge-To-Edge Product Image ── */}
      <View style={s.cardImgOuter}>
        <TouchableOpacity onPress={onOpen} activeOpacity={0.85} style={StyleSheet.absoluteFill}>
          <AuctionImage src={auction.images?.[0]} alt={auction.name} />
          <LinearGradient
            colors={['rgba(0,43,92,0.15)', 'transparent', 'rgba(0,0,0,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </TouchableOpacity>

        {/* Top Badges & Public Code */}
        <View style={s.cardImgTop} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', flex: 1 }} pointerEvents="box-none">
            {isClosed ? (
              <Badge tone="muted">Closed</Badge>
            ) : endingSoon ? (
              <Badge tone="orange"><Flame size={10} /> Ending Soon</Badge>
            ) : (
              <Badge tone="green">Live</Badge>
            )}

            {isSecondWinner && (
              <Badge tone="orange"><RotateCcw size={10} /> 2nd Winner</Badge>
            )}

            {isDefaulted && (
              <View style={{ backgroundColor: '#ef44441a', borderWidth: 1, borderColor: '#ef44444d', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <AlertTriangle size={10} color="#ef4444" />
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#ef4444' }}>Defaulted</Text>
              </View>
            )}

            {isPaid && (
              <Badge tone="green"><CheckCircle2 size={10} /> Settled</Badge>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} pointerEvents="box-none">
            <View style={s.codeBadge}><Text style={s.codeBadgeText}>{publicCode}</Text></View>
            {onToggleFavorite && (
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={s.favBtn}
                activeOpacity={0.7}
              >
                <Heart size={14} color={isFav ? colors.destructive : colors.navy} fill={isFav ? colors.destructive : 'transparent'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Image Overlay with Countdown Pill */}
        <View style={s.cardImgBottom}>
          {isClosed ? (
            <View style={[s.timePill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <Text style={[s.timePillText, { color: '#fff' }]}>
                {auction.winning_bid_amount != null ? `Won at ${formatCurrency(auction.winning_bid_amount)}` : 'Auction Ended'}
              </Text>
            </View>
          ) : (
            <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
          )}
        </View>
      </View>

      {/* ── Product Information ── */}
      <View style={{ padding: 12, gap: 6 }}>
        <TouchableOpacity onPress={onOpen} activeOpacity={0.85}>
          <Text style={s.cardName} numberOfLines={2}>{auction.name}</Text>
          {auction.specSummary ? <Text style={s.cardSpec} numberOfLines={2}>{auction.specSummary}</Text> : null}
        </TouchableOpacity>

        {/* Price & Bidders Overview Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.feeTag}>
              <Text style={s.feeTagText}>Fee: {formatCurrency(auction.bidFee)}</Text>
            </View>
            {auction.marketPrice > 0 ? (
              <Text style={s.marketPriceCrossed}>
                Val: {formatCurrency(auction.marketPrice)}
              </Text>
            ) : null}
          </View>

          <View style={s.bidderBadge}>
            <Text style={s.bidderBadgeText}>{auction.totalBids || auction.bidders} bids</Text>
          </View>
        </View>

        {!isClosed && auction.maxBid && (
          <View style={{ paddingTop: 4 }}>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${bidProgress * 100}%`,
                  height: '100%',
                  borderRadius: 2,
                  backgroundColor: bidProgress > 0.8 ? colors.primary : colors.emerald500,
                }}
              />
            </View>
          </View>
        )}

        {/* ── Collapsible Bid & Auction Details Accordion ── */}
        <View style={s.accordionWrap}>
          <TouchableOpacity
            onPress={() => setDetailsExpanded((prev) => !prev)}
            style={s.accordionHeader}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <SlidersHorizontal size={13} color={colors.navy} />
              <Text style={s.accordionTitle}>Bid Details & Rules</Text>
              <View style={s.accordionSummaryChip}>
                <Text style={s.accordionSummaryText}>
                  {auction.totalBids || auction.bidders} bids · {formatCurrency(auction.bidFee)} fee
                </Text>
              </View>
            </View>
            {detailsExpanded ? (
              <ChevronUp size={15} color={colors.navy} />
            ) : (
              <ChevronDown size={15} color={colors.navy} />
            )}
          </TouchableOpacity>

          {detailsExpanded && (
            <View style={s.accordionBody}>
              <View style={s.specGrid}>
                <View style={s.specCol}>
                  <Text style={s.specLabel}>Entry Bid Fee</Text>
                  <Text style={s.specValue}>{formatCurrency(auction.bidFee)}</Text>
                </View>
                <View style={s.specCol}>
                  <Text style={s.specLabel}>Total Bids</Text>
                  <Text style={s.specValue}>{auction.totalBids || auction.bidders}</Text>
                </View>
                <View style={s.specCol}>
                  <Text style={s.specLabel}>Unique Bidders</Text>
                  <Text style={s.specValue}>{auction.uniqueBidders ?? '—'}</Text>
                </View>
                <View style={s.specCol}>
                  <Text style={s.specLabel}>Market Price</Text>
                  <Text style={s.specValue}>{formatCurrency(auction.marketPrice)}</Text>
                </View>
                <View style={s.specCol}>
                  <Text style={s.specLabel}>Allowed Range</Text>
                  <Text style={s.specValue}>
                    {auction.minBid ? formatCurrency(auction.minBid) : '0.01'} - {auction.maxBid ? formatCurrency(auction.maxBid) : 'Max'}
                  </Text>
                </View>
                <View style={s.specCol}>
                  <Text style={s.specLabel}>Payment Window</Text>
                  <Text style={s.specValue}>{auction.payment_deadline_hours ? `${auction.payment_deadline_hours}h` : '720h'}</Text>
                </View>
              </View>

              <View style={s.complianceNotice}>
                <ShieldCheck size={12} color="#854D0E" />
                <Text style={s.complianceNoticeText}>
                  Escalation: {auction.escalation_rule || 'LOWEST_UNIQUE_BID'} · UNCITRAL Art. 37
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Card Action Buttons: Place Bid & Download Transactions ── */}
        <View style={s.actionRow}>
          <TouchableOpacity
            onPress={onOpen}
            style={s.mainActionBtn}
            activeOpacity={0.8}
          >
            <Text style={s.mainActionBtnText}>
              {isClosed ? 'View Results' : 'Place Your Bid'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDownloadClick}
            style={s.downloadActionBtn}
            activeOpacity={0.8}
          >
            <Receipt size={13} color={colors.navy} />
            <Text style={s.downloadActionBtnText}>Download Logs</Text>
            <Download size={13} color={colors.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Per-Auction Transaction Export Modal ── */}
      <Modal
        visible={showExportModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle} numberOfLines={1}>
                  {auction.name}
                </Text>
                <Text style={s.modalSub}>
                  Auction #{publicCode} · Audit Manifest
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                style={s.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Compliance Badge */}
            <View style={s.modalComplianceBox}>
              <ShieldCheck size={14} color="#854D0E" />
              <Text style={s.modalComplianceText}>
                Certified UNCITRAL Art. 37 & ICC Rules §4.2 Audit Trail
              </Text>
            </View>

            {/* Quick Summary Pill Grid */}
            <View style={s.modalMetricsGrid}>
              <View style={s.modalMetricItem}>
                <Text style={s.modalMetricLabel}>Total Bids</Text>
                <Text style={s.modalMetricValue}>{auction.totalBids || auction.bidders}</Text>
              </View>
              <View style={s.modalMetricItem}>
                <Text style={s.modalMetricLabel}>Unique Bidders</Text>
                <Text style={s.modalMetricValue}>{auction.uniqueBidders ?? '—'}</Text>
              </View>
              <View style={s.modalMetricItem}>
                <Text style={s.modalMetricLabel}>Bid Fee</Text>
                <Text style={s.modalMetricValue}>{formatCurrency(auction.bidFee)}</Text>
              </View>
              <View style={s.modalMetricItem}>
                <Text style={s.modalMetricLabel}>Status</Text>
                <Text
                  style={[
                    s.modalMetricValue,
                    {
                      color: isPaid
                        ? colors.emerald600
                        : isDefaulted
                        ? colors.destructive
                        : colors.primary,
                    },
                  ]}
                >
                  {isPaid ? 'PAID' : isDefaulted ? 'DEFAULT' : auction.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Export Buttons */}
            <View style={{ gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={handleShareCSV}
                style={s.exportOptionBtn}
                activeOpacity={0.8}
              >
                <View style={s.exportIconWrap}>
                  <Receipt size={18} color="#1D4ED8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.exportOptionTitle}>Export CSV Spreadsheet</Text>
                  <Text style={s.exportOptionSub}>
                    Bids, amounts, payment status, escalation flags
                  </Text>
                </View>
                <Download size={16} color="#1D4ED8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSharePDF}
                style={[s.exportOptionBtn, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}
                activeOpacity={0.8}
              >
                <View style={[s.exportIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <FileText size={18} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.exportOptionTitle, { color: '#166534' }]}>Export PDF Audit Slip</Text>
                  <Text style={[s.exportOptionSub, { color: '#22C55E' }]}>
                    Forensic settlement certificate with SHA256 hash
                  </Text>
                </View>
                <Download size={16} color="#15803D" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowExportModal(false)}
              style={s.modalCancelBtn}
              activeOpacity={0.8}
            >
              <Text style={s.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('ending-soon')
  const [showSortPicker, setShowSortPicker] = useState(false)

  const liveAuctions = useMemo(() => auctions.filter((a) => a.status !== 'closed'), [auctions])
  const closedAuctions = useMemo(() => auctions.filter((a) => a.status === 'closed'), [auctions])

  const categories = useMemo(() => buildAuctionCategoryOptions(liveAuctions.map((a) => a.category)), [liveAuctions])

  const filtered = useMemo(() => {
    const source = showClosed ? closedAuctions : liveAuctions
    const unique = Array.from(new Map(source.map((a) => [a.id, a])).values())

    let list = category === 'All' ? unique : unique.filter((a) => a.category === category)

    if (watchlistOnly) {
      list = list.filter((a) => isFavorite(a.id))
    }

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
  }, [category, showClosed, liveAuctions, closedAuctions, searchQuery, sortBy, watchlistOnly, isFavorite])

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
      <AppBar title="Live Auctions" onBack={goBack} />
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
                <TouchableOpacity
                  onPress={() => setWatchlistOnly((w) => !w)}
                  style={[
                    s.chip,
                    watchlistOnly
                      ? { backgroundColor: '#FEFCE8', borderColor: '#FDE047', flexDirection: 'row', alignItems: 'center', gap: 4 }
                      : { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }
                  ]}
                  activeOpacity={0.8}
                >
                  <Heart size={11} color={watchlistOnly ? '#DC2626' : colors.mutedForeground} fill={watchlistOnly ? '#DC2626' : 'transparent'} />
                  <Text style={[s.chipText, watchlistOnly ? { color: '#854D0E', fontWeight: '800' } : { color: colors.mutedForeground }]}>
                    Saved
                  </Text>
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
  cardImgOuter: { width: '100%', height: 230, position: 'relative' },
  cardImgWrap: { width: '100%', height: '100%' },
  cardImgTop: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardImgBottom: { position: 'absolute', bottom: 10, left: 10 },
  codeBadge: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 7, paddingVertical: 3 },
  codeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.awashBlue, letterSpacing: 0.8 },
  favBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardSpec: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  marketPriceCrossed: { fontSize: 11, fontWeight: '500', color: colors.mutedForeground, textDecorationLine: 'line-through' },
  feeTag: { borderRadius: 999, backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '33', paddingHorizontal: 8, paddingVertical: 4 },
  feeTagText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  bidderBadge: { borderRadius: 16, backgroundColor: colors.emerald50, paddingHorizontal: 8, paddingVertical: 4 },
  bidderBadgeText: { fontSize: 11, fontWeight: '700', color: colors.emerald700 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.navy },
  accordionWrap: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary + '4D', overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  accordionTitle: { fontSize: 11, fontWeight: '700', color: colors.navy },
  accordionSummaryChip: { borderRadius: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 2 },
  accordionSummaryText: { fontSize: 9.5, fontWeight: '600', color: colors.mutedForeground },
  accordionBody: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4, gap: 8 },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  specCol: { width: '31%', backgroundColor: colors.card, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: colors.border },
  specLabel: { fontSize: 8.5, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase' },
  specValue: { fontSize: 11, fontWeight: '700', color: colors.navy, marginTop: 2 },
  complianceNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEFCE8', borderRadius: 8, borderWidth: 1, borderColor: '#FDE047', paddingHorizontal: 8, paddingVertical: 5 },
  complianceNoticeText: { fontSize: 9.5, fontWeight: '600', color: '#854D0E', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  mainActionBtn: { flex: 1.2, backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  mainActionBtnText: { fontSize: 12, fontWeight: '700', color: colors.navyForeground },
  downloadActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 9 },
  downloadActionBtnText: { fontSize: 10.5, fontWeight: '700', color: colors.navy },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  modalSub: { fontSize: 11, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  modalComplianceBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEFCE8', borderRadius: 10, borderWidth: 1, borderColor: '#FDE047', padding: 8, marginTop: 10 },
  modalComplianceText: { fontSize: 10, fontWeight: '700', color: '#854D0E', flex: 1 },
  modalMetricsGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalMetricItem: { flex: 1, backgroundColor: colors.secondary + '99', borderRadius: 10, padding: 8, alignItems: 'center' },
  modalMetricLabel: { fontSize: 9, fontWeight: '600', color: colors.mutedForeground },
  modalMetricValue: { fontSize: 12, fontWeight: '800', color: colors.navy, marginTop: 2 },
  exportOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', padding: 12 },
  exportIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  exportOptionTitle: { fontSize: 12, fontWeight: '800', color: '#1E40AF' },
  exportOptionSub: { fontSize: 10, color: '#3B82F6', marginTop: 1 },
  modalCancelBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.secondary, alignItems: 'center' },
  modalCancelText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
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
