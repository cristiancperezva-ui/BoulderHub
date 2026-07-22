export function LegalView() {
  return (
    <div style={{
      maxWidth: 720,
      margin: '2rem auto',
      padding: '2rem',
      lineHeight: 1.8,
    }}>
      <h1 style={{ color: 'var(--color-accent-primary)', marginBottom: '1.5rem' }}>
        Aviso Legal
      </h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          1. Iniciativa Comunitaria
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          BoulderHub es una iniciativa independiente creada por y para la comunidad de escalada.
          No está afiliada, patrocinada, respaldada ni aprobada por ningún gimnasio de escalada
          en particular, incluyendo pero no limitado a gimnasios locales, nacionales o internacionales.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          2. Exención de Responsabilidad
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          La información, datos, y clasificaciones de dificultad (incluyendo la escala "V")
          proporcionados en esta plataforma son generados por la comunidad y tienen fines
          informativos y de referencia únicamente. Las dificultades asignadas a los bloques
          son subjetivas y pueden variar significativamente según la percepción individual,
          condiciones del muro, y otros factores. BoulderHub no garantiza la precisión,
          integridad o actualidad de la información publicada. El uso de la información
          proporcionada es bajo tu propio riesgo y responsabilidad.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          3. Privacidad y Datos
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Al utilizar BoulderHub, aceptas que tu información de perfil (nombre, email, y emoji)
          sea almacenada en nuestra base de datos. La información pública como nombre de usuario,
          emoji, estadísticas de escalada, y calificaciones será visible para otros usuarios
          de la comunidad con el fin de fomentar la interacción y el progreso colectivo.
          No compartimos tus datos con terceros ni utilizamos tu información con fines comerciales.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          4. Seguridad
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          La escalada es un deporte inherentemente peligroso. Las rutas, clasificaciones,
          y comentarios en BoulderHub no deben ser utilizados como única fuente de información
          para determinar la seguridad o dificultad de un bloque. Siempre utiliza tu propio
          juicio, calienta adecuadamente, y escala dentro de tus capacidades. BoulderHub no
          se hace responsable por lesiones o daños derivados del uso de la información
          publicada en la plataforma.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          5. Contacto
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Si tienes preguntas sobre este aviso legal, o deseas solicitar la eliminación
          de tus datos de la plataforma, por favor contacta al administrador de la comunidad.
        </p>
      </section>

      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.875rem',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingTop: '1.5rem',
      }}>
        Última actualización: Julio 2026
      </p>
    </div>
  );
}
