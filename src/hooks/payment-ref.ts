import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function buildTransferNote(
    fullName: string,
    sessionTitle: string,
    scheduledAt: string | Date,
    maxLength: number = 50,
): string {
    const timeStr = format(new Date(scheduledAt), 'dd/MM HH:mm', { locale: vi });
    const prefix = `${fullName} thanh toán cho buổi đánh `;
    const suffix = ` ${timeStr}`;

    const budgetForTitle = maxLength - prefix.length - suffix.length;

    let title = sessionTitle.trim();
    if (budgetForTitle <= 0) {
        title = '';
    } else if (title.length > budgetForTitle) {
        title = title.slice(0, Math.max(budgetForTitle - 1, 0)).trim() + '…';
    }

    return `${prefix}${title}${suffix}`.replace(/\s+/g, ' ').trim();
}