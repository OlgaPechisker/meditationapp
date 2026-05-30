import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

interface Song {
  id: number;
  title: string;
  lyrics: string;
  locale: string;
}

@Component({
  selector: 'app-songs',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './songs.component.html',
  styleUrl: './songs.component.scss',
})
export class SongsComponent implements OnInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);

  songs = signal<Song[]>([]);
  expandedId = signal<number | null>(null);
  loaded = signal(false);

  ngOnInit() {
    this.seo.updateMeta({ title: 'שירים', description: 'שירים של עינת שומונוב' });
    this.api.get<PaginatedResponse<Song>>('/songs', { locale: 'he' })
      .subscribe(res => { this.songs.set(res.data); this.loaded.set(true); });
  }

  toggle(id: number) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }
}
