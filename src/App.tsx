/**
 * Application shell.
 *
 * Deliberately close to empty: the project is initialised, the design is not
 * started. Sections in `src/sections` are structural stubs and are NOT composed
 * here yet — composing them would be a layout decision, and layout decisions
 * come after the visual concept.
 *
 * See `CLAUDE.md` → "Before writing complex visual code".
 */
export default function App() {
  return (
    <main className="u-shell u-shell--text" style={{ paddingBlock: 'var(--space-3xl)' }}>
      <h1
        style={{
          font: 'var(--weight-regular) var(--text-2xl)/var(--leading-tight) var(--font-display)',
        }}
      >
        Project initialised
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-md)' }}>
        Stack, architecture, design tokens and Claude skills are in place. The visual concept has
        not been designed yet — see <code>docs/ARCHITECTURE.md</code> and <code>CLAUDE.md</code>.
      </p>
    </main>
  );
}
