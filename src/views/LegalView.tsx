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
        </p>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Tratamos tus datos personales conforme a la normativa de protección de datos aplicable
          (incluyendo, cuando corresponda, la Ley 1581 de 2012 de Colombia y normas equivalentes
          en tu jurisdicción). Puedes ejercer tus derechos de acceso, corrección, actualización
          y eliminación de tus datos personales ("habeas data") en cualquier momento contactando
          al administrador de la comunidad (ver sección 5).
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          4. Uso Comercial de Datos Agregados y Alianzas con Gimnasios
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          BoulderHub podrá compartir, licenciar o comercializar <strong>estadísticas agregadas
          y/o anonimizadas</strong> de uso de la plataforma (por ejemplo: número de intentos por
          bloque o muro, distribución de grados V, frecuencia de visitas, popularidad de colores
          o categorías, tendencias de progreso de la comunidad) con gimnasios de escalada afiliados
          y otros terceros, con el fin de mejorar el diseño de rutas, la operación de los gimnasios
          y la experiencia general de la comunidad escaladora.
        </p>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Estos reportes agregados <strong>no identifican individualmente</strong> a los usuarios
          salvo que exista un consentimiento explícito adicional (por ejemplo, tablas de
          clasificación o rankings públicos dentro de la propia app, que ya son visibles para la
          comunidad conforme a la sección 3). BoulderHub no vende tu nombre, email, ni datos de
          contacto a terceros.
        </p>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Si prefieres que tu actividad quede excluida de los reportes agregados que se comparten
          con gimnasios, puedes solicitarlo escribiendo al administrador de la comunidad
          (sección 5); tu solicitud será aplicada en los siguientes reportes generados.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          5. Seguridad
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
          6. Contacto
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Si tienes preguntas sobre este aviso legal, deseas solicitar la eliminación
          de tus datos de la plataforma, o exclusión de los reportes agregados descritos
          en la sección 4, por favor contacta al administrador de la comunidad.
        </p>
      </section>

      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.875rem',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingTop: '1.5rem',
      }}>
        Última actualización: Agosto 2026. Este documento es una referencia informativa
        y no sustituye asesoría legal profesional; se recomienda revisión por un abogado
        antes de su uso comercial formal con gimnasios u otros socios.
      </p>
    </div>
  );
}
