import { ApplicationConfig, provideZoneChangeDetection, isDevMode, Injectable, inject } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch, HttpClient } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';

import { routes } from './app.routes';
import { localeInterceptor } from './core/interceptors/locale.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);
  getTranslation(lang: string) {
    return this.http.get<Translation>(`/assets/i18n/${lang}.json`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([localeInterceptor, authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['he', 'en'],
        defaultLang: 'he',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};

