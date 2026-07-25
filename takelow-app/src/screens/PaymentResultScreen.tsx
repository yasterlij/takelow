import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Check, X, ArrowRight, RefreshCw } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { colors } from '../theme'
import { CURRENCY, formatETB } from '../mockDataV0'

type ResultType = 'success' | 'failed' | 'pending'

export function PaymentResultScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [polling, setPolling] = useState(true)
  const [result, setResult] = useState<ResultType>('pending')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async (): Promise<boolean> => {
      try {
        if (selectedId) {
          const status = await api.getPaymentLinkStatus(selectedId)
          if (!cancelled) {
            if (status.status === 'SUCCESSFUL') {
              setResult('success')
              setPolling(false)
              return true
            } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status.status)) {
              setResult('failed')
              setPolling(false)
              return true
            }
          }
        } else {
          if (!cancelled) {
            setResult('success')
            setPolling(false)
            return true
          }
        }
      } catch {
        if (!cancelled) setResult('failed')
      }
      return false
    }

    check().then((done) => {
      if (!done && !cancelled) {
        pollRef.current = setInterval(async () => {
          const finished = await check()
          if (finished && pollRef.current) {
            clearInterval(pollRef.current)
          }
        }, 3000)
        setTimeout(() => {
          if (pollRef.current) clearInterval(pollRef.current)
          if (!cancelled) setPolling(false)
        }, 60000)
      }
    })

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId])

  const amount = userBid ?? 0

  if (polling && result === 'pending') {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.pollingText}>Verifying payment status...</Text>
      </View>
    )
  }

  if (result === 'success') {
    return (
      <View style={s.container}>
        <View style={s.iconCircle}>
          <Check size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={s.title}>Payment Successful!</Text>
        <Text style={s.subtitle}>
          Your payment of <Text style={s.amount}>{formatETB(amount)} {CURRENCY}</Text> was received.
        </Text>
        <View style={s.card}>
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
        </View>
        <TouchableOpacity style={s.btn} onPress={() => go('delivery')} activeOpacity={0.8}>
          <ArrowRight size={18} color={colors.primaryForeground} />
          <Text style={s.btnText}>Track Delivery</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.container}>
      <View style={[s.iconCircle, { backgroundColor: colors.destructive }]}>
        <X size={40} color={colors.primaryForeground} strokeWidth={3} />
      </View>
      <Text style={s.title}>Payment Not Completed</Text>
      <Text style={s.subtitle}>
        The payment was not completed. You can try again or contact support.
      </Text>
      <TouchableOpacity style={s.btn} onPress={() => go('pay-winning')} activeOpacity={0.8}>
        <RefreshCw size={18} color={colors.primaryForeground} />
        <Text style={s.btnText}>Try Again</Text>
      </TouchableOpacity>
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
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
})