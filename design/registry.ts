export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  type: 'custom' | 'daisy';
}

export const themes: Theme[] = [
  // Custom Themes
  { id: 'default', name: 'Default', isDark: false, type: 'custom' },
  { id: 'shadcn', name: 'Modern (Light)', isDark: false, type: 'custom' },
  { id: 'shadcn', name: 'Modern (Dark)', isDark: true, type: 'custom' }, // Logic handles toggle class
  { id: 'amber', name: 'Amber Soft (Light)', isDark: false, type: 'custom' },
  { id: 'amber', name: 'Amber Soft (Dark)', isDark: true, type: 'custom' },

  // DaisyUI Light Themes
  { id: 'light', name: 'Daisy Light', isDark: false, type: 'daisy' },
  { id: 'cupcake', name: 'Cupcake', isDark: false, type: 'daisy' },
  { id: 'bumblebee', name: 'Bumblebee', isDark: false, type: 'daisy' },
  { id: 'emerald', name: 'Emerald', isDark: false, type: 'daisy' },
  { id: 'corporate', name: 'Corporate', isDark: false, type: 'daisy' },
  { id: 'retro', name: 'Retro', isDark: false, type: 'daisy' },
  { id: 'cyberpunk', name: 'Cyberpunk', isDark: false, type: 'daisy' },
  { id: 'valentine', name: 'Valentine', isDark: false, type: 'daisy' },
  { id: 'garden', name: 'Garden', isDark: false, type: 'daisy' },
  { id: 'lofi', name: 'Lo-Fi', isDark: false, type: 'daisy' },
  { id: 'pastel', name: 'Pastel', isDark: false, type: 'daisy' },
  { id: 'fantasy', name: 'Fantasy', isDark: false, type: 'daisy' },
  { id: 'wireframe', name: 'Wireframe', isDark: false, type: 'daisy' },
  { id: 'cmyk', name: 'CMYK', isDark: false, type: 'daisy' },
  { id: 'autumn', name: 'Autumn', isDark: false, type: 'daisy' },
  { id: 'acid', name: 'Acid', isDark: false, type: 'daisy' },
  { id: 'lemonade', name: 'Lemonade', isDark: false, type: 'daisy' },
  { id: 'winter', name: 'Winter', isDark: false, type: 'daisy' },
  { id: 'nord', name: 'Nord', isDark: false, type: 'daisy' },

  // DaisyUI Dark Themes
  { id: 'dark', name: 'Daisy Dark', isDark: true, type: 'daisy' },
  { id: 'synthwave', name: 'Synthwave', isDark: true, type: 'daisy' },
  { id: 'halloween', name: 'Halloween', isDark: true, type: 'daisy' },
  { id: 'forest', name: 'Forest', isDark: true, type: 'daisy' },
  { id: 'aqua', name: 'Aqua', isDark: true, type: 'daisy' },
  { id: 'black', name: 'Black', isDark: true, type: 'daisy' },
  { id: 'luxury', name: 'Luxury', isDark: true, type: 'daisy' },
  { id: 'dracula', name: 'Dracula', isDark: true, type: 'daisy' },
  { id: 'business', name: 'Business', isDark: true, type: 'daisy' },
  { id: 'night', name: 'Night', isDark: true, type: 'daisy' },
  { id: 'coffee', name: 'Coffee', isDark: true, type: 'daisy' },
  { id: 'dim', name: 'Dim', isDark: true, type: 'daisy' },
  { id: 'sunset', name: 'Sunset', isDark: true, type: 'daisy' },
];