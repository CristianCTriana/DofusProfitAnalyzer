export function ConfigMissingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="max-w-[480px] rounded-2xl border border-border bg-surface p-8">
        <h1 className="mb-2 text-lg font-extrabold text-text-primary">Falta configurar Firebase</h1>
        <p className="mb-4 text-sm text-text-secondary">
          No encontré las credenciales del proyecto Firebase, así que la app no puede iniciar
          Auth ni Firestore.
        </p>
        <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>
            Copia <code className="rounded bg-surface-2 px-1.5 py-0.5 text-accent">.env.example</code> a{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-accent">.env.local</code>
          </li>
          <li>Completa los valores desde la consola de Firebase (Configuración del proyecto)</li>
          <li>Reinicia el servidor de desarrollo</li>
        </ol>
        <p className="text-xs text-text-muted">Este archivo nunca se sube a git.</p>
      </div>
    </div>
  );
}
