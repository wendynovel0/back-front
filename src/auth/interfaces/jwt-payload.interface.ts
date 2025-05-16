export interface JwtPayload {
  sub: number; // user ID
  username: string;
  email: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}