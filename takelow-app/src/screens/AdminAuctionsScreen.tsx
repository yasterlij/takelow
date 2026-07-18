import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Alert, Platform } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Plus, X, Pencil, XCircle, Trash2, Eye, Calendar } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Badge, Card } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

const CATEGORIES = ['Electronics', 'Smartphones', 'Computers', 'Audio', 'Gaming']

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function AdminAuctionsScreen() {
  const { go, auctions, addAuction, updateAuction, deleteAuction, closeAuction, allBids, users } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewBidsId, setViewBidsId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Electronics')
  const [marketPrice, setMarketPrice] = useState('')
  const [bidFee, setBidFee] = useState('10')
  const [description, setDescription] = useState('')
  const [highlights, setHighlights] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000))
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date')
  const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setName(''); setCategory('Electronics'); setMarketPrice(''); setBidFee('10')
    setDescription(''); setHighlights('')
    setStartDate(new Date()); setEndDate(new Date(Date.now() + 7 * 86400000))
  }

  const openCreate = () => {
    setEditingId(null); resetForm(); setShowForm(true)
  }

  const openEdit = (a: any) => {
    setEditingId(a.id)
    setName(a.name); setCategory(a.category); setMarketPrice(String(a.marketPrice))
    setBidFee('10'); setDescription(a.description)
    setHighlights(Array.isArray(a.highlights) ? a.highlights.join(', ') : '')
    setStartDate(new Date()); setEndDate(new Date(Date.now() + 7 * 86400000))
    setShowForm(true)
  }

  const onStartChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false)
    if (!selected) return
    if (startPickerMode === 'date') {
      const merged = new Date(selected)
      merged.setHours(startDate.getHours(), startDate.getMinutes())
      setStartDate(merged)
      setStartPickerMode('time')
      if (Platform.OS === 'android') setShowStartPicker(true)
    } else {
      setStartDate(selected)
      setStartPickerMode('date')
    }
  }

  const onEndChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false)
    if (!selected) return
    if (endPickerMode === 'date') {
      const merged = new Date(selected)
      merged.setHours(endDate.getHours(), endDate.getMinutes())
      setEndDate(merged)
      setEndPickerMode('time')
      if (Platform.OS === 'android') setShowEndPicker(true)
    } else {
      setEndDate(selected)
      setEndPickerMode('date')
    }
  }

  const handleSubmit = async () => {
    if (!name || !marketPrice) return
    setSubmitting(true)
    const hl = highlights ? highlights.split(',').map((h) => h.trim()).filter(Boolean) : []
    if (editingId) {
      await updateAuction(editingId, {
        name, category, marketPrice: Number(marketPrice), description, highlights: hl,
      })
    } else {
      await addAuction({
        name, category, marketPrice: Number(marketPrice), bidFee: Number(bidFee),
        description, highlights: hl,
        startTime: startDate.toISOString(), endTime: endDate.toISOString(),
      })
    }
    setSubmitting(false)
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  const handleClose = (id: string) => {
    Alert.alert('Close Auction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: () => closeAuction(id) },
    ])
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Auction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAuction(id) },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Manage Auctions" onBack={() => go('admin-dashboard')} right={
        <TouchableOpacity style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }} onPress={openCreate}>
          <Plus size={20} color={colors.navyForeground} />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {showForm && (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>{editingId ? 'Edit Auction' : 'New Auction'}</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); setEditingId(null) }}><X size={16} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            <TextInput value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor={colors.mutedForeground} style={s.input} />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <TextInput value={marketPrice} onChangeText={(t) => setMarketPrice(t.replace(/\D/g, ''))} placeholder="Market price" placeholderTextColor={colors.mutedForeground} style={[s.input, { flex: 1 }]} keyboardType="numeric" />
              <TextInput value={bidFee} onChangeText={(t) => setBidFee(t.replace(/\D/g, ''))} placeholder="Bid fee" placeholderTextColor={colors.mutedForeground} style={[s.input, { flex: 1 }]} keyboardType="numeric" />
            </View>
            <TextInput value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.mutedForeground} style={s.input} multiline numberOfLines={2} />
            <TextInput value={highlights} onChangeText={setHighlights} placeholder="Highlights (comma separated)" placeholderTextColor={colors.mutedForeground} style={s.input} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, marginBottom: 4 }}>Start</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => { setStartPickerMode('date'); setShowStartPicker(true) }}>
              <Calendar size={14} color={colors.mutedForeground} />
              <Text style={s.dateText}>{fmtDate(startDate)}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker value={startDate} mode={startPickerMode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onStartChange} />
            )}
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, marginBottom: 4, marginTop: 4 }}>End</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => { setEndPickerMode('date'); setShowEndPicker(true) }}>
              <Calendar size={14} color={colors.mutedForeground} />
              <Text style={s.dateText}>{fmtDate(endDate)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker value={endDate} mode={endPickerMode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onEndChange} />
            )}
            <CTAButton onPress={handleSubmit} disabled={submitting || !name || !marketPrice}>
              {submitting ? 'Saving...' : editingId ? 'Update Auction' : 'Create Auction'}
            </CTAButton>
          </Card>
        )}

        {auctions.length === 0 && (
          <Text style={{ textAlign: 'center', paddingVertical: 32, fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
            No auctions yet. Create one above.
          </Text>
        )}

        {auctions.map((a) => (
          <View key={a.id}>
            <View style={s.row}>
              <View style={s.imageWrap}>
                {a.image ? (
                  <Image source={{ uri: a.image }} style={{ width: 48, height: 48 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>No img</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.name} numberOfLines={1}>{a.name}</Text>
                  <Badge tone={a.status === 'ending-soon' ? 'orange' : a.status === 'live' ? 'green' : 'muted'}>{a.status}</Badge>
                </View>
                <Text style={s.meta}>{a.bidders} bidders · {CURRENCY} {formatETB(a.marketPrice)}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(a)} style={s.iconBtn}><Pencil size={12} color={colors.mutedForeground} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setViewBidsId(viewBidsId === a.id ? null : a.id)} style={s.iconBtn}><Eye size={12} color={colors.mutedForeground} /></TouchableOpacity>
              {a.status !== 'closed' && (
                <TouchableOpacity onPress={() => handleClose(a.id)} style={s.closeBtn}><XCircle size={12} color={colors.destructive} /></TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDelete(a.id)} style={[s.iconBtn, { borderColor: colors.destructive + '4D' }]}><Trash2 size={12} color={colors.destructive} /></TouchableOpacity>
            </View>
            {viewBidsId === a.id && (
              <View style={s.bidsBox}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>
                  Bids ({allBids.filter(b => b.auctionId === a.id).length})
                </Text>
                {allBids.filter(b => b.auctionId === a.id).length === 0 ? (
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>No bids yet</Text>
                ) : (
                  allBids.filter(b => b.auctionId === a.id).map((b, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>
                        {b.userName || users.find(u => u.id === b.userId)?.name || 'Anonymous'}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>{CURRENCY} {formatETB(b.amount)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        ))}
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
  imageWrap: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  name: { fontSize: 14, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 11, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  iconBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 6 },
  closeBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.destructive + '4D', paddingHorizontal: 8, paddingVertical: 6 },
  bidsBox: { marginTop: -8, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary + '66', padding: 12 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontWeight: '500', color: colors.foreground, marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  dateText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
})
