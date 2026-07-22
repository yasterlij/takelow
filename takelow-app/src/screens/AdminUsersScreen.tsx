import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Shield, User, Search, X, ChevronRight } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, CTAButton, Card } from '../components/AuctionUI'
import { colors } from '../theme'

export function AdminUsersScreen() {
  const { go, users, allBids } = useApp()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase().trim()
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.id?.toLowerCase().includes(q))
  }, [users, search])

  const adminCount = users.filter((u) => u.role === 'admin').length
  const totalBids = allBids.length

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Manage Users" onBack={() => go('admin-dashboard')} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={s.searchRow}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground}
            style={s.searchInput}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <Card style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12, padding: 12 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy }}>{users.length}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Users</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{adminCount}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Admins</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.emerald600 }}>{totalBids}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Total Bids</Text>
        </View>
      </Card>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Search size={32} color={colors.mutedForeground + '66'} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 12 }}>
              {search ? 'No users match your search' : 'No users found'}
            </Text>
          </View>
        ) : (
          filtered.map((u) => {
            const userBids = allBids.filter((b) => b.userId === u.id)
            const isAdmin = u.role === 'admin'
            const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
            return (
              <View key={u.id} style={s.row}>
                <View style={[s.avatar, { backgroundColor: isAdmin ? colors.primary + '33' : colors.secondary }]}>
                  {isAdmin ? <Shield size={20} color={colors.primary} /> : <User size={20} color={colors.navy} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.name}>{u.name || 'Unknown'}</Text>
                    {isAdmin && <Badge tone="orange">Admin</Badge>}
                  </View>
                  <Text style={s.meta}>{u.phone || u.id.slice(0, 8)}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Text style={s.stat}>{userBids.length} bids</Text>
                    <Text style={s.stat}>{uniqueAuctions} auctions</Text>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </View>
            )
          })
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
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.navy, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  stat: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground },
})
