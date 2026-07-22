import { useState } from 'react';
import { Search, Shield } from 'lucide-react';
import type { UserRole } from '@/types';

interface MockUser {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export function AdminUsersView() {
  const [search, setSearch] = useState('');
  const [users] = useState<MockUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setUsers] = useState<MockUser[]>([]);

  const changeRole = (uid: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
  };

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Gestión de Usuarios
      </h1>

      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'var(--color-bg-base)',
          border: '1px solid var(--color-border-default)',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
        }}>
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <Shield size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>Los usuarios aparecerán aquí cuando se conecten por primera vez.</p>
            <p style={{ fontSize: '0.875rem' }}>Usa la búsqueda para encontrar usuarios específicos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((user) => (
              <div key={user.uid} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-base)',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {user.displayName}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      background: user.role === 'admin' ? 'rgba(232,125,62,0.15)' :
                        user.role === 'routesetter' ? 'rgba(74,158,110,0.15)' : 'rgba(90,155,213,0.15)',
                      color: user.role === 'admin' ? 'var(--color-accent-primary)' :
                        user.role === 'routesetter' ? 'var(--color-state-success)' : 'var(--color-state-info)',
                      fontWeight: 600,
                    }}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'routesetter' ? 'Ruteador' : 'Escalador'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                    {user.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {(['climber', 'routesetter', 'admin'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => changeRole(user.uid, role)}
                      style={{
                        padding: '0.375rem 0.625rem',
                        background: user.role === role ? 'var(--color-bg-hover)' : 'transparent',
                        color: user.role === role ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                        border: '1px solid',
                        borderColor: user.role === role ? 'var(--color-accent-primary)' : 'var(--color-border-default)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: user.role === role ? 600 : 400,
                      }}
                    >
                      {role === 'admin' ? 'Admin' : role === 'routesetter' ? 'Ruteador' : 'Escalador'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
