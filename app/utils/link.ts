import type MarkdownIt from "markdown-it";

function toHostname(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    return new URL(input).hostname.toLowerCase();
  } catch {
    try {
      return new URL(`https://${input}`).hostname.toLowerCase();
    } catch {
      return "";
    }
  }
}

function normalizeHttpUrl(value: string) {
  const input = value.trim();
  if (!input) return "";
  if (input.startsWith("//")) return `https:${input}`;
  return input;
}

function removeTokenAttr(token: any, name: string) {
  const index = token.attrIndex(name);
  if (index >= 0 && Array.isArray(token.attrs)) token.attrs.splice(index, 1);
}

export function resolveSiteHostname(siteUrl: string | null | undefined, _fallbackUrl = "") {
  const primary = toHostname(String(siteUrl || ""));
  if (primary) return primary;
  // Keep SSR/CSR deterministic: avoid request-host fallback that can differ behind proxy,
  // which may cause hydration mismatches when external-link rendering depends on hostname.
  return "";
}

export function isExternalSiteLink(href: string | null | undefined, siteHostname: string) {
  const input = String(href || "").trim();
  if (!input) return false;
  if (!/^https?:\/\//i.test(input) && !input.startsWith("//")) return false;

  try {
    const parsed = new URL(normalizeHttpUrl(input));
    const linkHostname = parsed.hostname.toLowerCase();
    if (!linkHostname) return false;
    if (!siteHostname) return true;
    return linkHostname !== siteHostname.toLowerCase();
  } catch {
    return false;
  }
}

export function installMarkdownExternalLinkRule(markdown: MarkdownIt, getSiteHostname: () => string) {
  const defaultRender =
    markdown.renderer.rules.link_open
    || ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const href = token.attrGet("href") || "";
    const external = isExternalSiteLink(href, getSiteHostname());

    if (!external) {
      removeTokenAttr(token, "target");
      removeTokenAttr(token, "rel");
      return defaultRender(tokens, index, options, env, self);
    }

    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");

    const className = token.attrGet("class") || "";
    const classes = className
      .split(/\s+/g)
      .map((item: string) => item.trim())
      .filter(Boolean);
    if (!classes.includes("external-link")) classes.push("external-link");
    token.attrSet("class", classes.join(" "));

    return defaultRender(tokens, index, options, env, self);
  };
}
