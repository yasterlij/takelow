import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Gavel, Trophy, Eye, Shield, Home } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton } from '../components/AuctionUI'
import { api } from '../api'
import { colors } from '../theme'

export function ClosedScreen() {
  const { go, selectedId, getAuction, user } = useApp()
  const isAdmin = user?.role === 'admin'
  const auction = getAuction(selectedId)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return Math.min(p + 4, 100)
      })
    }, 90)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => setDone(true), 500)
      return () => clearTimeout(t)
    }
  }, [progress])

  const handleReveal = async () => {
    setRevealing(true)
    try {
      await api.closeAuction(selectedId!)
      go('winner')
    } catch {
      go('winner')
    } finally {
      setRevealing(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBarCustom />
      <View style={s.body}>
        <View style={s.iconCircle}>
          {done ? <Trophy size={48} strokeWidth={1.5} color={colors.primary} /> : <Gavel size={44} strokeWidth={1.5} color={colors.primary} />}
        </View>
        <Text style={s.title}>Auction Closed</Text>
        <Text style={s.subtitle}>
          {done
            ? `${auction?.name || 'Auction'} has ended.${isAdmin ? ' The lowest unique bid has been determined.' : ''}`
            : `Finding the lowest unique bid for ${auction?.name || 'auction'}...`}
        </Text>

        <View style={s.progressBarOuter}>
          <View style={[s.progressBarInner, { width: `${progress}%` }]} />
        </View>
        <Text style={s.progressLabel}>
          {done ? 'Result ready' : `Analyzing bids... ${progress}%`}
        </Text>

        {done && !isAdmin && (
          <View style={s.infoBox}>
            <Shield size={16} color={colors.warning} />
            <Text style={s.infoText}>
              Results are being reviewed by the admin. You will be notified once the winner is declared.
            </Text>
          </View>
        )}
        {done && isAdmin && (
          <Text style={s.adminHint}>Close the auction to draw and reveal the winner.</Text>
        )}
      </View>

      <View style={s.bottomCta}>
        {isAdmin ? (
          <CTAButton disabled={!done || revealing} onPress={handleReveal}>
            {revealing ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : done ? (
              <>
                <Eye size={18} />
                <Text> Reveal Winner</Text>
              </>
            ) : (
              <Text>Determining...</Text>
            )}
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onPress={() => go('home')}>
            <Home size={18} />
            <Text> Back to Home</Text>
          </CTAButton>
        )}
      </View>
    </View>
  )
}

function StatusBarCustom() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, backgroundColor: colors.navy }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyForeground }}>9:41</Text>
    </View>
  )
}

const s = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy, marginTop: 24 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', maxWidth: 300, marginTop: 8, lineHeight: 20 },
  progressBarOuter: { width: '100%', maxWidth: 300, height: 10, borderRadius: 5, backgroundColor: colors.secondary, marginTop: 32, overflow: 'hidden' },
  progressBarInner: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  progressLabel: { fontSize: 13, fontWeight: '700', color: colors.navy, fontVariant: ['tabular-nums'], marginTop: 12 },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, padding: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, maxWidth: 300, marginTop: 24 },
  infoText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#92400E', lineHeight: 18 },
  adminHint: { fontSize: 14, fontWeight: '600', color: colors.navy, textAlign: 'center', maxWidth: 300, marginTop: 24 },
})
