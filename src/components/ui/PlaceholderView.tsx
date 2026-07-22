import { Construction } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  description?: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <Construction size={48} style={{ color: 'var(--color-accent-tertiary)', marginBottom: '1rem' }} />
      <h2 style={{
        color: 'var(--color-text-primary)',
        fontSize: '1.5rem',
        fontWeight: 600,
        margin: '0 0 0.5rem',
      }}>
        {title}
      </h2>
      {description && (
        <p style={{ color: 'var(--color-text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
          {description}
        </p>
      )}
    </div>
  );
}
