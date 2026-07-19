export enum PlatformRole { VIEWER = 'VIEWER', ANALYST = 'ANALYST', ADMIN = 'ADMIN' }
export interface AuthUser { id: string; username: string; displayName: string; role: PlatformRole }
export interface TokenClaims extends AuthUser { iat: number; exp: number; iss: 'identity-access-graph' }
