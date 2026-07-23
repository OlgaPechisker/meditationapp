import "express";

declare global {
  namespace Express {
    interface Request {
      locale: string;
      requestId: string;
      routeBase?: string;
      actor?: {
        type: "admin";
      };
    }
  }
}

export {};
