
import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  subLabel?: string;
  extraInfo?: React.ReactNode;
}

interface AdvancedSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}

export const AdvancedSelect: React.FC<AdvancedSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchable = true,
  className = "",
  required = false,
  disabled = false,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const searchLower = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(searchLower) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(searchLower))
    );
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`advance-select-toggle ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'ring-1 ring-primary border-primary' : ''}`}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={`truncate ${!selectedOption ? 'text-muted-foreground' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown size={16} className="text-muted-foreground shrink-0" />
      </button>

      {/* Hidden Native Input for Form Validation if needed */}
      <input 
        type="text" 
        className="sr-only" 
        required={required} 
        value={value} 
        onChange={()=>{}} 
        name={name}
        tabIndex={-1}
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="advance-select-menu">
          {searchable && (
            <div className="relative border-b border-border">
              <input
                ref={searchInputRef}
                type="text"
                className="advance-select-search pl-9"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}

          <div className="overflow-y-auto max-h-52">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`advance-select-option ${value === option.value ? 'selected' : ''}`}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate" data-title>{option.label}</span>
                    {option.subLabel && (
                      <span className="text-xs text-muted-foreground truncate">{option.subLabel}</span>
                    )}
                  </div>
                  {value === option.value && (
                    <Check size={16} className="text-primary shrink-0 ml-2" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Aucun résultat trouvé.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
