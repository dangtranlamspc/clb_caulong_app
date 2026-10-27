"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UtensilsCrossed, CalendarDays, MapPin, Users, Loader2, Trash2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { diningAdminApi } from "@/lib/api";
import { DINING_STATUS } from "@/lib/dining";
import {
    CARD, Chip, ModalShell, ModalHeader, ModalBody, ModalFooter, formatVnd,
} from "@/components/admin/sessions/session-ui";
import { DateTimeField } from "@/components/admin/dining/fields";

export default function AdminDiningPage() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: "",
        event_date: `${new Date().toISOString().slice(0, 10)}T19:00`,
        location: "",
        note: "",
    });
    const [toDelete, setToDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await diningAdminApi.delete(toDelete.id);
            toast.success("Đã xóa buổi ăn uống");
            setToDelete(null);
            await load();
        } catch { } finally {
            setDeleting(false);
        }
    };

    const load = async () => {
        try {
            const { data } = await diningAdminApi.list();
            setEvents(data ?? []);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!form.title.trim() || !form.event_date) {
            toast.error("Nhập tên buổi và thời gian");
            return;
        }
        setSaving(true);
        try {
            const { data } = await diningAdminApi.create({
                title: form.title.trim(),
                event_date: new Date(form.event_date).toISOString(),
                location: form.location.trim() || undefined,
                note: form.note.trim() || undefined,
            });
            toast.success("Đã tạo buổi ăn uống");
            router.push(`/admin/dining/${data.id}`);
        } catch { } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-4 pb-24">
            <div className="flex items-center justify-between gap-3">
                <h1 className="flex min-w-0 items-center gap-2 truncate text-xl font-bold text-[var(--text)]">
                    <UtensilsCrossed className="h-5 w-5 shrink-0 text-pink-500" /> Ăn uống
                </h1>

                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" /> Tạo buổi
                </button>
            </div>

            {loading ? (
                <div className={`${CARD} h-28 animate-pulse bg-[var(--surface-muted)]`} />
            ) : events.length === 0 ? (
                <div className={`${CARD} px-6 py-12 text-center text-sm text-[var(--text-faint)]`}>
                    Chưa có buổi ăn uống nào
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((e) => {
                        const st = DINING_STATUS[e.status] ?? DINING_STATUS.open;
                        return (
                            <div key={e.id} className="relative">
                                <button
                                    onClick={() => router.push(`/admin/dining/${e.id}`)}
                                    className={`${CARD} block w-full p-4 text-left transition-colors hover:bg-[var(--surface-hover)]`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="min-w-0 truncate text-[15px] font-semibold text-[var(--text)]">{e.title}</p>
                                        <Chip tone={st.tone}>{st.label}</Chip>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {format(new Date(e.event_date), "EEE dd/MM HH:mm", { locale: vi })}
                                        </span>
                                        {e.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" /> {e.location}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" /> {e.paid_count}/{e.participant_count} đã trả
                                        </span>
                                    </div>
                                    <p className="mt-2 pr-10 text-sm font-bold text-[var(--text)]">
                                        {Number(e.total_bill) > 0 ? formatVnd(Number(e.total_bill)) : "Chưa nhập bill"}
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    aria-label="Xóa buổi"
                                    onClick={() => setToDelete(e)}
                                    className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)] active:scale-95"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {showCreate && (
                <ModalShell onClose={() => setShowCreate(false)} dismissible={false}>
                    {(close) => (
                        <>
                            <ModalHeader
                                icon={<UtensilsCrossed className="h-4 w-4" />}
                                tone="primary"
                                title="Tạo buổi ăn uống"
                                onClose={close}
                            />
                            <ModalBody className="space-y-3">
                                <input
                                    className="input-field" placeholder="Tên buổi (vd: Nhậu sau buổi đánh)"
                                    value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                />
                                <DateTimeField
                                    value={form.event_date}
                                    onChange={(v) => setForm((f) => ({ ...f, event_date: v }))}
                                />
                                <input
                                    className="input-field" placeholder="Địa điểm (tuỳ chọn)"
                                    value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                                />
                                <input
                                    className="input-field" placeholder="Ghi chú (tuỳ chọn)"
                                    value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <button onClick={close} className="btn-secondary text-sm">Hủy</button>
                                <button
                                    onClick={handleCreate} disabled={saving}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Tạo
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalShell>
            )}


            {toDelete && (
                <ModalShell size="sm" onClose={() => setToDelete(null)}>
                    {(close) => (
                        <>
                            <ModalHeader
                                icon={<Trash2 className="h-4 w-4" />}
                                tone="danger"
                                title="Xóa buổi ăn uống?"
                                onClose={close}
                            />
                            <ModalBody>
                                <p className="text-sm text-[var(--text-muted)]">
                                    Xóa buổi <strong className="text-[var(--text)]">"{toDelete.title}"</strong> cùng danh sách
                                    người tham gia? Hành động này không thể hoàn tác.
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <button onClick={close} className="btn-secondary text-sm">Hủy</button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                    {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận xóa
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalShell>
            )}
        </div>
    );
}