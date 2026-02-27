export interface InviteTemplate {
  id: string;
  name: string;
  preview: string; // emoji/icon for preview
  styles: InviteStyles;
}

export interface InviteStyles {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontDisplay: string;
  fontBody: string;
  borderRadius: string;
  cardOpacity: number;
  showPetals: boolean;
  petalEmoji: string;
  backgroundImageUrl?: string;
}

export const FONT_OPTIONS = [
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

export const TEMPLATES: InviteTemplate[] = [
  {
    id: "classic",
    name: "Classic Elegance",
    preview: "🌸",
    styles: {
      primaryColor: "#c9a96e",
      accentColor: "#d4a5a5",
      backgroundColor: "#faf8f5",
      textColor: "#3d3229",
      fontDisplay: "'Playfair Display', serif",
      fontBody: "'Lato', sans-serif",
      borderRadius: "1.5rem",
      cardOpacity: 0.9,
      showPetals: true,
      petalEmoji: "🌸",
    },
  },
  {
    id: "modern",
    name: "Modern Minimal",
    preview: "✨",
    styles: {
      primaryColor: "#1a1a1a",
      accentColor: "#666666",
      backgroundColor: "#ffffff",
      textColor: "#1a1a1a",
      fontDisplay: "'Lato', sans-serif",
      fontBody: "'Lato', sans-serif",
      borderRadius: "0.5rem",
      cardOpacity: 1,
      showPetals: false,
      petalEmoji: "✨",
    },
  },
  {
    id: "rustic",
    name: "Rustic Garden",
    preview: "🌿",
    styles: {
      primaryColor: "#6b7c5e",
      accentColor: "#a67c52",
      backgroundColor: "#f5f0e8",
      textColor: "#3a3a2e",
      fontDisplay: "Georgia, serif",
      fontBody: "'Lato', sans-serif",
      borderRadius: "1rem",
      cardOpacity: 0.85,
      showPetals: true,
      petalEmoji: "🍃",
    },
  },
  {
    id: "romantic",
    name: "Romantic Rose",
    preview: "🌹",
    styles: {
      primaryColor: "#c45b78",
      accentColor: "#e8a0b5",
      backgroundColor: "#fff5f7",
      textColor: "#4a2030",
      fontDisplay: "'Playfair Display', serif",
      fontBody: "'Lato', sans-serif",
      borderRadius: "2rem",
      cardOpacity: 0.9,
      showPetals: true,
      petalEmoji: "🌹",
    },
  },
  {
    id: "royal",
    name: "Royal Navy",
    preview: "👑",
    styles: {
      primaryColor: "#c9a96e",
      accentColor: "#1e3a5f",
      backgroundColor: "#0d1b2a",
      textColor: "#e8dcc8",
      fontDisplay: "'Playfair Display', serif",
      fontBody: "'Lato', sans-serif",
      borderRadius: "1rem",
      cardOpacity: 0.15,
      showPetals: true,
      petalEmoji: "⭐",
    },
  },
];

export const DEFAULT_STYLES: InviteStyles = TEMPLATES[0].styles;

export function getTemplateById(id: string): InviteTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function mergeStyles(template: string, customStyles: Partial<InviteStyles>): InviteStyles {
  const base = getTemplateById(template)?.styles ?? DEFAULT_STYLES;
  return { ...base, ...customStyles };
}
