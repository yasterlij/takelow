import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Loader2,
  AlertTriangle,
  Users,
  Clock,
  CreditCard,
  ArrowLeft,
  Info,
  CheckCircle2,
  PartyPopper,
  ShieldQuestion,
  X,
  Send,
  RotateCcw,
  Calendar,
  Gavel,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../AppContext";
import {
  api,
  type ApiWinnerResult,
  type ApiAuctionResult,
  type ApiWinnerInfo,
  type ApiBid,
} from "../api";
import { formatCurrency } from "../mockDataV0";
import { toast } from "../store/toast.store";

const confettiParticles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 0.5}s`,
  duration: `${0.8 + Math.random() * 0.8}s`,
  color: i % 3 === 0 ? "#0071e3" : i % 3 === 1 ? "#1d1d1f" : "#86868b",
}));

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function WinnerScreen() {
  const { go, goBack, selectedId, user, getAuction, reopenAuction, selectAuction } = useApp();
  const isAdmin = user?.role === "admin";
  const canManage = isAdmin;
  const auction = getAuction(selectedId);
  const [winner, setWinner] = useState<
    ApiWinnerResult | ApiAuctionResult | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [bidsPage, setBidsPage] = useState(0);

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeType, setDisputeType] = useState("WINNER_DISPUTE");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenConfirming, setReopenConfirming] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenForm, setReopenForm] = useState({
    startTime: toDatetimeLocal(new Date()),
    endTime: toDatetimeLocal(new Date(Date.now() + 7 * 86400000)),
    minBid: "",
    maxBid: "",
    bidFee: "10",
    name: "",
    category: "",
    marketPrice: "",
    description: "",
  });

  const openReopenModal = () => {
    if (!auction) return;
    setReopenForm({
      startTime: toDatetimeLocal(new Date()),
      endTime: toDatetimeLocal(new Date(Date.now() + 7 * 86400000)),
      minBid: auction.minBid != null ? String(auction.minBid) : "",
      maxBid: auction.maxBid != null ? String(auction.maxBid) : "",
      bidFee: auction.bidFee != null ? String(auction.bidFee) : "10",
      name: auction.name || "",
      category: auction.category || "",
      marketPrice: auction.marketPrice ? String(auction.marketPrice) : "",
      description: auction.description || "",
    });
    setReopenConfirming(false);
    setReopenModalOpen(true);
  };

  const handleReopenSubmit = async () => {
    if (!auction) return;
    setReopening(true);
    try {
      await reopenAuction(auction.id, {
        start_time: new Date(reopenForm.startTime).toISOString(),
        end_time: new Date(reopenForm.endTime).toISOString(),
        min_bid: reopenForm.minBid ? Number(reopenForm.minBid) : undefined,
        max_bid: reopenForm.maxBid ? Number(reopenForm.maxBid) : undefined,
        bid_fee: reopenForm.bidFee ? Number(reopenForm.bidFee) : undefined,
        name: reopenForm.name || undefined,
        category: reopenForm.category || undefined,
        current_market_price: reopenForm.marketPrice ? Number(reopenForm.marketPrice) : undefined,
        description: reopenForm.description || undefined,
      });
      setReopenModalOpen(false);
      go("admin-auctions");
    } catch {
      // error handled in AppContext
    } finally {
      setReopening(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDesc.trim() || !auction) return;
    setDisputeSubmitting(true);
    try {
      await api.createDispute({
        auction_id: auction.id,
        type: disputeType,
        description: disputeDesc.trim(),
      });
      toast("Your claim has been submitted to the governance audit team.", "success");
      setDisputeModalOpen(false);
      setDisputeDesc("");
    } catch (err: any) {
      toast(err.message || "Failed to submit inquiry", "error");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setBidsPage(0);
    const fetch = isAdmin
      ? api.drawWinner(selectedId)
      : api.getAuctionResult(selectedId);
    fetch
      .then(setWinner as any)
      .catch((e: any) => setError(e.message || "Failed to load winner"))
      .finally(() => setLoading(false));
  }, [selectedId, isAdmin, refreshKey]);

  if (!auction) return null;

  const isAlreadyActive =
    auction.status === "live" ||
    auction.status === "ending-soon" ||
    (auction as any).raw_status === "ACTIVE";

  const winnerPhone = winner?.winner_phone || null;
  const maskPhone = (p: string | null) =>
    p ? p.slice(0, 4) + "XXXX" + p.slice(-2) : null;
  const maskedPhone = winnerPhone ? maskPhone(winnerPhone) : null;
  const firstName = winner?.winner_name
    ? winner.winner_name.split(" ")[0]
    : null;
  const winnerName =
    firstName && maskedPhone
      ? `${firstName} ${maskedPhone}`
      : firstName || maskedPhone || null;
  const deadline = (winner as any)?.payment_deadline
    ? new Date((winner as any).payment_deadline)
    : null;
  const deadlineHrs = deadline
    ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000))
    : null;
  const allWinners = (winner as any)?.all_winners as
    | ApiWinnerInfo[]
    | undefined;
  const winnersCount = (winner as any)?.winners_count as number | undefined;
  const myBidInfo = (winner as any)?.my_bid as
    | { amount: number; service_fee_paid: boolean }
    | undefined;
  const isUserWinner = allWinners?.some((w) => w.user_id === user?.id);
  const userWinnerInfo = allWinners?.find((w) => w.user_id === user?.id);
  const isPrimaryWinner = winner?.winner_user_id === user?.id;
  const allBids = ((winner as any)?.bids as ApiBid[] | undefined)?.map(
    (bid) => ({
      ...bid,
      amount: Number(bid.amount),
    }),
  );
  const amountCount = new Map<number, number>();
  allBids?.forEach((b) =>
    amountCount.set(b.amount, (amountCount.get(b.amount) || 0) + 1),
  );
  const winningAmount =
    winner?.winning_bid_amount != null
      ? Number(winner.winning_bid_amount)
      : null;
  const lowerAmounts =
    winningAmount != null && allBids
      ? [
          ...new Set(
            allBids
              .filter((b) => b.amount < winningAmount)
              .map((b) => b.amount),
          ),
        ].sort((a, b) => a - b)
      : [];
  const lowerBidsGrouped = lowerAmounts.map((amount) => ({
    amount,
    count: amountCount.get(amount) || 1,
  }));
  const lowerBidLevels = lowerBidsGrouped.length;
  const lowerBidEntries = lowerBidsGrouped.reduce(
    (sum, bid) => sum + bid.count,
    0,
  );
  const duplicateLowerLevels = lowerBidsGrouped.filter(
    (bid) => bid.count > 1,
  ).length;
  const lowestBlockedAmount = lowerBidsGrouped[0]?.amount ?? null;
  const transparencyMessage =
    winningAmount == null
      ? "No winning amount was found for this auction."
      : lowerBidLevels > 0
        ? `There ${lowerBidLevels === 1 ? "was" : "were"} ${lowerBidLevels} lower bid level${lowerBidLevels === 1 ? "" : "s"}, but each one was repeated by more than one bidder so none of them qualified.`
        : "No lower bid amounts were placed, so this winning amount was already the first valid unique bid.";
  const BIDS_PAGE_SIZE = 8;
  const totalBidPages = Math.max(
    1,
    Math.ceil(lowerBidsGrouped.length / BIDS_PAGE_SIZE),
  );
  const currentBidsPage = Math.min(bidsPage, totalBidPages - 1);
  const pagedBids = lowerBidsGrouped.slice(
    currentBidsPage * BIDS_PAGE_SIZE,
    (currentBidsPage + 1) * BIDS_PAGE_SIZE,
  );
  const pageStart =
    lowerBidsGrouped.length === 0 ? 0 : currentBidsPage * BIDS_PAGE_SIZE + 1;
  const pageEnd = currentBidsPage * BIDS_PAGE_SIZE + pagedBids.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col items-center gap-6 pb-16 relative"
    >
      {/* ── Confetti when winner found ── */}
      {winner?.winner_user_id && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confettiParticles.map((p) => (
            <div
              key={p.id}
              className="absolute size-2 rounded-sm"
              style={{
                left: p.left,
                top: "-10px",
                backgroundColor: p.color,
                animation: `confetti ${p.duration} ${p.delay} ease-out forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex w-full items-center justify-between">
        <button
          onClick={goBack}
          className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary/15 to-awash-gold/10 backdrop-blur-sm px-3 py-1 text-xs font-bold text-primary border border-primary/20">
          <PartyPopper className="size-3.5" /> Winner Results
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-neutral-500">
            Calculating winners...
          </p>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-2 py-16"
        >
          <AlertTriangle className="size-10 text-amber-400" />
          <p className="text-sm font-medium text-neutral-500">{error}</p>
          <button
            onClick={() => go("home")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to Dashboard
          </button>
        </motion.div>
      ) : winner ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex w-full max-w-2xl flex-col items-center gap-6"
        >
          {/* ── Trophy / Live Icon ── */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative"
          >
            <span
              className={`absolute inset-0 rounded-full ${
                isAlreadyActive
                  ? "bg-emerald-500/20 animate-pulse"
                  : winner.winner_user_id
                    ? "bg-primary/20 animate-ping"
                    : ""
              }`}
            />
            <span
              className={`relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br shadow-xl ${
                isAlreadyActive
                  ? "from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"
                  : winner.winner_user_id
                    ? "from-primary to-awash-gold-light text-primary-foreground shadow-primary/40"
                    : "from-neutral-300 to-neutral-400 text-white"
              }`}
            >
              {isAlreadyActive ? (
                <Gavel className="size-14" />
              ) : (
                <Trophy className="size-14" />
              )}
            </span>
          </motion.div>

          <div className="text-center">
            <h1 className="font-display text-3xl font-extrabold text-foreground">
              {isAlreadyActive
                ? "Auction Currently Active"
                : winner.winner_user_id
                  ? "Winner Found!"
                  : "No Winner"}
            </h1>
            <p className="mt-2 text-sm font-medium text-neutral-500">
              {isAlreadyActive
                ? "This auction is currently running and accepting unique bids."
                : winner.winner_user_id
                  ? `${allWinners?.length || 1} winner(s) from ${winner.total_bids} bids`
                  : `No unique bids among ${winner.total_bids} bids.`}
            </p>
            {winner?.payment_status === "PAID" && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="size-3.5" /> All Payments Complete
              </span>
            )}
          </div>

          {/* ── Active Auction Notice OR Unsold Relist Admin Actions ── */}
          {isAlreadyActive ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 text-center shadow-sm"
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Auction is Currently Active & Live
              </div>
              <p className="mt-1 text-[11px] text-neutral-600">
                This auction is live and accepting bids until{" "}
                <span className="font-semibold text-neutral-800">
                  {auction.endTime
                    ? new Date(auction.endTime).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "scheduled end"}
                </span>
                .
              </p>
              <button
                onClick={() => selectAuction(auction.id)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98]"
              >
                <ArrowRight className="size-3.5" /> View Live Auction
              </button>
            </motion.div>
          ) : !winner?.winner_user_id && canManage ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 text-center shadow-sm"
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800">
                <RotateCcw className="size-3.5 text-amber-600" /> Unsold Auction Relisting
              </div>
              <p className="mt-1 text-[11px] text-neutral-600">
                This item concluded without a winning bidder. As an administrator, you can reopen and reschedule this auction immediately.
              </p>
              <button
                onClick={openReopenModal}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
              >
                <RotateCcw className="size-3.5" /> Reopen This Auction
              </button>
            </motion.div>
          ) : null}

          {/* ── Winner Card ── */}
          {(winner?.winner_user_id || winner?.winning_bid_amount != null) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-md"
            >
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(200,166,66,0.06)]">
                <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-awash-blue/10 via-white to-awash-gold/10 border border-border/60 p-1 shadow-[0_12px_32px_rgba(0,43,92,0.16)]">
                  <img
                    src={auction.images?.[0] || "/placeholder.svg"}
                    alt={auction.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className="mt-4 text-center font-display text-lg font-bold text-foreground">
                  {auction.name}
                </h2>
                <div className="mt-4 rounded-xl bg-gradient-to-br from-awash-gold/15 to-awash-gold-light/10 border border-primary/20 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-awash-gold-dark">
                    Primary Winning Bid
                  </p>
                  <p className="font-display text-4xl font-extrabold text-gradient-gold tabular-nums">
                    {formatCurrency(winner.winning_bid_amount ?? 0)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      Lowest valid unique bid
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-neutral-600 border border-border/60">
                      1 winner at this amount
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/60 p-2.5">
                    <span className="text-xs text-neutral-400">Total Bids</span>
                    <p className="font-semibold text-foreground">
                      {winner.total_bids}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 p-2.5">
                    <span className="text-xs text-neutral-400">
                      Unique Bidders
                    </span>
                    <p className="font-semibold text-foreground">
                      {winner.unique_bidders}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 p-2.5">
                    <span className="text-xs text-neutral-400">
                      Primary Winner
                    </span>
                    <p className="font-bold text-foreground">
                      {winnerName || "Unknown"}
                    </p>
                  </div>
                  {winner.lowest_unique_bid != null && (
                    <div className="rounded-lg bg-white/60 p-2.5">
                      <span className="text-xs text-neutral-400">
                        Lowest Unique Bid
                      </span>
                      <p className="font-bold text-emerald-600">
                        {formatCurrency(winner.lowest_unique_bid)}
                      </p>
                    </div>
                  )}
                  {deadlineHrs != null && (
                    <div className="rounded-lg bg-white/60 p-2.5 col-span-2">
                      <span className="flex items-center gap-1 text-xs text-neutral-400">
                        <Clock className="size-3" /> Payment Deadline
                      </span>
                      <p
                        className={`font-bold ${deadlineHrs < 6 ? "text-red-500" : "text-foreground"}`}
                      >
                        {deadlineHrs > 0
                          ? `${deadlineHrs}h remaining`
                          : "Expired"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── How Winners Are Selected ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-md rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 backdrop-blur-sm p-4"
          >
            <div className="flex items-start gap-2">
              <Info className="size-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  How Winners Are Selected
                </h3>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  Winners are the lowest bid amounts that were placed by{" "}
                  <strong>exactly one person</strong> (unique bids). If multiple
                  people bid the same amount, that amount is{" "}
                  <strong>disqualified</strong>. The lowest unique amount wins
                  #1, the next lowest wins #2, and so on.
                </p>
              </div>
            </div>
          </motion.div>

          {winningAmount != null && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.33 }}
              className="w-full max-w-md rounded-2xl border border-awash-blue/15 bg-white/85 backdrop-blur-sm p-4 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 flex-shrink-0 text-awash-blue" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Transparency Check
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    {transparencyMessage}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-neutral-50/90 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    Lower levels
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground tabular-nums">
                    {lowerBidLevels}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50/90 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    Grouped bids
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground tabular-nums">
                    {lowerBidEntries}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50/90 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    Lowest blocked
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-foreground tabular-nums">
                    {lowestBlockedAmount != null
                      ? formatCurrency(lowestBlockedAmount)
                      : "None"}
                  </p>
                </div>
              </div>
              {duplicateLowerLevels > 0 && (
                <p className="mt-3 text-[11px] font-medium text-neutral-500">
                  Each lower amount is shown once, with a flag for how many
                  bidders repeated that same amount.
                </p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[11px] text-neutral-500">Need transparency verification?</span>
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ShieldQuestion className="size-3.5" />
                  Raise Inquiry / Dispute
                </button>
              </div>
            </motion.div>
          )}

          {/* ── All Winners List ── */}
          {allWinners && allWinners.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full max-w-md rounded-2xl border border-primary/20 bg-white/80 backdrop-blur-sm p-4"
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Winner List ({allWinners.length})
                </h3>
              </div>
              <div className="space-y-2">
                {allWinners.map((w, i) => {
                  const wDeadline = w.payment_deadline
                    ? new Date(w.payment_deadline)
                    : null;
                  const wDeadlineHrs = wDeadline
                    ? Math.max(
                        0,
                        Math.round(
                          (wDeadline.getTime() - Date.now()) / 3600000,
                        ),
                      )
                    : null;
                  const isPaid = w.payment_status === "PAID";
                  const isExpired = w.payment_status === "EXPIRED";
                  const isCurrentUser = w.user_id === user?.id;
                  return (
                    <div
                      key={w.user_id}
                      className={`flex items-center justify-between rounded-xl p-3 transition-all ${
                        isCurrentUser
                          ? "bg-primary/5 border border-primary/20 shadow-sm"
                          : "bg-neutral-50/80 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                            i === 0
                              ? "bg-amber-100 text-amber-800 border border-amber-300 shadow-sm"
                              : i === 1
                              ? "bg-slate-100 text-slate-700 border border-slate-300 shadow-sm"
                              : i === 2
                              ? "bg-orange-100 text-orange-800 border border-orange-200 shadow-sm"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          #{i + 1}
                        </span>
                        <div>
                          <p
                            className={`text-sm font-semibold ${isCurrentUser ? "text-primary" : "text-foreground"}`}
                          >
                            {(() => {
                              const fn = w.name ? w.name.split(" ")[0] : null;
                              const mp = w.phone ? maskPhone(w.phone) : null;
                              return fn && mp
                                ? `${fn} ${mp}`
                                : fn || mp || `Winner #${i + 1}`;
                            })()}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] font-bold text-primary">
                                (You)
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span className="font-medium text-emerald-600">
                              {formatCurrency(w.amount)}
                            </span>
                            {isPaid && (
                              <span className="text-emerald-600 font-medium">
                                • Paid
                              </span>
                            )}
                            {isExpired && (
                              <span className="text-red-500 font-medium">
                                • Expired
                              </span>
                            )}
                            {!isPaid && !isExpired && wDeadlineHrs != null && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  wDeadlineHrs < 6
                                    ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
                                    : wDeadlineHrs < 24
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                <Clock className="size-2.5" />
                                {wDeadlineHrs > 0
                                  ? `${wDeadlineHrs}h left`
                                  : "Overdue"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-foreground tabular-nums">
                        {formatCurrency(w.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── My Bid Info ── */}
          {myBidInfo && (
            <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-white/80 backdrop-blur-sm p-4">
              <h3 className="mb-2 text-sm font-bold text-foreground">
                Your Bid
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Amount</span>
                <span className="font-bold text-primary">
                  {formatCurrency(myBidInfo.amount)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-neutral-400">Fee Paid</span>
                <span
                  className={`font-bold ${myBidInfo.service_fee_paid ? "text-emerald-600" : "text-red-500"}`}
                >
                  {myBidInfo.service_fee_paid ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )}

          {/* ── Next Steps ── */}
          {userWinnerInfo && userWinnerInfo.payment_status !== "PAID" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-md rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/30 p-4"
            >
              <div className="flex items-start gap-2">
                <Info className="size-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isPrimaryWinner ? "Next Steps" : "Standby Status"}
                  </h3>
                  {isPrimaryWinner ? (
                    <ul className="mt-1 space-y-1 text-xs text-neutral-600">
                      <li className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5 font-bold">
                          1.
                        </span>{" "}
                        Complete payment before the deadline
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5 font-bold">
                          2.
                        </span>{" "}
                        Collect your item at the designated collection point
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5 font-bold">
                          3.
                        </span>{" "}
                        Present payment confirmation for collection
                      </li>
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                      You are ranked #{userWinnerInfo?.rank ?? "-"}. Payment
                      opens only for the current promoted winner. If a
                      higher-ranked winner expires, you will be moved up
                      automatically.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Bids Table ── */}
          {allBids && allBids.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Supporting Bids Below Winner
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Grouped once per amount to avoid duplicate rows.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {lowerBidLevels > 0 && (
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-neutral-500 border border-border/60">
                      {pageStart}-{pageEnd} of {lowerBidLevels}
                    </span>
                  )}
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500">
                    {lowerBidLevels} level{lowerBidLevels === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {winningAmount != null &&
                (() => {
                  const winnerBid = allBids.find(
                    (b) => b.amount === winningAmount,
                  );
                  if (!winnerBid) return null;
                  return (
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-emerald-800 truncate">
                          {winnerBid.user_name || winnerBid.user_id.slice(0, 8)}
                        </span>
                        {winnerBid.user_id === user?.id && (
                          <span className="text-[10px] font-bold text-primary shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Winner
                        </span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                          Unique ×1
                        </span>
                        <span className="text-xs font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(winningAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              {lowerBidsGrouped.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-medium text-neutral-400">
                      Amounts below winner (lowest ↑)
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-1">
                    {pagedBids.map(({ amount, count }) => (
                      <div
                        key={amount}
                        className="flex items-center justify-between rounded-lg bg-neutral-50/80 border border-transparent px-3 py-2.5"
                      >
                        <div>
                          <span className="text-xs font-bold text-foreground tabular-nums">
                            {formatCurrency(amount)}
                          </span>
                          <p className="mt-0.5 text-[10px] text-neutral-400">
                            Lower than the winner, so it only qualifies if it
                            was unique.
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${count > 1 ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"}`}
                          >
                            {count > 1 ? `Repeated ×${count}` : "Unique ×1"}
                          </span>
                          <p className="mt-1 text-[10px] text-neutral-400">
                            {count > 1
                              ? "Disqualified duplicate"
                              : "Valid unique amount"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalBidPages > 1 && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-white/70 px-3 py-2">
                      <button
                        onClick={() => setBidsPage((p) => Math.max(0, p - 1))}
                        disabled={currentBidsPage === 0}
                        className="rounded-md border border-border/60 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-all enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-[11px] font-semibold text-neutral-500">
                        Page {currentBidsPage + 1} of {totalBidPages}
                      </span>
                      <button
                        onClick={() =>
                          setBidsPage((p) => Math.min(totalBidPages - 1, p + 1))
                        }
                        disabled={currentBidsPage >= totalBidPages - 1}
                        className="rounded-md border border-border/60 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-all enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
              {lowerBidsGrouped.length === 0 && winningAmount != null && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                  No lower bid amounts were placed. The winner was already the
                  lowest valid bid.
                </div>
              )}
            </motion.div>
          )}

          {/* ── Actions ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-md space-y-2"
          >
            {winner.winner_user_id && isUserWinner ? (
              userWinnerInfo?.payment_status === "PAID" ? (
                <button onClick={() => go("home")} className="btn-primary">
                  <CheckCircle2 className="size-[18px]" /> Payment Complete —
                  Back Home
                </button>
              ) : !isPrimaryWinner ? (
                <button type="button" className="btn-outline cursor-default">
                  <Clock className="size-[18px]" /> Waiting for higher-ranked
                  winners
                </button>
              ) : (
                <button
                  onClick={() => go("pay-winning")}
                  className="btn-primary animate-shine"
                >
                  <CreditCard className="size-[18px]" /> Process Payment
                </button>
              )
            ) : (
              <button onClick={() => go("home")} className="btn-outline">
                Back to Home
              </button>
            )}
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="flex w-full items-center justify-center gap-1 text-xs font-medium text-neutral-400 hover:text-awash-gold transition-colors"
            >
              <Loader2 className="size-3" /> Refresh results
            </button>
          </motion.div>
        </motion.div>
      ) : null}

      {/* ── Dispute / Claim Modal ── */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <ShieldQuestion className="size-5 text-primary" />
                <h3 className="font-display text-base font-bold">Submit Auction Inquiry</h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="rounded-full p-1 text-neutral-400 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-neutral-500">
              File an inquiry or transparency review for <strong className="text-foreground">{auction.name}</strong>. Our audit committee reviews all bid frequency logs.
            </p>

            <form onSubmit={handleDisputeSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Inquiry Type</label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none shadow-sm"
                >
                  <option value="WINNER_DISPUTE">Winner Determination / Unique Bid Verification</option>
                  <option value="BID_DISPUTE">Bid Registration or Nonce Dispute</option>
                  <option value="PAYMENT_DISPUTE">Participation Fee / Payment Inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Explanation / Claim</label>
                <textarea
                  required
                  rows={4}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Describe what you observed (e.g. Your bid amount, transaction details)..."
                  className="mt-1.5 w-full rounded-xl border border-border/60 bg-white p-3 text-xs text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="rounded-xl border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeSubmitting || !disputeDesc.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {disputeSubmitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                  Submit Claim
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Reopen Auction Modal ── */}
      {reopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setReopenModalOpen(false); setReopenConfirming(false); }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700">
                <RotateCcw className="size-5.5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-awash-blue">Reopen Unsold Auction</h2>
                <p className="text-xs font-medium text-neutral-500">
                  Re-list "{auction.name}" with a fresh bidding window
                </p>
              </div>
            </div>

            {!reopenConfirming ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 text-xs text-amber-900">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Lifecycle State Reset Notice</p>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                      Reopening transitions this auction back to <strong>ACTIVE</strong>. Prior bids below reserve are archived, prior winner records are purged, and Redis tallies are cleared for a clean start.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                    <Calendar className="size-3.5 text-primary" /> Schedule New Duration
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">New Start Time</label>
                      <input
                        type="datetime-local"
                        value={reopenForm.startTime}
                        onChange={(e) => setReopenForm({ ...reopenForm, startTime: e.target.value })}
                        className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">New End Time</label>
                      <input
                        type="datetime-local"
                        value={reopenForm.endTime}
                        onChange={(e) => setReopenForm({ ...reopenForm, endTime: e.target.value })}
                        className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                    <Gavel className="size-3.5 text-primary" /> Pricing & Bidding Rules
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Market Price</label>
                      <input
                        value={reopenForm.marketPrice}
                        onChange={(e) => setReopenForm({ ...reopenForm, marketPrice: e.target.value.replace(/[^\d.]/g, "") })}
                        placeholder="e.g. 50000"
                        className="w-full rounded-xl border border-border/60 bg-white px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Bid Fee (ETB)</label>
                      <input
                        value={reopenForm.bidFee}
                        onChange={(e) => setReopenForm({ ...reopenForm, bidFee: e.target.value.replace(/[^\d.]/g, "") })}
                        placeholder="e.g. 10"
                        className="w-full rounded-xl border border-border/60 bg-white px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Min Bids (Reserve)</label>
                      <input
                        value={reopenForm.minBid}
                        onChange={(e) => setReopenForm({ ...reopenForm, minBid: e.target.value.replace(/[^\d]/g, "") })}
                        placeholder="None"
                        className="w-full rounded-xl border border-border/60 bg-white px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Max Bids</label>
                      <input
                        value={reopenForm.maxBid}
                        onChange={(e) => setReopenForm({ ...reopenForm, maxBid: e.target.value.replace(/[^\d]/g, "") })}
                        placeholder="None"
                        className="w-full rounded-xl border border-border/60 bg-white px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReopenModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setReopenConfirming(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-5 py-2 text-xs font-bold text-awash-blue shadow-md hover:shadow-lg"
                  >
                    Review & Reopen <Sparkles className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-awash-blue">Confirm Auction Reopening</h3>
                  <p className="mt-1 text-xs text-neutral-600 max-w-md mx-auto">
                    Are you sure you want to reopen <strong>"{auction.name}"</strong> until{" "}
                    <span className="font-bold text-awash-blue">
                      {new Date(reopenForm.endTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>?
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setReopenConfirming(false)}
                    disabled={reopening}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                  >
                    Go Back & Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleReopenSubmit}
                    disabled={reopening}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {reopening ? "Reopening..." : <><RotateCcw className="size-3.5" /> Confirm & Reopen Now</>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
