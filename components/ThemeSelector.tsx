import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme, COLOR_THEMES, ColorTheme } from '../contexts/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { colorTheme, setColorTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTheme = COLOR_THEMES.find((t) => t.id === colorTheme) || COLOR_THEMES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium transition-all shadow-xs"
        title="Changer le thème de couleur"
        type="button"
      >
        <Palette size={15} className="text-primary shrink-0" />
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full inline-block shrink-0 shadow-xs ring-1 ring-border"
            style={{ backgroundColor: activeTheme.color }}
          />
          <span className="hidden sm:inline font-semibold">{activeTheme.name}</span>
        </span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-popover text-popover-foreground border border-border shadow-lg py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
            Thème de couleur
          </div>
          <div className="flex flex-col gap-0.5 px-1">
            {COLOR_THEMES.map((theme) => {
              const isSelected = colorTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setColorTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-colors text-left ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:bg-muted/70 text-foreground font-medium'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full inline-block shrink-0 ring-2 ring-background shadow-xs"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span>{theme.name}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
