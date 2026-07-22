import { Link } from 'react-router-dom';
import { Mountain, Search, Filter } from 'lucide-react';
import { useState } from 'react';

export function ClimberBlocksView() {
  const [search, setSearch] = useState('');

  // TODO: Fetch from Firestore
  const blocks: { id: string; wallName: string; photoUrl: string; categoryColorName: string; proposedDifficultyV: number; avgRating: number; routeSetterName: string }[] = [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Bloques
      </h1>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-default)',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
      }}>
        <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar bloques por muro, color, dificultad..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <Filter size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0, cursor: 'pointer' }} />
      </div>

      {blocks.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '0.75rem',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <Mountain size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Aún no hay bloques publicados
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Los bloques aparecerán aquí cuando los ruteadores comiencen a publicar.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {blocks.map((block) => (
            <Link
              key={block.id}
              to={`/climber/blocks/${block.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                <div style={{
                  height: 180,
                  background: 'var(--color-bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.875rem',
                }}>
                  {block.photoUrl ? (
                    <img src={block.photoUrl} alt="Bloque" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    'Sin foto'
                  )}
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {block.wallName}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(232,125,62,0.15)',
                      color: 'var(--color-accent-primary)',
                      fontWeight: 600,
                    }}>
                      V{block.proposedDifficultyV}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    <span>{block.categoryColorName}</span>
                    <span>⭐ {block.avgRating.toFixed(1)} · {block.routeSetterName}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
