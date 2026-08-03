import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "../api"
import { getUserFriendlyMessage } from "../api"

export function useFavoriteAuctions({
  hydrated,
  userId,
  onError,
}: {
  hydrated: boolean
  userId?: string | null
  onError?: (message: string) => void
}) {
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const [favoriteAuctionIds, setFavoriteAuctionIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  const refreshFavorites = useCallback(async () => {
    if (!userId) {
      setFavoriteAuctionIds([])
      return
    }
    setFavoritesLoading(true)
    try {
      const res = await api.getFavorites()
      setFavoriteAuctionIds(res.data.map((item) => item.auction_id))
    } catch {
      onErrorRef.current?.("Failed to refresh favorites")
    } finally {
      setFavoritesLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!hydrated) return
    if (!userId) {
      setFavoriteAuctionIds([])
      return
    }
    refreshFavorites()
  }, [hydrated, userId, refreshFavorites])

  const isFavorite = useCallback((auctionId: string) => favoriteAuctionIds.includes(auctionId), [favoriteAuctionIds])

  const toggleFavorite = useCallback(async (auctionId: string) => {
    if (!userId) return
    const currentlyFavorite = favoriteAuctionIds.includes(auctionId)
    setFavoriteAuctionIds((prev) => currentlyFavorite ? prev.filter((id) => id !== auctionId) : [...prev, auctionId])
    try {
      if (currentlyFavorite) await api.removeFavorite(auctionId)
      else await api.addFavorite(auctionId)
    } catch (e: any) {
      setFavoriteAuctionIds((prev) => currentlyFavorite ? [...prev, auctionId] : prev.filter((id) => id !== auctionId))
      onError?.(getUserFriendlyMessage(e))
    }
  }, [favoriteAuctionIds, onError, userId])

  return {
    favoriteAuctionIds,
    favoritesLoading,
    refreshFavorites,
    isFavorite,
    toggleFavorite,
  }
}