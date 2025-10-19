export type Roles = 'super_admin' | 'company_admin' | 'staff' | 'client_user';

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      company_id?: string;
    };
  }
}
