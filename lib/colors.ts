
export const PHASE_COLORS = [
  { name: 'indigo', bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-600', soft: 'bg-indigo-50', softText: 'text-indigo-700', badge: 'badge-primary', hex: '#4f46e5' },
  { name: 'emerald', bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', soft: 'bg-emerald-50', softText: 'text-emerald-700', badge: 'badge-success', hex: '#059669' },
  { name: 'amber', bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600', soft: 'bg-amber-50', softText: 'text-amber-700', badge: 'badge-warning', hex: '#d97706' },
  { name: 'rose', bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-600', soft: 'bg-rose-50', softText: 'text-rose-700', badge: 'badge-error', hex: '#e11d48' },
  { name: 'sky', bg: 'bg-sky-600', text: 'text-white', border: 'border-sky-600', soft: 'bg-sky-50', softText: 'text-sky-700', badge: 'badge-info', hex: '#0284c7' },
  { name: 'violet', bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-600', soft: 'bg-violet-50', softText: 'text-violet-700', badge: 'badge-secondary', hex: '#7c3aed' },
  { name: 'orange', bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-600', soft: 'bg-orange-50', softText: 'text-orange-700', badge: 'badge-warning', hex: '#ea580c' },
  { name: 'teal', bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-600', soft: 'bg-teal-50', softText: 'text-teal-700', badge: 'badge-success', hex: '#0d9488' },
];

export const getPhaseColor = (phaseNumber: number | string) => {
  const num = typeof phaseNumber === 'string' ? parseInt(phaseNumber) : phaseNumber;
  if (isNaN(num) || num <= 0) return PHASE_COLORS[0];
  return PHASE_COLORS[(num - 1) % PHASE_COLORS.length];
};
