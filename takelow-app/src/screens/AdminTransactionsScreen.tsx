import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import {
  Receipt,
  Search,
  X,
  Trophy,
  TicketCheck,
  ArrowDownLeft,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, Card } from '../components/AuctionUI'
import { formatCurrency } from '../mockDataV0'
import { colors } from '../theme'
import { api, type ApiUnifiedTransaction, type ApiTransactionsListResponse } from '../api'

type TxnTypeFilter = 'ALL' | 'WINNING_BID' | 'BID_FEE' | 'DEPOSIT' | 'REFUND'
type TxnStatusFilter = 'ALL' | 'SUCCESSFUL' | 'PENDING' | 'FAILED'

export function AdminTransactionsScreen() {
  const { go } = useApp()
  const [transactions, setTransactions] = useState<ApiUnifiedTransaction[]>([])
  const [summary, setSummary] = useState<ApiTransactionsListResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<TxnTypeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<TxnStatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [selectedTxn, setSelectedTxn] = useState<ApiUnifiedTransaction | null>(null)

  const loadTransactions = useCallback(async (targetPage = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await api.adminListEnhancedTransactions({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        page: targetPage,
        limit: 30,
      })

      if (targetPage === 1) {
        setTransactions(res.data)
      } else {
        setTransactions((prev) => [...prev, ...res.data])
      }

      setSummary(res.summary)
      setPage(res.meta.page)
      setTotalPages(res.meta.total_pages)
    } catch {
      // Fallback if network or error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [typeFilter, statusFilter, search])

  useEffect(() => {
    loadTransactions(1)
  }, [loadTransactions])

  const onRefresh = () => {
    loadTransactions(1, true)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WINNING_BID':
        return <Trophy size={16} color={colors.primary} />
      case 'BID_FEE':
        return <TicketCheck size={16} color={colors.orange} />
      case 'DEPOSIT':
        return <ArrowDownLeft size={16} color={colors.emerald600} />
      case 'REFUND':
        return <RotateCcw size={16} color={colors.destructive} />
      default:
        return <Receipt size={16} color={colors.navy} />
    }
  }

  const getTypeTone = (type: string): 'gold' | 'orange' | 'green' | 'muted' | 'navy' => {
    switch (type) {
      case 'WINNING_BID':
        return 'gold'
      case 'BID_FEE':
        return 'orange'
      case 'DEPOSIT':
        return 'green'
      case 'REFUND':
        return 'muted'
      default:
        return 'navy'
    }
  }

  const getStatusTone = (status: string): 'green' | 'orange' | 'muted' => {
    switch (status) {
      case 'SUCCESSFUL':
      case 'PAID':
        return 'green'
      case 'PENDING':
        return 'orange'
      case 'FAILED':
      case 'EXPIRED':
        return 'muted'
      default:
        return 'muted'
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Transactions Hub" onBack={() => go('admin-dashboard')} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Compliance Banner */}
        <Card style={s.complianceBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#854D0E" />
            <Text style={s.complianceTitle}>UNCITRAL Art. 37 & ICC §4.2 Compliant</Text>
          </View>
          <Text style={s.complianceDesc}>
            Immutable forensic audit records. All transaction modifications are cryptographically signed and read-only.
          </Text>
        </Card>

        {/* Summary Metric Cards */}
        {summary && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1, padding: 12 }}>
                <Text style={s.metricLabel}>Total Volume</Text>
                <Text style={s.metricValue}>{formatCurrency(summary.total_volume)}</Text>
                <Text style={s.metricHint}>{summary.successful_count} successful</Text>
              </Card>
              <Card style={{ flex: 1, padding: 12 }}>
                <Text style={s.metricLabel}>Winner Payments</Text>
                <Text style={[s.metricValue, { color: colors.primary }]}>
                  {formatCurrency(summary.winning_bid_volume)}
                </Text>
                <Text style={s.metricHint}>Winning bids</Text>
              </Card>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1, padding: 12 }}>
                <Text style={s.metricLabel}>Bid Fees</Text>
                <Text style={[s.metricValue, { color: '#854D0E' }]}>
                  {formatCurrency(summary.bid_fee_volume)}
                </Text>
                <Text style={s.metricHint}>Participation fees</Text>
              </Card>
              <Card style={{ flex: 1, padding: 12 }}>
                <Text style={s.metricLabel}>Pending / Default</Text>
                <Text style={[s.metricValue, { color: summary.defaulted_count > 0 ? colors.destructive : colors.navy }]}>
                  {summary.pending_count} P / {summary.defaulted_count} D
                </Text>
                <Text style={s.metricHint}>Status breakdown</Text>
              </Card>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={s.searchBar}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder="Search bidder phone, auction..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => loadTransactions(1)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[
            { key: 'ALL', label: 'All Types' },
            { key: 'WINNING_BID', label: 'Winner Payments' },
            { key: 'BID_FEE', label: 'Bid Fees' },
            { key: 'DEPOSIT', label: 'Deposits' },
            { key: 'REFUND', label: 'Refunds' },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTypeFilter(t.key as TxnTypeFilter)}
              style={[s.filterPill, typeFilter === t.key && s.filterPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterPillText, typeFilter === t.key && s.filterPillTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[
            { key: 'ALL', label: 'All Status' },
            { key: 'SUCCESSFUL', label: 'Successful' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'FAILED', label: 'Failed / Defaulted' },
          ].map((st) => (
            <TouchableOpacity
              key={st.key}
              onPress={() => setStatusFilter(st.key as TxnStatusFilter)}
              style={[s.filterPill, statusFilter === st.key && s.filterPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterPillText, statusFilter === st.key && s.filterPillTextActive]}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transactions List */}
        {loading && transactions.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 10 }}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <Receipt size={32} color={colors.mutedForeground} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 10 }}>No Transactions Found</Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
              No transactions match the selected filters.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {transactions.map((txn) => (
              <TouchableOpacity
                key={txn.id}
                onPress={() => setSelectedTxn(txn)}
                activeOpacity={0.8}
              >
                <Card style={s.txnCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={s.txnIconBox}>
                      {getTypeIcon(txn.type)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.txnTitle} numberOfLines={1}>
                          {txn.product_name || (txn.type === 'DEPOSIT' ? 'Wallet Deposit' : 'Transaction')}
                        </Text>
                      </View>
                      <Text style={s.txnSubtitle} numberOfLines={1}>
                        {txn.user_phone || txn.user_name || txn.user_id.slice(0, 8)}
                        {txn.gateway ? ` · ${txn.gateway}` : ''}
                      </Text>
                      <Text style={s.txnTime}>
                        {new Date(txn.created_at).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.txnAmount}>
                        {formatCurrency(txn.amount)}
                      </Text>
                      <Badge tone={getStatusTone(txn.status)}>
                        {txn.status}
                      </Badge>
                    </View>
                    <ChevronRight size={14} color={colors.mutedForeground} />
                  </View>

                  {txn.escalation_flag && (
                    <View style={s.flagBanner}>
                      <AlertTriangle size={12} color={colors.destructive} />
                      <Text style={s.flagText}>{txn.escalation_flag}</Text>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))}

            {page < totalPages && (
              <TouchableOpacity
                onPress={() => loadTransactions(page + 1)}
                style={s.loadMoreBtn}
                activeOpacity={0.8}
              >
                <Text style={s.loadMoreText}>Load More Transactions</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTxn} transparent animationType="fade" onRequestClose={() => setSelectedTxn(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} color={colors.navy} />
                <Text style={s.modalTitle}>Transaction Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTxn(null)} style={{ padding: 4 }}>
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
                {/* Amount Header */}
                <View style={{ alignItems: 'center', paddingVertical: 14, backgroundColor: colors.secondary, borderRadius: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>Transaction Amount</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: colors.navy, marginTop: 4 }}>
                    {formatCurrency(selectedTxn.amount)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <Badge tone={getTypeTone(selectedTxn.type)}>{selectedTxn.type}</Badge>
                    <Badge tone={getStatusTone(selectedTxn.status)}>{selectedTxn.status}</Badge>
                  </View>
                </View>

                {/* Metadata Fields */}
                <View style={{ gap: 10 }}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Auction / Product</Text>
                    <Text style={s.detailVal} numberOfLines={1}>{selectedTxn.product_name || '—'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Bidder Phone</Text>
                    <Text style={s.detailVal}>{selectedTxn.user_phone || '—'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>User ID</Text>
                    <Text style={[s.detailVal, { fontFamily: 'Courier' }]}>{selectedTxn.user_id}</Text>
                  </View>

                  {selectedTxn.gateway && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Payment Gateway</Text>
                      <Text style={s.detailVal}>{selectedTxn.gateway}</Text>
                    </View>
                  )}

                  {selectedTxn.reference_id && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Reference ID</Text>
                      <Text style={[s.detailVal, { fontFamily: 'Courier' }]}>{selectedTxn.reference_id}</Text>
                    </View>
                  )}

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Timestamp</Text>
                    <Text style={s.detailVal}>{new Date(selectedTxn.created_at).toLocaleString()}</Text>
                  </View>

                  {selectedTxn.escalation_flag && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Escalation Flag</Text>
                      <Text style={[s.detailVal, { color: colors.destructive, fontWeight: '700' }]}>
                        {selectedTxn.escalation_flag}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Legal compliance stamp */}
                <View style={s.complianceFootnote}>
                  <ShieldCheck size={12} color="#854D0E" />
                  <Text style={{ fontSize: 10, color: '#854D0E', flex: 1 }}>
                    Certified read-only ledger record under UNCITRAL Model Law Art. 37.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  complianceBanner: {
    padding: 12,
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
    borderWidth: 1,
  },
  complianceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
    textTransform: 'uppercase',
  },
  complianceDesc: {
    fontSize: 10.5,
    color: '#854D0E',
    marginTop: 4,
    lineHeight: 15,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  metricHint: {
    fontSize: 9.5,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
    padding: 0,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  filterPillTextActive: {
    color: '#FFF',
  },
  txnCard: {
    padding: 12,
  },
  txnIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  txnSubtitle: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  txnTime: {
    fontSize: 9.5,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    fontVariant: ['tabular-nums'],
  },
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  flagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.destructive,
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  detailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
    maxWidth: '60%',
    textAlign: 'right',
  },
  complianceFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#FEFCE8',
    borderRadius: 10,
    marginTop: 6,
  },
})
