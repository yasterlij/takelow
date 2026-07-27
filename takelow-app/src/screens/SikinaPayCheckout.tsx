import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { X, Check } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { colors } from '../theme'

const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 120000

export function SikinaPayCheckout() {
  const { go, selectedId, sikinaPayUrl, setSikinaPayUrl, sikinaPayContext, setFeePaid } = useApp()
  const [status, setStatus] = useState<'loading' | 'paid' | 'failed'>('loading')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleClose = () => {
    cleanup()
    setSikinaPayUrl(null)
    go(sikinaPayContext === 'bid-fee' ? 'pay-fee' : 'pay-winning')
  }

  useEffect(() => {
    if (!sikinaPayUrl) return
    WebBrowser.openBrowserAsync(sikinaPayUrl, {
      toolbarColor: colors.awashBlue,
      controlsColor: colors.neutralWhite,
    }).catch(() => {})
  }, [sikinaPayUrl])

  useEffect(() => {
    if (!selectedId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = sikinaPayContext === 'bid-fee'
          ? await api.getBidFeePaymentStatus(selectedId)
          : await api.getPaymentLinkStatus(selectedId)
        if (res.status === 'SUCCESSFUL') {
          cleanup()
          setStatus('paid')
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(res.status)) {
          cleanup()
          setStatus('failed')
        }
      } catch {
        // retry on next interval
      }
    }, POLL_INTERVAL)

    timeoutRef.current = setTimeout(() => {
      cleanup()
      setStatus('failed')
    }, POLL_TIMEOUT)

    return cleanup
  }, [selectedId, sikinaPayContext])

  const handleContinuePaid = () => {
    cleanup()
    setSikinaPayUrl(null)
    if (sikinaPayContext === 'bid-fee') {
      setFeePaid(true)
      go('place-bid')
    } else {
      go('delivery')
    }
  }

  const handleConfirmManually = async () => {
    cleanup()
    setSikinaPayUrl(null)
    if (sikinaPayContext === 'bid-fee') {
      try {
        await api.confirmBidFeePayment(selectedId!)
        setFeePaid(true)
        go('place-bid')
      } catch {
        go('pay-fee')
      }
      return
    }
    try {
      await api.confirmPayment(selectedId!)
      go('delivery')
    } catch {
      go('pay-winning')
    }
  }

  const handleTryAgain = () => {
    cleanup()
    setSikinaPayUrl(null)
    go(sikinaPayContext === 'bid-fee' ? 'pay-fee' : 'pay-winning')
  }

  if (status === 'paid') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.emerald500, justifyContent: 'center', alignItems: 'center' }}>
          <Check size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.awashBlue, marginTop: 24 }}>Payment Successful!</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
          Your payment was received successfully.
        </Text>
        <TouchableOpacity
          onPress={handleContinuePaid}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, backgroundColor: colors.primary, marginTop: 24 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryForeground }}>
            {sikinaPayContext === 'bid-fee' ? 'Continue to Place Bid' : 'Track Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (status === 'failed') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.destructive, justifyContent: 'center', alignItems: 'center' }}>
          <X size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.awashBlue, marginTop: 24 }}>Payment Not Confirmed</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
          We couldn't automatically confirm your payment. If you've already paid, tap confirm below.
        </Text>
        <TouchableOpacity
          onPress={handleConfirmManually}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, backgroundColor: colors.primary, marginTop: 24 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryForeground }}>I've Already Paid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleTryAgain}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 12 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.awashBlue }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center' }}>
        Processing your payment...
      </Text>
      <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '500', color: colors.mutedForeground + '99', textAlign: 'center' }}>
        A secure browser has opened within the app to complete your payment.
      </Text>
      <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '500', color: colors.mutedForeground + '66', textAlign: 'center' }}>
        Once complete, return here to confirm.
      </Text>
      <TouchableOpacity
        onPress={handleClose}
        style={{ marginTop: 32, paddingVertical: 12, paddingHorizontal: 24 }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.mutedForeground }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}
