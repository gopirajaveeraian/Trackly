import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <SkipToContent />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main id="main-content" className="flex-1 overflow-y-auto p-6" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
