// ─── Tema BoulderHub — Paleta Deportiva Escalada ──────────────────────────────

export const theme = {
  colors: {
    // Tonos tierra y deportivos
    bg: {
      base: '#1C1512',       // marrón oscuro — fondo principal
      surface: '#2A211D',    // marrón superficie — tarjetas
      elevated: '#352B26',   // marrón elevado — modales
      hover: '#3F342E',      // hover en superficies
    },
    text: {
      primary: '#F5F0EB',    // crema claro — texto principal
      secondary: '#B8A99E',  // marrón claro — texto secundario
      muted: '#8A7A6E',      // marrón apagado — texto terciario
      inverse: '#1C1512',    // marrón oscuro — sobre colores brillantes
    },
    accent: {
      primary: '#E87D3E',    // naranja escalada — acciones principales
      primaryHover: '#D46D2E',
      secondary: '#4A9E6E',  // verde musgo — éxito, flash
      secondaryHover: '#3D8E5E',
      tertiary: '#D4A84B',   // amarillo mostaza — advertencia / encadenado
    },
    // Colores de dificultad (mapeo visual)
    difficulty: {
      yellow: '#F5D742',
      green: '#4ADE80',
      blue: '#60A5FA',
      red: '#F87171',
      purple: '#C084FC',
      black: '#374151',
      white: '#F3F4F6',
      orange: '#FB923C',
    },
    // Estados
    state: {
      success: '#4A9E6E',
      warning: '#D4A84B',
      error: '#D84C4C',
      info: '#5B9BD5',
    },
    border: {
      subtle: '#3A2F29',
      default: '#4A3D35',
      strong: '#5C4D43',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.3)',
    lg: '0 10px 15px rgba(0,0,0,0.3)',
    glow: '0 0 12px rgba(232,125,62,0.3)',
  },
} as const;

export type Theme = typeof theme;
