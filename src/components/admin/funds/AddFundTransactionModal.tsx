"use client";
import { useEffect, useState, useRef } from "react";
import {
    X, Loader2, ArrowUpCircle, ArrowDownCircle,
    AlertTriangle, Users, Gift, ShoppingCart, PartyPopper, MoreHorizontal,
    UserCircle2, Search, XCircle, Wallet, ListChecks, CalendarClock, Clock3, Siren, HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { fundApi, penaltiesApi, registrationsAdminApi, sessionsAdminApi } from "@/lib/api";
import { membersAdminApi } from "@/lib/api";

const CATEGORY_OPTIONS: { value: string; label: string; icon: any; types: ("thu" | "chi")[] }[] = [
    { value: "phat", label: "Phạt", icon: AlertTriangle, types: ["thu"] },
    { value: "dong_gop", label: "Đóng góp", icon: Users, types: ["thu"] },
    { value: "tai_tro", label: "Tài trợ", icon: Gift, types: ["thu"] },
    { value: "mua_sam", label: "Mua sắm", icon: ShoppingCart, types: ["chi"] },
    { value: "tiec_team", label: "Tiệc / Team", icon: PartyPopper, types: ["chi"] },
    { value: "chi_khac", label: "Chi phí khác", icon: MoreHorizontal, types: ["chi"] },
];

const THU_ONLY_CATEGORIES = ["phat", "dong_gop", "tai_tro"];

const PENALTY_TYPE_OPTIONS: { value: "late_early" | "special" | "other"; label: string; icon: any }[] = [
    { value: "late_early", label: "Đi trễ / về sớm", icon: Clock3 },
    { value: "special", label: "Trường hợp đặc biệt", icon: Siren },
    { value: "other", label: "Khác", icon: HelpCircle },
];

type ContributionMethod = "wallet" | "member_choice";
type PenaltyType = "late_early" | "special" | "other";

function parseAmountInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    return digits ? Number(digits) : 0;
}
function formatAmountInput(n: number) {
    return n ? n.toLocaleString("vi-VN") : "";
}
function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
}

interface AddFundTransactionModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function AddFundTransactionModal({
    open,
    onClose,
    onSuccess,
}: AddFundTransactionModalProps) {
    const [visible, setVisible] = useState(false);
    const [type, setType] = useState<"thu" | "chi">("thu");
    const [category, setCategory] = useState("dong_gop");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const [memberQuery, setMemberQuery] = useState("");
    const [memberResults, setMemberResults] = useState<any[]>([]);
    const [searchingMembers, setSearchingMembers] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);
    const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
    const [contributionMethod, setContributionMethod] = useState<ContributionMethod>("wallet");
    const memberSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isPenaltyFlow = type === "thu" && category === "phat" && !!selectedMember;

    const [penaltySessions, setPenaltySessions] = useState<any[]>([]);
    const [penaltySessionsLoading, setPenaltySessionsLoading] = useState(false);
    const [penaltySessionQuery, setPenaltySessionQuery] = useState("");
    const [selectedPenaltySession, setSelectedPenaltySession] = useState<any | null>(null);
    const [penaltySessionDropdownOpen, setPenaltySessionDropdownOpen] = useState(false);
    const [penaltyType, setPenaltyType] = useState<PenaltyType | null>(null);
    const [penaltyOtherReason, setPenaltyOtherReason] = useState("");

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            setVisible(false);
        }
    }, [open]);

    useEffect(() => {
        if (type === "chi") {
            setSelectedMember(null);
            setMemberQuery("");
            setMemberResults([]);
            setMemberDropdownOpen(false);
            setContributionMethod("wallet");
        }
    }, [type]);

    useEffect(() => {
        const valid = CATEGORY_OPTIONS.find((c) => c.types.includes(type));
        if (valid && !CATEGORY_OPTIONS.find((c) => c.value === category)?.types.includes(type)) {
            setCategory(valid.value);
        }
    }, [type]);

    useEffect(() => {
        if (!isPenaltyFlow) {
            setSelectedPenaltySession(null);
            setPenaltySessionQuery("");
            setPenaltySessionDropdownOpen(false);
            setPenaltyType(null);
            setPenaltyOtherReason("");
        }
    }, [isPenaltyFlow]);

    useEffect(() => {
        if (!isPenaltyFlow || !selectedMember) {
            setPenaltySessions([]);
            setSelectedPenaltySession(null);
            return;
        }

        setSelectedPenaltySession(null);
        setPenaltySessionsLoading(true);
        registrationsAdminApi
            .getCheckedInSessions(selectedMember.id)
            .then(({ data }) => setPenaltySessions(data?.data ?? data ?? []))
            .catch(() => setPenaltySessions([]))
            .finally(() => setPenaltySessionsLoading(false));
    }, [isPenaltyFlow, selectedMember?.id]);

    useEffect(() => {
        if (memberSearchDebounceRef.current) clearTimeout(memberSearchDebounceRef.current);

        const q = memberQuery.trim();
        if (q.length < 2) {
            setMemberResults([]);
            setSearchingMembers(false);
            return;
        }

        setSearchingMembers(true);
        memberSearchDebounceRef.current = setTimeout(async () => {
            try {
                const { data } = await membersAdminApi.searchMembers(q);
                setMemberResults(data?.data ?? data ?? []);
            } catch {
                setMemberResults([]);
            } finally {
                setSearchingMembers(false);
            }
        }, 350);

        return () => {
            if (memberSearchDebounceRef.current) clearTimeout(memberSearchDebounceRef.current);
        };
    }, [memberQuery]);


    useEffect(() => {
        if (!isPenaltyFlow || !selectedMember) {
            setPenaltySessions([]);
            return;
        }

        setPenaltySessionsLoading(true);
        registrationsAdminApi
            .getCheckedInSessions(selectedMember.id)
            .then(({ data }) => setPenaltySessions(data?.data ?? data ?? []))
            .catch(() => setPenaltySessions([]))
            .finally(() => setPenaltySessionsLoading(false));
    }, [isPenaltyFlow, selectedMember?.id]);

    const resetForm = () => {
        setType("thu");
        setCategory("dong_gop");
        setTitle("");
        setDescription("");
        setAmount(0);
        setSelectedMember(null);
        setMemberQuery("");
        setMemberResults([]);
        setMemberDropdownOpen(false);
        setContributionMethod("wallet");
        setPenaltySessions([]);
        setPenaltySessionQuery("");
        setSelectedPenaltySession(null);
        setPenaltySessionDropdownOpen(false);
        setPenaltyType(null);
        setPenaltyOtherReason("");
    };

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => {
            onClose();
            resetForm();
        }, 250);
    };

    const handleSelectMember = (m: any) => {
        setSelectedMember(m);
        setMemberQuery("");
        setMemberResults([]);
        setMemberDropdownOpen(false);
        setContributionMethod("wallet");
    };

    const handleRemoveMember = () => {
        setSelectedMember(null);
        setContributionMethod("wallet");
    };

    const filteredPenaltySessions = penaltySessionQuery.trim()
        ? penaltySessions.filter((s) =>
            (s.title ?? "").toLowerCase().includes(penaltySessionQuery.trim().toLowerCase()),
        )
        : penaltySessions;

    const handleSelectPenaltySession = (s: any) => {
        setSelectedPenaltySession(s);
        setPenaltySessionQuery("");
        setPenaltySessionDropdownOpen(false);
    };

    const penaltyReasonPreview = (() => {
        if (penaltyType === "late_early") return "Đi trễ / về sớm";
        if (penaltyType === "special") return "Trường hợp đặc biệt";
        if (penaltyType === "other") return penaltyOtherReason.trim();
        return "";
    })();

    const handleSubmit = async () => {
        if (!amount || amount <= 0) {
            toast.error("Số tiền phải lớn hơn 0");
            return;
        }

        if (isPenaltyFlow) {
            if (!penaltyType) {
                toast.error("Vui lòng chọn loại phạt");
                return;
            }
            if (penaltyType === "other" && !penaltyOtherReason.trim()) {
                toast.error("Vui lòng nhập lý do phạt");
                return;
            }

            setSubmitting(true);
            try {
                await penaltiesApi.create({
                    session_id: selectedPenaltySession?.id,
                    user_id: selectedMember.id,
                    type: penaltyType,
                    amount,
                    reason: penaltyReasonPreview,
                    payment_method: contributionMethod,
                });
                toast.success(
                    contributionMethod === "member_choice"
                        ? `Đã tạo khoản phạt, chờ ${selectedMember.full_name} chọn cách thanh toán`
                        : `Đã phạt và trừ ví ${selectedMember.full_name}`,
                );
                onSuccess?.();
                handleClose();
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? "Tạo khoản phạt thất bại");
            } finally {
                setSubmitting(false);
            }
            return;
        }

        if (!title.trim()) {
            toast.error("Vui lòng nhập nội dung giao dịch");
            return;
        }

        setSubmitting(true);
        try {
            await fundApi.createTransaction({
                type,
                category,
                title: title.trim(),
                description: description.trim() || undefined,
                amount,
                ...(type === "thu" && selectedMember
                    ? {
                        deduct_from_member_id: selectedMember.id,
                        ...(contributionMethod === "member_choice"
                            ? { payment_method: "member_choice" }
                            : {}),
                    }
                    : {}),
            });
            toast.success(
                type === "thu" && selectedMember
                    ? contributionMethod === "member_choice"
                        ? `Đã tạo yêu cầu đóng góp, chờ ${selectedMember.full_name} thanh toán`
                        : `Đã thu quỹ và trừ ví ${selectedMember.full_name}`
                    : "Đã thêm giao dịch vào quỹ",
            );
            onSuccess?.();
            handleClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Thêm giao dịch thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    const insufficientBalance =
        selectedMember &&
        contributionMethod === "wallet" &&
        amount > (selectedMember.wallet_balance ?? 0);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{
                background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
                transition: "background .3s",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                    paddingBottom: "env(safe-area-inset-bottom)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                        {isPenaltyFlow ? "Tạo khoản phạt" : "Thêm giao dịch quỹ"}
                    </span>
                    <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Loại giao dịch</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType("thu")}
                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${type === "thu"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                                    : "bg-white border-gray-200 text-gray-500"
                                    }`}
                            >
                                <ArrowUpCircle className="w-4 h-4" /> Thu
                            </button>
                            <button
                                type="button"
                                onClick={() => setType("chi")}
                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${type === "chi"
                                    ? "bg-red-50 border-red-300 text-red-500"
                                    : "bg-white border-gray-200 text-gray-500"
                                    }`}
                            >
                                <ArrowDownCircle className="w-4 h-4" /> Chi
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Danh mục</p>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORY_OPTIONS.filter((c) => c.types.includes(type)).map((c) => {
                                const Icon = c.icon;
                                const active = category === c.value;
                                return (
                                    <button
                                        type="button"
                                        key={c.value}
                                        onClick={() => setCategory(c.value)}
                                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium border transition-colors ${active
                                            ? "bg-blue-50 border-blue-300 text-blue-600"
                                            : "bg-white border-gray-200 text-gray-500"
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {type === "thu" && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">
                                {category === "phat" ? "Thành viên bị phạt" : "Thành viên đóng góp"}{" "}
                                <span className="font-normal text-gray-400">
                                    {category === "phat" ? "(bắt buộc)" : "(tuỳ chọn)"}
                                </span>
                            </p>

                            {selectedMember ? (
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50/60">
                                        {selectedMember.avatar_url ? (
                                            <img
                                                src={selectedMember.avatar_url}
                                                alt=""
                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                                                <UserCircle2 className="w-4.5 h-4.5 text-blue-500" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {selectedMember.full_name}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                Số dư ví: {fmt(selectedMember.wallet_balance ?? 0)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveMember}
                                            className="p-1 rounded-full text-gray-300 hover:text-gray-500 hover:bg-white flex-shrink-0"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Cách xử lý đóng góp / phạt */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setContributionMethod("wallet")}
                                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border transition-colors ${contributionMethod === "wallet"
                                                ? "bg-blue-50 border-blue-300 text-blue-600"
                                                : "bg-white border-gray-200 text-gray-500"
                                                }`}
                                        >
                                            <Wallet className="w-4 h-4" />
                                            Trừ thẳng vào ví
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setContributionMethod("member_choice")}
                                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border transition-colors ${contributionMethod === "member_choice"
                                                ? "bg-blue-50 border-blue-300 text-blue-600"
                                                : "bg-white border-gray-200 text-gray-500"
                                                }`}
                                        >
                                            <ListChecks className="w-4 h-4" />
                                            Member tự chọn
                                        </button>
                                    </div>

                                    {contributionMethod === "wallet" ? (
                                        insufficientBalance && (
                                            <p className="text-[11px] text-red-500">
                                                Số dư ví không đủ (hiện có {fmt(selectedMember.wallet_balance ?? 0)})
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-[11px] text-gray-400">
                                            {category === "phat" ? "Thành viên" : "Quỹ sẽ chưa cộng tiền ngay. " + selectedMember.full_name}{" "}
                                            có 24h để tự chọn Ví / Chuyển khoản / Tiền mặt, hết hạn sẽ tự động trừ ví.
                                        </p>
                                    )}

                                    {category === "phat" && (
                                        <div className="space-y-2.5 pt-1 border-t border-gray-100">
                                            <div className="pt-2.5">
                                                <p className="text-xs font-semibold text-gray-500 mb-2">
                                                    Buổi đánh liên quan <span className="font-normal text-gray-400">(tuỳ chọn)</span>
                                                </p>
                                                {selectedPenaltySession ? (
                                                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50">
                                                        <CalendarClock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-gray-800 truncate">
                                                                {selectedPenaltySession.title}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400">
                                                                {new Date(selectedPenaltySession.scheduled_at).toLocaleString("vi-VN")}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPenaltySession(null)}
                                                            className="p-1 rounded-full text-gray-300 hover:text-gray-500 hover:bg-white flex-shrink-0"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                                        <input
                                                            value={penaltySessionQuery}
                                                            onChange={(e) => {
                                                                setPenaltySessionQuery(e.target.value);
                                                                setPenaltySessionDropdownOpen(true);
                                                            }}
                                                            onFocus={() => setPenaltySessionDropdownOpen(true)}
                                                            placeholder="Tìm trong các buổi member đã điểm danh có mặt..."
                                                            className="w-full pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400"
                                                        />
                                                        {penaltySessionsLoading && (
                                                            <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                                                        )}

                                                        {penaltySessionDropdownOpen && (
                                                            <>
                                                                <div
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={() => setPenaltySessionDropdownOpen(false)}
                                                                />
                                                                <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg py-1">
                                                                    {penaltySessionsLoading ? (
                                                                        <p className="px-3 py-3 text-xs text-gray-400 text-center">
                                                                            Đang tải...
                                                                        </p>
                                                                    ) : filteredPenaltySessions.length === 0 ? (
                                                                        <p className="px-3 py-3 text-xs text-gray-400 text-center">
                                                                            {selectedMember?.full_name} chưa có buổi nào đã điểm danh có mặt
                                                                        </p>
                                                                    ) : (
                                                                        filteredPenaltySessions.map((s) => (
                                                                            <button
                                                                                type="button"
                                                                                key={s.id}
                                                                                onClick={() => handleSelectPenaltySession(s)}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
                                                                            >
                                                                                <CalendarClock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-xs font-semibold text-gray-800 truncate">
                                                                                        {s.title}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-gray-400">
                                                                                        {new Date(s.scheduled_at).toLocaleString("vi-VN")}
                                                                                    </p>
                                                                                </div>
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-2">Loại phạt</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {PENALTY_TYPE_OPTIONS.map((p) => {
                                                        const Icon = p.icon;
                                                        const active = penaltyType === p.value;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={p.value}
                                                                onClick={() => setPenaltyType(p.value)}
                                                                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium border transition-colors ${active
                                                                    ? "bg-red-50 border-red-300 text-red-500"
                                                                    : "bg-white border-gray-200 text-gray-500"
                                                                    }`}
                                                            >
                                                                <Icon className="w-4 h-4" />
                                                                {p.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {penaltyType === "other" && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 mb-2">Lý do phạt</p>
                                                    <input
                                                        value={penaltyOtherReason}
                                                        onChange={(e) => setPenaltyOtherReason(e.target.value)}
                                                        placeholder="VD: Không mang giày đúng quy định"
                                                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : category === "phat" ? (
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        value={memberQuery}
                                        onChange={(e) => {
                                            setMemberQuery(e.target.value);
                                            setMemberDropdownOpen(true);
                                        }}
                                        onFocus={() => setMemberDropdownOpen(true)}
                                        placeholder="Tìm thành viên bị phạt..."
                                        className="w-full pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400"
                                    />
                                    {searchingMembers && (
                                        <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                                    )}

                                    {memberDropdownOpen && memberQuery.trim().length >= 2 && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setMemberDropdownOpen(false)} />
                                            <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg py-1">
                                                {searchingMembers ? (
                                                    <p className="px-3 py-3 text-xs text-gray-400 text-center">Đang tìm...</p>
                                                ) : memberResults.length === 0 ? (
                                                    <p className="px-3 py-3 text-xs text-gray-400 text-center">
                                                        Không tìm thấy thành viên
                                                    </p>
                                                ) : (
                                                    memberResults.map((m) => (
                                                        <button
                                                            type="button"
                                                            key={m.id}
                                                            onClick={() => handleSelectMember(m)}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
                                                        >
                                                            {m.avatar_url ? (
                                                                <img
                                                                    src={m.avatar_url}
                                                                    alt=""
                                                                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                                    <UserCircle2 className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-semibold text-gray-800 truncate">
                                                                    {m.full_name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    Ví: {fmt(m.wallet_balance ?? 0)}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        value={memberQuery}
                                        onChange={(e) => {
                                            setMemberQuery(e.target.value);
                                            setMemberDropdownOpen(true);
                                        }}
                                        onFocus={() => setMemberDropdownOpen(true)}
                                        placeholder="Tìm theo tên thành viên (bỏ trống nếu thu quỹ chung)..."
                                        className="w-full pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400"
                                    />
                                    {searchingMembers && (
                                        <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                                    )}

                                    {memberDropdownOpen && memberQuery.trim().length >= 2 && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setMemberDropdownOpen(false)} />
                                            <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg py-1">
                                                {searchingMembers ? (
                                                    <p className="px-3 py-3 text-xs text-gray-400 text-center">Đang tìm...</p>
                                                ) : memberResults.length === 0 ? (
                                                    <p className="px-3 py-3 text-xs text-gray-400 text-center">
                                                        Không tìm thấy thành viên
                                                    </p>
                                                ) : (
                                                    memberResults.map((m) => (
                                                        <button
                                                            type="button"
                                                            key={m.id}
                                                            onClick={() => handleSelectMember(m)}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
                                                        >
                                                            {m.avatar_url ? (
                                                                <img
                                                                    src={m.avatar_url}
                                                                    alt=""
                                                                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                                    <UserCircle2 className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-semibold text-gray-800 truncate">
                                                                    {m.full_name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    Ví: {fmt(m.wallet_balance ?? 0)}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {!isPenaltyFlow && (
                        <>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">Nội dung giao dịch</p>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="VD: Đóng góp quỹ tháng 7"
                                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Số tiền</p>
                        <div className="relative">
                            <input
                                inputMode="numeric"
                                value={formatAmountInput(amount)}
                                onChange={(e) => setAmount(parseAmountInput(e.target.value))}
                                placeholder="0"
                                className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 text-right font-semibold text-gray-900"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                        </div>
                    </div>

                    {!isPenaltyFlow && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Mô tả (tuỳ chọn)</p>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Ghi chú thêm..."
                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 resize-none"
                            />
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4 pt-1 flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (category === "phat" && type === "thu" && !selectedMember)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isPenaltyFlow ? "Tạo khoản phạt" : "Thêm giao dịch"}
                    </button>
                </div>
            </div>
        </div>
    );
}