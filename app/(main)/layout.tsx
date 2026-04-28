import Navbar from '../../components/layout/Navbar';
import StickyCartBar from '../../components/layout/StickyCartBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container-app py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
        {children}
      </main>
      <footer className="border-t border-gray-100 dark:border-arena-700 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} Prost Arena · Eat. Play. Win.
      </footer>
      <StickyCartBar />
    </div>
  );
}
