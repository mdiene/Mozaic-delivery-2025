
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
  Briefcase,
  Search,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  Wrench,
  Users,
  UserCheck,
  Activity,
  UserPlus
} from 'lucide-react';
import { db } from '../services/db';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getPhaseColor } from '../lib/colors';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  const validChildren = React.Children.toArray(children).filter(child => isValidElement(child));
  if (validChildren.length === 0) return null;

  return (
    <li className="flex flex-col">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all cursor-pointer group ${isActive ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Icon size={20} className="shrink-0" />
          <span className={`${expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden'} whitespace-nowrap font-medium`}>
            {label}
          </span>
        </div>
        {expanded && (
           <ChevronRight size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} shrink-0 text-muted-foreground`} />
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="menu gap-1 pl-4 mt-1 border-l border-border/50 ml-6">
              {children}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
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
  const location = useLocation();
  
  if (user?.role === 'DRIVER') return null;

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isVisitor = user?.role === 'VISITOR';

  return (
    <aside 
      className={`fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border shadow-sm ${expanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/30 shrink-0">
            M
          </div>
          {expanded && (
            <div className="flex flex-col animate-fade-in whitespace-nowrap overflow-hidden">
                <span className="font-bold text-lg tracking-tight text-foreground leading-tight">
                MASAE
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Logistics</span>
            </div>
          )}
        </div>
        
        {/* Pin Button */}
        {expanded && (
           <button 
             onClick={togglePin}
             className={`p-1.5 rounded-full hover:bg-secondary transition-colors ${pinned ? 'text-primary' : 'text-muted-foreground'}`}
           >
              {pinned ? <Pin size={16} className="fill-current" /> : <Circle size={16} />}
           </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-3 overflow-y-auto h-[calc(100vh-140px)] no-scrollbar">
        <ul className="flex flex-col gap-1">
          
          <li className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 mb-2 mt-4">
             <span className={expanded ? 'opacity-100 transition-opacity' : 'opacity-0'}>Menu</span>
          </li>

          {(isAdmin || isVisitor) && (
            <li>
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`
                }
              >
                <LayoutDashboard size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden font-medium'}>Tableau de bord</span>
              </NavLink>
            </li>
          )}

          {(isAdmin || isVisitor) && (
            <li>
              <NavLink 
                to="/allocations"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`
                }
              >
                <Map size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden font-medium'}>Allocations</span>
              </NavLink>
            </li>
          )}

          {(isAdmin || isManager || isVisitor) && (
            <SidebarSubmenu label="Production" icon={Factory} basePath="/production" expanded={expanded}>
               <li><NavLink to="/production" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Package size={16} className="shrink-0" /><span className="truncate">Ensachage</span></NavLink></li>
               <li><NavLink to="/production/purchases" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><ShoppingCart size={16} className="shrink-0" /><span className="truncate">Achats & Dépenses</span></NavLink></li>
               <li><NavLink to="/production/screening" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Grid size={16} className="shrink-0" /><span className="truncate">Cribblage</span></NavLink></li>
               <li><NavLink to="/production/excavation" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><HardHat size={16} className="shrink-0" /><span className="truncate">Excavation</span></NavLink></li>
            </SidebarSubmenu>
          )}

          <SidebarSubmenu label="Logistique" icon={Package} basePath="/logistics" expanded={expanded}>
             <li><NavLink to="/logistics/fifo" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><ScanBarcode size={16} className="shrink-0" /><span className="truncate">File d'attente (FIFO)</span></NavLink></li>
             {(isAdmin || isVisitor) && <li><NavLink to="/logistics/dispatch" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Package size={16} className="shrink-0" /><span className="truncate">Expéditions</span></NavLink></li>}
             {(isAdmin || isManager || isVisitor) && <li><NavLink to="/logistics/expenses" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Receipt size={16} className="shrink-0" /><span className="truncate">Note de frais</span></NavLink></li>}
          </SidebarSubmenu>

          {(isAdmin || isVisitor) && (
            <li>
              <NavLink to="/fleet" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                <Truck size={20} className="shrink-0" />
                <span className={expanded ? 'opacity-100 transition-opacity duration-200' : 'opacity-0 w-0 overflow-hidden font-medium'}>Parc Auto</span>
              </NavLink>
            </li>
          )}

          <SidebarSubmenu label="Rapports" icon={Eye} basePath="/views" expanded={expanded}>
              <li><NavLink to="/views?tab=bon_livraison" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><FileText size={16} className="shrink-0" /><span className="truncate">Bon de Livraison</span></NavLink></li>
              {(isAdmin || isVisitor) && <li><NavLink to="/views?tab=fin_cession" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Gift size={16} className="shrink-0" /><span className="truncate">Fin de Cession</span></NavLink></li>}
          </SidebarSubmenu>

          <SidebarSubmenu label="Réseau" icon={Network} basePath="/network" expanded={expanded}>
              {(isAdmin || isVisitor) && <li><NavLink to="/network/map" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Map size={16} className="shrink-0" /><span className="truncate">Carte</span></NavLink></li>}
              {(isAdmin || isManager || isVisitor) && <li><NavLink to="/network/itinerary" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Navigation size={16} className="shrink-0" /><span className="truncate">Itinéraire</span></NavLink></li>}
              {(isAdmin || isVisitor) && <li><NavLink to="/network/global" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Globe size={16} className="shrink-0" /><span className="truncate">Vue Globale</span></NavLink></li>}
          </SidebarSubmenu>

          {(isAdmin || isVisitor) && (
            <SidebarSubmenu label="Administration" icon={Users} basePath="/admin" expanded={expanded}>
               <li><NavLink to="/admin/dashboard" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Activity size={16} className="shrink-0" /><span className="truncate">Tableau de bord</span></NavLink></li>
               <li><NavLink to="/admin/personnel" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><UserCheck size={16} className="shrink-0" /><span className="truncate">Gestion Personnel</span></NavLink></li>
            </SidebarSubmenu>
          )}

          {(isAdmin || isVisitor) && (
            <SidebarSubmenu label="HQSE" icon={ShieldCheck} basePath="/hqse" expanded={expanded}>
               <li><NavLink to="/hqse" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Activity size={16} className="shrink-0" /><span className="truncate">Dashboard</span></NavLink></li>
               <li><NavLink to="/hqse/allocations" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Gift size={16} className="shrink-0" /><span className="truncate">Dotations</span></NavLink></li>
               <li><NavLink to="/hqse/dotations" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><HardHat size={16} className="shrink-0" /><span className="truncate">Contrôle</span></NavLink></li>
            </SidebarSubmenu>
          )}

          {(isAdmin || isVisitor) && (
            <SidebarSubmenu label="Paramètres" icon={Settings} basePath="/settings" expanded={expanded}>
               <li><NavLink to="/settings" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Database size={16} className="shrink-0" /><span className="truncate">Système</span></NavLink></li>
               <li><NavLink to="/settings/admin" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-primary font-semibold' : 'text-sidebar-foreground/70 hover:text-foreground'}`}><Briefcase size={16} className="shrink-0" /><span className="truncate">Administratif</span></NavLink></li>
            </SidebarSubmenu>
          )}
        </ul>
      </nav>

      {/* Footer / User Profile - Removed Logout Section as requested */}
      <div className="absolute bottom-0 w-full p-4 border-t border-sidebar-border/50">
        <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${expanded ? 'bg-sidebar-accent' : ''}`}>
          <div className="relative shrink-0">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                <User size={18} />
             </div>
             <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar"></span>
          </div>
          {expanded && (
            <div className="flex flex-col overflow-hidden animate-fade-in">
              <span className="truncate text-sm font-bold text-foreground">{user?.name}</span>
              <span className="truncate text-[10px] text-muted-foreground uppercase font-semibold">{user?.role}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

// --- Missing Header Component ---
const Header = () => {
  const { selectedProject, setSelectedProject, projects } = useProject();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const visibleProjects = projects.filter(p => p.project_visibility !== false);

  return (
    <header className="h-16 bg-card/80 border-b border-border px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        {/* User Profile & Exit Button - Moved to top left as requested */}
        <div className="flex items-center gap-3 pr-4 border-r border-border">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground whitespace-nowrap">{user?.name}</span>
          </div>
          <button 
            onClick={logout} 
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-1" 
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Search Bar Mock */}
        <div className="relative max-w-xs w-full hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher... [CTRL + K]" 
            className="w-full bg-secondary/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg ml-4">
          <div className="px-2 text-muted-foreground">
            <Filter size={14} />
          </div>
          <div className="flex gap-1">
             <button 
               onClick={() => setSelectedProject('all')}
               className={`px-3 py-1 text-xs rounded-md transition-all ${selectedProject === 'all' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
             >
               Toutes
             </button>
             {visibleProjects.map(p => (
               <button
                 key={p.id}
                 onClick={() => setSelectedProject(p.id)}
                 className={`px-3 py-1 text-xs rounded-md transition-all ${selectedProject === p.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 Phase {p.numero_phase}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-card"></span>
        </button>
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
        // Site-wide components only get visible projects
        const data = await db.getProjects(true);
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
