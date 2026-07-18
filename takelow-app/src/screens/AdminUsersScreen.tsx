import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Shield, User } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge } from '../components/AuctionUI'
import { colors } from '../theme'

export function AdminUsersScreen() {
  const { go, users, allBids } = useApp()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Manage Users" onBack={() => go('admin-dashboard')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {users.map((u) => {
          const userBids = allBids.filter((b) => b.userId === u.id)
          const isAdmin = u.role === 'admin'
          return (
            <View key={u.id} style={s.row}>
              <View style={[s.avatar, { backgroundColor: isAdmin ? colors.primary + '33' : colors.secondary }]}>
                {isAdmin ? <Shield size={20} color={colors.primary} /> : <User size={20} color={colors.navy} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.name}>{u.name}</Text>
                  {isAdmin && <Badge tone="orange">Admin</Badge>}
                </View>
                <Text style={s.meta}>{u.phone} · {userBids.length} bids</Text>
              </View>
            </View>
          )
        })}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
})
