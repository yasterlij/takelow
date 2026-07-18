import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Gavel, Trophy, Eye, Loader2 } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton } from '../components/AuctionUI'

import { colors } from '../theme'

export function ClosedScreen() {
  const { go, selectedId, setWinner, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

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
            ? `${auction?.name} — the lowest unique bid has been determined.`
            : `Finding the lowest unique bid for ${auction?.name}...`}
        </Text>

        <View style={s.progressBarOuter}>
          <View style={[s.progressBarInner, { width: `${progress}%` }]} />
        </View>
        <Text style={s.progressLabel}>
          {done ? 'Result ready' : `Analyzing bids... ${progress}%`}
        </Text>

        {done && (
          <Text style={s.doneMessage}>The system automatically determined the winner based on the lowest unique bid.</Text>
        )}
      </View>

      <View style={s.bottomCta}>
        <CTAButton disabled={!done} onPress={() => { setWinner(); go('winner') }}>
          {done ? (
            <><Eye size={18} /> Reveal Winner</>
          ) : (
            <><Loader2 size={18} /> Determining...</>
          )}
        </CTAButton>
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
  doneMessage: { fontSize: 12, fontWeight: '500', color: colors.navy + 'B3', textAlign: 'center', maxWidth: 300, marginTop: 16, lineHeight: 18 },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, padding: 16 },
})
