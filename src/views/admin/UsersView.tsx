import { useState, useEffect } from 'react';
import { Search, Shield, RefreshCw } from 'lucide-react';
import { getAllDocs, updateDocById } from '@/lib/firestore';
import type { UserProfile, UserRole, FirestoreDoc } from '@/types';

export function AdminUsersView() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<FirestoreDoc<UserProfile>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllDocs<UserProfile>('users', 'createdAt');
      setUsers(data);
    } catch (e) { console.warn('Users load:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleRole = async (uid: string, role: UserRole) => {
    const u = users.find(u => u.id === uid);
    if (!u) return;
    const has = u.roles.includes(role);
    const newRoles = has ? u.roles.filter(r => r !== role) : [...u.roles, role];
    try {
      await updateDocById<Partial<UserProfile>>('users', uid, { roles: newRoles });
      await loadUsers();
    } catch (e) { console.error(e); }
  };

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          Gestión de Usuarios
        </h1>
        <button onClick={loadUsers} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-default)', borderRadius: '0.5rem',
            color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} /> {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div style={{
        background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem', padding: '1.5rem',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
          border: '1px solid var(--color-border-default)', borderRadius: '0.5rem', marginBottom: '1.5rem',
        }}>
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando usuarios...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <Shield size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>{users.length === 0 ? 'Aún no hay usuarios registrados.' : 'Ningún usuario coincide con la búsqueda.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((u) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--color-bg-base)',
                borderRadius: '0.5rem', border: '1px solid var(--color-border-subtle)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {u.displayName}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px',
                      background: u.roles?.includes('admin') ? 'rgba(232,125,62,0.15)' :
                        u.roles?.includes('routesetter') ? 'rgba(74,158,110,0.15)' : 'rgba(90,155,213,0.15)',
                      color: u.roles?.includes('admin') ? 'var(--color-accent-primary)' :
                        u.roles?.includes('routesetter') ? 'var(--color-state-success)' : 'var(--color-state-info)',
                      fontWeight: 600,
                    }}>
                      {u.roles?.join(', ') || 'escalador'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                    {u.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  {(['climber', 'routesetter', 'admin'] as UserRole[]).map(r => {
                    const hasRole = u.roles?.includes(r) ?? false;
                    return (
                      <button key={r} onClick={() => toggleRole(u.id, r)}
                        style={{
                          padding: '0.375rem 0.625rem',
                          background: hasRole ? 'var(--color-bg-hover)' : 'transparent',
                          color: hasRole ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                          border: '1px solid', cursor: 'pointer', fontSize: '0.75rem',
                          borderColor: hasRole ? 'var(--color-accent-primary)' : 'var(--color-border-default)',
                          borderRadius: '0.375rem', fontWeight: hasRole ? 600 : 400,
                        }}
                      >
                        {r === 'admin' ? 'Admin' : r === 'routesetter' ? 'RouteSetter' : 'Escalador'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
