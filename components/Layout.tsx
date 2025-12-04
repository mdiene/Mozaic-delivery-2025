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
  Palette,
  Sun,
  Moon
} from 'lucide-react';
import { themes } from '../design/registry';

interface LayoutProps {
  children: React.ReactNode;
}

const Sidebar = ({ expanded, setExpanded }: { expanded: boolean, setExpanded: (v: boolean) => void }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Allocations', path: '/allocations', icon: Map },
    { name: 'Logistics', path: '/logistics', icon: Package },
    { name: 'Fleet', path: '/fleet', icon: Truck },
    { name: 'Settings', path: '/settings', icon: Settings },
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
              <span className="truncate text-sm font-medium">Admin User</span>
              <span className="truncate text-xs text-sidebar-foreground/60">Logistics Manager</span>
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
  currentThemeId, 
  setTheme, 
  isDarkMode, 
  toggleDarkMode 
}: { 
  currentThemeId: string, 
  setTheme: (t: string) => void,
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
          <span className="hover:text-foreground cursor-pointer">Project Phase 1</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">Overview</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        
        {/* Theme Selector */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1 border border-border">
          <Palette size={14} className="text-muted-foreground" />
          <select 
            value={currentThemeId} 
            onChange={(e) => setTheme(e.target.value)}
            className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer max-w-[100px] md:max-w-[150px]"
          >
            {themes.map(t => (
               // Filter duplicates if strictly distinct names needed, but IDs might be shared for modes
               <option key={`${t.id}-${t.name}`} value={t.id} disabled={t.isDark !== isDarkMode && t.id === currentThemeId}>
                 {t.name}
               </option>
            ))}
          </select>
        </div>

        {/* Day/Night Toggle */}
        <button 
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg border transition-colors ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:text-yellow-300' 
              : 'bg-orange-50 border-orange-200 text-orange-500 hover:text-orange-600'
          }`}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="w-px h-6 bg-border mx-1"></div>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Search..." 
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
  const [themeId, setThemeId] = useState('amber');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Set data-theme for DaisyUI or Custom CSS
    // If it's a custom theme (shadcn, amber), we still set data-theme so our CSS selector works.
    // If it's a DaisyUI theme, data-theme triggers Daisy styles.
    root.setAttribute('data-theme', themeId);

    // 2. Handle Dark Mode Class
    // Some custom themes use .dark class (like shadcn.css)
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeId, isDarkMode]);

  // Intelligent Toggle
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    // Logic to switch to a corresponding theme if available
    // E.g. if on "light" (daisy), switch to "dark" (daisy)
    // If on "shadcn" (custom), stay on "shadcn" but toggle class
    // If on "amber", stay on "amber" but toggle class
    
    const currentThemeDef = themes.find(t => t.id === themeId && t.isDark === isDarkMode);
    
    // If currently using a Daisy theme, we might want to switch to a different Daisy theme that matches the new mode
    if (currentThemeDef?.type === 'daisy') {
       // Simple mapping for common defaults
       if (newMode) {
         if (themeId === 'light') setThemeId('dark');
         if (themeId === 'cupcake') setThemeId('dim');
         if (themeId === 'emerald') setThemeId('forest');
         if (themeId === 'corporate') setThemeId('business');
       } else {
         if (themeId === 'dark') setThemeId('light');
         if (themeId === 'dim') setThemeId('cupcake');
         if (themeId === 'forest') setThemeId('emerald');
         if (themeId === 'business') setThemeId('corporate');
       }
    }
  };

  const handleThemeChange = (newId: string) => {
    setThemeId(newId);
    // Check if the selected theme implies a mode change
    const themeDef = themes.find(t => t.id === newId);
    if (themeDef) {
       // If picking a strictly dark theme (e.g. 'black'), force dark mode
       // If picking a strictly light theme (e.g. 'cupcake'), force light mode
       // Custom themes (shadcn, amber) support both, so don't force unless implicit
       if (themeDef.type === 'daisy') {
         setIsDarkMode(themeDef.isDark);
       }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      <div className={`transition-all duration-300 ${expanded ? 'pl-64' : 'pl-20'}`}>
        <Header 
          currentThemeId={themeId} 
          setTheme={handleThemeChange} 
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