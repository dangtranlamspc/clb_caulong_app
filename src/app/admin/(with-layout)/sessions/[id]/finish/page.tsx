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
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { sessionsAdminApi, drinksAdminApi } from "@/lib/api";
import { MorphButton } from "@/components/effect-button/MorphButton";
import PenaltyModal from "@/components/admin/wallet/PenaltyModal";
import SessionPenaltiesCard, {
  SessionPenaltiesCardHandle,
} from "@/components/admin/sessions/SessionPenaltiesCard";
import { useNavLoadingStore } from "@/store/nav-loading.store";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";

interface CourtItem {
  id: string;
  name: string;
  minutes: number;
  pricePerHour: number;
}

interface OtherFeeItem {
  id: string;
  amount: number;
  note: string;
  drinkId?: string | null;
  quantity?: number;
  quantityInput?: string;
  deductStock?: boolean;
}

interface Drink {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  is_active?: boolean;
}

let courtIdCounter = 0;

function newCourtId() {
  courtIdCounter += 1;
  return `court_${Date.now()}_${courtIdCounter}`;
}

let otherFeeItemIdCounter = 0;

function newOtherFeeItemId() {
  otherFeeItemIdCounter += 1;
  return `fee_${Date.now()}_${otherFeeItemIdCounter}`;
}

function emptyOtherFeeItem(): OtherFeeItem {
  return {
    id: newOtherFeeItemId(),
    amount: 0,
    note: "",
    drinkId: null,
    quantity: 1,
    quantityInput: "1",
    deductStock: false,
  };
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

  const [emailIds, setEmailIds] = useState<Set<string>>(new Set());

  const [drinks, setDrinks] = useState<Drink[]>([]);

  const startNavLoading = useNavLoadingStore((s) => s.start);

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
  const [otherFeeItems, setOtherFeeItems] = useState<
    Record<string, OtherFeeItem[]>
  >({});

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

  const effectiveQuantity = (item: OtherFeeItem) =>
    item.quantity && item.quantity >= 1 ? item.quantity : 1;

  const effectiveAmount = (item: OtherFeeItem) => {
    if (item.drinkId) {
      const drink = drinks.find((d) => d.id === item.drinkId);
      if (drink) return drink.price * effectiveQuantity(item);
    }
    return Number(item.amount) || 0;
  };

  const otherFeeSum = (regId: string) =>
    (otherFeeItems[regId] ?? []).reduce((s, i) => s + effectiveAmount(i), 0);

  const otherFeeNoteJoined = (regId: string) => {
    const items = (otherFeeItems[regId] ?? []).filter(
      (i) => effectiveAmount(i) > 0 || i.note.trim(),
    );
    if (items.length === 0) return undefined;

    return items
      .map((i) => {
        const amountText = fmt(effectiveAmount(i));
        const label = i.drinkId
          ? `${i.note.trim() || "Nước"} x${effectiveQuantity(i)}`
          : i.note.trim();
        return label ? `${amountText} - ${label}` : amountText;
      })
      .join("\n");
  };

  const handleQuantityBlur = (regId: string, itemId: string) => {
    setOtherFeeItems((prev) => ({
      ...prev,
      [regId]: (prev[regId] ?? []).map((i) => {
        if (i.id !== itemId) return i;
        if (i.quantity && i.quantity >= 1) return i;
        const drink = i.drinkId ? drinks.find((d) => d.id === i.drinkId) : null;
        return {
          ...i,
          quantity: 1,
          quantityInput: "1",
          amount: drink ? drink.price * 1 : i.amount,
        };
      }),
    }));
  };

  const addOtherFeeItem = (regId: string) => {
    setOtherFeeItems((prev) => ({
      ...prev,
      [regId]: [...(prev[regId] ?? []), emptyOtherFeeItem()],
    }));
  };

  const removeOtherFeeItem = (regId: string, itemId: string) => {
    setOtherFeeItems((prev) => {
      const items = prev[regId] ?? [];
      if (items.length <= 1) return prev;
      return { ...prev, [regId]: items.filter((i) => i.id !== itemId) };
    });
  };


  const isMailEligible = (r: any) => {
    if (!r.host_registration_id) {
      return r.is_guest;
    }
    const host = registrations.find((h) => h.id === r.host_registration_id);
    if (host?.is_guest) return false;
    return (
      walletDeductIds.has(host?.id) &&
      (walletModes[host?.id] ?? "grouped") === "separate"
    );
  };

  const eligibleRegs = registrations.filter(isMailEligible);
  const mailAll = eligibleRegs.length > 0 && eligibleRegs.every((r) => emailIds.has(r.id));

  const toggleMailAll = () => {
    if (mailAll) {
      setEmailIds((prev) => {
        const next = new Set(prev);
        eligibleRegs.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setEmailIds((prev) => {
        const next = new Set(prev);
        eligibleRegs.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const toggleEmailFor = (registrationId: string) => {
    setEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(registrationId)) next.delete(registrationId);
      else next.add(registrationId);
      return next;
    });
  };

  const updateOtherFeeItem = (
    regId: string,
    itemId: string,
    field: "amount" | "note" | "drinkId" | "quantity" | "deductStock",
    value: string | number | boolean,
  ) => {
    setOtherFeeItems((prev) => ({
      ...prev,
      [regId]: (prev[regId] ?? []).map((i) => {
        if (i.id !== itemId) return i;

        if (field === "drinkId") {
          const drinkId = (value as string) || null;
          if (!drinkId) {
            return {
              ...i,
              drinkId: null,
              deductStock: false,
              amount: 0,
              note: "",
            };
          }
          const drink = drinks.find((d) => d.id === drinkId);
          const qty = i.quantity && i.quantity > 0 ? i.quantity : 1;
          return {
            ...i,
            drinkId,
            quantity: qty,
            quantityInput: String(qty),
            note: drink?.name ?? i.note,
            amount: (drink?.price ?? 0) * qty,
          };
        }

        if (field === "quantity") {
          const raw = String(value);
          const numeric = raw === "" ? 0 : parseInt(raw, 10) || 0;
          if (i.drinkId) {
            const drink = drinks.find((d) => d.id === i.drinkId);
            return {
              ...i,
              quantity: numeric,
              quantityInput: raw,
              amount: (drink?.price ?? 0) * numeric,
            };
          }
          return { ...i, quantity: numeric, quantityInput: raw };
        }

        if (field === "deductStock") {
          return { ...i, deductStock: value as boolean };
        }

        return { ...i, [field]: value };
      }),
    }));
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

        const initOtherFeeItems: Record<string, OtherFeeItem[]> = {};
        confirmed.forEach((reg: any) => {
          initOtherFeeItems[reg.id] = reg.other_fee_amount
            ? [
              {
                ...emptyOtherFeeItem(),
                amount: reg.other_fee_amount,
                note: reg.other_fee_note ?? "",
              },
            ]
            : [emptyOtherFeeItem()];
        });
        setOtherFeeItems(initOtherFeeItems);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    drinksAdminApi
      .list()
      .then(({ data }: any) => {
        setDrinks((data ?? []).filter((d: Drink) => d.is_active !== false));
      })
      .catch((err: any) => {
        console.error("[SessionFinishPage] Không tải được danh sách nước:", err);
      });
  }, []);

  const shuttleCost = shuttleCount * shuttlePrice;
  const splittableCost = courtFee + shuttleCost;
  const totalOtherFees = Object.values(otherFeeItems).reduce(
    (sum, items) => sum + items.reduce((s, i) => s + effectiveAmount(i), 0),
    0,
  );
  const totalCost = splittableCost + totalOtherFees;

  const hostRows = registrations.filter((r) => !r.host_registration_id);
  const guestsOf = (hostId: string) =>
    registrations.filter((r) => r.host_registration_id === hostId);

  const totalCollected =
    Object.values(amounts).reduce((a, b) => a + (Number(b) || 0), 0) +
    Object.values(guestAmounts).reduce((a, b) => a + (Number(b) || 0), 0) +
    totalOtherFees;

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
        send_email: boolean;
      }[] = [];

      hostRows.forEach((h) => {
        const base = Number(amounts[h.id]) || 0;
        const other = otherFeeSum(h.id);
        allAmounts.push({
          registration_id: h.id,
          amount: base + other,
          base_amount: base,
          other_fee_amount: other,
          other_fee_note: otherFeeNoteJoined(h.id),
          send_email: emailIds.has(h.id),
        });

        guestsOf(h.id).forEach((g) => {
          const gBase = Number(guestAmounts[g.id]) || 0;
          const gOther = otherFeeSum(g.id);
          allAmounts.push({
            registration_id: g.id,
            amount: gBase + gOther,
            base_amount: gBase,
            other_fee_amount: gOther,
            other_fee_note: otherFeeNoteJoined(g.id),
            send_email: emailIds.has(g.id),
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

      const deductions = new Map<string, number>();
      Object.values(otherFeeItems).forEach((items) => {
        items.forEach((item) => {
          if (item.drinkId && item.deductStock) {
            const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
            deductions.set(item.drinkId, (deductions.get(item.drinkId) ?? 0) + qty);
          }
        });
      });

      if (deductions.size > 0) {
        const results = await Promise.allSettled(
          Array.from(deductions.entries()).map(([drinkId, qty]) =>
            drinksAdminApi.consume(drinkId, qty),
          ),
        );
        const failedCount = results.filter((r) => r.status === "rejected").length;
        if (failedCount > 0) {
          toast.error(
            `Gửi hóa đơn thành công nhưng trừ kho thất bại cho ${failedCount} loại nước, vui lòng kiểm tra lại kho thủ công`,
          );
        }
      }

      setSubmitPhase("success");
      toast.success("Đã kết thúc buổi và gửi hóa đơn thanh toán!");
      setTimeout(() => {
        startNavLoading();
        router.push(`/admin/sessions/${id}`);
      }, 600);
    } catch (err) {
      setSubmitPhase("idle");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const drinkSelectOptions = [
    { value: "", label: "✏️ Khoản khác (nhập tay)" },
    ...drinks.map((d) => ({
      value: d.id,
      label: d.name,
      subLabel: `Còn ${d.quantity}`,
      imageUrl: d.image_url ?? null,
    })),
  ];

  const renderOtherFeeEditor = (
    regId: string,
    placeholder: string,
    wrapperClassName: string,
  ) => {
    const items = otherFeeItems[regId] ?? [];
    return (
      <div className={wrapperClassName}>
        {items.map((item) => {
          const selectedDrink = item.drinkId
            ? drinks.find((d) => d.id === item.drinkId)
            : null;

          return (
            <div
              key={item.id}
              className="rounded-lg border border-gray-100 bg-white/70 p-2 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <CustomSelect
                    value={item.drinkId ?? ""}
                    onChange={(val) =>
                      updateOtherFeeItem(regId, item.id, "drinkId", val)
                    }
                    options={drinkSelectOptions}
                    placeholder="✏️ Khoản khác (nhập tay)"
                    triggerClassName="input-field w-full flex items-center justify-between text-left text-xs text-gray-500"
                  />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberInput(item.amount)}
                  onChange={(e) =>
                    updateOtherFeeItem(
                      regId,
                      item.id,
                      "amount",
                      parseNumberInput(e.target.value),
                    )
                  }
                  className="input-field w-20 text-right text-xs text-gray-500 flex-shrink-0"
                  placeholder="0"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOtherFeeItem(regId, item.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Xóa dòng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedDrink ? (
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-[11px] text-gray-400">SL</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.quantityInput ?? String(item.quantity ?? "")}
                    onChange={(e) =>
                      updateOtherFeeItem(
                        regId,
                        item.id,
                        "quantity",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    onBlur={() => handleQuantityBlur(regId, item.id)}
                    className="input-field w-14 text-right text-xs text-gray-500"
                  />
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    × {fmt(selectedDrink.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateOtherFeeItem(
                        regId,
                        item.id,
                        "deductStock",
                        !item.deductStock,
                      )
                    }
                    className={`ml-auto flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border-2 transition-all ${item.deductStock
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-500"
                      }`}
                    title={
                      item.deductStock
                        ? "Sẽ trừ tồn kho khi gửi hóa đơn"
                        : "Không trừ tồn kho"
                    }
                  >
                    {item.deductStock ? "Trừ kho" : "Không trừ kho"}
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) =>
                    updateOtherFeeItem(regId, item.id, "note", e.target.value)
                  }
                  className="input-field w-full text-xs text-gray-500"
                  placeholder={placeholder}
                />
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => addOtherFeeItem(regId)}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm khoản khác
        </button>
      </div>
    );
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
          onClick={() => {
            startNavLoading();
            router.push(`/admin/sessions/${id}`);
          }}
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
        <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Số tiền từng người phải trả
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={toggleMailAll}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${mailAll
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
            >
              <Mail className="w-4 h-4" /> {mailAll ? "Mail all: Bật" : "Mail all"}
            </button>
            <button
              onClick={handleSplitEqually}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold whitespace-nowrap transition-colors"
            >
              <Divide className="w-4 h-4" /> Chia đều
            </button>
          </div>
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
                className={`rounded-2xl border-2 p-3 space-y-3 transition-colors duration-300 ${isWalletDeduct
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {name}
                          {h.is_guest && (
                            <span className="text-xs text-gray-400 ml-1">(khách)</span>
                          )}
                        </p>
                        {isWalletDeduct && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                            <Wallet className="w-2.5 h-2.5" /> Ví BNB
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                        {h.is_guest && (
                          <button
                            type="button"
                            onClick={() => toggleEmailFor(h.id)}
                            title={emailIds.has(h.id) ? "Sẽ gửi mail" : "Không gửi mail"}
                            className={`flex-shrink-0 h-10 w-12 sm:h-8 sm:w-auto sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 transition-all ${emailIds.has(h.id)
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-400"
                              }`}
                          >
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">Mail</span>
                          </button>
                        )}
                        {isRealUser && (
                          <button
                            type="button"
                            onClick={() => toggleWalletDeduct(h.id)}
                            title={isWalletDeduct ? "Bỏ trừ ví" : "Trừ thẳng ví BNB"}
                            className={`flex-shrink-0 h-10 w-12 sm:h-8 sm:w-auto sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 transition-all ${isWalletDeduct
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
                            onClick={() => setPenaltyTarget({ id: h.user_id, name })}
                            title="Phạt thành viên này"
                            className="flex-shrink-0 h-10 w-12 sm:h-8 sm:w-auto sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 bg-red-500 border-red-500 text-white sm:bg-transparent sm:border-gray-200 sm:text-gray-300 sm:hover:border-red-300 sm:hover:text-red-500 transition-all"
                          >
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
                              Phạt
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberInput(amounts[h.id] ?? 0)}
                      onChange={(e) =>
                        handleAmountChange(h.id, parseNumberInput(e.target.value))
                      }
                      className="input-field w-full text-right text-sm"
                      placeholder="0"
                    />
                  </div>

                  {renderOtherFeeEditor(
                    h.id,
                    "💰 Khoản khác của host...",
                    "space-y-1.5 pl-2",
                  )}

                  <div className="flex justify-end">
                    <div className="w-fit text-right text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg flex items-center gap-1.5 px-2.5 py-1.5">
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                        Tổng thu
                      </span>
                      <span className="whitespace-nowrap">
                        {fmt(
                          (Number(amounts[h.id]) || 0) + otherFeeSum(h.id),
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {guests.length > 0 && (
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isWalletDeduct
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pt-1 pb-1">
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
                                className={`px-2 py-3 min-h-[38px] rounded-lg text-[11px] sm:text-xs font-medium text-center leading-tight transition-all ${active
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
                    </div>
                  </div>
                )}

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
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
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

                                {!h.is_guest &&
                                  isWalletDeduct &&
                                  (walletModes[h.id] ?? "grouped") === "separate" && (
                                    <button
                                      type="button"
                                      onClick={() => toggleEmailFor(g.id)}
                                      title={emailIds.has(g.id) ? "Sẽ gửi mail" : "Không gửi mail"}
                                      className={`flex-shrink-0 h-7 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 border-2 transition-all ${emailIds.has(g.id)
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-400"
                                        }`}
                                    >
                                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">Mail</span>
                                    </button>
                                  )}

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
                              </div>

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
                                className="input-field w-full text-right text-sm"
                                placeholder="0"
                              />
                            </div>

                            {renderOtherFeeEditor(
                              g.id,
                              "💰 Khoản khác của khách...",
                              "space-y-1.5",
                            )}

                            <div className="flex justify-end">
                              <div className="w-fit text-right text-xs font-bold text-gray-800 bg-white border border-purple-200 rounded-lg flex items-center gap-1.5 px-2.5 py-1.5">
                                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                                  Tổng thu
                                </span>
                                <span className="whitespace-nowrap">
                                  {fmt(
                                    (Number(guestAmounts[g.id]) || 0) + otherFeeSum(g.id),
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
                    sum + (Number(amounts[regId]) || 0) + otherFeeSum(regId)
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
          onClick={() => {
            startNavLoading();
            router.push(`/admin/sessions/${id}`);
          }}
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