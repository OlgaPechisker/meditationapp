import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.params.has('locale')) {
    return next(req);
  }
  const transloco = inject(TranslocoService);
  const locale = transloco.getActiveLang();
  const cloned = req.clone({ params: req.params.set('locale', locale) });
  return next(cloned);
};
