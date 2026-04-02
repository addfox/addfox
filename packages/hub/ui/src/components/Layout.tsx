import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Activity, 
  Settings,
  Terminal,
  Menu,
  X,
  Settings2,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TerminalNavButton } from './TerminalDrawer';

const sidebarNavItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: Activity,
  },
  {
    title: 'Logs',
    href: '/logs',
    icon: ScrollText,
  },
  {
    title: 'Terminal',
    href: '/terminal',
    icon: Terminal,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Sidebar - Fixed on left with dark styling */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-dark-800 bg-dark-900 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo - Fixed height with fox branding */}
        <div className="flex h-16 items-center border-b border-dark-800 px-6 shrink-0">
          <Link to="/" className="flex items-center gap-3 font-bold text-xl">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fox-500 to-fox-600 flex items-center justify-center shadow-lg shadow-fox-500/20">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-white">Addfox Hub</span>
          </Link>
        </div>
        
        {/* Navigation - Scrollable if needed */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-fox-500/10 text-fox-400 border-l-2 border-fox-500" 
                      : "text-dark-400 hover:bg-dark-800 hover:text-dark-200"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-fox-400")} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom actions - Fixed at bottom */}
        <div className="border-t border-dark-800 p-4 space-y-2 shrink-0">
          <TerminalNavButton />
          <Link to="/settings" className="flex items-center gap-3 rounded-lg bg-dark-800/50 px-3 py-2 hover:bg-dark-800 transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-fox-500/20 to-fox-600/20 flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-fox-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-dark-200 truncate">Settings</p>
              <p className="text-xs text-dark-500 truncate">v0.1.0</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content - Scrollable area */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 bg-dark-950",
        "lg:ml-64"
      )}>
        {/* Mobile header */}
        <header className="lg:hidden flex h-16 items-center justify-between border-b border-dark-800 bg-dark-900 px-4 shrink-0">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fox-500 to-fox-600 flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="text-white">Addfox</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-dark-400 hover:text-white hover:bg-dark-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Page content - Scrollable */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
