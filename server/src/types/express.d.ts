import "express";

export interface AuthenticatedPrincipal {
  type: "admin";
}

declare global {
  namespace Express {
    interface Request {
      locale: string;
      requestId: string;
      routeBase?: string;
      actor?: AuthenticatedPrincipal;
    }
  }
}

export {};
