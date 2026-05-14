import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { parse, HTMLElement } from "npm:node-html-parser@7.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "IFRAME", "LINK", "META", "HEAD",
]);

const BOILERPLATE_TAGS = new Set(["NAV", "FOOTER", "HEADER"]);

const BLOCK_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "DIV", "SECTION", "ARTICLE",
  "MAIN", "BLOCKQUOTE", "PRE", "FIGURE", "FIGCAPTION", "TABLE", "THEAD",
  "TBODY", "TR", "TD", "TH", "UL", "OL", "LI", "DL", "DT", "DD",
  "DETAILS", "SUMMARY", "ASIDE",
]);

const PRESERVE_HTML_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "UL",
  "OL", "LI", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "A", "STRONG",
  "B", "EM", "I", "U", "CODE", "BR", "HR", "IMG", "FIGURE", "FIGCAPTION",
  "DL", "DT", "DD", "MARK", "SUP", "SUB", "SPAN",
]);

function extractMeta(doc: HTMLElement, name: string): string {
  const sel1 = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (sel1) {
    const c = sel1.getAttribute("content");
    if (c) return c.trim();
  }
  return "";
}

function extractTitle(doc: HTMLElement): string {
  const titleEl = doc.querySelector("title");
  return titleEl ? titleEl.textContent.trim().slice(0, 200) : "";
}

function shouldSkip(node: HTMLElement): boolean {
  if (SKIP_TAGS.has(node.rawTagName?.toUpperCase() || "")) return true;
  const role = node.getAttribute("role");
  if (role === "navigation" || role === "banner" || role === "contentinfo") return true;
  const cls = (node.getAttribute("class") || "").toLowerCase();
  const id = (node.getAttribute("id") || "").toLowerCase();
  const combined = cls + " " + id;
  const skipPatterns = [
    "cookie", "popup", "modal", "overlay", "sidebar", "widget", "advert",
    "ad-", "social-share", "share-button", "newsletter", "subscribe", "comment",
  ];
  for (const pat of skipPatterns) {
    if (combined.includes(pat)) return true;
  }
  return false;
}

function isBoilerplate(node: HTMLElement): boolean {
  return BOILERPLATE_TAGS.has(node.rawTagName?.toUpperCase() || "");
}

function findMainContent(doc: HTMLElement): HTMLElement {
  const candidates = [
    doc.querySelector("main"),
    doc.querySelector("article"),
    doc.querySelector('[role="main"]'),
    doc.querySelector("#content"),
    doc.querySelector("#main-content"),
    doc.querySelector(".content"),
    doc.querySelector(".post-content"),
    doc.querySelector(".article-content"),
    doc.querySelector(".entry-content"),
    doc.querySelector(".page-content"),
    doc.querySelector(".main-content"),
    doc.querySelector('[itemprop="articleBody"]'),
  ];
  for (const c of candidates) {
    if (c && c.textContent.trim().length > 100) return c;
  }
  const body = doc.querySelector("body");
  return body || doc;
}

function nodeToHtml(node: HTMLElement, depth: number = 0): string {
  if (depth > 50) return "";
  if (node.nodeType === 3) return node.textContent || "";
  if (node.nodeType !== 1) return "";
  const tag = node.rawTagName?.toUpperCase() || "";
  if (shouldSkip(node) || isBoilerplate(node)) return "";
  if (tag === "BR") return "<br>";
  if (tag === "HR") return "<hr>";
  if (tag === "IMG") {
    const src = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "";
    if (src) return `<img src="${src}" alt="${alt}">`;
    return "";
  }
  const children = node.childNodes as HTMLElement[];
  let inner = "";
  for (const child of children) inner += nodeToHtml(child, depth + 1);
  if (!inner.trim()) return "";
  if (PRESERVE_HTML_TAGS.has(tag)) {
    const tagLower = tag.toLowerCase();
    if (tag === "A") {
      const href = node.getAttribute("href") || "";
      return `<a href="${href}">${inner}</a>`;
    }
    return `<${tagLower}>${inner}</${tagLower}>`;
  }
  if (BLOCK_TAGS.has(tag)) return `\n${inner}\n`;
  return inner;
}

function cleanHtml(raw: string): string {
  return raw.replace(/\n{3,}/g, "\n\n").replace(/(<br\s*\/?>){3,}/gi, "<br><br>").trim();
}

function extractImages(doc: HTMLElement, baseUrl: string): string[] {
  const images: string[] = [];
  const imgEls = doc.querySelectorAll("img");
  for (const img of imgEls) {
    let src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    if (!src) continue;
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { const u = new URL(baseUrl); src = u.origin + src; } catch { continue; }
    }
    if (
      src.startsWith("http") && !src.includes("data:") && !src.includes("1x1") &&
      !src.includes("pixel") && !src.includes("tracking") && !src.includes("spacer")
    ) {
      if (!images.includes(src)) images.push(src);
    }
    if (images.length >= 15) break;
  }
  return images;
}

function resolveImageUrls(html: string, baseUrl: string): string {
  return html.replace(/(<img\s[^>]*src=")([^"]+)(")/gi, (_m, prefix, src, suffix) => {
    let resolved = src;
    if (resolved.startsWith("//")) resolved = "https:" + resolved;
    else if (resolved.startsWith("/")) {
      try { const u = new URL(baseUrl); resolved = u.origin + resolved; } catch { return prefix + src + suffix; }
    }
    return prefix + resolved + suffix;
  });
}

function resolveLinks(html: string, baseUrl: string): string {
  return html.replace(/(<a\s[^>]*href=")([^"]+)(")/gi, (_m, prefix, href, suffix) => {
    let resolved = href;
    if (resolved.startsWith("/")) {
      try { const u = new URL(baseUrl); resolved = u.origin + resolved; } catch { return prefix + href + suffix; }
    }
    return prefix + resolved + suffix;
  });
}

async function fetchAndExtract(url: string) {
  const parsedUrl = new URL(url);
  const response = await fetch(parsedUrl.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) throw new Error(`Failed to fetch ${url} (status ${response.status})`);

  const html = await response.text();
  const doc = parse(html, {
    comment: false,
    blockTextElements: { script: false, noscript: false, style: false, pre: true },
  });

  const title = extractTitle(doc);
  const description = extractMeta(doc, "description") || extractMeta(doc, "og:description");
  const ogImage = extractMeta(doc, "og:image");
  const metaTitle = extractMeta(doc, "og:title") || title;
  const keywords = extractMeta(doc, "keywords");

  const mainEl = findMainContent(doc);
  let contentHtml = nodeToHtml(mainEl);
  contentHtml = resolveImageUrls(contentHtml, parsedUrl.toString());
  contentHtml = resolveLinks(contentHtml, parsedUrl.toString());
  contentHtml = cleanHtml(contentHtml);

  const images = extractImages(doc, parsedUrl.toString());

  return {
    url: parsedUrl.toString(),
    title,
    meta_title: metaTitle,
    description,
    og_image: ogImage,
    keywords,
    content: contentHtml.slice(0, 30000),
    images,
    links: extractInternalLinks(doc, parsedUrl),
  };
}

function extractInternalLinks(doc: HTMLElement, baseUrl: URL): string[] {
  const links = new Set<string>();
  const anchors = doc.querySelectorAll("a[href]");
  for (const a of anchors) {
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const resolved = new URL(href, baseUrl.toString());
      // Only same-origin top-level pages (no deep paths, no query-only, no file extensions)
      if (
        resolved.origin === baseUrl.origin &&
        resolved.pathname !== baseUrl.pathname &&
        !resolved.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js)$/i)
      ) {
        // Top-level means pathname has at most one segment after /
        const segments = resolved.pathname.replace(/^\//, "").split("/").filter(Boolean);
        if (segments.length <= 1) {
          links.add(resolved.origin + resolved.pathname);
        }
      }
    } catch { /* skip */ }
    if (links.size >= 30) break;
  }
  return Array.from(links);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both single url (legacy) and multi-url mode
    const urls: string[] = [];
    if (typeof body.url === "string") {
      urls.push(body.url.trim());
    } else if (Array.isArray(body.urls)) {
      for (const u of body.urls.slice(0, 5)) {
        if (typeof u === "string" && u.trim()) urls.push(u.trim());
      }
    }

    const crawlTopLevel: boolean = body.crawl_top_level === true;

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all URLs
    const parsedUrls: URL[] = [];
    for (const u of urls) {
      try {
        const p = new URL(u);
        if (!["http:", "https:"].includes(p.protocol)) throw new Error("Invalid protocol");
        parsedUrls.push(p);
      } catch {
        return new Response(
          JSON.stringify({ error: `Invalid URL format: ${u}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch all primary URLs in parallel
    const primaryResults = await Promise.all(
      parsedUrls.map((p) => fetchAndExtract(p.toString()).catch((err) => ({
        url: p.toString(),
        error: err instanceof Error ? err.message : "Failed to fetch",
        title: "", meta_title: "", description: "", og_image: "",
        keywords: "", content: "", images: [], links: [],
      })))
    );

    // Collect unique crawl targets from all primary pages if crawl enabled
    let crawlResults: typeof primaryResults = [];
    if (crawlTopLevel) {
      const allLinks = new Map<string, string>(); // url -> origin
      for (const r of primaryResults) {
        if ("links" in r && Array.isArray(r.links)) {
          for (const link of r.links) {
            // Don't re-fetch already-fetched URLs
            if (!primaryResults.some((p) => p.url === link)) {
              allLinks.set(link, link);
            }
          }
        }
      }
      // Limit crawl to at most 8 additional pages
      const crawlTargets = Array.from(allLinks.keys()).slice(0, 8);
      crawlResults = await Promise.all(
        crawlTargets.map((u) => fetchAndExtract(u).catch((err) => ({
          url: u,
          error: err instanceof Error ? err.message : "Failed to fetch",
          title: "", meta_title: "", description: "", og_image: "",
          keywords: "", content: "", images: [], links: [],
        })))
      );
    }

    const allResults = [...primaryResults, ...crawlResults];

    // Merge all extracted content into a single combined result
    const successResults = allResults.filter((r) => !("error" in r) || (r as { error?: string }).error === undefined || r.content);

    // Use the first successful primary result as the base for metadata
    const base = successResults[0] || primaryResults[0];

    // Combine all content with labeled sections
    const combinedContent = allResults
      .filter((r) => r.content)
      .map((r) => {
        const label = r.title ? `<!-- Source: ${r.title} (${r.url}) -->` : `<!-- Source: ${r.url} -->`;
        return `${label}\n${r.content}`;
      })
      .join("\n\n")
      .slice(0, 50000);

    const allImages = Array.from(
      new Set(allResults.flatMap((r) => r.images || []))
    ).slice(0, 20);

    const allKeywords = Array.from(
      new Set(
        allResults
          .map((r) => r.keywords)
          .filter(Boolean)
          .join(", ")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      )
    ).join(", ");

    const result = {
      url: base.url,
      urls: allResults.map((r) => ({ url: r.url, title: r.title, error: ("error" in r ? (r as { error?: string }).error : undefined) })),
      title: base.title,
      meta_title: base.meta_title,
      description: base.description || allResults.find((r) => r.description)?.description || "",
      og_image: base.og_image || allResults.find((r) => r.og_image)?.og_image || "",
      keywords: allKeywords,
      content: combinedContent,
      images: allImages,
      crawled_count: crawlResults.length,
      total_sources: allResults.filter((r) => r.content).length,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
