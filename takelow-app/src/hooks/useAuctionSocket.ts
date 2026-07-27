import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { io, Socket } from 'socket.io-client'
import type { Auction } from '../mockDataV0'
import { getApiToken } from '../api'

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
const SOCKET_URL = `http://${HOST}:3002/auctions`

export type SocketUpdatePayload = {
  auction_id: string
  new_bid_amount: number
  total_bids: number
  timestamp: string
}

export function useAuctionSocket(
  selectedId: string | null,
  onUpdate: (payload: SocketUpdatePayload) => void,
) {
  const socketRef = useRef<Socket | null>(null)
  const subscribedRef = useRef<string | null>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const token = getApiToken()
    if (!token) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('auction:update', (payload: SocketUpdatePayload) => {
      onUpdateRef.current(payload)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      subscribedRef.current = null
    }
  }, [])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return

    if (subscribedRef.current && subscribedRef.current !== selectedId) {
      socket.emit('unsubscribe:auction', subscribedRef.current)
    }

    if (selectedId) {
      socket.emit('subscribe:auction', selectedId)
      subscribedRef.current = selectedId
    } else {
      subscribedRef.current = null
    }
  }, [selectedId])
}

export function applySocketUpdate(
  auctions: Auction[],
  payload: SocketUpdatePayload,
): Auction[] {
  return auctions.map((a) =>
    a.id === payload.auction_id
      ? { ...a, bidders: payload.total_bids, totalBids: payload.total_bids }
      : a,
  )
}
