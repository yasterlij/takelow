import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl, TextInput } from 'react-native'
import { Bell, CheckCheck, Search, X, Trophy, AlertTriangle, Info, Gavel } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api, type ApiNotification } from '../api'
import { AppBar, Badge, Card, CTAButton } from '../components/AuctionUI'
import { EmptyState } from '../components/EmptyState'
import { colors } from '../theme'

function formatSentAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export function NotificationsScreen() {
  const { go, goBack, refreshUnreadNotifications } = useApp()
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const items = await api.getInbox(unreadOnly)
      setNotifications(items)
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [unreadOnly])

  useEffect(() => {
    setLoading(true)
    fetchNotifications()
  }, [fetchNotifications, refreshKey])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    await refreshUnreadNotifications()
  }

  const markRead = async (id: string) => {
    setBusyId(id)
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item))
      await refreshUnreadNotifications()
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
      await refreshUnreadNotifications()
    } finally {
      setMarkingAll(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return notifications
    const q = searchQuery.toLowerCase().trim()
    return notifications.filter((n) =>
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q)
    )
  }, [notifications, searchQuery])

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <AppBar title="Notifications" onBack={goBack} />
      </View>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={s.headerRow}>
          <Text style={s.subtitle}>Auction updates, outbid notices, and winner alerts</Text>
          <Badge tone={unreadCount > 0 ? 'orange' : 'muted'}>{unreadCount} unread</Badge>
        </View>

        {/* ── Search Bar ── */}
        <View style={s.searchBarContainer}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search alerts and notifications..."
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

        <View style={s.actionsRow}>
          <TouchableOpacity onPress={() => setUnreadOnly((current) => !current)} style={[s.filterChip, unreadOnly ? s.filterChipActive : null]} activeOpacity={0.85}>
            <Text style={[s.filterChipText, unreadOnly ? s.filterChipTextActive : null]}>{unreadOnly ? 'Showing unread' : 'Show unread only'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <CTAButton variant="outline" onPress={markAllRead} disabled={markingAll || unreadCount === 0}>
              <View style={s.markAllInner}>
                <CheckCheck size={16} color={colors.foreground} />
                <Text style={s.markAllText}>{markingAll ? 'Marking...' : 'Mark all read'}</Text>
              </View>
            </CTAButton>
          </View>
        </View>

        {loading ? (
          <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : error ? (
          <EmptyState icon="alert" title="Notifications unavailable" message={error} actionLabel="Retry" onAction={() => setRefreshKey((current) => current + 1)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No notifications"
            message={searchQuery ? 'No notifications match your search.' : unreadOnly ? 'You have read everything for now.' : 'We will show winner alerts, auction reminders, and account updates here.'}
            actionLabel={searchQuery ? 'Clear Search' : unreadOnly ? 'Show all' : 'Go to auctions'}
            onAction={() => searchQuery ? setSearchQuery('') : unreadOnly ? setUnreadOnly(false) : go('auctions')}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((item) => {
              const isWinner = item.title.toLowerCase().includes('winner') || item.title.toLowerCase().includes('won')
              const isOutbid = item.title.toLowerCase().includes('outbid')

              return (
                <Card key={item.id} style={{ ...s.card, ...(!item.read ? s.unreadCard : {}) }}>
                  <View style={s.cardRow}>
                    <View style={[
                      s.iconWrap,
                      item.read ? s.iconWrapMuted : null,
                      isWinner ? { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' } : null,
                    ]}>
                      {isWinner ? (
                        <Trophy size={18} color={colors.primary} />
                      ) : isOutbid ? (
                        <AlertTriangle size={18} color={colors.warning} />
                      ) : (
                        <Bell size={18} color={item.read ? colors.mutedForeground : colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.titleRow}>
                        <Text style={s.title}>{item.title}</Text>
                        {!item.read && <Badge tone="orange">New</Badge>}
                      </View>
                      <Text style={s.body}>{item.body}</Text>
                      <Text style={s.timestamp}>{formatSentAt(item.sent_at)}</Text>
                    </View>
                  </View>
                  {!item.read && (
                    <TouchableOpacity onPress={() => markRead(item.id)} style={s.readBtn} activeOpacity={0.85} disabled={busyId === item.id}>
                      <Text style={s.readBtnText}>{busyId === item.id ? 'Saving...' : 'Mark read'}</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 110, gap: 14 },
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
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  filterChipTextActive: { color: colors.navyForeground },
  markAllInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  markAllText: { fontSize: 12, fontWeight: '700', color: colors.foreground },
  loadingWrap: { paddingVertical: 48 },
  card: { padding: 14, gap: 12, borderRadius: 16 },
  unreadCard: { borderColor: colors.primary + '55' },
  cardRow: { flexDirection: 'row', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '2A', justifyContent: 'center', alignItems: 'center' },
  iconWrapMuted: { backgroundColor: colors.secondary, borderColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.navy },
  body: { fontSize: 13, lineHeight: 20, color: colors.foreground },
  timestamp: { marginTop: 10, fontSize: 11, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase' },
  readBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  readBtnText: { fontSize: 12, fontWeight: '700', color: colors.awashBlue },
})
