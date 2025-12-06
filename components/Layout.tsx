
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Truck, 
  Settings, 
  Package, 
  Menu, 
  User, 
  LogOut,
  Bell,
  Search,
  Sun,
  Moon,
  Eye
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Sidebar = ({ expanded, setExpanded }: { expanded: boolean, setExpanded: (v: boolean) => void }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Allocations', path: '/allocations', icon: Map },
    { name: 'Logistique', path: '/logistics', icon: Package },
    { name: 'Parc Auto', path: '/fleet', icon: Truck },
    { name: 'Vues', path: '/views', icon: Eye },
    { name: 'Paramètres', path: '/settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out ${expanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground shadow-lg shadow-black/10">
            M
          </div>
          {expanded && (
            <span className="font-bold text-lg tracking-tight animate-fade-in whitespace-nowrap">
              MASAE Tracker
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex flex-col gap-2 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-4 rounded-lg px-3 py-3 transition-all duration-200
                ${isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <item.icon size={22} className={`${isActive ? 'text-sidebar-primary-foreground' : 'group-hover:text-sidebar-accent-foreground'} min-w-[22px]`} />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="absolute bottom-0 w-full border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
            <User size={20} />
          </div>
          {expanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">Administrateur</span>
              <span className="truncate text-xs text-sidebar-foreground/60">Resp. Logistique</span>
            </div>
          )}
          {expanded && (
            <button className="ml-auto text-sidebar-foreground/60 hover:text-destructive">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

const Header = ({ 
  isDarkMode, 
  toggleDarkMode 
}: { 
  isDarkMode: boolean,
  toggleDarkMode: () => void
}) => {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-md">
           <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center text-sm text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer">Projet Phase 1</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">Vue d'ensemble</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        
        {/* Day/Night Toggle */}
        <button 
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg border transition-colors ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:text-yellow-300' 
              : 'bg-orange-50 border-orange-200 text-orange-500 hover:text-orange-600'
          }`}
          title={isDarkMode ? "Passer en Mode Clair" : "Passer en Mode Sombre"}
        >
          {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="w-px h-6 bg-border mx-1"></div>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="h-9 w-48 lg:w-64 rounded-full border border-input bg-muted/30 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button className="relative rounded-full bg-muted/30 p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
          <Bell size={20} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-semibold text-xs">
          AD
        </div>
      </div>
    </header>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [expanded, setExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      <div className={`transition-all duration-300 ${expanded ? 'pl-64' : 'pl-20'}`}>
        <Header 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className="p-6 md:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
