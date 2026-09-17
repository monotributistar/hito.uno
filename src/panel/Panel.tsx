import { useEffect, useState } from 'react'
import { kindInfo } from './panel-data'

/* Panel Lite: el cliente ve el Hito que tiene y elige a donde apunta.
   Una pantalla, un campo por objeto, un boton. Nada mas: el resto de las
   capas (toques, contenido, activaciones) se agregan alrededor de esto.
   Ver docs/PANEL.md. */

type HitoObject = { id: string; kind: string; label: string; to: string }
type Suggestion = { label: string; url: string }
type Me = {
  owner: string
  name: string
  page: string
  objects: HitoObject[]
  suggestions: Suggestion[]
}

type Props = { token: string }

export default function Panel({ token }: Props) {
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/panel/me', { headers: { 'X-Hito-Token': token } })
      .then(async (res) => {
        if (res.status === 401) throw new Error('Este link no es válido o ya fue reemplazado.')
        if (!res.ok) throw new Error('No pudimos cargar tu Hito. Probá de nuevo en un momento.')
        return (await res.json()) as Me
      })
      .then(setMe)
      .catch((err: Error) => setError(err.message))
  }, [token])

  useEffect(() => {
    if (me) document.title = `Tu Hito · ${me.name}`
  }, [me])

  return (
    <main className="panel-shell">
      <header className="panel-topbar">
        <a className="panel-brand" href="https://hito.uno">
          hito.uno
        </a>
        {me ? <span className="panel-who">{me.name}</span> : null}
      </header>

      {error ? (
        <section className="panel-card panel-card--message">
          <h1 className="panel-title">No pudimos abrir tu panel</h1>
          <p className="panel-text">{error}</p>
          <p className="panel-text">Escribinos y te mandamos un link nuevo.</p>
        </section>
      ) : null}

      {!me && !error ? <p className="panel-text panel-loading">Cargando tu Hito…</p> : null}

      {me ? (
        <>
          <div className="panel-head">
            <p className="panel-eyebrow">Tu Hito</p>
            <h1 className="panel-title">
              Vos decidís qué pasa
              <br />
              <em>después del toque.</em>
            </h1>
          </div>

          {me.objects.length === 0 ? (
            <section className="panel-card panel-card--message">
              <p className="panel-text">
                Todavía no tenés objetos cargados. En cuanto salga de producción el tuyo, aparece acá.
              </p>
            </section>
          ) : (
            me.objects.map((object) => (
              <ObjectCard
                key={object.id}
                token={token}
                object={object}
                suggestions={me.suggestions}
              />
            ))
          )}
        </>
      ) : null}

      <footer className="panel-footer">
        <p className="panel-footer-line">Un objeto, un gesto, una experiencia.</p>
      </footer>
    </main>
  )
}

type CardProps = { token: string; object: HitoObject; suggestions: Suggestion[] }

function ObjectCard({ token, object, suggestions }: CardProps) {
  const info = kindInfo(object.kind)
  const [value, setValue] = useState(object.to)
  const [saved, setSaved] = useState(object.to)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const dirty = value.trim() !== saved

  const save = async () => {
    setStatus('saving')
    setMessage(null)
    try {
      const res = await fetch(`/api/panel/objects/${encodeURIComponent(object.id)}`, {
        method: 'PATCH',
        headers: { 'X-Hito-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: value.trim() }),
      })
      const data = (await res.json()) as { to?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar.')
      setSaved(data.to ?? value.trim())
      setValue(data.to ?? value.trim())
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setMessage((err as Error).message)
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-object">
        {info.photo ? (
          <img className="panel-object-photo" src={info.photo} alt="" loading="lazy" />
        ) : (
          <div className="panel-object-photo panel-object-photo--empty" aria-hidden="true">
            {info.monogram}
          </div>
        )}
        <div className="panel-object-id">
          <strong>{object.label || info.label}</strong>
        </div>
      </div>

      <label className="panel-field">
        <span className="panel-label">Cuando alguien lo toca, se abre:</span>
        <input
          type="text"
          inputMode="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setStatus('idle')
            setMessage(null)
          }}
          placeholder="https://..."
          spellCheck={false}
        />
      </label>

      <div className="panel-suggestions" role="group" aria-label="Destinos sugeridos">
        {suggestions.map((s) => (
          <button
            key={s.url}
            type="button"
            className={value.trim() === s.url ? 'panel-chip is-current' : 'panel-chip'}
            onClick={() => {
              setValue(s.url)
              setStatus('idle')
              setMessage(null)
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="panel-actions">
        <button
          type="button"
          className="panel-save"
          onClick={save}
          disabled={!dirty || status === 'saving'}
        >
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
        <span className="panel-note" aria-live="polite">
          {status === 'ok' && !dirty
            ? 'Listo. Cambia en el próximo toque.'
            : status === 'error'
              ? message
              : dirty
                ? 'Sin guardar.'
                : 'Cambia en el próximo toque.'}
        </span>
      </div>

      {/* El id impreso no le dice nada al cliente mientras todo funciona, pero
          es lo primero que le vamos a pedir si nos escribe por un problema.
          Por eso queda al pie, sin competir con el nombre del objeto. */}
      <p className="panel-object-ref">
        Código del objeto: <span>{object.id}</span>
      </p>
    </section>
  )
}
