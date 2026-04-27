/**
 * Auth layout — centered card shell for login / register.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-gradient px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🏟️</span>
          <h1 className="font-display font-black text-3xl text-white mt-3">
            PROST ARENA
          </h1>
          <p className="text-gray-400 text-sm mt-1">Eat. Play. Win.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
