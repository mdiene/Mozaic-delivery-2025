
// Fix: Added React to imports to resolve 'Cannot find name React' error on line 78
import React, { useState, useEffect, createContext, useContext, ReactNode, FC } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
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
  Sun,
  Moon,
  Eye,
  Network,
  ChevronRight,
  ChevronDown,
  Check,
  FileText,
  Gift,
  Navigation,
  Globe,
  Receipt,
  Pin,
  Circle,
  ScanBarcode
} from 'lucide-react';
import { db } from '../services/db';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

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

// Helper Component for Submenus
const SidebarSubmenu = ({ 
  label, 
  icon: Icon, 
  basePath, 
  children, 
  expanded 
}: { 
  label: string, 
  icon: any, 
  basePath: string, 
  children?: ReactNode, 
  expanded: boolean 
}) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(basePath);
  const [isOpen, setIsOpen] = useState(false);

  // If no visible children, don't render the submenu at all
  // Fix: React.Children.count now works correctly with React explicitly imported
  if (React.Children.count(children) === 0) return null;

  return (
    <li 
       className="flex flex-col"
       onMouseEnter={() => expanded && setIsOpen(true)}
       onMouseLeave={() => expanded && setIsOpen(false)}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${isActive ? 'text-white' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Icon size={20} className="shrink-0" />
          <span className={`${expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'} whitespace-nowrap`}>
            {label}
          </span>
        </div>
        {expanded && (
           <ChevronRight size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} shrink-0 text-muted-foreground group-hover:text-white`} />
        )}
      </div>
      
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen && expanded ? 'grid-rows-[1fr] opacity-100 mb-1' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
             <ul className="menu gap-1 pl-4 mt-1 border-l border-sidebar-border/30 ml-3">
                {children}
             </ul>
        </div>
      </div>
    </li>
  );
};

const Sidebar = ({ 
  expanded, 
  setHovered,
  pinned,
  togglePin
}: { 
  expanded: boolean, 
  setHovered: (v: boolean) => void,
  pinned: boolean,
  togglePin: () => void
}) => {
  const { user, logout } = useAuth();
  
  // Sidebar hidden for drivers - they get a mobile-first focused UI
  if (user?.role === 'DRIVER') return null;

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  return (
    <aside 
      className={`fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border shadow-2xl ${expanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo Area */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-white/20 flex items-center justify-center font-bold text-white shadow-glow transition-colors duration-300 shrink-0">
            M
          </div>
          {expanded && (
            <div className="flex flex-col animate-fade-in whitespace-nowrap overflow-hidden">
                <span className="font-bold text-lg tracking-tight text-white leading-tight">
                MASAE
                </span>
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">Tracker</span>
            </div>
          )}
        </div>
        
        {/* Pin Button */}
        {expanded && (
           <button 
             onClick={togglePin}
             className={`p-1.5 rounded-full hover:bg-sidebar-accent transition-colors ${pinned ? 'text-primary' : 'text-sidebar-foreground/50'}`}
             title={pinned ? "Détacher la barre latérale" : "Épingler la barre latérale"}
           >
              {pinned ? <Pin size={16} className="fill-current" /> : <Circle size={16} />}
           </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-2 overflow-y-auto max-h-[calc(100vh-140px)] no-scrollbar">
        <ul className="menu w-full p-0 gap-1">
          
          <li className="menu-title text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1 mt-2">
             <span className={expanded ? 'opacity-100 transition-opacity' : 'opacity-0'}>Menu Principal</span>
          </li>

          {isAdmin && (
            <li>
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`
                }
              >
                <LayoutDashboard size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Tableau de bord</span>
              </NavLink>
            </li>
          )}

          {isAdmin && (
            <li>
              <NavLink 
                to="/allocations"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`
                }
              >
                <Map size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Allocations</span>
              </NavLink>
            </li>
          )}

          <SidebarSubmenu label="Logistique" icon={Package} basePath="/logistics" expanded={expanded}>
             <li><NavLink to="/logistics/fifo" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><ScanBarcode size={16} className="shrink-0" /><span className="truncate">File d'attente (FIFO)</span></NavLink></li>
             {isAdmin && <li><NavLink to="/logistics/dispatch" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Package size={16} className="shrink-0" /><span className="truncate">Expéditions</span></NavLink></li>}
             {(isAdmin || isManager) && <li><NavLink to="/logistics/expenses" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Receipt size={16} className="shrink-0" /><span className="truncate">Note de frais</span></NavLink></li>}
          </SidebarSubmenu>

          {isAdmin && (
            <li>
              <NavLink to="/fleet" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}>
                <Truck size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Parc Auto</span>
              </NavLink>
            </li>
          )}

          <SidebarSubmenu label="Vues & Rapports" icon={Eye} basePath="/views" expanded={expanded}>
              <li><NavLink to="/views?tab=bon_livraison" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><FileText size={16} className="shrink-0" /><span className="truncate">Bon de Livraison</span></NavLink></li>
              {isAdmin && <li><NavLink to="/views?tab=fin_cession" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Gift size={16} className="shrink-0" /><span className="truncate">Fin de Cession</span></NavLink></li>}
          </SidebarSubmenu>

          <SidebarSubmenu label="Réseau" icon={Network} basePath="/network" expanded={expanded}>
              {isAdmin && <li><NavLink to="/network/map" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Map size={16} className="shrink-0" /><span className="truncate">Carte</span></NavLink></li>}
              {(isAdmin || isManager) && <li><NavLink to="/network/itinerary" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Navigation size={16} className="shrink-0" /><span className="truncate">Itinéraire</span></NavLink></li>}
              {isAdmin && <li><NavLink to="/network/global" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Globe size={16} className="shrink-0" /><span className="truncate">Vue Globale</span></NavLink></li>}
          </SidebarSubmenu>

          {isAdmin && (
            <>
              <div className="my-2 px-2"><div className="h-px bg-sidebar-border/50 w-full"></div></div>
              <li>
                <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}>
                  <Settings size={20} className="shrink-0" />
                  <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Paramètres</span>
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Footer / User Profile */}
      <div className="absolute bottom-0 w-full p-4 border-t border-sidebar-border/50 bg-sidebar">
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${expanded ? 'bg-sidebar-accent' : ''}`}>
          <div className="relative shrink-0">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sidebar-primary to-white/20 text-white shadow-lg transition-colors duration-300">
                <User size={18} />
             </div>
             <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-sidebar-accent"></span>
          </div>
          {expanded && (
            <div className="flex flex-col overflow-hidden animate-fade-in">
              <span className="truncate text-sm font-bold text-white">{user?.name}</span>
              <span className="truncate text-[10px] text-sidebar-foreground uppercase">{user?.role}</span>
            </div>
          )}
          {expanded && (
            <button onClick={logout} className="ml-auto text-sidebar-foreground hover:text-white transition-colors" title="Déconnexion">
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
  toggleDarkMode,
  currentTheme,
  setCurrentTheme
}: { 
  isDarkMode: boolean,
  toggleDarkMode: () => void,
  currentTheme: string,
  setCurrentTheme: (t: string) => void
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { projects, selectedProject, setSelectedProject } = useProject();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const isDashboard = location.pathname === '/';
  const isDriver = user?.role === 'DRIVER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className={`sticky top-0 z-40 flex h-20 w-full items-center justify-between px-6 bg-background/80 backdrop-blur-md transition-all ${isDriver ? 'border-b border-border' : ''}`}>
      <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
        {!isDriver && (
          <button className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-md">
            <Menu size={20} />
          </button>
        )}
        
        {isDashboard && isAdmin ? (
          <div className="flex items-center overflow-x-auto no-scrollbar mask-fade-right py-1">
             <form className="filter">
                <input className="btn btn-square" type="reset" value="×" onClick={() => setSelectedProject('all')} title="Réinitialiser" />
                <input className="btn" type="radio" name="header-project" aria-label="Vue d'ensemble" checked={selectedProject === 'all'} onChange={() => setSelectedProject('all')} />
                {projects.map(p => (
                  <input key={p.id} className="btn" type="radio" name="header-project" aria-label={`Phase ${p.numero_phase}${p.numero_marche ? ` - ${p.numero_marche}` : ''}`} checked={selectedProject === p.id} onChange={() => setSelectedProject(p.id)} />
                ))}
             </form>
          </div>
        ) : (
          <div className="flex items-center gap-3">
             {isDriver && (
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm">M</div>
             )}
             <h2 className="text-xl font-bold text-foreground tracking-tight">
              {location.pathname === '/allocations' && 'Allocations'}
              {location.pathname.startsWith('/logistics/fifo') && "File d'attente (FIFO)"}
              {location.pathname.startsWith('/logistics/dispatch') && 'Logistique'}
              {location.pathname.startsWith('/logistics/expenses') && 'Notes de Frais'}
              {location.pathname === '/fleet' && 'Parc Auto'}
              {location.pathname.startsWith('/views') && 'Rapports'}
              {location.pathname.startsWith('/network') && 'Réseau'}
              {location.pathname === '/settings' && 'Paramètres'}
             </h2>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0 bg-secondary/50 dark:bg-card p-1.5 pr-4 pl-4 rounded-full shadow-inner border border-border/50 relative">
        <div className="relative">
             <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="flex items-center gap-3 px-2 py-1.5 rounded-full hover:bg-background/80 transition-colors outline-none group">
                <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center bg-background shadow-sm">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEMES.find(t => t.id === currentTheme)?.color }}></div>
                </div>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground hidden sm:block">
                    {THEMES.find(t => t.id === currentTheme)?.name}
                </span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
             </button>
             {isThemeMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-4 w-48 bg-background rounded-xl p-2 shadow-soft-xl border border-border animate-in fade-in slide-in-from-top-2 z-50">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-2 uppercase tracking-wider">Choisir un thème</div>
                        <div className="space-y-1">
                            {THEMES.map((theme) => (
                                <button key={theme.id} onClick={() => { setCurrentTheme(theme.id); setIsThemeMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentTheme === theme.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }}></div>
                                  <span className="flex-1 text-left">{theme.name}</span>
                                  {currentTheme === theme.id && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
             )}
        </div>

        <div className="h-6 w-px bg-border mx-2"></div>

        <button onClick={toggleDarkMode} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Toggle Dark Mode">
          {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {!isAdmin && (
          <>
            <div className="h-6 w-px bg-border mx-2"></div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-destructive hover:opacity-80 transition-opacity" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export const Layout = () => {
  const { user } = useAuth();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isDriver = user?.role === 'DRIVER';
  const expanded = !isDriver && (pinned || hovered);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  
  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    const init = async () => {
      db.getProjects().then(setProjects).catch(console.error);
      try {
        const prefs = await db.getUserPreferences(user?.email || 'guest');
        if (prefs) {
          setPinned(prefs.sidebar_pinned);
          setIsDarkMode(prefs.theme_mode === 'dark');
          setCurrentTheme(prefs.theme_color);
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, [user]);

  const savePref = async (updates: any) => {
    if (user?.email) await db.saveUserPreferences(user.email, updates);
  };

  const togglePin = () => {
    const newVal = !pinned;
    setPinned(newVal);
    savePref({ sidebar_pinned: newVal });
  };

  const toggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    savePref({ theme_mode: newVal ? 'dark' : 'light' });
  };

  const handleSetTheme = (theme: string) => {
    setCurrentTheme(theme);
    savePref({ theme_color: theme });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    THEMES.forEach(t => { if (t.id !== 'default') root.classList.remove(t.id); });
    if (currentTheme !== 'default') root.classList.add(currentTheme);
  }, [isDarkMode, currentTheme]);

  return (
    <ProjectContext.Provider value={{ projects, selectedProject, setSelectedProject }}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
        <Sidebar expanded={expanded} setHovered={setHovered} pinned={pinned} togglePin={togglePin} />
        <div className={`transition-all duration-300 ease-in-out ${expanded ? 'pl-64' : isDriver ? 'pl-0' : 'pl-20'}`}>
          <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} currentTheme={currentTheme} setCurrentTheme={handleSetTheme} />
          <main className={`px-6 pb-6 pt-2 animate-fade-in max-w-screen-2xl mx-auto ${isDriver ? 'mt-4' : ''}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
};
