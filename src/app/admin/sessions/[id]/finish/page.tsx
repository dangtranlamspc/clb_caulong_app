"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  Send,
  Divide,
  Wallet,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { sessionsAdminApi } from "@/lib/api";
import { MorphButton } from "@/components/effect-button/MorphButton";
import PenaltyModal from "@/components/admin/wallet/PenaltyModal";
import SessionPenaltiesCard, {
  SessionPenaltiesCardHandle,
} from "@/components/admin/sessions/SessionPenaltiesCard";

interface CourtItem {
  id: string;
  name: string;
  minutes: number;
  pricePerHour: number;
}

let courtIdCounter = 0;

function newCourtId() {
  courtIdCounter += 1;
  return `court_${Date.now()}_${courtIdCounter}`;
}

function courtTotal(c: CourtItem): number {
  const hours = (Number(c.minutes) || 0) / 60;
  return Math.round((Number(c.pricePerHour) || 0) * hours);
}

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function formatNumberInput(n: number): string {
  if (!n) return "";
  return n.toLocaleString("vi-VN");
}

function parseNumberInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export default function SessionFinishPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [registrations, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<
    "idle" | "loading" | "success"
  >("idle");

  const [courts, setCourts] = useState<CourtItem[]>([
    { id: newCourtId(), name: "", minutes: 0, pricePerHour: 0 },
  ]);

  const courtFee = courts.reduce((sum, c) => sum + courtTotal(c), 0);

  const addCourt = () => {
    setCourts((prev) => [
      ...prev,
      { id: newCourtId(), name: "", minutes: 0, pricePerHour: 0 },
    ]);
  };

  const removeCourt = (id: string) => {
    setCourts((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));
  };


  const updateCourt = (
    id: string,
    field: "name" | "minutes" | "pricePerHour",
    value: string | number,
  ) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };


  const [shuttleCount, setShuttleCount] = useState(0);
  const [shuttlePrice, setShuttlePrice] = useState(0);

  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [guestAmounts, setGuestAmounts] = useState<Record<string, number>>({});
  const [otherFees, setOtherFees] = useState<Record<string, number>>({});
  const [otherFeeNotes, setOtherFeeNotes] = useState<Record<string, string>>(
    {},
  );

  const [walletDeductIds, setWalletDeductIds] = useState<Set<string>>(
    new Set(),
  );

  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  const [walletModes, setWalletModes] = useState<
    Record<string, "member_choice" | "grouped" | "separate">
  >({});

  const [penaltyTarget, setPenaltyTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const penaltiesCardRef = useRef<SessionPenaltiesCardHandle>(null);

  const setWalletMode = (
    registrationId: string,
    mode: "member_choice" | "grouped" | "separate",
  ) => {
    setWalletModes((prev) => ({ ...prev, [registrationId]: mode }));
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      sessionsAdminApi.get(id),
      sessionsAdminApi.getRegistrations(id),
    ])
      .then(([{ data: s }, { data: r }]) => {
        setSession(s);
        if (Array.isArray(s.court_breakdown) && s.court_breakdown.length > 0) {
          setCourts(
            s.court_breakdown.map((c: any) => ({
              id: newCourtId(),
              name: c.name ?? "",
              minutes: c.minutes ?? 0,
              pricePerHour: c.price_per_hour ?? 0,
            })),
          );
        } else {
          setCourts([
            { id: newCourtId(), name: "", minutes: 0, pricePerHour: s.court_fee ?? 0 },
          ]);
        }
        setShuttleCount(s.shuttle_count ?? 0);
        setShuttlePrice(s.shuttle_price ?? 0);

        const confirmed = r.filter(
          (reg: any) => reg.participation_status !== "declined",
        );
        setRegs(confirmed);

        const priceMale = s.price_male ?? s.price_per_slot ?? 0;
        const priceFemale = s.price_female ?? s.price_per_slot ?? 0;

        const hosts = confirmed.filter((reg: any) => !reg.host_registration_id);
        const guests = confirmed.filter(
          (reg: any) => !!reg.host_registration_id,
        );

        const initAmounts: Record<string, number> = {};
        hosts.forEach((h: any) => {
          const hostGender = h.is_guest ? h.guest_gender : h.users?.gender;
          const hostDefault = hostGender === "female" ? priceFemale : priceMale;
          initAmounts[h.id] = h.base_amount ?? h.amount_override ?? hostDefault;
        });
        setAmounts(initAmounts);

        const initGuestAmounts: Record<string, number> = {};
        guests.forEach((g: any) => {
          const gGender = g.guest_gender;
          initGuestAmounts[g.id] =
            g.base_amount ?? (gGender === "female" ? priceFemale : priceMale);
        });
        setGuestAmounts(initGuestAmounts);

        const initOtherFees: Record<string, number> = {};
        const initOtherFeeNotes: Record<string, string> = {};
        confirmed.forEach((reg: any) => {
          if (reg.other_fee_amount)
            initOtherFees[reg.id] = reg.other_fee_amount;
          if (reg.other_fee_note)
            initOtherFeeNotes[reg.id] = reg.other_fee_note;
        });
        setOtherFees(initOtherFees);
        setOtherFeeNotes(initOtherFeeNotes);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const shuttleCost = shuttleCount * shuttlePrice;
  const splittableCost = courtFee + shuttleCost;
  const totalOtherFees = Object.values(otherFees).reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  );
  const totalCost = splittableCost + totalOtherFees;

  const hostRows = registrations.filter((r) => !r.host_registration_id);
  const guestsOf = (hostId: string) =>
    registrations.filter((r) => r.host_registration_id === hostId);

  const totalCollected =
    Object.values(amounts).reduce((a, b) => a + (Number(b) || 0), 0) +
    Object.values(guestAmounts).reduce((a, b) => a + (Number(b) || 0), 0) +
    Object.values(otherFees).reduce((a, b) => a + (Number(b) || 0), 0);

  const toggleWalletDeduct = (registrationId: string) => {
    setWalletDeductIds((prev) => {
      const next = new Set(prev);
      if (next.has(registrationId)) next.delete(registrationId);
      else next.add(registrationId);
      return next;
    });
  };

  const handleSplitEqually = () => {
    const allMembers = registrations;
    const n = allMembers.length;
    if (n === 0) {
      toast.error("Chưa có ai đăng ký để chia tiền");
      return;
    }

    const base = Math.floor(splittableCost / n);
    let remainder = splittableCost - base * n;

    const nextAmounts = { ...amounts };
    const nextGuestAmounts = { ...guestAmounts };

    allMembers.forEach((m: any) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      const share = base + extra;

      if (!m.host_registration_id) {
        nextAmounts[m.id] = share;
      } else {
        nextGuestAmounts[m.id] = share;
      }
    });

    setAmounts(nextAmounts);
    setGuestAmounts(nextGuestAmounts);
    setLockedIds(new Set());
    toast.success(`Đã chia đều ${fmt(splittableCost)} cho ${n} người`);
  };

  const handleAmountChange = (registrationId: string, value: number) => {
    const target = registrations.find((r) => r.id === registrationId);
    if (!target) return;
    const isHost = !target.host_registration_id;

    const newLockedIds = new Set(lockedIds);
    newLockedIds.add(registrationId);

    const newAmounts = { ...amounts };
    const newGuestAmounts = { ...guestAmounts };

    if (isHost) newAmounts[registrationId] = value;
    else newGuestAmounts[registrationId] = value;

    const getAmount = (r: any) =>
      r.host_registration_id
        ? (newGuestAmounts[r.id] ?? 0)
        : (newAmounts[r.id] ?? 0);

    const lockedSum = registrations.reduce(
      (sum, r) =>
        newLockedIds.has(r.id) ? sum + (Number(getAmount(r)) || 0) : sum,
      0,
    );

    const unlockedMembers = registrations.filter(
      (r) => !newLockedIds.has(r.id),
    );
    const remaining = Math.max(0, splittableCost - lockedSum);

    if (unlockedMembers.length > 0) {
      const base = Math.floor(remaining / unlockedMembers.length);
      let rem = remaining - base * unlockedMembers.length;
      unlockedMembers.forEach((m) => {
        const extra = rem > 0 ? 1 : 0;
        if (rem > 0) rem -= 1;
        const share = base + extra;
        if (m.host_registration_id) newGuestAmounts[m.id] = share;
        else newAmounts[m.id] = share;
      });
    }

    setLockedIds(newLockedIds);
    setAmounts(newAmounts);
    setGuestAmounts(newGuestAmounts);
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitPhase("loading");
    setSubmitting(true);
    try {
      const allAmounts: {
        registration_id: string;
        amount: number;
        base_amount: number;
        other_fee_amount: number;
        other_fee_note?: string;
      }[] = [];

      hostRows.forEach((h) => {
        const base = Number(amounts[h.id]) || 0;
        const other = Number(otherFees[h.id]) || 0;
        allAmounts.push({
          registration_id: h.id,
          amount: base + other,
          base_amount: base,
          other_fee_amount: other,
          other_fee_note: otherFeeNotes[h.id]?.trim() || undefined,
        });

        guestsOf(h.id).forEach((g) => {
          const gBase = Number(guestAmounts[g.id]) || 0;
          const gOther = Number(otherFees[g.id]) || 0;
          allAmounts.push({
            registration_id: g.id,
            amount: gBase + gOther,
            base_amount: gBase,
            other_fee_amount: gOther,
            other_fee_note: otherFeeNotes[g.id]?.trim() || undefined,
          });
        });
      });

      await sessionsAdminApi.finish(id, {
        court_fee: courtFee,
        court_breakdown: courts
          .filter((c) => c.name.trim() || c.pricePerHour > 0)
          .map((c) => ({
            name: c.name.trim() || "Sân (chưa đặt tên)",
            minutes: Number(c.minutes) || undefined,
            price_per_hour: Number(c.pricePerHour) || 0,
            total: courtTotal(c),
          })),
        shuttle_count: shuttleCount,
        shuttle_price: shuttlePrice,
        other_fee: totalOtherFees,
        amounts: allAmounts,
        wallet_deduct: Array.from(walletDeductIds),
        wallet_deduct_modes: Object.fromEntries(
          Array.from(walletDeductIds)
            .filter((regId) => guestsOf(regId).length > 0)
            .map((regId) => [regId, walletModes[regId] ?? "grouped"]),
        ),
      });

      setSubmitPhase("success");
      toast.success("Đã kết thúc buổi và gửi hóa đơn thanh toán!");
      setTimeout(() => {
        router.push(`/admin/sessions/${id}`);
      }, 600);
    } catch (err) {
      setSubmitPhase("idle");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-48 bg-gray-100 animate-pulse rounded-2xl" />
      </div>
    );
  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/sessions/${id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">
            Kết thúc buổi: {session.title}
          </h1>
        </div>
      </div>

      <div className="card space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Chi phí thực tế
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏟 Tiền sân
          </label>
          <div className="space-y-3">
            {courts.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">
                    Sân {idx + 1}
                  </span>
                  {courts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCourt(c.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Xóa sân này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Tên sân
                    </label>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateCourt(c.id, "name", e.target.value)}
                      className="input-field text-sm w-full"
                      placeholder="Sân 1"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Số phút
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={c.minutes || ""}
                      onChange={(e) =>
                        updateCourt(c.id, "minutes", parseNumberInput(e.target.value))
                      }
                      className="input-field text-sm text-right w-full"
                      placeholder="60"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Giá / tiếng
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberInput(c.pricePerHour)}
                      onChange={(e) =>
                        updateCourt(c.id, "pricePerHour", parseNumberInput(e.target.value))
                      }
                      className="input-field text-sm text-right w-full"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs font-semibold text-gray-600 pt-1 border-t border-gray-200">
                  <span>
                    Tổng ({c.minutes || 0} phút × {fmt(c.pricePerHour || 0)}/tiếng)
                  </span>
                  <span>{fmt(courtTotal(c))}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCourt}
            className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm sân
          </button>

          <div className="flex justify-between text-sm font-medium text-gray-700 mt-2 pt-2 border-t border-gray-100">
            <span>Tổng tiền sân</span>
            <span>{fmt(courtFee)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Số bông cầu
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberInput(shuttleCount)}
              onChange={(e) =>
                setShuttleCount(parseNumberInput(e.target.value))
              }
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Giá 1 bông
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberInput(shuttlePrice)}
              onChange={(e) =>
                setShuttlePrice(parseNumberInput(e.target.value))
              }
              className="input-field"
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
          <span>Tổng chi phí (chưa khoản khác)</span>
          <span>{fmt(splittableCost)}</span>
        </div>
      </div>

      {id && <SessionPenaltiesCard ref={penaltiesCardRef} sessionId={id} />}

      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Số tiền từng người phải trả
          </p>
          <button
            onClick={handleSplitEqually}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <Divide className="w-4 h-4" /> Chia đều
          </button>
        </div>

        <div className="p-4 space-y-4">
          {hostRows.map((h) => {
            const guests = guestsOf(h.id);
            const name = h.is_guest ? h.guest_full_name : h.users?.full_name;
            const isRealUser = !!h.user_id && !h.is_guest;
            const isWalletDeduct = walletDeductIds.has(h.id);

            return (
              <div
                key={h.id}
                className={`rounded-2xl border-2 p-3 space-y-3 transition-colors ${isWalletDeduct
                  ? "border-blue-200 bg-blue-50/30"
                  : "border-gray-200 bg-white"
                  }`}
              >
                <div
                  className={`rounded-xl border p-3 space-y-2 transition-colors ${isWalletDeduct
                    ? "border-blue-200 bg-blue-50/70"
                    : "border-gray-200 bg-gray-50/60"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {name}
                          {h.is_guest && (
                            <span className="text-xs text-gray-400 ml-1">
                              (khách)
                            </span>
                          )}
                        </p>
                        {isWalletDeduct && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                            <Wallet className="w-2.5 h-2.5" /> Ví BNB
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberInput(amounts[h.id] ?? 0)}
                      onChange={(e) =>
                        handleAmountChange(
                          h.id,
                          parseNumberInput(e.target.value),
                        )
                      }
                      className="input-field w-32 text-right text-sm flex-shrink-0"
                      placeholder="0"
                    />

                    {isRealUser && (
                      <button
                        type="button"
                        onClick={() => toggleWalletDeduct(h.id)}
                        title={
                          isWalletDeduct ? "Bỏ trừ ví" : "Trừ thẳng ví BNB"
                        }
                        className={`flex-shrink-0 h-8 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 transition-all ${isWalletDeduct
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400"
                          }`}
                      >
                        <Wallet className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
                          Ví
                        </span>
                      </button>
                    )}
                    {isRealUser && (
                      <button
                        type="button"
                        onClick={() =>
                          setPenaltyTarget({ id: h.user_id, name })
                        }
                        title="Phạt thành viên này"
                        className="flex-shrink-0 h-8 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 bg-red-500 border-red-500 text-white sm:bg-transparent sm:border-gray-200 sm:text-gray-300 sm:hover:border-red-300 sm:hover:text-red-500 transition-all"
                      >
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
                          Phạt
                        </span>
                      </button>
                    )}
                  </div>

                  {guests.length > 0 && isWalletDeduct && (
                    <div className="pt-1">
                      <p className="text-[11px] font-medium text-gray-400 mb-1.5">
                        Cách xử lý thanh toán cho khách đi cùng
                      </p>
                      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl">
                        {[
                          { val: "member_choice", label: "Member tự chọn" },
                          { val: "grouped", label: "Gộp trừ ví" },
                          { val: "separate", label: "Tách riêng" },
                        ].map(({ val, label }) => {
                          const active =
                            (walletModes[h.id] ?? "grouped") === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setWalletMode(h.id, val as any)}
                              className={`px-2 py-3 min-h-[44px] rounded-lg text-[11px] sm:text-xs font-medium text-center leading-tight transition-all ${active
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-500 hover:bg-gray-200/70"
                                }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-2 flex-shrink-0" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberInput(otherFees[h.id] ?? 0)}
                      onChange={(e) =>
                        setOtherFees((prev) => ({
                          ...prev,
                          [h.id]: parseNumberInput(e.target.value),
                        }))
                      }
                      className="input-field w-28 text-right text-xs text-gray-500"
                      placeholder="0"
                    />
                    <input
                      type="text"
                      value={otherFeeNotes[h.id] ?? ""}
                      onChange={(e) =>
                        setOtherFeeNotes((prev) => ({
                          ...prev,
                          [h.id]: e.target.value,
                        }))
                      }
                      className="input-field flex-1 text-xs text-gray-500"
                      placeholder="💰 Khoản khác của host..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <div className="w-fit text-right text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg flex items-center gap-1.5 px-2.5 py-1.5">
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                        Tổng thu
                      </span>
                      <span className="whitespace-nowrap">
                        {fmt(
                          (Number(amounts[h.id]) || 0) +
                          (Number(otherFees[h.id]) || 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {guests.length > 0 && (
                  <div className="relative pl-6">
                    <div
                      className={`absolute left-2 top-0 bottom-4 w-px ${isWalletDeduct ? "bg-blue-300" : "bg-gray-300"
                        }`}
                    />

                    <div className="space-y-3">
                      {guests.map((g: any) => (
                        <div key={g.id} className="relative">
                          <div
                            className={`absolute -left-4 top-5 w-4 h-px ${isWalletDeduct ? "bg-blue-300" : "bg-gray-300"
                              }`}
                          />

                          <div
                            className={`rounded-xl border p-3 space-y-2 transition-colors ${isWalletDeduct
                              ? "border-blue-200 bg-blue-50/70"
                              : "border-purple-100 bg-purple-50/40"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <p className="flex-1 text-xs text-purple-600 truncate">
                                +{" "}
                                {g.is_guest
                                  ? g.guest_full_name
                                  : g.users?.full_name}
                                <span className="text-gray-400 ml-1">
                                  (đi cùng)
                                </span>
                                {isWalletDeduct && (
                                  <span className="text-blue-400 ml-1">
                                    · chờ xác nhận
                                  </span>
                                )}
                              </p>
                              {!!g.user_id && !g.is_guest && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPenaltyTarget({
                                      id: g.user_id,
                                      name: g.users?.full_name,
                                    })
                                  }
                                  title="Phạt thành viên này"
                                  className="flex-shrink-0 h-7 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 bg-red-500 border-red-500 text-white sm:bg-transparent sm:border-gray-200 sm:text-gray-300 sm:hover:border-red-300 sm:hover:text-red-500 transition-all"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
                                    Phạt
                                  </span>
                                </button>
                              )}
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumberInput(
                                  guestAmounts[g.id] ?? 0,
                                )}
                                onChange={(e) =>
                                  handleAmountChange(
                                    g.id,
                                    parseNumberInput(e.target.value),
                                  )
                                }
                                className="input-field w-32 text-right text-sm"
                                placeholder="0"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumberInput(otherFees[g.id] ?? 0)}
                                onChange={(e) =>
                                  setOtherFees((prev) => ({
                                    ...prev,
                                    [g.id]: parseNumberInput(e.target.value),
                                  }))
                                }
                                className="input-field w-28 text-right text-xs text-gray-500"
                                placeholder="0"
                              />
                              <input
                                type="text"
                                value={otherFeeNotes[g.id] ?? ""}
                                onChange={(e) =>
                                  setOtherFeeNotes((prev) => ({
                                    ...prev,
                                    [g.id]: e.target.value,
                                  }))
                                }
                                className="input-field flex-1 text-xs text-gray-500"
                                placeholder="💰 Khoản khác của khách..."
                              />
                            </div>

                            <div className="flex justify-end">
                              <div className="w-fit text-right text-xs font-bold text-gray-800 bg-white border border-purple-200 rounded-lg flex items-center gap-1.5 px-2.5 py-1.5">
                                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                                  Tổng thu
                                </span>
                                <span className="whitespace-nowrap">
                                  {fmt(
                                    (Number(guestAmounts[g.id]) || 0) +
                                    (Number(otherFees[g.id]) || 0),
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-sm font-bold px-4 py-3 bg-gray-50 border-t border-gray-100">
          <span>Tổng cộng</span>
          <span className="text-blue-600">{fmt(totalCollected)}</span>
        </div>

        {walletDeductIds.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2 text-xs text-blue-700">
            <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {walletDeductIds.size} thành viên sẽ được trừ thẳng ví BNB — tổng{" "}
              {fmt(
                Array.from(walletDeductIds).reduce((sum, regId) => {
                  return (
                    sum +
                    (Number(amounts[regId]) || 0) +
                    (Number(otherFees[regId]) || 0)
                  );
                }, 0),
              )}
            </span>
          </div>
        )}

        {penaltyTarget && (
          <PenaltyModal
            open={!!penaltyTarget}
            onClose={() => {
              setPenaltyTarget(null);
              penaltiesCardRef.current?.refresh();
            }}
            sessionId={id}
            memberId={penaltyTarget.id}
            memberName={penaltyTarget.name}
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => router.push(`/admin/sessions/${id}`)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          disabled={submitPhase !== "idle"}
        >
          Hủy
        </button>
        <MorphButton
          phase={submitPhase}
          idleIcon={<Send className="w-4 h-4" />}
          label="Gửi hóa đơn thanh toán"
          idleClassName="bg-green-500 hover:bg-green-600 text-white"
          successClassName="bg-green-500 text-white"
          idleWidthClass="min-w-[11rem]"
          onClick={handleSubmit}
          disabled={submitPhase !== "idle"}
        />
      </div>
    </div>
  );
}