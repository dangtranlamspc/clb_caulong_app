'use client';
import { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { membersAdminApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-400';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5';

type ChangePasswordModalProps = {
    isOpen: boolean;
    onClose: () => void;
    memberId: string | null;
};

export default function ChangePasswordModal({ isOpen, onClose, memberId }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleClose = () => {
        setNewPassword('');
        setError('');
        onClose();
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!memberId) return;
        if (!newPassword || newPassword.length < 8) {
            setError('Tối thiểu 8 ký tự');
            return;
        }
        setError('');
        setSaving(true);
        try {
            await membersAdminApi.updatePassword(memberId, { new_password: newPassword });
            toast.success('Đã đổi mật khẩu!');
            handleClose();
        } catch {
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Đổi mật khẩu">
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className={labelCls}>Mật khẩu mới</label>
                    <input
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                        type="password"
                        autoFocus
                        className={inputCls}
                        placeholder="Tối thiểu 8 ký tự"
                    />
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100">
                        Quay lại
                    </button>
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 flex items-center gap-2 disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Cập nhật mật khẩu
                    </button>
                </div>
            </form>
        </Modal>
    );
}