
import React, { useState, useEffect, createContext, useContext } from 'react';
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
  Eye,
  Layers,
  Network,
  ChevronRight,
  Check,
  Palette
} from 'lucide-react';
import { db } from '../services/db';
import { Project } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

// Context for sharing Project state between Header and Dashboard
interface ProjectContextType {
  projects: Project[];
  selectedProject: string;
  setSelectedProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};

// Available Themes from Images
const THEMES = [
  { id: 'default', name: 'Azia', color: '#6F42C1' },      // Default Purple
  { id: 'theme-skydash', name: 'Skydash', color: '#4B49AC' }, // Indigo
  { id: 'theme-orange', name: 'StarAdmin', color: '#F29F67' }, // Orange
  { id: 'theme-green', name: 'Stellar', color: '#38CE3C' },   // Green
  { id: 'theme-cyan', name: 'Breeze', color: '#00CCCD' },     // Cyan
  { id: 'theme-violet', name: 'Pollux', color: '#844FC1' },   // Violet
];

const Sidebar = ({ 
  expanded, 
  setExpanded,
  currentTheme,
  setCurrentTheme
}: { 
  expanded: boolean, 
  setExpanded: (v: boolean) => void,
  currentTheme: string,
  setCurrentTheme: (t: string) => void
}) => {
  const location = useLocation();

  const mainNavItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Allocations', path: '/allocations', icon: Map },
    { name: 'Logistique', path: '/logistics', icon: Package },
    { name: 'Parc Auto', path: '/fleet', icon: Truck },
    { name: 'Vues & Rapports', path: '/views', icon: Eye },
    { name: 'Réseau', path: '/network', icon: Network },
  ];

  const settingsItem = { name: 'Paramètres', path: '/settings', icon: Settings };

  return (
    <aside 
      className={`fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border shadow-2xl ${expanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo Area */}
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-white/20 flex items-center justify-center font-bold text-white shadow-glow transition-colors duration-300">
            M
          </div>
          {expanded && (
            <div className="flex flex-col animate-fade-in">
                <span className="font-bold text-lg tracking-tight text-white leading-tight">
                MASAE
                </span>
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">Tracker</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex flex-col gap-1 px-3">
        <p className={`text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 mb-2 px-3 transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            Menu Principal
        </p>
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 relative overflow-hidden
                ${isActive 
                  ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                }
              `}
            >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-primary rounded-r-full"></div>}
              <item.icon size={20} className={`${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-white'} min-w-[20px] transition-colors`} />
              <span className={`whitespace-nowrap text-sm font-medium transition-all duration-200 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                {item.name}
              </span>
              {isActive && expanded && <ChevronRight size={14} className="ml-auto text-sidebar-primary" />}
            </NavLink>
          );
        })}

        {/* Separator */}
        <div className="my-4 px-4">
          <div className="h-px bg-sidebar-border/50 w-full"></div>
        </div>

        <p className={`text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 mb-2 px-3 transition-opacity ${expanded ? 'opacity-100' : 'opacity-0'}`}>
            Système
        </p>

        {/* Settings Item */}
        <NavLink
          to={settingsItem.path}
          className={`group flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 relative
            ${location.pathname === settingsItem.path 
              ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white' 
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
            }
          `}
        >
          {location.pathname === settingsItem.path && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-primary rounded-r-full"></div>}
          <settingsItem.icon size={20} className={`${location.pathname === settingsItem.path ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-white'} min-w-[20px]`} />
          <span className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            {settingsItem.name}
          </span>
        </NavLink>
      </nav>

      {/* Theme Selector (Fixed at bottom above profile) */}
      <div className="absolute bottom-20 w-full px-4">
        <div className={`transition-all duration-300 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-sidebar-foreground/50 tracking-widest">
            <Palette size={12} />
            <span>Thèmes</span>
          </div>
          
          <div className="relative group">
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/20 shadow-sm pointer-events-none z-10"
              style={{ backgroundColor: THEMES.find(t => t.id === currentTheme)?.color }}
            ></div>
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value)}
              className="w-full appearance-none bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border text-sidebar-foreground text-sm rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:ring-1 focus:ring-sidebar-primary cursor-pointer transition-colors"
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id} className="bg-sidebar-accent text-sidebar-foreground">
                  {theme.name}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-sidebar-foreground/50 pointer-events-none" size={14} />
          </div>
        </div>
        
        {/* Minimized Theme Icon when sidebar is closed */}
        {!expanded && (
           <div className="flex justify-center mb-2">
             <div 
               className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg border border-white/10"
               style={{ backgroundColor: THEMES.find(t => t.id === currentTheme)?.color }}
             >
               <Palette size={14} className="text-white" />
             </div>
           </div>
        )}
      </div>

      {/* Footer / User Profile */}
      <div className="absolute bottom-0 w-full p-4 border-t border-sidebar-border/50 bg-sidebar">
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${expanded ? 'bg-sidebar-accent' : ''}`}>
          <div className="relative">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sidebar-primary to-white/20 text-white shadow-lg transition-colors duration-300">
                <User size={18} />
             </div>
             <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-sidebar-accent"></span>
          </div>
          
          {expanded && (
            <div className="flex flex-col overflow-hidden animate-fade-in">
              <span className="truncate text-sm font-bold text-white">Admin</span>
              <span className="truncate text-xs text-sidebar-foreground">Logistique</span>
            </div>
          )}
          {expanded && (
            <button className="ml-auto text-sidebar-foreground hover:text-white transition-colors">
              <LogOut size={16} />
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
  const location = useLocation();
  const { projects, selectedProject, setSelectedProject } = useProject();
  const isDashboard = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between px-6 bg-background/80 backdrop-blur-md transition-all">
      <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
        <button className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-md">
           <Menu size={20} />
        </button>
        
        {isDashboard ? (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-fade-right py-1">
             <button
              onClick={() => setSelectedProject('all')}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${
                selectedProject === 'all'
                  ? 'bg-gradient-to-r from-primary to-purple-600/50 text-white shadow-glow'
                  : 'bg-white dark:bg-card text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Vue d'ensemble
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${
                  selectedProject === p.id
                    ? 'bg-gradient-to-r from-primary to-purple-600/50 text-white shadow-glow'
                    : 'bg-white dark:bg-card text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Phase {p.numero_phase} {p.numero_marche ? `- ${p.numero_marche}` : ''}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center">
             <h2 className="text-xl font-bold text-foreground tracking-tight">
              {location.pathname === '/allocations' && 'Allocations'}
              {location.pathname === '/logistics' && 'Logistique'}
              {location.pathname === '/fleet' && 'Parc Auto'}
              {location.pathname === '/views' && 'Rapports'}
              {location.pathname === '/network' && 'Réseau'}
              {location.pathname === '/settings' && 'Paramètres'}
             </h2>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0 bg-white dark:bg-card p-1.5 pr-4 pl-4 rounded-full shadow-soft-sm border border-border/50">
        
        <div className="relative hidden md:block">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="h-9 w-48 bg-transparent pl-8 pr-4 text-sm focus:outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="h-6 w-px bg-border"></div>

        <button 
          onClick={toggleDarkMode}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="relative text-muted-foreground hover:text-primary transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-white dark:ring-card"></span>
        </button>
      </div>
    </header>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [expanded, setExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  
  // Project State lifted to Layout
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    db.getProjects().then(setProjects).catch(console.error);
  }, []);

  // Apply Theme & Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle Dark Mode
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Handle Color Theme
    // Remove all previous theme classes
    THEMES.forEach(t => {
      if (t.id !== 'default') root.classList.remove(t.id);
    });

    // Add new theme class if not default
    if (currentTheme !== 'default') {
      root.classList.add(currentTheme);
    }
  }, [isDarkMode, currentTheme]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ProjectContext.Provider value={{ projects, selectedProject, setSelectedProject }}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
        <Sidebar 
          expanded={expanded} 
          setExpanded={setExpanded} 
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
        />
        <div className={`transition-all duration-300 ease-in-out ${expanded ? 'pl-64' : 'pl-20'}`}>
          <Header 
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
          <main className="px-6 pb-6 pt-2 animate-fade-in max-w-screen-2xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
};
