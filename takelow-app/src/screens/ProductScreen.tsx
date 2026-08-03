import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Users,
  CheckCircle2,
  TrendingDown,
  X,
  Zap,
  Minus,
  Plus,
  Wallet,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { AppBar, Card, Badge, AwashMark } from "../components/AuctionUI";
import { ImageCarousel } from "../components/ImageCarousel";
import { Countdown, useCountdown } from "../components/Countdown";
import {
  CURRENCY,
  formatCurrency,
  formatSpecSummary,
  getSpecEntries,
} from "../mockDataV0";
import { colors, spacing, borderRadius, fontSize } from "../theme";
import { api } from "../api";

const { width } = Dimensions.get("window");

function LightboxModal({
  visible,
  images,
  idx,
  onClose,
}: {
  visible: boolean;
  images: string[];
  idx: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(idx);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{ position: "absolute", top: 60, right: 20, zIndex: 10 }}
          onPress={onClose}
        >
          <X size={28} color="#fff" />
        </TouchableOpacity>
        <ImageCarousel
          images={images}
          alt=""
          containerWidth={width}
          autoPlayInterval={0}
          showThumbnails
        />
      </View>
    </Modal>
  );
}

export function ProductScreen() {
  const {
    go,
    selectedId,
    getAuction,
    payFee,
    setPaymentMethod,
    walletBalance,
    pendingBidAmount,
    setPendingBidAmount,
    authError,
    myBids,
  } = useApp();
  const auction = getAuction(selectedId);
  const seconds = useCountdown(auction?.timeLeft ?? 0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<
    "SIKINAPAY" | "AWASH" | null
  >(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "SIKINAPAY" | "AWASH"
  >("AWASH");
  const [checkingPin, setCheckingPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [pinLocked, setPinLocked] = useState(false);
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(
    pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "",
  );
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);

  if (!auction) return null;

  const STEP = 0.01;
  const numericBid = bidAmount ? Number(bidAmount) : 0;
  const hasValidBid = numericBid >= 1 && /^\d+(\.\d{1,2})?$/.test(bidAmount);
  const isDuplicate =
    numericBid > 0 &&
    (myBids.some(
      (b) => b.auctionId === selectedId && b.amount === numericBid,
    ) ||
      serverBidAmounts.some((amount) => amount === numericBid));

  const images = auction.images || [];
  const savings =
    auction.marketPrice > 0
      ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100)
      : 0;
  const isEnding = seconds > 0 && seconds < 3600;
  const isOver = seconds <= 0;
  const auctionCode =
    auction.publicCode || auction.id.slice(0, 6).toUpperCase();
  const specSummary = auction.specSummary || formatSpecSummary(auction.specs);
  const specEntries = getSpecEntries(auction.specs);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.bid
      .myBids(selectedId)
      .then((res) => {
        if (active) setServerBidAmounts(res.bids.map((b) => b.amount));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (showPinModal) {
      setPinInput("");
      setPinError(null);
    }
  }, [showPinModal]);

  useEffect(() => {
    const nextBid = pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "";
    setBidAmount((current) => (current === nextBid ? current : nextBid));
  }, [pendingBidAmount]);

  useEffect(() => {
    if (!pinLocked || !pinLockedUntil) {
      setLockCountdown("");
      return;
    }
    const update = () => {
      const ms = new Date(pinLockedUntil).getTime() - Date.now();
      if (ms <= 0) {
        setLockCountdown("");
        setPinLocked(false);
        setPinLockedUntil(null);
        setAttemptsRemaining(5);
        return;
      }
      const totalSec = Math.ceil(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        setLockCountdown(
          `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`,
        );
      } else {
        setLockCountdown(
          `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`,
        );
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [pinLocked, pinLockedUntil]);

  useEffect(() => {
    if (!bidFlash) return;
    const id = setTimeout(() => setBidFlash(false), 240);
    return () => clearTimeout(id);
  }, [bidFlash]);

  useEffect(() => {
    if (!isDuplicate) return;
    Alert.alert(
      "Duplicate Bid",
      `You've already placed a bid of ${formatCurrency(numericBid)} on this auction. Please enter a different bid amount.`,
      [{ text: "Change Bid Amount" }],
    );
  }, [isDuplicate, numericBid]);

  const updateBid = useCallback(
    (next: number) => {
      const safe = Math.max(1, Number(next.toFixed(2)));
      setBidAmount(safe.toFixed(2));
      setBidError(null);
      setPendingBidAmount(safe);
      setBidFlash(true);
    },
    [setPendingBidAmount],
  );

  const adjustBid = useCallback(
    (delta: number) => {
      updateBid((bidAmount ? Number(bidAmount) : 1) + delta);
    },
    [bidAmount, updateBid],
  );

  const handlePayment = useCallback(
    async (method: "SIKINAPAY" | "AWASH") => {
      if (!hasValidBid) {
        setBidError("Enter a valid bid amount to continue");
        return;
      }

      if (isDuplicate) {
        Alert.alert(
          "Duplicate Bid",
          `You've already placed a bid of ${formatCurrency(numericBid)} on this auction. Please enter a different bid amount.`,
          [{ text: "Change Bid Amount" }],
        );
        return;
      }

      setPendingBidAmount(numericBid);
      setPaymentMethod(method);

      if (method === "SIKINAPAY") {
        setLoadingMethod(method);
        try {
          await Promise.resolve(payFee(auction.bidFee, method));
        } finally {
          setLoadingMethod(null);
        }
        return;
      }

      setCheckingPin(true);
      try {
        const status = await api.wallet.pinStatus();
        setPinLocked(status.locked);
        setPinLockedUntil(status.lockedUntil);
        setAttemptsRemaining(status.locked ? 0 : status.attemptsRemaining);
        setNeedsPinSetup(!status.hasPin);
        setShowPinModal(true);
      } catch (err: any) {
        setPinError(err?.message || "Failed to check wallet PIN status");
        setNeedsPinSetup(false);
        setPinLocked(false);
        setShowPinModal(true);
      } finally {
        setCheckingPin(false);
      }
    },
    [
      auction.bidFee,
      hasValidBid,
      isDuplicate,
      numericBid,
      payFee,
      setPaymentMethod,
      setPendingBidAmount,
    ],
  );

  const handleVerifyPin = useCallback(async () => {
    if (!pinInput) {
      setPinError("Please enter your wallet PIN");
      return;
    }
    if (pinLocked) return;
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await api.wallet.verifyPin(pinInput);
      if (res.valid) {
        setShowPinModal(false);
        setLoadingMethod("AWASH");
        try {
          await Promise.resolve(payFee(auction.bidFee, "AWASH"));
        } finally {
          setLoadingMethod(null);
        }
      } else if (res.locked) {
        setPinLocked(true);
        setPinLockedUntil(res.lockedUntil);
        setAttemptsRemaining(0);
        setPinError(
          "Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.",
        );
      } else {
        setAttemptsRemaining(res.attemptsRemaining);
        if (res.attemptsRemaining <= 2) {
          setPinError(
            `Invalid PIN — ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`,
          );
        } else {
          setPinError("Invalid wallet PIN");
        }
      }
    } catch (err: any) {
      setPinError(err?.message || "Unable to verify PIN. Please try again.");
    } finally {
      setPinLoading(false);
    }
  }, [auction.bidFee, payFee, pinInput, pinLocked]);

  const handleSetupPin = useCallback(async () => {
    if (
      !setupPin ||
      setupPin.length < 4 ||
      setupPin.length > 6 ||
      !/^\d+$/.test(setupPin)
    ) {
      setSetupError("PIN must be 4–6 digits");
      return;
    }
    if (setupPin !== setupConfirm) {
      setSetupError("PINs do not match");
      return;
    }
    setSetupLoading(true);
    setSetupError(null);
    try {
      await api.wallet.setPin(setupPin);
      setShowPinModal(false);
      setNeedsPinSetup(false);
      setLoadingMethod("AWASH");
      try {
        await Promise.resolve(payFee(auction.bidFee, "AWASH"));
      } finally {
        setLoadingMethod(null);
      }
    } catch {
      setSetupError("Failed to set wallet PIN. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  }, [auction.bidFee, payFee, setupConfirm, setupPin]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar
        title="Product Details"
        onBack={() => go("auctions")}
        right={
          <TouchableOpacity
            onPress={() => go("home")}
            style={{
              width: 34,
              height: 34,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AwashMark size={22} />
          </TouchableOpacity>
        }
      />
      <LightboxModal
        visible={lightboxVisible}
        images={images}
        idx={lightboxIdx}
        onClose={() => setLightboxVisible(false)}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        }}
      >
        <Card style={s.heroCard}>
          {/* ── Image Gallery ── */}
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              alt={auction.name}
              containerWidth={width - 32}
              autoPlayInterval={4000}
              showThumbnails
              onImagePress={(i) => {
                setLightboxIdx(i);
                setLightboxVisible(true);
              }}
              overlay={
                <View style={s.badges}>
                  <Badge tone="green">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.emerald500,
                      }}
                    />{" "}
                    Live
                  </Badge>
                  {savings > 0 && (
                    <View style={s.savingsPill}>
                      <Zap size={12} color="#fff" />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        {savings}% off
                      </Text>
                    </View>
                  )}
                </View>
              }
            />
          ) : (
            <View style={s.imageArea}>
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.mutedForeground,
                  }}
                >
                  No images available
                </Text>
              </View>
            </View>
          )}
          <View style={s.heroBody}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Badge tone="navy">{auction.category}</Badge>
                <Text style={s.name}>{auction.name}</Text>
                {!!specSummary && (
                  <Text style={s.specSummary}>{specSummary}</Text>
                )}
              </View>
              {savings > 0 && (
                <View style={s.savingsBadge}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.emerald700,
                    }}
                  >
                    {savings}% off
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        <View style={{ paddingHorizontal: 4 }}>
          <Card
            style={{
              padding: 16,
              borderWidth: 0,
              backgroundColor: colors.navy,
            }}
          >
            <Text style={s.sectionTitle}>About this product</Text>
            <Text
              style={[s.name, { marginTop: 8, fontSize: 18, color: "#FFF" }]}
            >
              {auction.name}
            </Text>
            {!!specSummary && (
              <Text
                style={[s.specSummary, { color: "rgba(255,255,255,0.82)" }]}
              >
                {specSummary}
              </Text>
            )}
            {auction.description ? (
              <Text
                style={[s.description, { color: "rgba(255,255,255,0.78)" }]}
              >
                {auction.description}
              </Text>
            ) : null}
          </Card>

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 16,
              marginBottom: specEntries.length > 0 ? 0 : 16,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 16,
                backgroundColor: colors.navy,
                paddingHorizontal: 10,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {isOver
                  ? "Auction Ended"
                  : isEnding
                    ? "Ending Soon"
                    : "Time Left"}
              </Text>
              <View style={{ marginTop: 4 }}>
                <Countdown seconds={seconds} size="sm" />
              </View>
            </View>
            <View
              style={{
                width: 108,
                borderRadius: 16,
                backgroundColor: colors.navy,
                paddingHorizontal: 10,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                Auction Code
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                  color: "#FFF",
                  marginTop: 4,
                }}
              >
                {auctionCode}
              </Text>
            </View>
          </View>

          {specEntries.length > 0 && (
            <Card style={{ marginTop: 16, padding: 16 }}>
              <TouchableOpacity
                style={s.specToggle}
                onPress={() => setShowSpecs((value) => !value)}
              >
                <Text style={s.sectionTitle}>Product specifications</Text>
                <Text style={s.specToggleText}>
                  {showSpecs ? "Hide details" : "View details"}
                </Text>
              </TouchableOpacity>
              {showSpecs && (
                <View style={s.specGrid}>
                  {specEntries.map((entry) => (
                    <Card key={entry.key} style={s.specCard}>
                      <Text style={s.specLabel}>{entry.label}</Text>
                      <Text style={s.specValue}>{entry.value}</Text>
                    </Card>
                  ))}
                </View>
              )}
            </Card>
          )}

          <Card
            style={{
              marginTop: 16,
              padding: 14,
              borderWidth: 0,
              backgroundColor: colors.navy,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
                marginBottom: 10,
              }}
            >
              Bid Amount
            </Text>

            <View
              style={{
                width: "100%",
                maxWidth: 304,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: bidFlash
                  ? colors.emerald200
                  : "rgba(255,255,255,0.14)",
                backgroundColor: "rgba(255,255,255,0.08)",
                padding: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => adjustBid(-STEP)}
                disabled={numericBid <= 1}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.95)",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: numericBid <= 1 ? 0.45 : 1,
                }}
              >
                <Minus
                  size={18}
                  color={
                    numericBid <= 1 ? colors.mutedForeground : colors.awashBlue
                  }
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={bidAmount}
                  onChangeText={(t) => {
                    const clean = t
                      .replace(/[^\d.]/g, "")
                      .replace(/(\..*)\./g, "$1")
                      .replace(/(\.\d{2})\d+/g, "$1")
                      .slice(0, 13);
                    if (clean && Number(clean) < 1) return;
                    setBidAmount(clean);
                    setBidError(null);
                  }}
                  onBlur={() => {
                    if (!bidAmount) return;
                    const normalized = Number(bidAmount);
                    if (normalized < 1) {
                      setBidError("Minimum bid is 1.00");
                      updateBid(1);
                      return;
                    }
                    updateBid(normalized);
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  style={{
                    textAlign: "center",
                    fontSize: 30,
                    fontWeight: "800",
                    color: "#FFF",
                    paddingVertical: 6,
                  }}
                  placeholderTextColor={"rgba(255,255,255,0.45)"}
                />
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.72)",
                  }}
                >
                  {CURRENCY}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => adjustBid(STEP)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.95)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Plus size={18} color={colors.awashBlue} />
              </TouchableOpacity>
            </View>
            {bidError ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.destructive,
                  marginTop: 8,
                }}
              >
                {bidError}
              </Text>
            ) : null}
          </Card>

          <Card
            style={{
              marginTop: 16,
              padding: 16,
              borderWidth: 0,
              backgroundColor: "#0F4C81",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                Payment
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowPaymentMethods((value) => !value)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                backgroundColor: "rgba(255,255,255,0.08)",
                padding: 14,
                marginTop: 10,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.15)",
                  }}
                >
                  {selectedPaymentMethod === "AWASH" ? (
                    <Building2 size={20} color={colors.awashGold} />
                  ) : (
                    <ShieldCheck size={20} color={"#FFF"} />
                  )}
                </View>
                <View>
                  <Text
                    style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}
                  >
                    {selectedPaymentMethod === "AWASH"
                      ? "Awash Wallet Pay"
                      : "SikinaPay"}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.68)" }}
                  >
                    Select payment type
                  </Text>
                </View>
              </View>
              {showPaymentMethods ? (
                <ChevronUp size={18} color={"rgba(255,255,255,0.68)"} />
              ) : (
                <ChevronDown size={18} color={"rgba(255,255,255,0.68)"} />
              )}
            </TouchableOpacity>

            {showPaymentMethods && (
              <Card
                style={{
                  marginTop: 10,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPaymentMethod("AWASH");
                    setShowPaymentMethods(false);
                  }}
                  style={[
                    s.methodOption,
                    selectedPaymentMethod === "AWASH" && s.methodOptionSelected,
                  ]}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <AwashMark size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.methodOptionTitle}>Awash Wallet Pay</Text>
                    <Text style={s.methodOptionSub}>
                      Pay using your wallet balance
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPaymentMethod("SIKINAPAY");
                    setShowPaymentMethods(false);
                  }}
                  style={[
                    s.methodOption,
                    selectedPaymentMethod === "SIKINAPAY" &&
                      s.methodOptionSelected,
                  ]}
                >
                  <ShieldCheck size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.methodOptionTitle}>SikinaPay</Text>
                    <Text style={s.methodOptionSub}>
                      Pay via online payment gateway
                    </Text>
                  </View>
                </TouchableOpacity>
              </Card>
            )}

            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                backgroundColor: "rgba(255,255,255,0.08)",
                padding: 14,
                marginTop: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {selectedPaymentMethod === "AWASH" ? (
                    <Wallet size={20} color={colors.awashGold} />
                  ) : (
                    <ShieldCheck size={20} color={"#FFF"} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color:
                          selectedPaymentMethod === "AWASH"
                            ? colors.awashGold
                            : "#FFF",
                      }}
                    >
                      {selectedPaymentMethod === "AWASH"
                        ? "Awash Wallet Pay"
                        : "SikinaPay"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: "rgba(255,255,255,0.72)",
                        marginTop: 2,
                      }}
                    >
                      {selectedPaymentMethod === "AWASH"
                        ? "Pay using your wallet balance after PIN confirmation."
                        : "Open the payment gateway and return automatically after confirmation."}
                    </Text>
                  </View>
                </View>
                {selectedPaymentMethod === "AWASH" ? (
                  loadingMethod === "AWASH" || checkingPin ? (
                    <ActivityIndicator size="small" color={colors.awashGold} />
                  ) : (
                    <Lock size={18} color={colors.awashGold} />
                  )
                ) : loadingMethod === "SIKINAPAY" ? (
                  <ActivityIndicator size="small" color={"#FFF"} />
                ) : null}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {selectedPaymentMethod === "AWASH" ? "Balance" : "Supports"}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color:
                      selectedPaymentMethod === "AWASH"
                        ? walletBalance < auction.bidFee
                          ? "#FECACA"
                          : "#FFF"
                        : "rgba(255,255,255,0.72)",
                  }}
                >
                  {selectedPaymentMethod === "AWASH"
                    ? formatCurrency(walletBalance)
                    : "Mobile Money, USSD, card"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handlePayment(selectedPaymentMethod)}
              disabled={
                !hasValidBid ||
                (selectedPaymentMethod === "AWASH" &&
                  (checkingPin ||
                    loadingMethod === "SIKINAPAY" ||
                    walletBalance < auction.bidFee)) ||
                (selectedPaymentMethod === "SIKINAPAY" &&
                  (loadingMethod === "AWASH" || checkingPin))
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 16,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                marginTop: 12,
                opacity:
                  !hasValidBid ||
                  (selectedPaymentMethod === "AWASH" &&
                    (checkingPin ||
                      loadingMethod === "SIKINAPAY" ||
                      walletBalance < auction.bidFee)) ||
                  (selectedPaymentMethod === "SIKINAPAY" &&
                    (loadingMethod === "AWASH" || checkingPin))
                    ? 0.55
                    : 1,
              }}
            >
              {selectedPaymentMethod === "AWASH" ? (
                loadingMethod === "AWASH" || checkingPin ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Wallet size={18} color={colors.primaryForeground} />
                )
              ) : loadingMethod === "SIKINAPAY" ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <ShieldCheck size={18} color={colors.primaryForeground} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.primaryForeground,
                }}
              >
                {selectedPaymentMethod === "AWASH"
                  ? "Pay Fee with Awash Wallet"
                  : "Pay Fee with SikinaPay"}
              </Text>
            </TouchableOpacity>

            {walletBalance < auction.bidFee && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.destructive,
                  marginTop: 10,
                }}
              >
                Awash Wallet balance is below the bid amount. Use SikinaPay or
                top up your wallet.
              </Text>
            )}
            {authError ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.destructive,
                  marginTop: 10,
                }}
              >
                {authError}
              </Text>
            ) : null}
          </Card>

          {isEnding ? (
            <Card
              style={{
                marginTop: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: "#FDE68A",
                backgroundColor: "#FFFBEB",
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "700", color: "#B45309" }}
              >
                Place your bid before the timer ends.
              </Text>
            </Card>
          ) : null}

          <View style={s.hint}>
            <TrendingDown size={18} color={colors.primary} />
            <Text style={s.hintText}>
              Place the{" "}
              <Text style={{ fontWeight: "700" }}>lowest unique bid</Text> — the
              smallest amount that no one else has chosen — to win this product.
            </Text>
          </View>

          {/* Highlights */}
          {auction.highlights?.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 16,
              }}
            >
              {auction.highlights.map((h) => (
                <Card key={h} style={s.highlight}>
                  <CheckCircle2 size={16} color={colors.primary} />
                  <Text style={s.highlightText}>{h}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.42)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              borderRadius: 24,
              backgroundColor: colors.card,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{ fontSize: 22, fontWeight: "800", color: colors.navy }}
            >
              {needsPinSetup ? "Set Wallet PIN" : "Confirm Wallet PIN"}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              {needsPinSetup
                ? "Create a 4–6 digit PIN to secure your wallet payment."
                : `Pay ${formatCurrency(auction.bidFee)} from your Awash Wallet.`}
            </Text>

            {needsPinSetup ? (
              <View style={{ marginTop: 16, gap: 12 }}>
                <TextInput
                  value={setupPin}
                  onChangeText={(t) => {
                    setSetupPin(t.replace(/\D/g, "").slice(0, 6));
                    setSetupError(null);
                  }}
                  placeholder="Create PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={s.input}
                />
                <TextInput
                  value={setupConfirm}
                  onChangeText={(t) => {
                    setSetupConfirm(t.replace(/\D/g, "").slice(0, 6));
                    setSetupError(null);
                  }}
                  placeholder="Confirm PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={s.input}
                />
                {setupError ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.destructive,
                    }}
                  >
                    {setupError}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowPinModal(false)}
                    style={[
                      s.specCard,
                      {
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSetupPin}
                    disabled={setupLoading}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 14,
                      opacity: setupLoading ? 0.7 : 1,
                    }}
                  >
                    {setupLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.primaryForeground,
                        }}
                      >
                        Set PIN & Pay
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 16, gap: 12 }}>
                <TextInput
                  value={pinInput}
                  onChangeText={(t) => {
                    setPinInput(t.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="Enter wallet PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={s.input}
                />
                {pinLocked ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.destructive,
                    }}
                  >
                    Wallet PIN locked. {lockCountdown || "Try again later."}
                  </Text>
                ) : null}
                {!pinLocked && attemptsRemaining != null ? (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      color: colors.mutedForeground,
                    }}
                  >
                    Attempts remaining: {attemptsRemaining}
                  </Text>
                ) : null}
                {pinError ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.destructive,
                    }}
                  >
                    {pinError}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowPinModal(false)}
                    style={[
                      s.specCard,
                      {
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVerifyPin}
                    disabled={pinLoading || pinLocked}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 14,
                      opacity: pinLoading || pinLocked ? 0.7 : 1,
                    }}
                  >
                    {pinLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.primaryForeground,
                        }}
                      >
                        Pay with Wallet
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatusBarCustom() {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.navyForeground,
        }}
      >
        9:41
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  imageArea: {
    width,
    height: width * 0.75,
    backgroundColor: colors.secondary,
    position: "relative",
  },
  heroCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  heroBody: { padding: 16, gap: 16 },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  overviewPrimaryCard: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.awashBlue + "1A",
    backgroundColor: colors.awashBlue + "0D",
  },
  overviewMetricCard: {
    width: (width - 58) / 2,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.awashBlue + "CC",
  },
  overviewPrimaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 8,
  },
  badges: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    backgroundColor: colors.emerald600,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingsBadge: {
    borderRadius: 20,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.emerald200,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.navy, marginTop: 8 },
  specSummary: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.neutralGray600,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 4,
  },
  specToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  specToggleText: { fontSize: 12, fontWeight: "700", color: colors.awashBlue },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  specCard: {
    width: (width - 52) / 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  specValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 6,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
  },
  methodOptionSelected: { backgroundColor: colors.primary + "1A" },
  methodOptionTitle: { fontSize: 13, fontWeight: "700", color: colors.navy },
  methodOptionSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.navy,
    backgroundColor: colors.card,
  },
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    backgroundColor: colors.navy + "0D",
    padding: 12,
    marginTop: 16,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: colors.navy + "CC",
    flex: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
    marginTop: 6,
  },
  highlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  highlightText: { fontSize: 12, fontWeight: "600", color: colors.navy },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
  },
});
