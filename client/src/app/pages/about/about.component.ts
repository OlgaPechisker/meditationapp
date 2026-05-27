import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

interface SiteContent {
  id: number;
  key: string;
  value: string;
  locale: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent implements OnInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);

  content = signal<string>('');

  ngOnInit() {
    this.seo.updateMeta({ title: 'אודות', description: 'אודות עינת שומונוב' });
    this.api.get<PaginatedResponse<SiteContent>>('/content', { locale: 'he', key: 'about' })
      .subscribe(res => {
        const item = res.data?.find(c => c.key === 'about') ?? res.data?.[0];
        if (item) {
          this.content.set(item.value);
        }
      });
  }
}
