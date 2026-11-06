/** News feed integration.
 *  Primary:  GNews.io (user-supplied API key, free tier 100 req/day).
 *  Fallback: rss2json.com public endpoint (no key, Google News RSS proxy).
 *  Articles are cached in localStorage per category for 2 hours.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Article {
  id: string          // derived from URL
  title: string
  description: string
  url: string
  image: string | null
  publishedAt: string // ISO-ish string
  source: string
  category: NewsCategory
}

export interface NewsCacheEntry {
  articles: Article[]
  fetchedAt: number
}

// ── Categories ─────────────────────────────────────────────────────────────

export type NewsCategory =
  | 'water'
  | 'agriculture'
  | 'environment'
  | 'technology'
  | 'health'

export interface CategoryConfig {
  id: NewsCategory
  label: string
  /** GNews search query (used when user has supplied an API key) */
  gNewsQuery: string
  /** Google News RSS topic tag or search term — used by rss2json fallback */
  rssSearch: string
  faIcon: string
}

export const NEWS_CATEGORIES: CategoryConfig[] = [
  {
    id: 'water',
    label: 'Water & Sanitation',
    gNewsQuery: 'water treatment OR water sanitation OR water quality OR WASH OR borehole',
    rssSearch: 'water sanitation treatment quality',
    faIcon: 'droplet',
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    gNewsQuery: 'irrigation farming agriculture water crop drought',
    rssSearch: 'irrigation agriculture farming drought',
    faIcon: 'seedling',
  },
  {
    id: 'environment',
    label: 'Environment',
    gNewsQuery: 'climate water environment rainfall flood drought Africa',
    rssSearch: 'climate environment water flood drought',
    faIcon: 'leaf',
  },
  {
    id: 'technology',
    label: 'Water Tech',
    gNewsQuery: 'water technology desalination smart water IoT sensor treatment plant',
    rssSearch: 'water technology desalination smart water',
    faIcon: 'microchip',
  },
  {
    id: 'health',
    label: 'Public Health',
    gNewsQuery: 'drinking water health cholera waterborne disease WHO sanitation',
    rssSearch: 'drinking water health waterborne disease WHO',
    faIcon: 'heart-pulse',
  },
]

// ── Cache helpers ──────────────────────────────────────────────────────────

const CACHE_TTL = 2 * 60 * 60 * 1000  // 2 hours

export function cacheKey(cat: NewsCategory): string {
  return `aquarho.news.${cat}`
}

export function loadCache(cat: NewsCategory): NewsCacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(cat))
    if (!raw) return null
    return JSON.parse(raw) as NewsCacheEntry
  } catch { return null }
}

export function saveCache(cat: NewsCategory, articles: Article[]): void {
  try {
    const entry: NewsCacheEntry = { articles, fetchedAt: Date.now() }
    localStorage.setItem(cacheKey(cat), JSON.stringify(entry))
  } catch { /* quota exceeded — skip */ }
}

export function isCacheStale(entry: NewsCacheEntry): boolean {
  return Date.now() - entry.fetchedAt > CACHE_TTL
}

// ── Slug / ID ──────────────────────────────────────────────────────────────

function makeId(url: string): string {
  // Short stable id from the URL so React keys stay consistent
  let h = 0
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

// ── GNews fetch (API key required) ────────────────────────────────────────

interface GNewsArticle {
  title: string
  description: string
  url: string
  image: string | null
  publishedAt: string
  source: { name: string; url: string }
}

interface GNewsResponse {
  totalArticles: number
  articles: GNewsArticle[]
}

export async function fetchFromGNews(
  cat: CategoryConfig,
  apiKey: string
): Promise<Article[]> {
  const params = new URLSearchParams({
    q:       cat.gNewsQuery,
    lang:    'en',
    max:     '10',
    sortby:  'publishedAt',
    apikey:  apiKey,
  })
  const url = `https://gnews.io/api/v4/search?${params}`
  const res = await fetch(url)
  if (res.status === 403 || res.status === 401)
    throw new Error('Invalid GNews API key. Check your key in News settings.')
  if (!res.ok)
    throw new Error(`GNews API error ${res.status}`)
  const data = await res.json() as GNewsResponse
  return data.articles.map((a) => ({
    id:          makeId(a.url),
    title:       a.title,
    description: a.description ?? '',
    url:         a.url,
    image:       a.image ?? null,
    publishedAt: a.publishedAt,
    source:      a.source.name,
    category:    cat.id,
  }))
}

// ── RSS2JSON fallback (no key) ─────────────────────────────────────────────

interface Rss2JsonItem {
  title: string
  description: string
  link: string
  thumbnail?: string
  enclosure?: { link?: string }
  pubDate: string
  author?: string
  categories?: string[]
}

interface Rss2JsonResponse {
  status: string
  feed: { title: string; link: string }
  items: Rss2JsonItem[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

export async function fetchFromRSS(cat: CategoryConfig): Promise<Article[]> {
  // Use Google News search RSS — no key required
  const googleRss = `https://news.google.com/rss/search?q=${encodeURIComponent(cat.rssSearch)}&hl=en&gl=US&ceid=US:en`
  const params = new URLSearchParams({
    rss_url: googleRss,
    api_key:  'public',  // rss2json public endpoint
    count:    '10',
    order_by: 'pubDate',
    order_dir: 'desc',
  })
  const res = await fetch(`https://api.rss2json.com/v1/api.json?${params}`)
  if (!res.ok) throw new Error(`RSS proxy error ${res.status}`)
  const data = await res.json() as Rss2JsonResponse
  if (data.status !== 'ok') throw new Error('RSS proxy returned non-ok status')

  return data.items.map((item) => ({
    id:          makeId(item.link),
    title:       stripHtml(item.title),
    description: stripHtml(item.description).slice(0, 220),
    url:         item.link,
    image:       item.thumbnail ?? item.enclosure?.link ?? null,
    publishedAt: item.pubDate,
    source:      item.author || data.feed.title || 'News',
    category:    cat.id,
  }))
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function fetchNews(
  cat: CategoryConfig,
  apiKey: string | null
): Promise<Article[]> {
  if (apiKey) {
    return fetchFromGNews(cat, apiKey)
  }
  return fetchFromRSS(cat)
}

// ── Relative time label ────────────────────────────────────────────────────

export function relativeTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const diffMs  = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)    return `${diffD}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
