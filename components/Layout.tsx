
import { useState, useEffect, createContext, useContext, ReactNode, FC } from 'react';
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
  Receipt
} from 'lucide-react';
import { db } from '../services/db';
import { Project } from '../types';

interface LayoutProps {
  children: ReactNode;
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

// Helper Component for Submenus with Hover/Click Toggle
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

  return (
    <li 
       className="flex flex-col"
       onMouseEnter={() => setIsOpen(true)}
       onMouseLeave={() => setIsOpen(false)}
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
  setExpanded
}: { 
  expanded: boolean, 
  setExpanded: (v: boolean) => void
}) => {
  const location = useLocation();

  // Helper to check if a main route is active (or its children)
  const isRouteActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

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

      {/* Navigation - FlyonUI Menu Structure */}
      <nav className="mt-6 px-2 overflow-y-auto max-h-[calc(100vh-140px)] no-scrollbar">
        <ul className="menu w-full p-0 gap-1">
          
          <li className="menu-title text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1 mt-2">
             <span className={expanded ? 'opacity-100 transition-opacity' : 'opacity-0'}>Menu Principal</span>
          </li>

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

          {/* Logistics with Submenu */}
          <SidebarSubmenu 
            label="Logistique" 
            icon={Package} 
            basePath="/logistics" 
            expanded={expanded}
          >
             <li>
                <NavLink 
                  to="/logistics/dispatch"
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                >
                  <Package size={16} className="shrink-0" />
                  <span className="truncate">Expéditions</span>
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/logistics/expenses"
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                >
                  <Receipt size={16} className="shrink-0" />
                  <span className="truncate">Note de frais</span>
                </NavLink>
              </li>
          </SidebarSubmenu>

          <li>
            <NavLink 
              to="/fleet"
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`
              }
            >
              <Truck size={20} className="shrink-0" />
              <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Parc Auto</span>
            </NavLink>
          </li>

          {/* Vues & Rapports with Submenu */}
          <SidebarSubmenu
            label="Vues & Rapports"
            icon={Eye}
            basePath="/views"
            expanded={expanded}
          >
              <li>
                <NavLink 
                  to="/views?tab=bon_livraison"
                  className={({ isActive }) => {
                    const isTabActive = location.pathname === '/views' && (location.search.includes('bon_livraison') || !location.search.includes('tab='));
                    return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isTabActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`;
                  }}
                >
                  <FileText size={16} className="shrink-0" />
                  <span className="truncate">Bon de Livraison</span>
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/views?tab=fin_cession"
                  className={({ isActive }) => {
                    const isTabActive = location.pathname === '/views' && location.search.includes('fin_cession');
                    return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isTabActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`;
                  }}
                >
                  <Gift size={16} className="shrink-0" />
                  <span className="truncate">Fin de Cession</span>
                </NavLink>
              </li>
          </SidebarSubmenu>

          {/* Réseau with Submenu */}
          <SidebarSubmenu
            label="Réseau"
            icon={Network}
            basePath="/network"
            expanded={expanded}
          >
              <li>
                <NavLink 
                  to="/network/map"
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                >
                  <Map size={16} className="shrink-0" />
                  <span className="truncate">Carte</span>
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/network/itinerary"
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                >
                  <Navigation size={16} className="shrink-0" />
                  <span className="truncate">Itinéraire</span>
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/network/global"
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                >
                  <Globe size={16} className="shrink-0" />
                  <span className="truncate">Vue Globale</span>
                </NavLink>
              </li>
          </SidebarSubmenu>

          <div className="my-2 px-2">
            <div className="h-px bg-sidebar-border/50 w-full"></div>
          </div>

          <li className="menu-title text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">
             <span className={expanded ? 'opacity-100 transition-opacity' : 'opacity-0'}>Système</span>
          </li>

          <li>
            <NavLink 
              to="/settings"
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`
              }
            >
              <Settings size={20} className="shrink-0" />
              <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Paramètres</span>
            </NavLink>
          </li>
        </ul>
      </nav>

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
  const { projects, selectedProject, setSelectedProject } = useProject();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const isDashboard = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between px-6 bg-background/80 backdrop-blur-md transition-all">
      <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
        <button className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-md">
           <Menu size={20} />
        </button>
        
        {isDashboard ? (
          <div className="flex items-center overflow-x-auto no-scrollbar mask-fade-right py-1">
             <form className="filter">
                <input 
                  className="btn btn-square" 
                  type="reset" 
                  value="×" 
                  onClick={() => setSelectedProject('all')}
                  title="Réinitialiser"
                />
                <input 
                  className="btn" 
                  type="radio" 
                  name="header-project" 
                  aria-label="Vue d'ensemble"
                  checked={selectedProject === 'all'}
                  onChange={() => setSelectedProject('all')}
                />
                {projects.map(p => (
                  <input
                    key={p.id}
                    className="btn" 
                    type="radio" 
                    name="header-project" 
                    aria-label={`Phase ${p.numero_phase}${p.numero_marche ? ` - ${p.numero_marche}` : ''}`}
                    checked={selectedProject === p.id}
                    onChange={() => setSelectedProject(p.id)}
                  />
                ))}
             </form>
          </div>
        ) : (
          <div className="flex items-center">
             <h2 className="text-xl font-bold text-foreground tracking-tight">
              {location.pathname === '/allocations' && 'Allocations'}
              {location.pathname.startsWith('/logistics') && 'Logistique'}
              {location.pathname === '/fleet' && 'Parc Auto'}
              {location.pathname.startsWith('/views') && 'Rapports'}
              {location.pathname.startsWith('/network') && 'Réseau'}
              {location.pathname === '/settings' && 'Paramètres'}
             </h2>
          </div>
        )}
      </div>

      {/* Theme & Tools Box - Mimics Search Bar Style */}
      <div className="flex items-center gap-4 shrink-0 bg-secondary/50 dark:bg-card p-1.5 pr-4 pl-4 rounded-full shadow-inner border border-border/50 relative">
        
        {/* Theme Selector */}
        <div className="relative">
             <button 
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="flex items-center gap-3 px-2 py-1.5 rounded-full hover:bg-background/80 transition-colors outline-none group"
             >
                <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center bg-background shadow-sm">
                   <div 
                     className="w-3 h-3 rounded-full"
                     style={{ backgroundColor: THEMES.find(t => t.id === currentTheme)?.color }}
                   ></div>
                </div>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground hidden sm:block">
                    {THEMES.find(t => t.id === currentTheme)?.name}
                </span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
             </button>

             {/* Dropdown Menu */}
             {isThemeMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-4 w-48 bg-background rounded-xl p-2 shadow-soft-xl border border-border animate-in fade-in slide-in-from-top-2 z-50">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-2 uppercase tracking-wider">
                            Choisir un thème
                        </div>
                        <div className="space-y-1">
                            {THEMES.map((theme) => (
                                <button
                                key={theme.id}
                                onClick={() => { setCurrentTheme(theme.id); setIsThemeMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                                    ${currentTheme === theme.id 
                                    ? 'bg-primary/10 text-primary shadow-sm' 
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }
                                `}
                                >
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

        <button 
          onClick={toggleDarkMode}
          className="text-muted-foreground hover:text-primary transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="relative text-muted-foreground hover:text-primary transition-colors" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-white dark:ring-card"></span>
        </button>
      </div>
    </header>
  );
};

export const Layout: FC<LayoutProps> = ({ children }) => {
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
        />
        <div className={`transition-all duration-300 ease-in-out ${expanded ? 'pl-64' : 'pl-20'}`}>
          <Header 
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            currentTheme={currentTheme}
            setCurrentTheme={setCurrentTheme}
          />
          <main className="px-6 pb-6 pt-2 animate-fade-in max-w-screen-2xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
};
