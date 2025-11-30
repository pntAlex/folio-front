type Env = Record<string, string | undefined>;

export type UmamiConfig = {
  scriptUrl: string;
  websiteId: string;
  enabled: boolean;
};

const defaultUmamiScriptUrl = "http://localhost:3001/script.js";
const defaultUmamiWebsiteId = "77cf6a85-6f14-474e-a783-a917526bb83c";

export const resolveUmamiConfig = (env: Env): UmamiConfig => {
  const scriptUrl = (env.UMAMI_SCRIPT_URL ?? defaultUmamiScriptUrl).trim();
  const websiteId = (env.UMAMI_WEBSITE_ID ?? defaultUmamiWebsiteId).trim();
  const enabled = Boolean(scriptUrl && websiteId);

  return { scriptUrl, websiteId, enabled };
};

const buildUmamiTag = (config: UmamiConfig) =>
  `<script defer src="${config.scriptUrl}" data-website-id="${config.websiteId}"></script>`;

const umamiScriptPattern =
  /<script[^>]*\bdata-website-id="[^"]*"[^>]*>\s*<\/script>/i;

export const injectUmamiConfig = (html: string, config: UmamiConfig) => {
  if (!config.enabled) {
    return html;
  }

  if (umamiScriptPattern.test(html)) {
    return html.replace(umamiScriptPattern, buildUmamiTag(config));
  }

  const closingHeadIndex = html.search(/<\/head>/i);
  if (closingHeadIndex === -1) {
    return html;
  }

  const insertion = `    ${buildUmamiTag(config)}\n`;
  return `${html.slice(0, closingHeadIndex)}${insertion}${html.slice(closingHeadIndex)}`;
};
