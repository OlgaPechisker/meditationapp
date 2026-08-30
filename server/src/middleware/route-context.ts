import type { NextFunction, Request, Response } from "express";

export function routeContext(base: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.routeBase = base;
    next();
  };
}
