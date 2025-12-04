import React, { useState } from 'react';
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
  Search
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Sidebar = () => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Allocations', path: '/allocations', icon: Map },
    { name: 'Logistics', path: '/logistics', icon: Package },
    { name: 'Fleet', path: '/fleet', icon: Truck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 z-50 h-screen bg-slate-900 text-white transition-all duration-300 ease-in-out ${expanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/30">
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
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400'
                }
              `}
            >
              <item.icon size={22} className={`${isActive ? 'text-white' : 'group-hover:text-emerald-400'} min-w-[22px]`} />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="absolute bottom-0 w-full border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-slate-300">
            <User size={20} />
          </div>
          {expanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">Admin User</span>
              <span className="truncate text-xs text-slate-500">Logistics Manager</span>
            </div>
          )}
          {expanded && (
            <button className="ml-auto text-slate-500 hover:text-red-400">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

const Header = () => {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md">
           <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center text-sm text-slate-500">
          <span className="hover:text-slate-800 cursor-pointer">Project Phase 1</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-slate-800">Overview</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search BL, Operator..." 
            className="h-9 w-64 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button className="relative rounded-full bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors">
          <Bell size={20} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-semibold text-xs">
          AD
        </div>
      </div>
    </header>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-20 transition-all duration-300">
        <Header />
        <main className="p-6 md:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};