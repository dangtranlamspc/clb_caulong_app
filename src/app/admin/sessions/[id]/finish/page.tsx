'use client';
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Calculator,
  Send,
  Divide,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { sessionsAdminApi as sessionsApi } from "@/lib/api";

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

  const [courtFee, setCourtFee] = useState(0);
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

  const setWalletMode = (
    registrationId: string,
    mode: "member_choice" | "grouped" | "separate",
  ) => {
    setWalletModes((prev) => ({ ...prev, [registrationId]: mode }));
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([sessionsApi.get(id), sessionsApi.getRegistrations(id)])
      .then(([{ data: s }, { data: r }]) => {
        setSession(s);
        setCourtFee(s.court_fee ?? 0);
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

      await sessionsApi.finish(id, {
        court_fee: courtFee,
        shuttle_count: shuttleCount,
        shuttle_price: shuttlePrice,
        other_fee: totalOtherFees,
        amounts: allAmounts,
        wallet_deduct: Array.from(walletDeductIds),
        wallet_deduct_modes: Object.fromEntries(
          Array.from(walletDeductIds)
            .filter((regId) => guestsOf(regId).length > 0)
            .map((regId) => [regId, walletModes[regId] ?? "member_choice"]),
        ),
      });
      toast.success("Đã kết thúc buổi và gửi hóa đơn thanh toán!");
      router.push(`/sessions/${id}`);
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
          onClick={() => router.push(`/sessions/${id}`)}
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

      {/* Chi phí chung */}
      <div className="card space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Chi phí thực tế
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🏟 Tiền sân
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumberInput(courtFee)}
            onChange={(e) => setCourtFee(parseNumberInput(e.target.value))}
            className="input-field"
            placeholder="0"
          />
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
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Số tiền từng người phải trả
          </p>
          <button
            onClick={handleSplitEqually}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors"
          >
            <Divide className="w-3.5 h-3.5" /> Chia đều
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
                {/* Khung host */}
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
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${isWalletDeduct
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400"
                          }`}
                      >
                        <Wallet className="w-4 h-4" />
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
                            (walletModes[h.id] ?? "member_choice") === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setWalletMode(h.id, val as any)}
                              className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium text-center leading-tight transition-all ${active
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

                  {/* Tổng thu — dòng riêng, canh phải */}
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

                {/* Nhóm guest đi cùng — có đường nối từ host xuống */}
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
                                + {g.guest_full_name}
                                <span className="text-gray-400 ml-1">
                                  (đi cùng)
                                </span>
                                {isWalletDeduct && (
                                  <span className="text-blue-400 ml-1">
                                    · chờ xác nhận
                                  </span>
                                )}
                              </p>
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
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push(`/sessions/${id}`)}
          className="btn-secondary text-sm"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Gửi hóa đơn thanh toán
        </button>
      </div>
    </div>
  );
}
