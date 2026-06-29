import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Build nội dung chuyển khoản dạng:
 *   "{fullName} thanh toán cho buổi đánh {tên buổi (cắt ngắn nếu dài)} {dd/MM HH:mm}"
 *
 * Tổng chuỗi được giới hạn ~50 ký tự (an toàn cho nội dung CK ngân hàng).
 * Phần "tên buổi" sẽ bị cắt ngắn trước tiên nếu vượt giới hạn, fullName và
 * phần ngày giờ luôn được giữ nguyên để không mất thông tin định danh người chuyển.
 */
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
        // Trường hợp cực hiếm: fullName quá dài, vẫn giữ tối thiểu để không vỡ format
        title = '';
    } else if (title.length > budgetForTitle) {
        // Cắt ngắn và thêm dấu ba chấm, trừ thêm 1 ký tự cho dấu "…"
        title = title.slice(0, Math.max(budgetForTitle - 1, 0)).trim() + '…';
    }

    return `${prefix}${title}${suffix}`.replace(/\s+/g, ' ').trim();
}