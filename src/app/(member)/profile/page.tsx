'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { profileApi } from '../../../lib/api';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  User, Calendar, Shirt,
  ChevronRight, CheckCircle2, Clock, Lock,
  Trophy, CalendarDays, ClipboardList, Gem
} from 'lucide-react';
import Link from 'next/link';
import { rankingsApi } from '../../../lib/api';
import { RankIcon, RankPodiumAvatar } from '@/components/Rank';
import { RankInfoModal } from '@/components/RankInfoModal';

const LEVEL_CFG: Record<string, { emoji: string; cls: string; bg: string }> = {
  'Người Mới Tham Gia': { emoji: '🥚', cls: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
  'Làm Quen Sân': { emoji: '🏸', cls: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  'Bắt Nhịp': { emoji: '💪', cls: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  'Ổn Sân': { emoji: '⚡', cls: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'Thành Thạo Sân': { emoji: '🔥', cls: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'Gắn Bó CLB': { emoji: '⭐', cls: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'Trụ Cột Sân': { emoji: '💎', cls: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  'Lão Làng Sân Cầu': { emoji: '👑', cls: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

const ATTENDANCE_TIERS = [
  { min: 0, max: 1, label: 'Người Mới Tham Gia' },
  { min: 2, max: 5, label: 'Làm Quen Sân' },
  { min: 6, max: 12, label: 'Bắt Nhịp' },
  { min: 13, max: 25, label: 'Ổn Sân' },
  { min: 26, max: 45, label: 'Thành Thạo Sân' },
  { min: 46, max: 80, label: 'Gắn Bó CLB' },
  { min: 81, max: 130, label: 'Trụ Cột Sân' },
  { min: 131, max: Infinity, label: 'Lão Làng Sân Cầu' },
];

function getAttendanceLevel(totalSessions: number) {
  const tier = ATTENDANCE_TIERS.find((t) => totalSessions >= t.min && totalSessions <= t.max) ?? ATTENDANCE_TIERS[0];
  return { label: tier.label, ...LEVEL_CFG[tier.label] };
}


const LEVEL_LABELS: Record<string, string> = {
  yeu: 'Yếu',
  tb_yeu: 'TB yếu',
  tb: 'TB',
  tb_plus: 'TB+',
  ban_chuyen: 'Bán chuyên (BC)',
  chuyen_nghiep: 'Chuyên nghiệp',
};

function getMemberLevel(user: any) {
  if (!user) return { line1: 'Chưa có level' };

  if (user.member_type === 'co_dinh') {
    const isVip = user.member_subtype === 'vip';
    return {
      line1: isVip ? 'Thành viên VIP' : 'Thành viên thường',
      line2: user.level ? LEVEL_LABELS[user.level] : undefined,
    };
  }

  if (user.member_type === 'vang_lai') {
    const count = user.attendance_count ?? 0;
    const isKhachQuen = user.vang_lai_status === 'khach_quen' || count >= 5;
    return {
      line1: user.vang_lai_label ?? (isKhachQuen ? 'Khách quen' : 'Khách mới'),
    };
  }

  return { line1: 'Chưa có level' };
}

function EnergyBar({ points, total }: { points: number; total: number }) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const targetWidth = Math.min(100, (points / total) * 100);


  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(targetWidth), 150);
    return () => clearTimeout(timer);
  }, [targetWidth]);

  return (
    <div className="w-full max-w-[220px] mt-1">
      <div className="relative h-4 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lime-400 via-green-500 to-emerald-500 relative overflow-hidden"
          style={{
            width: `${animatedWidth}%`,
            transition: 'width 700ms ease-out',
            willChange: 'width',
          }}
        >
          <div
            className="absolute top-0 left-0 h-full w-1/2"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'energy-shimmer 2s linear infinite',
              willChange: 'transform',
            }}
          />
        </div>

        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

        {animatedWidth > 0 && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 rounded-full pointer-events-none"
            style={{
              left: `${animatedWidth}%`,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)',
              animation: 'energy-pulse 1.5s ease-in-out infinite',
              willChange: 'opacity, transform',
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes energy-shimmer {
          0% { transform: translateX(-220%); }
          100% { transform: translateX(220%); }
        }
        @keyframes energy-pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
        }
      `}</style>
    </div>
  );
}

const POINTS_PER_TIER = 50;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [myRank, setMyRank] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRankInfo, setShowRankInfo] = useState(false);

  const attendanceLevel = getAttendanceLevel(myStats?.badminton?.total_sessions ?? 0);

  useEffect(() => {
    Promise.all([
      profileApi.getMe(),
      rankingsApi.myStats(),
      rankingsApi.myRank(),
    ]).then(([p, s, r]) => {
      setProfile(p.data);
      setUser(p.data);
      setMyStats(s.data);
      setMyRank(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const data = profile || user;
  const tier = myRank?.tier;
  const points = myRank?.points ?? 0;

  const memberLevel = getMemberLevel(data);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => <div key={j} className="h-10 bg-gray-100 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Hero banner ── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 rounded-3xl px-5 py-6 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 130, height: 100 }}>
            <RankPodiumAvatar
              tier={tier}
              avatar={data?.avatar_url}
              name={data?.full_name}
              size={100}
              frameScale={4}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-1 pl-10">
            <h2 className="text-white text-lg font-black leading-tight truncate">
              {data?.full_name}
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] text-white/90 font-semibold whitespace-nowrap">
                {memberLevel.line1}
              </span>
              {memberLevel.line2 && (
                <>
                  <span className="text-white/40 text-[13px]">·</span>
                  <span className="text-[13px] text-yellow-300 font-medium whitespace-nowrap">
                    {memberLevel.line2}
                  </span>
                </>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white">
              <span>{attendanceLevel.emoji}</span>
              <span>{attendanceLevel.label}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-2">
        <RankIcon tier={tier} size={280} />
        <p className="text-sx font-bold text-gray-800">{tier}</p>
        <p className="text-xs text-gray-400">{points}/{POINTS_PER_TIER} điểm đến hạng tiếp theo</p>

        <EnergyBar points={points} total={POINTS_PER_TIER} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-black text-blue-600">{myStats?.badminton?.total_points}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-center gap-1">
            <img
              src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png"
              alt="Cầu lông"
              className="w-8 h-8 object-contain"
            />
            Cầu lông
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-black text-amber-600">{myStats?.sessions_this_month ?? 0}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Buổi tháng này</p>
        </div>
      </div>

      <div className={`bg-white rounded-2xl flex items-center gap-3 p-4 shadow-sm border ${data?.is_active ? 'border-emerald-100' : 'border-red-100'
        }`}>
        {data?.is_active
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          : <Clock className="w-5 h-5 text-red-400 flex-shrink-0" />
        }
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {data?.is_active ? 'Tài khoản đang hoạt động' : 'Tài khoản bị vô hiệu hóa'}
          </p>
          <p className="text-xs text-gray-400">
            Tham gia từ{' '}
            {data?.created_at
              ? format(new Date(data.created_at), 'dd MMMM yyyy', { locale: vi })
              : '—'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <Link
          href="/profile/settings"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="flex-1 text-sm font-medium text-gray-700">Chỉnh sửa hồ sơ</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>

        <button
          onClick={() => setShowRankInfo(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-cyan-600" />
          </div>
          <span className="flex-1 text-sm font-medium text-gray-700">Thông tin các rank</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <Link
          href="/profile/change-password"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="flex-1 text-sm font-medium text-gray-700">Đổi mật khẩu</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>

        <Link
          href="/history"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700">Lịch sử đăng ký</span>
            <p className="text-xs text-gray-400">Các buổi đã tham gia</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </div>
      {showRankInfo && <RankInfoModal onClose={() => setShowRankInfo(false)} />}
    </div>
  );
}