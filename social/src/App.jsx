import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Nav } from '@/components/Nav';
import Feed from '@/pages/Feed';
import Create from '@/pages/Create';
import Messages from '@/pages/Messages';
import Safety from '@/pages/Safety';

export default function App() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                   focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Nav />

      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/create" element={<Create />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="mt-10 border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Demo social client. Screening is provided by SheShield AI over its public API — this app
        holds no AI logic of its own. Automated assessments, not legal advice.
      </footer>
    </div>
  );
}
