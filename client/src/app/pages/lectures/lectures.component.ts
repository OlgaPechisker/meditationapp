import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

interface Lecture {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  locale: string;
}

@Component({
  selector: 'app-lectures',
  standalone: true,
  imports: [TranslocoPipe, DatePipe],
  templateUrl: './lectures.component.html',
  styleUrl: './lectures.component.scss',
})
export class LecturesComponent implements OnInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);

  lectures = signal<Lecture[]>([]);
  loaded = signal(false);

  upcoming = computed(() =>
    this.lectures()
      .filter(l => new Date(l.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  );

  past = computed(() =>
    this.lectures()
      .filter(l => new Date(l.date) < new Date())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );

  ngOnInit() {
    this.seo.updateMeta({ title: 'הרצאות', description: 'הרצאות של עינת שומונוב' });
    this.api.get<PaginatedResponse<Lecture>>('/lectures', { locale: 'he', limit: 100 })
      .subscribe(res => { this.lectures.set(res.data); this.loaded.set(true); });
  }
}
