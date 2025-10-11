import { URLSearchParams } from "url";

type ZohoDomains = {
  accountsHost: string;
  apisHost: string;
};

function normalizeDc(dc?: string): string {
  if (!dc) return "us";
  const v = dc.toLowerCase();
  if (v === "com" || v === "us") return "us";
  return v;
}

export function getZohoDomains(dc?: string): ZohoDomains {
  const v = normalizeDc(dc);
  switch (v) {
    case "eu":
      return {
        accountsHost: "https://accounts.zoho.eu",
        apisHost: "https://www.zohoapis.eu",
      };
    case "in":
      return {
        accountsHost: "https://accounts.zoho.in",
        apisHost: "https://www.zohoapis.in",
      };
    case "au":
      return {
        accountsHost: "https://accounts.zoho.com.au",
        apisHost: "https://www.zohoapis.com.au",
      };
    case "jp":
      return {
        accountsHost: "https://accounts.zoho.jp",
        apisHost: "https://www.zohoapis.jp",
      };
    case "cn":
      return {
        accountsHost: "https://accounts.zoho.com.cn",
        apisHost: "https://www.zohoapis.com.cn",
      };
    case "us":
    default:
      return {
        accountsHost: "https://accounts.zoho.com",
        apisHost: "https://www.zohoapis.com",
      };
  }
}

export function getScopes(): string {
  // Default to Accounts profile scope for sign-in only
  // Many DCs accept only AaaServer.profile.READ for user info
  const envScopes = process.env.ZOHO_SCOPES;
  const raw =
    envScopes && envScopes.trim().length > 0
      ? envScopes
      : "AaaServer.profile.READ";
  // Normalize separators: allow comma or space separated in env, output comma separated
  const parts = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(",");
}

export function buildAuthorizeUrl(state?: string): string {
  const { accountsHost } = getZohoDomains(process.env.ZOHO_DC);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOHO_CLIENT_ID || "",
    scope: getScopes(),
    redirect_uri: process.env.ZOHO_REDIRECT_URI || "",
    access_type: process.env.ZOHO_ACCESS_TYPE || "online", // online is enough for sign-in only
    // Remove 'prompt: consent' to allow Zoho to remember user consent
    // Use 'select_account' to let users choose which account without re-consenting
  });
  
  // Optional: Add domain hint if you want to suggest your organization domain
  if (process.env.ZOHO_DOMAIN_HINT) {
    params.set("login_hint", process.env.ZOHO_DOMAIN_HINT);
  }
  
  if (state) params.set("state", state);
  return `${accountsHost}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  api_domain?: string;
  token_type?: string;
}> {
  const { accountsHost } = getZohoDomains(process.env.ZOHO_DC);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.ZOHO_CLIENT_ID || "",
    client_secret: process.env.ZOHO_CLIENT_SECRET || "",
    redirect_uri: process.env.ZOHO_REDIRECT_URI || "",
  });

  const res = await fetch(`${accountsHost}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as any;
}

export async function fetchZohoUserInfo(accessToken: string): Promise<any> {
  const { accountsHost } = getZohoDomains(process.env.ZOHO_DC);
  const res = await fetch(`${accountsHost}/oauth/user/info`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho user info failed: ${res.status} ${text}`);
  }
  return await res.json();
}
