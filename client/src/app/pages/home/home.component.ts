import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SlicePipe } from '@angular/common';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

interface Treatment {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  locale: string;
  sortOrder: number;
}

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  locale: string;
  publishedAt: string;
}

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
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, SlicePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);

  treatments = signal<Treatment[]>([]);
  blogPosts = signal<BlogPost[]>([]);
  lectures = signal<Lecture[]>([]);
  lecturesLoaded = signal(false);

  ngOnInit() {
    this.seo.updateMeta({ title: 'עינת שומונוב', description: 'ריפוי, מדיטציה ושלווה פנימית' });

    this.api.get<PaginatedResponse<Treatment>>('/treatments', { locale: 'he' })
      .subscribe(res => this.treatments.set(res.data.slice(0, 3)));

    this.api.get<PaginatedResponse<BlogPost>>('/blog', { locale: 'he', limit: 3 })
      .subscribe(res => this.blogPosts.set(res.data));

    this.api.get<PaginatedResponse<Lecture>>('/lectures', { locale: 'he' })
      .subscribe(res => { this.lectures.set(res.data.slice(0, 3)); this.lecturesLoaded.set(true); });
  }
}
