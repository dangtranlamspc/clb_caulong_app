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
  'Cố định (tháng)': { emoji: '🏆', cls: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  'Vãng lai cố định': { emoji: '🥇', cls: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'Vãng lai lâu lâu': { emoji: '🥈', cls: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  'Vãng lai lần đầu': { emoji: '🥉', cls: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  'Chưa có level': { emoji: '🎯', cls: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [myRank, setMyRank] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRankInfo, setShowRankInfo] = useState(false);

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

  const levelCfg = LEVEL_CFG[myStats?.level] ?? LEVEL_CFG['Chưa có level'];

  const POINTS_PER_DIVISION: Record<string, number> = {
    'Sắt': 20, 'Đồng': 20, 'Bạc': 20, 'Vàng': 20,
    'Bạch Kim': 20, 'Lục Bảo': 25, 'Kim Cương': 30, 'Cao Thủ': 30,
  };

  const POINTS_PER_GEM = 5;

  const tier = myRank?.tier;
  const threshold = POINTS_PER_DIVISION[tier] ?? 20;
  const totalGems = threshold / POINTS_PER_GEM;
  const filledGems = Math.min(totalGems, Math.floor((myRank?.points ?? 0) / POINTS_PER_GEM));

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
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 rounded-3xl px-5 py-10 min-h-[180px] overflow-hidden">
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-4 ml-4">
          {/* Avatar */}
          <RankPodiumAvatar
            tier={tier}
            avatar={data?.avatar_url}
            name={data?.full_name}
            size={100}
            frameScale={4}
          />
          <div className="flex-1 min-w-0 ml-8">
            <p className="text-white/70 text-xs">Thành viên</p>
            <h2 className="text-white text-lg font-black leading-tight truncate">{data?.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {data?.role === 'admin' ? '⭐ Quản trị viên' : '🎖 Thành viên'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-2">
        <RankIcon tier={tier} size={280} />
        <p className="text-sx font-bold text-gray-800">{tier} {myRank?.division ?? 'V'}</p>
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalGems }).map((_, i) => (
            <Gem
              key={i}
              className={`w-8 h-8 ${i < filledGems
                ? 'text-cyan-400 fill-cyan-400'
                : 'text-gray-200 fill-gray-100'
                }`}
            />
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-black text-blue-600">{myStats?.badminton?.total_points}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">🏸 Cầu lông</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-black text-amber-600">{myStats?.sessions_this_month ?? 0}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Buổi tháng này</p>
        </div>
        <div className={`rounded-2xl p-3 text-center shadow-sm border ${levelCfg.bg}`}>
          <p className="text-lg">{levelCfg.emoji}</p>
          <p className={`text-[10px] font-bold mt-0.5 ${levelCfg.cls} leading-tight`}>
            {myStats?.level ?? 'Chưa có level'}
          </p>
        </div>
      </div>

      {/* ── Account status ── */}
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

      {/* ── Quick links ── */}
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