'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const BG_URL =
  'https://xuiwrhrnmxuhrzonofwa.supabase.co/storage/v1/object/public/background/background-auth.png';

const BG_URL_MOBILE =
  'https://xuiwrhrnmxuhrzonofwa.supabase.co/storage/v1/object/public/background/background-auth-mobile.png';

const LOGO_URL =
  'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494767/LOGO_TEAM_BNB_WHITE_hs59vg.png';

const TABS = [
  { href: '/auth/login', label: 'Đăng nhập' },
  { href: '/auth/register', label: 'Đăng ký' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const activeTab = pathname?.startsWith('/auth/register') ? '/auth/register' : '/auth/login';

  return (
    <div className="relative min-h-screen flex justify-center p-4 pt-12 sm:pt-16 overflow-y-auto">
      {/* Nền cho desktop (>= sm) */}
      <div
        className="hidden sm:block fixed inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5,32,26,0.55) 0%, rgba(4,20,18,0.8) 100%), url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Nền cho mobile (< sm) */}
      <div
        className="block sm:hidden fixed inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5,32,26,0.55) 0%, rgba(4,20,18,0.8) 100%), url(${BG_URL_MOBILE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="w-full max-w-md relative h-fit">
        <div className="text-center mb-6">
          <img
            src={LOGO_URL}
            alt="BNB Team"
            className="w-28 h-28 object-contain mx-auto mb-3 drop-shadow-lg"
          />
          <p className="text-[11px] tracking-[0.25em] uppercase text-amber-200/80 font-semibold mb-1">
            Câu lạc bộ cầu lông
          </p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">BNB</h1>
          <h3 className="text-xl font-extrabold text-white tracking-tight">BADMINTON CLUB</h3>
          <p className="text-white/60 text-sm mt-1">Hệ thống quản lý thành viên</p>
        </div>

        <div className="relative grid grid-cols-2 mb-5 p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
          {TABS.map((tab) => {
            const active = activeTab === tab.href;
            return (
              <Link key={tab.href} href={tab.href} className="relative z-10 py-2.5 text-center">
                {active && (
                  <motion.div
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-md"
                    transition={
                      reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                    }
                  />
                )}
                <span
                  className={`relative text-sm font-semibold transition-colors ${active ? 'text-emerald-700' : 'text-white/70'
                    }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}