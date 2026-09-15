import { useEffect, useState } from 'react'
import { csvToItems, formatPrice, googleSheetCsvUrl, type CatalogItem } from './csv'
import { whatsappHref } from '../partners'

/* Modulo Catalogo: lista de productos leida de una planilla que edita el
   cliente, con un boton "Lo quiero" que abre WhatsApp con el producto ya
   escrito. Pensado para el perfil Vitrina (quien vende por Instagram) y
   reutilizable por comercios. Sin dashboard ni cuentas: la planilla es la
   interfaz de edicion. */

export type CatalogConfig = {
  type: 'catalogo'
  /** Titulo de la seccion. Default: "Catálogo". */
  title?: string
  /** Planilla de Google compartida con enlace. */
  sheetId?: string
  /** Pestana de la planilla. Sin esto, la primera. */
  sheetName?: string
  /** Alternativa a sheetId: cualquier URL que devuelva CSV (para pruebas o
      para un catalogo servido desde el propio sitio). */
  csvUrl?: string
  /** Numero al que va "Lo quiero". Si falta, el boton usa `fallbackHref`. */
  whatsapp?: string
  /** Texto del boton. Default: "Lo quiero". */
  cta?: string
}

type Props = {
  slug: string
  config: CatalogConfig
  /** A donde va "Lo quiero" si el modulo no tiene WhatsApp propio. */
  fallbackHref?: string
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; items: CatalogItem[]; stale: boolean }
  | { status: 'empty' }
  | { status: 'error' }

function sourceUrl(config: CatalogConfig): string | null {
  if (config.csvUrl) return config.csvUrl
  if (config.sheetId) return googleSheetCsvUrl(config.sheetId, config.sheetName)
  return null
}

/* Ultima lectura buena, por perfil. Si la planilla falla (columna borrada,
   permisos cambiados, Google caido), la pagina sigue mostrando lo ultimo
   que leyo bien en este dispositivo en vez de un error delante del cliente. */
function cacheKey(slug: string) {
  return `hito:catalogo:${slug}`
}
function readCache(slug: string): string | null {
  try { return localStorage.getItem(cacheKey(slug)) } catch { return null }
}
function writeCache(slug: string, csv: string) {
  try { localStorage.setItem(cacheKey(slug), csv) } catch { /* modo privado, sin espacio: da igual */ }
}

export default function CatalogModule({ slug, config, fallbackHref }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const url = sourceUrl(config)

  useEffect(() => {
    if (!url) { setState({ status: 'error' }); return }
    let cancelled = false

    const apply = (csv: string, stale: boolean) => {
      const items = csvToItems(csv)
      if (cancelled) return
      setState(items.length ? { status: 'ready', items, stale } : { status: 'empty' })
    }

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((csv) => {
        // Google devuelve HTML (login) si la planilla no esta compartida.
        if (/^\s*</.test(csv)) throw new Error('La planilla no es publica.')
        apply(csv, false)
        writeCache(slug, csv)
      })
      .catch((err) => {
        console.error(`Catalogo de "${slug}": no se pudo leer la planilla.`, err)
        const cached = readCache(slug)
        if (cached) {
          try { apply(cached, true); return } catch { /* cache corrupta: cae al error */ }
        }
        if (!cancelled) setState({ status: 'error' })
      })

    return () => { cancelled = true }
  }, [url, slug])

  const title = config.title ?? 'Catálogo'
  const cta = config.cta ?? 'Lo quiero'

  const hrefFor = (item: CatalogItem): string | undefined => {
    if (config.whatsapp) {
      return whatsappHref(config.whatsapp, `Hola! Quiero: ${item.name}${item.price ? ` (${formatPrice(item.price)})` : ''}`)
    }
    return fallbackHref
  }

  return (
    <section className="partner-catalog" aria-labelledby={`catalog-${slug}`}>
      <header className="partner-catalog-head">
        <h2 id={`catalog-${slug}`} className="partner-catalog-title">{title}</h2>
        {state.status === 'ready' && state.stale ? (
          <p className="partner-catalog-note">Mostrando la última versión guardada.</p>
        ) : null}
      </header>

      {state.status === 'loading' ? (
        <p className="partner-catalog-note">Cargando…</p>
      ) : null}

      {state.status === 'empty' ? (
        <p className="partner-catalog-note">Todavía no hay productos cargados.</p>
      ) : null}

      {state.status === 'error' ? (
        <p className="partner-catalog-note">El catálogo no está disponible en este momento.</p>
      ) : null}

      {state.status === 'ready' ? (
        <ul className="partner-catalog-grid">
          {state.items.map((item, i) => {
            const href = item.available ? hrefFor(item) : undefined
            return (
              <li key={`${item.name}-${i}`} className={`partner-product${item.available ? '' : ' partner-product--off'}`}>
                {item.photo ? (
                  <img className="partner-product-photo" src={item.photo} alt="" loading="lazy" />
                ) : (
                  <div className="partner-product-photo partner-product-photo--empty" aria-hidden="true" />
                )}
                <div className="partner-product-body">
                  <h3 className="partner-product-name">{item.name}</h3>
                  {item.description ? <p className="partner-product-desc">{item.description}</p> : null}
                  <div className="partner-product-row">
                    <span className="partner-product-price">
                      {item.available ? (item.price ? formatPrice(item.price) : 'Consultar') : 'Sin stock'}
                    </span>
                    {href ? (
                      <a className="partner-product-cta" href={href} target="_blank" rel="noreferrer noopener">
                        {cta} <span aria-hidden="true">→</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
