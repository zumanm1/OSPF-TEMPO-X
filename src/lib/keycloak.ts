/**
 * Keycloak Integration for Tempo-X Frontend
 * Provides OIDC authentication via Keycloak with PKCE
 */

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export interface KeycloakTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
}

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  roles: string[];
}

// Dynamically determine API URL
function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:9101/api`;
  }
  return 'http://localhost:9101/api';
}

class KeycloakService {
  private config: KeycloakConfig | null = null;
  private tokens: KeycloakTokens | null = null;
  private refreshTimer: number | null = null;
  private initialized = false;

  async init(): Promise<boolean> {
    try {
      const response = await fetch(`${getApiUrl()}/auth/config`);

      if (!response.ok) {
        console.log('[Keycloak] Backend auth config not available');
        return false;
      }

      const data = await response.json();

      if (data.authMode !== 'keycloak' || !data.keycloak) {
        console.log('[Keycloak] Auth mode is not keycloak:', data.authMode);
        return false;
      }

      this.config = data.keycloak;
      this.initialized = true;
      console.log('[Keycloak] Initialized with config:', this.config);

      this.loadTokens();

      if (window.location.search.includes('code=')) {
        await this.handleCallback();
      }

      return true;
    } catch (error) {
      console.error('[Keycloak] Failed to initialize:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.initialized && this.config !== null;
  }

  isAuthenticated(): boolean {
    if (!this.tokens) return false;
    return Date.now() < this.tokens.expiresAt;
  }

  getAccessToken(): string | null {
    if (!this.isAuthenticated()) return null;
    return this.tokens?.accessToken || null;
  }

  async login(): Promise<void> {
    if (!this.config) {
      console.error('[Keycloak] Not initialized');
      return;
    }

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const state = this.generateState();
    const nonce = this.generateNonce();

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('keycloak_state', state);
    sessionStorage.setItem('keycloak_nonce', nonce);
    sessionStorage.setItem('keycloak_code_verifier', codeVerifier);

    const authUrl = new URL(`${this.config.url}/realms/${this.config.realm}/protocol/openid-connect/auth`);
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  }

  private async handleCallback(): Promise<void> {
    if (!this.config) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('keycloak_state');
    const codeVerifier = sessionStorage.getItem('keycloak_code_verifier');

    window.history.replaceState({}, document.title, window.location.pathname);

    if (!code || state !== storedState) {
      console.error('[Keycloak] Invalid callback state');
      sessionStorage.removeItem('keycloak_state');
      sessionStorage.removeItem('keycloak_nonce');
      sessionStorage.removeItem('keycloak_code_verifier');
      return;
    }

    sessionStorage.removeItem('keycloak_state');

    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const tokenUrl = `${this.config.url}/realms/${this.config.realm}/protocol/openid-connect/token`;

      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code,
        redirect_uri: redirectUri,
      };

      if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams),
      });

      sessionStorage.removeItem('keycloak_code_verifier');

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await response.json();
      this.setTokens(tokenData);
      console.log('[Keycloak] Authentication successful');
    } catch (error) {
      console.error('[Keycloak] Token exchange failed:', error);
      sessionStorage.removeItem('keycloak_nonce');
    }
  }

  logout(): void {
    if (!this.config) return;
    this.clearTokens();

    const logoutUrl = new URL(`${this.config.url}/realms/${this.config.realm}/protocol/openid-connect/logout`);
    logoutUrl.searchParams.set('post_logout_redirect_uri', window.location.origin);
    logoutUrl.searchParams.set('client_id', this.config.clientId);
    window.location.href = logoutUrl.toString();
  }

  getUserInfo(): KeycloakUser | null {
    if (!this.tokens?.idToken) return null;

    try {
      const payload = JSON.parse(atob(this.tokens.idToken.split('.')[1]));
      const realmRoles = payload.realm_access?.roles || [];
      const clientRoles = payload.resource_access?.[this.config?.clientId || '']?.roles || [];

      let appRole = 'user';
      if (realmRoles.includes('admin') || clientRoles.includes('admin')) {
        appRole = 'admin';
      }

      return {
        id: payload.sub,
        username: payload.preferred_username || payload.sub,
        email: payload.email,
        roles: [appRole],
      };
    } catch {
      return null;
    }
  }

  async refreshTokens(): Promise<boolean> {
    if (!this.config || !this.tokens?.refreshToken) return false;

    try {
      const tokenUrl = `${this.config.url}/realms/${this.config.realm}/protocol/openid-connect/token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          refresh_token: this.tokens.refreshToken,
        }),
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const tokenData = await response.json();
      this.setTokens(tokenData);
      return true;
    } catch (error) {
      console.error('[Keycloak] Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  private setTokens(tokenData: any): void {
    const expiresIn = tokenData.expires_in || 300;
    this.tokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      idToken: tokenData.id_token,
      expiresAt: Date.now() + (expiresIn * 1000),
    };
    localStorage.setItem('keycloak_tokens', JSON.stringify(this.tokens));
    this.setupRefreshTimer(expiresIn * 0.75 * 1000);
  }

  private loadTokens(): void {
    const stored = localStorage.getItem('keycloak_tokens');
    if (stored) {
      try {
        this.tokens = JSON.parse(stored);
        if (this.tokens && Date.now() < this.tokens.expiresAt) {
          this.setupRefreshTimer((this.tokens.expiresAt - Date.now()) * 0.75);
        } else {
          this.refreshTokens();
        }
      } catch {
        this.clearTokens();
      }
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem('keycloak_tokens');
    sessionStorage.removeItem('keycloak_nonce');
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private setupRefreshTimer(delay: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => this.refreshTokens(), delay);
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

export const keycloak = new KeycloakService();
