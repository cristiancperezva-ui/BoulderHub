// ─── Internacionalización simple (ES/EN) ──────────────────────────────────────

export type Lang = 'es' | 'en';

const translations: Record<string, { es: string; en: string }> = {
  // Global
  'app.name': { es: 'BoulderHub', en: 'BoulderHub' },
  'app.tagline': { es: 'Comunidad de Escalada', en: 'Climbing Community' },
  'app.loading': { es: 'Cargando...', en: 'Loading...' },
  'app.error': { es: 'Error', en: 'Error' },
  'app.save': { es: 'Guardar', en: 'Save' },
  'app.cancel': { es: 'Cancelar', en: 'Cancel' },
  'app.delete': { es: 'Eliminar', en: 'Delete' },
  'app.create': { es: 'Crear', en: 'Create' },
  'app.edit': { es: 'Editar', en: 'Edit' },
  'app.back': { es: 'Volver', en: 'Back' },
  'app.export': { es: 'Exportar', en: 'Export' },
  'app.download': { es: 'Descargar', en: 'Download' },
  'app.search': { es: 'Buscar', en: 'Search' },
  'app.filter': { es: 'Filtrar', en: 'Filter' },
  'app.noData': { es: 'Sin datos', en: 'No data' },

  // Auth
  'auth.login.google': { es: 'Iniciar sesión con Google', en: 'Sign in with Google' },
  'auth.login.title': { es: 'Bienvenido a BoulderHub', en: 'Welcome to BoulderHub' },
  'auth.login.subtitle': { es: 'Inicia sesión para unirte a la comunidad', en: 'Sign in to join the community' },
  'auth.logout': { es: 'Cerrar sesión', en: 'Sign out' },
  'auth.login.required': { es: 'Debes iniciar sesión para acceder', en: 'You must sign in to access' },

  // Roles
  'role.climber': { es: 'Escalador', en: 'Climber' },
  'role.routesetter': { es: 'RouteSetter', en: 'Route Setter' },
  'role.admin': { es: 'Administrador', en: 'Administrator' },

  // Navigation
  'nav.dashboard': { es: 'Panel', en: 'Dashboard' },
  'nav.blocks': { es: 'Bloques', en: 'Blocks' },
  'nav.challenges': { es: 'Retos', en: 'Challenges' },
  'nav.metrics': { es: 'Mis Métricas', en: 'My Metrics' },
  'nav.profile': { es: 'Perfil', en: 'Profile' },
  'nav.walls': { es: 'Muros', en: 'Walls' },
  'nav.categories': { es: 'Categorías', en: 'Categories' },
  'nav.users': { es: 'Usuarios', en: 'Users' },
  'nav.legal': { es: 'Aviso Legal', en: 'Legal Notice' },

  // Blocks
  'block.flash': { es: 'Flash ✅', en: 'Flash ✅' },
  'block.encadenado': { es: 'Encadenado 🧗', en: 'Sent 🧗' },
  'block.proyecto': { es: 'Proyecto 🎯', en: 'Project 🎯' },
  'block.attempts.range': { es: 'Rango de intentos', en: 'Attempts range' },
  'block.difficulty': { es: 'Dificultad propuesta', en: 'Proposed difficulty' },
  'block.rating': { es: 'Calificación', en: 'Rating' },
  'block.photo': { es: 'Foto del bloque', en: 'Block photo' },
  'block.upload.photo': { es: 'Subir foto', en: 'Upload photo' },
  'block.comments': { es: 'Comentarios', en: 'Comments' },
  'block.holdColors': { es: 'Colores de presas', en: 'Hold colors' },
  'block.category': { es: 'Categoría de color', en: 'Color category' },
  'block.wall': { es: 'Muro', en: 'Wall' },
  'block.routeSetter': { es: 'RouteSetter', en: 'Route Setter' },
  'block.date': { es: 'Fecha', en: 'Date' },

  // Challenges
  'challenge.create': { es: 'Crear reto', en: 'Create challenge' },
  'challenge.name': { es: 'Nombre del reto', en: 'Challenge name' },
  'challenge.description': { es: 'Descripción', en: 'Description' },
  'challenge.selectBlocks': { es: 'Seleccionar bloques', en: 'Select blocks' },
  'challenge.do': { es: 'Hacer reto', en: 'Do challenge' },
  'challenge.score': { es: 'Puntaje', en: 'Score' },
  'challenge.leaderboard': { es: 'Tabla de posiciones', en: 'Leaderboard' },
  'challenge.rating': { es: 'Valoración', en: 'Rating' },
  'challenge.results': { es: 'Resultados', en: 'Results' },
  'challenge.noResults': { es: 'Aún no hay resultados', en: 'No results yet' },

  // Metrics
  'metrics.title': { es: 'Mis Métricas', en: 'My Metrics' },
  'metrics.totalBlocks': { es: 'Bloques marcados', en: 'Blocks marked' },
  'metrics.totalFlashes': { es: 'Flashes', en: 'Flashes' },
  'metrics.totalEncadenados': { es: 'Encadenados', en: 'Sent' },
  'metrics.totalProyectos': { es: 'Proyectos', en: 'Projects' },
  'metrics.avgRating': { es: 'Promedio estrellas', en: 'Avg stars' },
  'metrics.streak': { es: 'Racha actual', en: 'Current streak' },
  'metrics.activeDays': { es: 'Días activo (4 sem)', en: 'Active days (4w)' },
  'metrics.evolution': { es: 'Evolución por mes', en: 'Monthly evolution' },
  'metrics.difficultyProgression': { es: 'Progresión de dificultad', en: 'Difficulty progression' },
  'metrics.distributionType': { es: 'Distribución por tipo', en: 'Distribution by type' },
  'metrics.distributionColor': { es: 'Distribución por color', en: 'Distribution by color' },
  'metrics.distributionAttempts': { es: 'Rangos de intentos', en: 'Attempts ranges' },
  'metrics.ratingsGiven': { es: 'Calificaciones dadas', en: 'Ratings given' },
  'metrics.dateRange': { es: 'Rango de fechas', en: 'Date range' },
  'metrics.from': { es: 'Desde', en: 'From' },
  'metrics.to': { es: 'Hasta', en: 'To' },
  'metrics.exportCsv': { es: '📥 Descargar CSV', en: '📥 Download CSV' },

  // Legal
  'legal.title': { es: 'Aviso Legal', en: 'Legal Notice' },
  'legal.disclaimer': { es: 'BoulderHub es una iniciativa independiente de la comunidad de escalada. No está afiliada, patrocinada ni respaldada por ningún gimnasio de escalada en particular. Los datos proporcionados son con fines informativos y comunitarios. Al usar esta aplicación, aceptas que tu información sea almacenada y procesada según nuestra política de privacidad.', en: 'BoulderHub is an independent community initiative. It is not affiliated with, sponsored by, or endorsed by any particular climbing gym. Data provided is for informational and community purposes. By using this application, you agree that your information will be stored and processed according to our privacy policy.' },
};

/** Obtener traducción */
export function t(key: string, lang: Lang = 'es'): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang];
}

/** Hook simple para usar en componentes (se puede reemplazar con Context si crece) */
let currentLang: Lang = 'es';

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
}
