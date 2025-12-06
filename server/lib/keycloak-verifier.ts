/**
 * Keycloak JWT Token Verifier for OSPF-TEMPO-X
 * Validates tokens issued by Keycloak using JWKS
 */

import jwt from 'jsonwebtoken';
import https from 'https';
import http from 'http';

interface KeycloakConfig {
  serverUrl: string;
  realm: string;
  clientId: string;
}

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

interface KeycloakToken {
  sub: string;
  preferred_username: string;
  email?: string;
  realm_access?: { roles: string[] };
  resource_access?: { [clientId: string]: { roles: string[] } };
  iat: number;
  exp: number;
  iss: string;
}

export interface VerifiedUser {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  realmRoles: string[];
  clientRoles: string[];
}

class KeycloakVerifier {
  private serverUrl: string;
  private realm: string;
  private clientId: string;
  private jwksCache: Map<string, string> = new Map();
  private jwksCacheExpiry: number = 0;
  private jwksCacheDuration: number = 10 * 60 * 1000;

  constructor(config: KeycloakConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.realm = config.realm;
    this.clientId = config.clientId;
  }

  private getJwksUri(): string {
    return `${this.serverUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
  }

  private getIssuer(): string {
    return `${this.serverUrl}/realms/${this.realm}`;
  }

  private async fetchJwks(): Promise<void> {
    const url = new URL(this.getJwksUri());
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const jwks = JSON.parse(data);
              this.jwksCache.clear();
              for (const key of jwks.keys) {
                if (key.use === 'sig' && key.kty === 'RSA') {
                  const pem = this.jwkToPem(key);
                  this.jwksCache.set(key.kid, pem);
                }
              }
              this.jwksCacheExpiry = Date.now() + this.jwksCacheDuration;
              resolve();
            } else {
              reject(new Error(`Failed to fetch JWKS: HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse JWKS: ${e}`));
          }
        });
      });
      req.on('error', (e) => reject(new Error(`JWKS fetch error: ${e.message}`)));
      req.end();
    });
  }

  private jwkToPem(jwk: JWK): string {
    const n = Buffer.from(jwk.n.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const e = Buffer.from(jwk.e.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const algIdentifier = Buffer.from([
      0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
      0x01, 0x05, 0x00,
    ]);

    const nInt = this.encodeInteger(n);
    const eInt = this.encodeInteger(e);

    const pubKeySeq = Buffer.concat([
      Buffer.from([0x30]),
      this.encodeLength(nInt.length + eInt.length),
      nInt,
      eInt,
    ]);

    const bitString = Buffer.concat([
      Buffer.from([0x03]),
      this.encodeLength(pubKeySeq.length + 1),
      Buffer.from([0x00]),
      pubKeySeq,
    ]);

    const fullSeq = Buffer.concat([algIdentifier, bitString]);
    const der = Buffer.concat([
      Buffer.from([0x30, 0x82]),
      this.encodeLength(fullSeq.length).slice(0, 2),
      fullSeq,
    ]);

    const base64 = der.toString('base64');
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  private encodeLength(length: number): Buffer {
    if (length < 128) return Buffer.from([length]);
    if (length < 256) return Buffer.from([0x81, length]);
    return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
  }

  private encodeInteger(value: Buffer): Buffer {
    const needsPadding = value[0] & 0x80;
    const paddedValue = needsPadding ? Buffer.concat([Buffer.from([0x00]), value]) : value;
    return Buffer.concat([Buffer.from([0x02]), this.encodeLength(paddedValue.length), paddedValue]);
  }

  private async getPublicKey(kid: string): Promise<string> {
    if (Date.now() > this.jwksCacheExpiry || !this.jwksCache.has(kid)) {
      await this.fetchJwks();
    }
    const key = this.jwksCache.get(kid);
    if (!key) throw new Error(`Key ${kid} not found in JWKS`);
    return key;
  }

  async verifyToken(token: string): Promise<VerifiedUser> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new Error('Invalid token format');
    const kid = decoded.header.kid;
    if (!kid) throw new Error('Token missing key ID (kid)');

    const publicKey = await this.getPublicKey(kid);
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: this.getIssuer(),
    }) as KeycloakToken;

    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.[this.clientId]?.roles || [];

    let appRole = 'user';
    if (realmRoles.includes('admin') || clientRoles.includes('admin')) appRole = 'admin';
    else if (realmRoles.includes('viewer') || clientRoles.includes('viewer')) appRole = 'viewer';

    return {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: [appRole],
      realmRoles,
      clientRoles,
    };
  }

  async isAvailable(): Promise<boolean> {
    try { await this.fetchJwks(); return true; } catch { return false; }
  }
}

let keycloakVerifier: KeycloakVerifier | null = null;

export function initKeycloakVerifier(): KeycloakVerifier {
  if (!keycloakVerifier) {
    keycloakVerifier = new KeycloakVerifier({
      serverUrl: process.env.KEYCLOAK_URL || 'http://localhost:9120',
      realm: process.env.KEYCLOAK_REALM || 'ospf-tempo-x',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'tempo-x-api',
    });
  }
  return keycloakVerifier;
}

export { KeycloakVerifier };
