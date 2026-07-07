import {
    Wallet, ArrowDownToLine, CalendarDays, ShoppingCart,
    PlusCircle, RotateCcw,
} from 'lucide-react';

export function smt(n: number) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
}

export function txIcon(tx: any) {
    switch (tx.type) {
        case 'topup': return { Icon: ArrowDownToLine, cls: 'bg-emerald-50 text-emerald-600' };
        case 'session_payment': return { Icon: CalendarDays, cls: 'bg-red-50 text-red-500' };
        case 'manual_expense': return { Icon: ShoppingCart, cls: 'bg-amber-50 text-amber-600' };
        case 'manual_credit': return { Icon: PlusCircle, cls: 'bg-emerald-50 text-emerald-600' };
        case 'refund': return { Icon: RotateCcw, cls: 'bg-blue-50 text-blue-600' };
        default: return { Icon: Wallet, cls: 'bg-gray-50 text-gray-500' };
    }
}