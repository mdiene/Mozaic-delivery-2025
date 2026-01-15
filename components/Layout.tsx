
// Fix: Added React to imports to resolve 'Cannot find name React' error and improved submenu hiding logic
import React, { useState, useEffect, createContext, useContext, ReactNode, FC, isValidElement } from 'react';
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
  ScanBarcode,
  Factory,
  Filter,
  Coins,
  Grid,
  HardHat,
  ShoppingCart,
  Database,
  Briefcase
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

  // Filter out non-element children (like false, null, etc) to accurately count visible items
  const validChildren = React.Children.toArray(children).filter(child => isValidElement(child));

  // If no visible children, don't render the submenu at all
  if (validChildren.length === 0) return null;

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
  const isVisitor = user?.role === 'VISITOR';

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

          {(isAdmin || isVisitor) && (
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

          {(isAdmin || isVisitor) && (
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

          {(isAdmin || isManager || isVisitor) && (
            <SidebarSubmenu label="Production" icon={Factory} basePath="/production" expanded={expanded}>
               <li><NavLink to="/production" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Package size={16} className="shrink-0" /><span className="truncate">Ensachage</span></NavLink></li>
               <li><NavLink to="/production/purchases" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><ShoppingCart size={16} className="shrink-0" /><span className="truncate">Achats & Dépenses</span></NavLink></li>
               <li><NavLink to="/production/screening" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Grid size={16} className="shrink-0" /><span className="truncate">Cribblage</span></NavLink></li>
               <li><NavLink to="/production/excavation" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><HardHat size={16} className="shrink-0" /><span className="truncate">Excavation</span></NavLink></li>
            </SidebarSubmenu>
          )}

          <SidebarSubmenu label="Logistique" icon={Package} basePath="/logistics" expanded={expanded}>
             <li><NavLink to="/logistics/fifo" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><ScanBarcode size={16} className="shrink-0" /><span className="truncate">File d'attente (FIFO)</span></NavLink></li>
             {(isAdmin || isVisitor) && <li><NavLink to="/logistics/dispatch" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Package size={16} className="shrink-0" /><span className="truncate">Expéditions</span></NavLink></li>}
             {(isAdmin || isManager || isVisitor) && <li><NavLink to="/logistics/expenses" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Receipt size={16} className="shrink-0" /><span className="truncate">Note de frais</span></NavLink></li>}
          </SidebarSubmenu>

          {(isAdmin || isVisitor) && (
            <li>
              <NavLink to="/fleet" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'}`}>
                <Truck size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'}>Parc Auto</span>
              </NavLink>
            </li>
          )}

          <SidebarSubmenu label="Vues & Rapports" icon={Eye} basePath="/views" expanded={expanded}>
              <li><NavLink to="/views?tab=bon_livraison" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><FileText size={16} className="shrink-0" /><span className="truncate">Bon de Livraison</span></NavLink></li>
              {(isAdmin || isVisitor) && <li><NavLink to="/views?tab=fin_cession" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Gift size={16} className="shrink-0" /><span className="truncate">Fin de Cession</span></NavLink></li>}
          </SidebarSubmenu>

          <SidebarSubmenu label="Réseau" icon={Network} basePath="/network" expanded={expanded}>
              {(isAdmin || isVisitor) && <li><NavLink to="/network/map" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Map size={16} className="shrink-0" /><span className="truncate">Carte</span></NavLink></li>}
              {(isAdmin || isManager || isVisitor) && <li><NavLink to="/network/itinerary" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Navigation size={16} className="shrink-0" /><span className="truncate">Itinéraire</span></NavLink></li>}
              {(isAdmin || isVisitor) && <li><NavLink to="/network/global" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Globe size={16} className="shrink-0" /><span className="truncate">Vue Globale</span></NavLink></li>}
          </SidebarSubmenu>

          {(isAdmin || isVisitor) && (
            <SidebarSubmenu label="Paramètres" icon={Settings} basePath="/settings" expanded={expanded}>
               <li><NavLink to="/settings" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Database size={16} className="shrink-0" /><span className="truncate">Système</span></NavLink></li>
               <li><NavLink to="/settings/admin" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}><Briefcase size={16} className="shrink-0" /><span className="truncate">Administratif</span></NavLink></li>
            </SidebarSubmenu>
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

// --- Missing Header Component ---
const Header = () => {
  const { selectedProject, setSelectedProject, projects } = useProject();
  const { user } = useAuth();

  return (
    <header className="h-20 bg-card border-b border-border px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-card/80">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <div className="px-3 text-muted-foreground">
            <Filter size={16} />
          </div>
          <form className="filter m-0 p-0 border-none shadow-none bg-transparent flex">
             <input 
               className="btn btn-square h-8 w-8 min-h-0" 
               type="reset" 
               value="×" 
               onClick={() => setSelectedProject('all')}
               title="Réinitialiser"
             />
             <input 
               className="btn h-8 min-h-0 px-3 text-xs" 
               type="radio" 
               name="header-phase" 
               aria-label="Toutes"
               checked={selectedProject === 'all'}
               onChange={() => setSelectedProject('all')}
             />
             {projects.map(p => (
               <input
                 key={p.id}
                 className="btn h-8 min-h-0 px-3 text-xs" 
                 type="radio" 
                 name="header-phase" 
                 aria-label={`Phase ${p.numero_phase}`}
                 checked={selectedProject === p.id}
                 onChange={() => setSelectedProject(p.id)}
               />
             ))}
          </form>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-sm font-bold text-foreground">{user?.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{user?.role}</span>
        </div>
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
          <User size={20} />
        </div>
      </div>
    </header>
  );
};

// --- Missing Layout Component ---
export const Layout = () => {
  const { user } = useAuth();
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const sidebarExpanded = sidebarPinned || sidebarHovered;

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await db.getProjects();
        setProjects(data);
      } catch (e) {
        console.error("Error loading projects:", e);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  // For drivers, we skip the sidebar/header and just show the content (usually FIFO)
  if (user?.role === 'DRIVER') {
    return (
      <main className="min-h-screen bg-background p-6">
        <Outlet />
      </main>
    );
  }

  return (
    <ProjectContext.Provider value={{ projects, selectedProject, setSelectedProject }}>
      <div className="min-h-screen bg-background">
        <Sidebar 
          expanded={sidebarExpanded} 
          setHovered={setSidebarHovered}
          pinned={sidebarPinned}
          togglePin={() => setSidebarPinned(!sidebarPinned)}
        />
        
        <div className={`transition-all duration-300 ${sidebarExpanded ? 'pl-64' : 'pl-20'}`}>
          <Header />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
};
