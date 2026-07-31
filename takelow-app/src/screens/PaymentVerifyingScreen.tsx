import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Check, X, ArrowRight, ExternalLink } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { Card } from '../components/AuctionUI'
import { colors } from '../theme'
import { CURRENCY, formatETB } from '../mockDataV0'

export function PaymentVerifyingScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [message, setMessage] = useState('Waiting for payment confirmation...')
  const [paid, setPaid] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      setMessage(`Waiting for payment confirmation${'.'.repeat((attempts % 3) + 1)}`)
      try {
        if (!selectedId) return
        const status = await api.getPaymentLinkStatus(selectedId)
        if (status.status === 'SUCCESSFUL') {
          setPaid(true)
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status.status)) {
          setFailed(true)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        setFailed(true)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 3000)
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        setFailed(true)
      }
    }, 300000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId])

  const handleConfirmPaid = async () => {
    if (!selectedId) return
    setConfirming(true)
    try {
      await api.confirmPayment(selectedId)
      setPaid(true)
    } catch {
      setConfirming(false)
    }
  }

  const amount = userBid ?? 0

  if (paid) {
    return (
      <View style={s.container}>
        <View style={s.iconCircle}>
          <Check size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={s.title}>Payment Successful!</Text>
        <Text style={s.subtitle}>
          Your payment of <Text style={s.amount}>{formatETB(amount)} {CURRENCY}</Text> was received.
        </Text>
        <Card style={{ width: '100%', maxWidth: 300, padding: 20, marginTop: 24 }}>
          <View style={s.row}>
            <Text style={s.label}>Product</Text>
            <Text style={s.value}>{auction?.name || '—'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Amount</Text>
            <Text style={s.value}>{CURRENCY} {formatETB(amount)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Status</Text>
            <Text style={[s.value, { color: colors.emerald500 }]}>Completed</Text>
          </View>
        </Card>
        <TouchableOpacity style={s.btn} onPress={() => go('delivery')} activeOpacity={0.8}>
          <ArrowRight size={18} color={colors.primaryForeground} />
          <Text style={s.btnText}>Track Delivery</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (failed) {
    return (
      <View style={s.container}>
        <View style={[s.iconCircle, { backgroundColor: colors.destructive }]}>
          <X size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={s.title}>Still Waiting for Confirmation</Text>
        <Text style={s.subtitle}>
          Payment was not automatically confirmed. If you've already paid, tap confirm below.
        </Text>
        <TouchableOpacity
          style={[s.btn, confirming && { opacity: 0.5 }]}
          onPress={handleConfirmPaid}
          disabled={confirming}
          activeOpacity={0.8}
        >
          <Text style={s.btnText}>{confirming ? 'Confirming...' : "I've Already Paid"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnOutline, { marginTop: 12 }]}
          onPress={() => go('pay-winning')}
          activeOpacity={0.8}
        >
          <Text style={s.btnOutlineText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={s.pollingText}>{message}</Text>
      <Text style={s.pollingSubtext}>Complete the payment in the opened window</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  pollingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  pollingSubtext: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground + '99',
    textAlign: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.emerald500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: colors.navy,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  amount: {
    fontWeight: '700',
    color: colors.navy,
  },
  card: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 300,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: 24,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
})