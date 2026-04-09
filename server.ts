import { createServer, type IncomingMessage } from "node:http"
import next from "next"
import httpProxy from "http-proxy"
import { getStudioInstance, getAllRunningStudios, isStudioReady, startStudio } from "./lib/studio-manager"
import { getWorkspacePath } from "./lib/workspace"

const port = parseInt(process.env.PORT || "3000", 10)
const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

const proxy = httpProxy.createProxyServer({ ws: true, selfHandleResponse: true })

// Suppress proxy errors (e.g. when studio is restarting)
proxy.on("error", (err, _req, res) => {
  console.error("[studio-proxy] proxy error:", err.message)
  if (res && "writeHead" in res) {
    const httpRes = res as import("node:http").ServerResponse
    if (!httpRes.headersSent) {
      httpRes.writeHead(502, { "Content-Type": "text/plain" })
      httpRes.end("Studio unavailable")
    }
  }
})

// Handle proxied responses — inject URL correction for studio HTML pages.
// Remotion reads window.location.pathname to determine the current composition.
// Without this, it sees "/studio-proxy/{sessionId}/" and fails to find a composition.
// We also patch pushState/replaceState so all subsequent URL changes keep the proxy prefix,
// ensuring Referer headers always contain /studio-proxy/{sessionId}/ for correct routing.
proxy.on("proxyRes", (proxyRes, req, res) => {
  const httpRes = res as import("node:http").ServerResponse
  const contentType = proxyRes.headers["content-type"] || ""
  const sessionId = (req as IncomingMessage & { __studioSession?: string }).__studioSession

  if (contentType.includes("text/html") && sessionId) {
    const chunks: Buffer[] = []
    proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk))
    proxyRes.on("end", () => {
      let body = Buffer.concat(chunks).toString("utf-8")
      // 1. replaceState('/') so Remotion sees "/" and auto-selects the first composition.
      // 2. Patch pushState/replaceState so future navigations stay under the proxy prefix,
      //    keeping Referer correct for all subsequent resource requests.
      const script = [
        "<script>(function(){",
        `var P="/studio-proxy/${sessionId}";`,
        'function f(u){return typeof u==="string"&&u.startsWith("/")&&!u.startsWith(P)?P+u:u}',
        // Patch history so navigations keep the proxy prefix in the URL
        "var _p=history.pushState.bind(history),_r=history.replaceState.bind(history);",
        "history.pushState=function(s,t,u){return _p(s,t,f(u))};",
        "history.replaceState=function(s,t,u){return _r(s,t,f(u))};",
        // Patch fetch so API calls (e.g. /api/render) go through the proxy
        "var _f=window.fetch;",
        "window.fetch=function(i,o){",
        'if(typeof i==="string"){i=f(i)}',
        "else if(i instanceof Request){var u=new URL(i.url);",
        'if(u.origin===location.origin&&u.pathname.startsWith("/")&&!u.pathname.startsWith(P)){',
        "i=new Request(P+u.pathname+u.search+u.hash,i)}}",
        "return _f.call(window,i,o)};",
        // Patch EventSource so SSE connections (e.g. /events) go through the proxy
        "var _E=window.EventSource;",
        'window.EventSource=function(u,o){return new _E(typeof u==="string"?f(u):u,o)};',
        "window.EventSource.prototype=_E.prototype;",
        "window.EventSource.CONNECTING=_E.CONNECTING;",
        "window.EventSource.OPEN=_E.OPEN;",
        "window.EventSource.CLOSED=_E.CLOSED;",
        // Patch XMLHttpRequest.open for legacy XHR calls
        "var _xo=XMLHttpRequest.prototype.open;",
        "XMLHttpRequest.prototype.open=function(m,u){",
        'arguments[1]=typeof u==="string"?f(u):u;',
        "return _xo.apply(this,arguments)};",
        // Patch HTMLMediaElement.src (audio/video tags)
        "var _ms=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');",
        "Object.defineProperty(HTMLMediaElement.prototype,'src',{set:function(u){",
        'return _ms.set.call(this,typeof u==="string"?f(u):u);},get:_ms.get});',
        // Patch HTMLImageElement.src (img tags)
        "var _is=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');",
        "Object.defineProperty(HTMLImageElement.prototype,'src',{set:function(u){",
        'return _is.set.call(this,typeof u==="string"?f(u):u);},get:_is.get});',
        // Patch HTMLScriptElement.src (script tags)
        "var _ss=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');",
        "Object.defineProperty(HTMLScriptElement.prototype,'src',{set:function(u){",
        'return _ss.set.call(this,typeof u==="string"?f(u):u);},get:_ss.get});',
        // Patch HTMLLinkElement.href (link tags for CSS)
        "var _lh=Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype,'href');",
        "Object.defineProperty(HTMLLinkElement.prototype,'href',{set:function(u){",
        'return _lh.set.call(this,typeof u==="string"?f(u):u);},get:_lh.get});',
        // Now set Remotion's visible path to "/" so it auto-selects the first composition
        '_r(null,"","/");',
        "})()</script>",
      ].join("")
      body = body.replace("<head>", "<head>" + script)
      const headers = { ...proxyRes.headers }
      headers["content-length"] = String(Buffer.byteLength(body))
      httpRes.writeHead(proxyRes.statusCode || 200, headers)
      httpRes.end(body)
    })
    return
  }

  // Non-HTML responses: pipe through unchanged
  httpRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
  proxyRes.pipe(httpRes)
})

const PROXY_REGEX = /\/studio-proxy\/([^/]+)/
const STATIC_HASH_REGEX = /^\/static-([a-f0-9]+)\//

// Track which static-hash belongs to which session.
// Populated when a request is matched via direct-path or Referer strategy.
const HASH_MAP_KEY = "__carocut_static_hash_map__" as const

function getStaticHashMap(): Map<string, string> {
  if (!(globalThis as Record<string, unknown>)[HASH_MAP_KEY]) {
    ;(globalThis as Record<string, unknown>)[HASH_MAP_KEY] = new Map<string, string>()
  }
  return (globalThis as Record<string, unknown>)[HASH_MAP_KEY] as Map<string, string>
}

async function resolveProxy(req: IncomingMessage): Promise<{ sessionId: string; path: string; port: number } | null> {
  const url = req.url || ""

  // 1. Direct path match: /studio-proxy/{sessionId}/...
  const pathMatch = url.match(/^\/studio-proxy\/([^/]+)(?:\/(.*))?$/)
  if (pathMatch) {
    const [, sessionId, rest = ""] = pathMatch
    let instance = getStudioInstance(sessionId)

    // Auto-restart if idle timeout stopped the studio
    if (!instance && isStudioReady(sessionId)) {
      console.log(`[studio-proxy] Auto-restarting idle studio for session ${sessionId}`)
      instance = await startStudio(sessionId, getWorkspacePath(sessionId))
    }

    if (instance?.status === "running") {
      return { sessionId, path: "/" + rest, port: instance.port }
    }
    return null
  }

  // 2. Referer-based match: the browser requests /bundle.js but Referer is /studio-proxy/{sessionId}/...
  //    This handles absolute-path assets loaded by the Studio HTML page inside the iframe.
  const referer = req.headers.referer
  if (referer) {
    const refMatch = referer.match(PROXY_REGEX)
    if (refMatch) {
      const sessionId = refMatch[1]
      const instance = getStudioInstance(sessionId)
      if (instance?.status === "running") {
        // Capture static hash → session mapping when possible
        const hm = url.match(STATIC_HASH_REGEX)
        if (hm) {
          getStaticHashMap().set(hm[1], sessionId)
        }
        return { sessionId, path: url, port: instance.port }
      }
    }
  }

  // 3. Static-hash fallback: Remotion uses pushState to navigate to /{compositionId},
  //    so the Referer no longer contains /studio-proxy/{sessionId}/.
  //    Match /static-{hash}/... URLs by hash lookup or single-studio fallback.
  const hashMatch = url.match(STATIC_HASH_REGEX)
  if (hashMatch) {
    const hash = hashMatch[1]
    const hashMap = getStaticHashMap()

    // 3a. Known hash → session mapping
    const mappedSessionId = hashMap.get(hash)
    if (mappedSessionId) {
      const instance = getStudioInstance(mappedSessionId)
      if (instance?.status === "running") {
        return { sessionId: mappedSessionId, path: url, port: instance.port }
      }
      // Stale mapping — studio stopped
      hashMap.delete(hash)
    }

    // 3b. Single running studio — unambiguous, use it
    const running = getAllRunningStudios()
    if (running.length === 1) {
      hashMap.set(hash, running[0].sessionId) // cache for subsequent requests
      return { sessionId: running[0].sessionId, path: url, port: running[0].port }
    }
  }

  // 4. Remotion dev-server paths (HMR, events, etc.) that use absolute URLs.
  //    Next.js uses /_next/ for its own HMR, so /__webpack_hmr is Remotion-only.
  if (url.startsWith("/__webpack_hmr")) {
    const running = getAllRunningStudios()
    if (running.length === 1) {
      return { sessionId: running[0].sessionId, path: url, port: running[0].port }
    }
  }

  return null
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const target = await resolveProxy(req)
    if (target) {
      // Tag the request so proxyRes can identify studio HTML responses
      ;(req as IncomingMessage & { __studioSession?: string }).__studioSession = target.sessionId
      req.url = target.path
      proxy.web(req, res, { target: `http://127.0.0.1:${target.port}` })
      return
    }
    handle(req, res)
  })

  // WebSocket upgrade for Remotion Studio HMR
  server.on("upgrade", async (req, socket, head) => {
    const target = await resolveProxy(req)
    if (target) {
      req.url = target.path
      proxy.ws(req, socket, head, { target: `http://127.0.0.1:${target.port}` })
      return
    }
    // Let Next.js handle its own WebSocket upgrades (HMR in dev mode)
  })

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Server listening at http://0.0.0.0:${port} (${dev ? "development" : "production"})`)
  })
})
