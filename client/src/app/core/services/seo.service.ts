import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);

  updateMeta(config: { title: string; description?: string; image?: string }) {
    this.title.setTitle(`${config.title} | עינת שומונוב`);
    if (config.description) {
      this.meta.updateTag({ name: 'description', content: config.description });
      this.meta.updateTag({ property: 'og:description', content: config.description });
    }
    this.meta.updateTag({ property: 'og:title', content: config.title });
    if (config.image) {
      this.meta.updateTag({ property: 'og:image', content: config.image });
    }
  }
}
