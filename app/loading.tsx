/**
 * Root-level loading state. Shows immediately after the OS splash while the
 * app hydrates, replacing the previous flash of unstyled empty layout.
 * Server component — no JS — so it paints instantly.
 */
export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-arena-900 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full blur-3xl bg-brand-500/20 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full blur-3xl bg-purple-500/20 animate-pulse" style={{ animationDelay: '600ms' }} />
      </div>

      <div className="relative flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 via-orange-500 to-amber-500 flex items-center justify-center text-4xl shadow-2xl shadow-brand-500/40">
          🏟️
        </div>

        <div className="text-center">
          <p className="font-display font-black text-3xl tracking-wide bg-gradient-to-r from-brand-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
            PROST ARENA
          </p>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mt-1.5">
            Eat · Play · Earn
          </p>
        </div>

        <div className="flex gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '120ms' }} />
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '240ms' }} />
        </div>
      </div>
    </div>
  );
}
