'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, AlertTriangle, ChevronDown } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { membersAdminApi } from '@/lib/api';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN') + 'đ';

export default function DeleteMemberModal({
    target, onClose, onDeleted,
}: {
    target: { id: string; name: string } | null;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showWallet, setShowWallet] = useState(false);
    const [action, setAction] = useState('');
    const [note, setNote] = useState('');
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [receiver, setReceiver] = useState<any>(null);

    useEffect(() => {
        if (!target) return;
        setPreview(null); setAction(''); setNote(''); setReceiver(null);
        setSearch(''); setResults([]); setShowWallet(false);
        setLoading(true);
        membersAdminApi.deletePreview(target.id)
            .then(({ data }) => setPreview(data))
            .catch((e) => { toast.error(e?.response?.data?.message ?? 'Không tải được thông tin'); onClose(); })
            .finally(() => setLoading(false));
    }, [target?.id]);

    useEffect(() => {
        if (action !== 'transfer_to_member' || search.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            const { data } = await membersAdminApi.list({ search, limit: 5, is_active: 'true' });
            setResults((data.data ?? []).filter((u: any) => u.id !== target?.id));
        }, 300);
        return () => clearTimeout(t);
    }, [search, action]);

    if (!target) return null;

    const balance = preview?.wallet?.balance ?? 0;
    const needAction = preview?.requires_wallet_action;
    const canSubmit =
        !submitting && !!preview &&
        (!needAction || (action && (action !== 'transfer_to_member' || receiver)));

    const submit = async () => {
        setSubmitting(true);
        try {
            await membersAdminApi.delete(target.id, {
                wallet_action: needAction ? action : undefined,
                transfer_to_user_id: action === 'transfer_to_member' ? receiver?.id : undefined,
                note: note.trim() || undefined,
            });
            toast.success('Đã xóa thành viên');
            onDeleted();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? 'Xóa thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Xóa thành viên">
            {loading || !preview ? (
                <div className="h-24 animate-pulse bg-[var(--surface-muted)] rounded-xl" />
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-muted)]">
                        Xóa <span className="font-semibold text-[var(--text)]">{target.name}</span>? Hành động này{' '}
                        <span className="font-medium text-[var(--danger)]">không thể hoàn tác</span>. Lịch sử ví sẽ bị xóa;
                        trong các buổi đánh, trận đấu... tên sẽ hiển thị là{' '}
                        <span className="font-medium">“Tài khoản đã bị xoá ({target.name})”</span>.
                    </p>

                    {/* Nút tình trạng ví */}
                    <button
                        type="button"
                        onClick={() => setShowWallet((v) => !v)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${balance < 0 ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]'
                                : balance > 0 ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                                    : 'border-[var(--border)] text-[var(--text-muted)]'}`}
                    >
                        <span className="flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            {balance < 0 ? `Ví đang nợ ${fmt(-balance)}`
                                : balance > 0 ? `Ví còn ${fmt(balance)}` : 'Ví đang 0đ'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showWallet ? 'rotate-180' : ''}`} />
                    </button>

                    {showWallet && (
                        <div className="rounded-xl border border-[var(--border)] p-3 text-xs space-y-2">
                            <div className="flex justify-between"><span>Tổng đã nạp</span><b>{fmt(preview.wallet.total_topup)}</b></div>
                            <div className="flex justify-between"><span>Tổng đã chi</span><b>{fmt(preview.wallet.total_spent)}</b></div>
                            <div className="pt-2 border-t border-[var(--border)] space-y-1">
                                <p className="text-[var(--text-muted)]">5 giao dịch gần nhất</p>
                                {preview.recent_transactions.length === 0 && <p className="text-[var(--text-faint)]">Chưa có giao dịch</p>}
                                {preview.recent_transactions.map((t: any, i: number) => (
                                    <div key={i} className="flex justify-between gap-2">
                                        <span className="truncate">{t.title}</span>
                                        <span className={Number(t.amount) < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
                                            {Number(t.amount) > 0 ? '+' : ''}{fmt(Number(t.amount))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cảnh báo dữ liệu treo */}
                    {(preview.impact.unpaid_bills > 0 || preview.impact.pending_fund_items > 0) && (
                        <div className="flex gap-2 p-3 rounded-xl bg-[var(--warning-soft)] text-[var(--warning)] text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                                {preview.impact.unpaid_bills > 0 && <p>Còn {preview.impact.unpaid_bills} hóa đơn buổi đánh chưa thanh toán (sẽ giữ nguyên, không thu được nữa).</p>}
                                {preview.impact.pending_fund_items > 0 && <p>Còn {preview.impact.pending_fund_items} khoản phạt/đóng góp quỹ đang chờ — sẽ bị hủy.</p>}
                            </div>
                        </div>
                    )}

                    {/* Chọn cách xử lý ví */}
                    {needAction && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-[var(--text)]">
                                {balance > 0 ? 'Chọn cách xử lý số dư ví' : 'Chọn cách xử lý công nợ'}
                            </p>
                            {preview.options.map((o: any) => (
                                <label key={o.value}
                                    className={`flex gap-2 p-3 rounded-xl border cursor-pointer text-sm ${action === o.value ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)]'}`}>
                                    <input type="radio" className="mt-1" checked={action === o.value}
                                        onChange={() => setAction(o.value)} />
                                    <span>
                                        <span className="font-medium text-[var(--text)]">{o.label}</span>
                                        <span className="block text-xs text-[var(--text-muted)]">{o.description}</span>
                                    </span>
                                </label>
                            ))}

                            {action === 'transfer_to_member' && (
                                <div className="space-y-2">
                                    {receiver ? (
                                        <div className="flex justify-between items-center px-3 py-2 rounded-xl border border-[var(--border)] text-sm">
                                            <span>Nhận: <b>{receiver.full_name}</b></span>
                                            <button className="text-xs text-[var(--primary)]" onClick={() => setReceiver(null)}>Đổi</button>
                                        </div>
                                    ) : (
                                        <>
                                            <input value={search} onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Tìm tên / SĐT người nhận..."
                                                className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2" />
                                            {results.map((u) => (
                                                <button key={u.id} onClick={() => setReceiver(u)}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] text-sm">
                                                    {u.full_name} <span className="text-xs text-[var(--text-faint)]">{u.phone}</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}

                            {balance < 0 && (
                                <p className="text-xs text-[var(--text-muted)]">
                                    Chưa muốn mất dấu khoản nợ? Hãy hủy và dùng <b>“Tạm ẩn”</b> thay vì xóa.
                                </p>
                            )}
                            <input value={note} onChange={(e) => setNote(e.target.value)}
                                placeholder="Ghi chú (tuỳ chọn)"
                                className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2" />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">
                            Hủy
                        </button>
                        <button onClick={submit} disabled={!canSubmit}
                            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
                            {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                            Xác nhận xóa
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}