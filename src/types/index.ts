// ─── BoulderHub — Tipos globales ──────────────────────────────────────────────

/** Roles de usuario en la app */
export type UserRole = 'climber' | 'routesetter' | 'admin';

/** Perfil de usuario en Firestore */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  emoji: string | null;       // solo escaladores
  photoURL: string | null;
  createdAt: number;           // timestamp ms
  updatedAt: number;
}

/** Muro de escalada */
export interface Wall {
  id: string;
  name: string;
  createdAt: number;
  active: boolean;
  createdBy: string;           // uid
}

/** Categoría de color = nivel de dificultad */
export interface ColorCategory {
  id: string;
  name: string;                // ej: "Amarillo", "Verde", "Azul"
  color: string;               // hex
  difficulty: string;          // ej: "V0-V2"
  order: number;               // para ordenar en UI
  createdAt: number;
  active: boolean;
}

/** Tipo de intento de un escalador */
export type AttemptType = 'flash' | 'encadenado' | 'proyecto';

/** Rango de intentos (solo para encadenado) */
export type AttemptsRange = '2-5' | '5-10' | '10+';

/** Bloque publicado por un ruteador */
export interface Block {
  id: string;
  wallId: string;
  wallName: string;            // denormalizado
  routeSetterId: string;
  routeSetterName: string;     // denormalizado
  photoUrl: string;            // URL de Firebase Storage (WebP)
  categoryColorId: string;
  categoryColorName: string;   // denormalizado
  holdColors: string[];        // array de hex colors
  proposedDifficultyV: number; // 1-14
  comments: string;
  createdAt: number;
  active: boolean;
  // Métricas computadas (se actualizan con cada intento)
  avgRating: number;
  totalAttempts: number;
  flashCount: number;
  encadenadoCount: number;
  proyectoCount: number;
}

/** Intento de un escalador en un bloque (subcolección) */
export interface Attempt {
  userId: string;
  userName: string;            // denormalizado
  userEmoji: string | null;    // denormalizado
  type: AttemptType;
  attemptsRange: AttemptsRange | null; // solo si type === 'encadenado'
  proposedVMin: number | null;
  proposedVMax: number | null;
  rating: number | null;       // 1-5 estrellas
  createdAt: number;
  updatedAt: number;
}

/** Bloque resumido para incluir en un reto */
export interface ChallengeBlock {
  blockId: string;
  wallName: string;
  photoUrl: string;
  routeSetterName: string;
  proposedDifficultyV: number;
  categoryColorName: string;
}

/** Resultado de un escalador en un bloque dentro de un reto */
export interface ChallengeBlockResult {
  blockId: string;
  type: AttemptType;
  attemptsRange: AttemptsRange | null;
}

/** Reto (pack de bloques) */
export interface Challenge {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;         // denormalizado
  creatorEmoji: string | null; // denormalizado
  blockIds: string[];
  blocks: ChallengeBlock[];    // denormalizado
  avgRating: number;
  totalResults: number;
  createdAt: number;
  active: boolean;
}

/** Resultado completo de un escalador en un reto */
export interface ChallengeResult {
  userId: string;
  userName: string;            // denormalizado
  userEmoji: string | null;    // denormalizado
  completedBlocks: ChallengeBlockResult[];
  score: number;
  rating: number | null;       // 1-5 estrellas (votación del reto)
  createdAt: number;
}

/** Voto de un escalador a un reto */
export interface ChallengeRating {
  userId: string;
  rating: number;              // 1-5
  createdAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type FirestoreDoc<T> = T & { id: string };
