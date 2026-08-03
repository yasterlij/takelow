import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  TrendingDown,
  ZoomIn,
  Bell,
  ArrowLeft,
  Eye,
  ShieldCheck,
  Wallet,
  Loader2,
  Minus,
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Building2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useApp } from "../AppContext";
import { Badge } from "../components/AuctionUI";
import { useCountdown } from "../components/Countdown";
import {
  CURRENCY,
  formatCountdown,
  formatCurrency,
  getSpecEntries,
} from "../mockDataV0";
import { ImageCarousel } from "../components/ImageCarousel";
import { api } from "../api";

function Lightbox({
  images,
  idx,
  onClose,
}: {
  images: string[];
  idx: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(idx);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        setCurrent((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-scale-in">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <ZoomIn className="size-6 rotate-45" />
      </button>
      <div className="flex h-full w-full items-center justify-center">
        <ImageCarousel
          images={images}
          alt=""
          aspectRatio="h-full w-full"
          autoPlayInterval={0}
          showThumbnails
        />
      </div>
      <div className="absolute bottom-6 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`size-2 rounded-full transition-all ${i === current % images.length ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "bg-white/40 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ProductScreen() {
  const {
    go,
    selectedId,
    getAuction,
    payFee,
    authError,
    setPaymentMethod,
    walletBalance,
    pendingBidAmount,
    setPendingBidAmount,
    myBids,
  } = useApp();
  const auction = getAuction(selectedId);
  const seconds = useCountdown(auction?.timeLeft ?? 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<
    "SIKINAPAY" | "AWASH" | null
  >(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "SIKINAPAY" | "AWASH"
  >("AWASH");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [pinLocked, setPinLocked] = useState(false);
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState("");
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [bidStr, setBidStr] = useState(
    pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "",
  );
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  if (!auction) return null;

  const STEP = 0.01;

  const bidAmount = bidStr ? Number(bidStr) : 0;
  const hasValidBid = bidAmount >= 1 && /^\d+(\.\d{1,2})?$/.test(bidStr);
  const isDuplicate =
    bidAmount > 0 &&
    (myBids.some((b) => b.auctionId === selectedId && b.amount === bidAmount) ||
      serverBidAmounts.some((amount) => amount === bidAmount));

  const images = auction.images || [];
  const isEnding = seconds > 0 && seconds < 3600;
  const isOver = seconds <= 0;
  const auctionCode =
    auction.publicCode ||
    auction.productId ||
    auction.id.slice(0, 6).toUpperCase();
  const countdown = formatCountdown(seconds);
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
    if (!showPinModal) return;
    setPinInput("");
    setPinError(null);
  }, [showPinModal]);

  useEffect(() => {
    const nextBid = pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "";
    setBidStr((current) => (current === nextBid ? current : nextBid));
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
      setLockCountdown(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}s`,
      );
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [pinLocked, pinLockedUntil]);

  useEffect(() => {
    if (!bidFlash) return;
    const id = window.setTimeout(() => setBidFlash(false), 240);
    return () => window.clearTimeout(id);
  }, [bidFlash]);

  useEffect(() => {
    if (isDuplicate) setShowDuplicateModal(true);
  }, [isDuplicate]);

  const updateBid = useCallback(
    (next: number) => {
      const safe = Math.max(1, Number(next.toFixed(2)));
      setBidStr(safe.toFixed(2));
      setBidError(null);
      setPendingBidAmount(safe);
      setBidFlash(true);
    },
    [setPendingBidAmount],
  );

  const adjustBid = useCallback(
    (delta: number) => {
      updateBid((bidStr ? Number(bidStr) : 1) + delta);
    },
    [bidStr, updateBid],
  );

  const handlePayment = useCallback(
    async (method: "SIKINAPAY" | "AWASH") => {
      if (!hasValidBid) {
        setBidError("Enter a valid bid amount to continue");
        return;
      }

      if (isDuplicate) {
        setShowDuplicateModal(true);
        return;
      }

      setPendingBidAmount(bidAmount);
      setPaymentMethod(method);

      if (method === "SIKINAPAY") {
        setLoadingMethod(method);
        try {
          await payFee(auction.bidFee, method);
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
      bidAmount,
      hasValidBid,
      isDuplicate,
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
          await payFee(auction.bidFee, "AWASH");
        } finally {
          setLoadingMethod(null);
        }
        return;
      }

      if (res.locked) {
        setPinLocked(true);
        setPinLockedUntil(res.lockedUntil);
        setAttemptsRemaining(0);
        setPinError(
          "Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.",
        );
      } else {
        setAttemptsRemaining(res.attemptsRemaining);
        setPinError(
          res.attemptsRemaining <= 2
            ? `Invalid PIN - ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`
            : "Invalid wallet PIN",
        );
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
      setSetupError("PIN must be 4-6 digits");
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
        await payFee(auction.bidFee, "AWASH");
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Back + Title ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => go("auctions")}
          className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {auction.name}
          </h1>
          <p className="text-sm font-medium text-neutral-500">
            {auction.category}
          </p>
          {auction.specSummary && (
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              {auction.specSummary}
            </p>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          idx={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_24px_80px_rgba(0,43,92,0.08)]">
          <div className="relative">
            {images.length > 0 ? (
              <ImageCarousel
                images={images}
                alt={auction.name}
                aspectRatio="aspect-[4/3]"
                autoPlayInterval={4000}
                showThumbnails
                onImageClick={(i) => {
                  setLightboxIdx(i);
                  setLightboxOpen(true);
                }}
              />
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center bg-neutral-100">
                <p className="text-sm font-medium text-neutral-400">
                  No images available
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <Badge tone="green" className="shadow-lg shadow-emerald-200/40">
                Live
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur-sm">
                <Eye className="size-4 text-awash-blue" />{" "}
                {auction.totalBids || auction.bidders} bids
              </span>
            </div>
          </div>

          <div className="border-t border-border/50 bg-gradient-to-br from-white via-white to-awash-blue/5 p-5 sm:p-6">
            <div className="space-y-5">
              <section className="rounded-[1.75rem] bg-gradient-to-br from-awash-blue via-[#0F4C81] to-[#6BB6D9] p-4 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">
                  About this product
                </p>
                <h2 className="mt-2 font-display text-lg font-extrabold tracking-tight text-white">
                  {auction.name}
                </h2>
                {auction.specSummary ? (
                  <p className="mt-1 text-sm font-semibold text-white/80">
                    {auction.specSummary}
                  </p>
                ) : null}
                {auction.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-white/78">
                    {auction.description}
                  </p>
                ) : null}
              </section>

              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1 rounded-[1.25rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark px-2.5 py-2.5 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">
                    {isOver
                      ? "Auction Ended"
                      : isEnding
                        ? "Ending Soon"
                        : "Time Left"}
                  </p>
                  <p
                    className={`mt-1 truncate font-display text-[22px] font-extrabold tabular-nums ${isEnding ? "text-amber-300" : "text-white"}`}
                  >
                    {countdown.d !== "00" ? `${parseInt(countdown.d)}d ` : ""}
                    {countdown.h}:{countdown.m}:{countdown.s}
                  </p>
                </div>
                <div className="w-[112px] shrink-0 rounded-[1.25rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark px-2.5 py-2.5 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)] sm:w-[118px]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                    Auction Code
                  </p>
                  <p className="mt-1 truncate font-display text-[18px] font-extrabold tracking-[0.1em] text-white">
                    {auctionCode}
                  </p>
                </div>
              </div>

              {specEntries.length > 0 && (
                <section className="rounded-[1.75rem] border border-border/60 bg-white/80 p-5 shadow-[0_4px_16px_rgba(0,43,92,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                      Product specifications
                    </p>
                    <button
                      onClick={() => setShowSpecs((v) => !v)}
                      className="rounded-full border border-awash-blue/20 bg-awash-blue/5 px-3 py-1 text-[11px] font-semibold text-awash-blue transition-colors hover:bg-awash-blue/10"
                    >
                      {showSpecs ? "Show less" : "View more"}
                    </button>
                  </div>
                  {showSpecs && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {specEntries.map((entry) => (
                        <div
                          key={entry.key}
                          className="rounded-xl border border-border/50 bg-neutral-50/80 p-3"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                            {entry.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {entry.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-[1.75rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark p-3.5 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">
                  Bid Amount
                </p>

                <div
                  className={`mx-auto flex max-w-[19rem] items-center gap-2 rounded-[1.25rem] border border-white/12 bg-white/10 p-2 transition-all ${bidFlash ? "border-emerald-200 ring-2 ring-emerald-200/40" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => adjustBid(-STEP)}
                    disabled={bidAmount <= 1}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/90 text-awash-blue transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease bid amount"
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <input
                      value={bidStr}
                      onChange={(e) => {
                        const clean = e.target.value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1")
                          .replace(/^(\d*\.?\d{0,2}).*/, "$1")
                          .slice(0, 13);
                        if (clean && Number(clean) < 1) return;
                        setBidStr(clean);
                        setBidError(null);
                      }}
                      onBlur={() => {
                        if (!bidStr) return;
                        const normalized = Number(bidStr);
                        if (normalized < 1) {
                          setBidError("Minimum bid is 1.00");
                          updateBid(1);
                          return;
                        }
                        updateBid(normalized);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          adjustBid(STEP);
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          adjustBid(-STEP);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full border-0 bg-transparent text-center font-display text-[32px] font-extrabold tabular-nums text-white outline-none placeholder:text-white/45"
                    />
                    <p className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                      {CURRENCY}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustBid(STEP)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/90 text-awash-blue transition-colors hover:bg-white"
                    aria-label="Increase bid amount"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {bidError ? (
                  <p className="mt-2 text-xs font-semibold text-destructive">
                    {bidError}
                  </p>
                ) : null}
              </section>

              <section className="rounded-[1.75rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark p-4 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">
                    Payment
                  </p>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentMethods((value) => !value)}
                    className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/12 bg-white/10 px-4 py-3 text-left text-white transition-all hover:bg-white/15"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-10 items-center justify-center rounded-xl ${selectedPaymentMethod === "AWASH" ? "bg-white/15 text-awash-gold" : "bg-white/15 text-white"}`}
                      >
                        {selectedPaymentMethod === "AWASH" ? (
                          <Building2 className="size-5" />
                        ) : (
                          <ShieldCheck className="size-5" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {selectedPaymentMethod === "AWASH"
                            ? "Awash Wallet Pay"
                            : "SikinaPay"}
                        </p>
                        <p className="text-xs text-white/65">
                          Select payment type
                        </p>
                      </div>
                    </div>
                    {showPaymentMethods ? (
                      <ChevronUp className="size-4 text-white/65" />
                    ) : (
                      <ChevronDown className="size-4 text-white/65" />
                    )}
                  </button>

                  {showPaymentMethods && (
                    <div className="mt-2 rounded-[1.25rem] border border-border/60 bg-white/80 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaymentMethod("AWASH");
                          setShowPaymentMethods(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${selectedPaymentMethod === "AWASH" ? "bg-awash-blue/10 ring-1 ring-awash-blue/20" : "hover:bg-neutral-50"}`}
                      >
                        <span
                          className={`flex size-10 items-center justify-center rounded-xl ${selectedPaymentMethod === "AWASH" ? "bg-awash-blue/10 text-awash-blue" : "bg-neutral-100 text-neutral-500"}`}
                        >
                          <Building2 className="size-5" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">
                            Awash Wallet Pay
                          </p>
                          <p className="text-xs text-neutral-500">
                            Pay from your wallet balance
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaymentMethod("SIKINAPAY");
                          setShowPaymentMethods(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${selectedPaymentMethod === "SIKINAPAY" ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-neutral-50"}`}
                      >
                        <span
                          className={`flex size-10 items-center justify-center rounded-xl ${selectedPaymentMethod === "SIKINAPAY" ? "bg-indigo-100 text-indigo-700" : "bg-neutral-100 text-neutral-500"}`}
                        >
                          <ShieldCheck className="size-5" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">
                            SikinaPay
                          </p>
                          <p className="text-xs text-neutral-500">
                            Mobile Money, USSD, or card
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`mt-4 rounded-[1.5rem] border p-4 ${selectedPaymentMethod === "AWASH" ? "border-white/12 bg-white/10" : "border-white/12 bg-white/10"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`flex items-center gap-2 ${selectedPaymentMethod === "AWASH" ? "text-awash-gold" : "text-white"}`}
                      >
                        {selectedPaymentMethod === "AWASH" ? (
                          <Wallet className="size-5" />
                        ) : (
                          <ShieldCheck className="size-5" />
                        )}
                        <span className="text-base font-bold">
                          {selectedPaymentMethod === "AWASH"
                            ? "Awash Wallet Pay"
                            : "SikinaPay"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white/72">
                        {selectedPaymentMethod === "AWASH"
                          ? "Pay from your wallet balance after PIN confirmation."
                          : "Open the payment gateway and return automatically after confirmation."}
                      </p>
                    </div>
                    {selectedPaymentMethod === "AWASH" ? (
                      loadingMethod === "AWASH" || checkingPin ? (
                        <Loader2 className="size-5 animate-spin text-white" />
                      ) : (
                        <Lock className="size-5 text-white/70" />
                      )
                    ) : loadingMethod === "SIKINAPAY" ? (
                      <Loader2 className="size-5 animate-spin text-white" />
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                    <span className="text-white/60">
                      {selectedPaymentMethod === "AWASH"
                        ? "Balance"
                        : "Supports"}
                    </span>
                    <span
                      className={
                        selectedPaymentMethod === "AWASH"
                          ? walletBalance < auction.bidFee
                            ? "text-red-200"
                            : "text-white"
                          : "text-white/72"
                      }
                    >
                      {selectedPaymentMethod === "AWASH"
                        ? formatCurrency(walletBalance)
                        : "Mobile Money, USSD, card"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePayment(selectedPaymentMethod)}
                  disabled={
                    !hasValidBid ||
                    checkingPin ||
                    (selectedPaymentMethod === "AWASH" &&
                      (loadingMethod === "SIKINAPAY" ||
                        walletBalance < auction.bidFee)) ||
                    (selectedPaymentMethod === "SIKINAPAY" &&
                      loadingMethod === "AWASH")
                  }
                  className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedPaymentMethod === "AWASH" ? (
                    loadingMethod === "AWASH" || checkingPin ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wallet className="size-4" />
                    )
                  ) : loadingMethod === "SIKINAPAY" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  {selectedPaymentMethod === "AWASH"
                    ? "Pay Fee with Awash Wallet"
                    : "Pay Fee with SikinaPay"}
                </button>

                {walletBalance < auction.bidFee && (
                  <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                    Awash Wallet balance is below the bid amount. Use SikinaPay
                    or top up your wallet.
                  </p>
                )}
                {authError && (
                  <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                    {authError}
                  </p>
                )}
              </section>

              {isEnding ? (
                <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  Place your bid before the timer ends.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div>
          <div className="flex flex-col gap-4">
            {auction.maxBid && (
              <div className="rounded-2xl border border-border/60 bg-white/80 p-4 shadow-[0_8px_32px_rgba(0,43,92,0.06)]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-neutral-400">
                    Bid Progress
                  </span>
                  <span className="text-xs font-semibold text-neutral-400">
                    {auction.totalBids || auction.bidders}/{auction.maxBid}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) * 100}%`,
                      backgroundColor:
                        (auction.totalBids || auction.bidders) /
                          auction.maxBid >
                        0.8
                          ? "#C8A642"
                          : "#10B981",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Extension Risk */}
            {auction.minBid != null &&
              (auction.totalBids || auction.bidders) < auction.minBid && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 animate-slide-up">
                  <Bell className="size-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-800">
                    Only {auction.totalBids || auction.bidders}/{auction.minBid}{" "}
                    bids — auction may extend
                  </p>
                </div>
              )}

            {/* Highlights */}
            {auction.highlights?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {auction.highlights.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-all hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      {h}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            <div className="flex items-start gap-2.5 rounded-xl bg-awash-blue/5 backdrop-blur-sm p-3.5 border border-awash-blue/10 transition-all hover:bg-awash-blue/10">
              <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-awash-gold" />
              <p className="text-xs font-medium leading-relaxed text-foreground/80">
                Place the{" "}
                <span className="font-bold text-awash-gold-dark">
                  lowest unique bid
                </span>{" "}
                — the smallest amount that no one else has chosen — to win.
              </p>
            </div>

            <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
              Terms and conditions will apply
            </p>
          </div>
        </div>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <h3 className="font-display text-xl font-extrabold text-foreground">
              {needsPinSetup ? "Set Wallet PIN" : "Confirm Wallet PIN"}
            </h3>
            <p className="mt-2 text-sm font-medium text-neutral-500">
              {needsPinSetup
                ? "Create a 4-6 digit PIN to secure your wallet payment."
                : `Pay ${formatCurrency(auction.bidFee)} from your Awash Wallet.`}
            </p>

            {needsPinSetup ? (
              <div className="mt-5 space-y-3">
                <input
                  value={setupPin}
                  onChange={(e) => {
                    setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setSetupError(null);
                  }}
                  placeholder="Create PIN"
                  inputMode="numeric"
                  type="password"
                  className="input-full"
                />
                <input
                  value={setupConfirm}
                  onChange={(e) => {
                    setSetupConfirm(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    );
                    setSetupError(null);
                  }}
                  placeholder="Confirm PIN"
                  inputMode="numeric"
                  type="password"
                  className="input-full"
                />
                {setupError ? (
                  <p className="text-xs font-semibold text-destructive">
                    {setupError}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetupPin}
                    disabled={setupLoading}
                    className="btn-primary flex-1"
                  >
                    {setupLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Set PIN & Pay"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <input
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="Enter wallet PIN"
                  inputMode="numeric"
                  type="password"
                  className="input-full"
                />
                {pinLocked ? (
                  <p className="text-xs font-semibold text-destructive">
                    Wallet PIN locked. {lockCountdown || "Try again later."}
                  </p>
                ) : null}
                {!pinLocked && attemptsRemaining != null ? (
                  <p className="text-xs font-medium text-neutral-500">
                    Attempts remaining: {attemptsRemaining}
                  </p>
                ) : null}
                {pinError ? (
                  <p className="text-xs font-semibold text-destructive">
                    {pinError}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyPin}
                    disabled={pinLoading || pinLocked}
                    className="btn-primary flex-1"
                  >
                    {pinLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Pay with Wallet"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-amber-700">
                Duplicate Bid
              </h3>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  You've already placed a bid of {formatCurrency(bidAmount)} on
                  this auction.
                </p>
                <p className="mt-1 text-xs font-medium text-neutral-600">
                  Please enter a different bid amount.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="btn-primary mt-4 w-full"
            >
              Change Bid Amount
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
