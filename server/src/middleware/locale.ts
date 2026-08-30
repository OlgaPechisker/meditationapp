import { Request, Response, NextFunction } from "express";

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  const locale = (req.query.locale as string) || req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "he";
  req.locale = ["he", "en"].includes(locale) ? locale : "he";
  next();
}
