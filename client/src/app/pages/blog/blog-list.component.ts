import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

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

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, DatePipe],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss',
})
export class BlogListComponent implements OnInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);

  posts = signal<BlogPost[]>([]);
  currentPage = signal(1);
  totalPages = signal(1);
  loaded = signal(false);
  private limit = 10;

  ngOnInit() {
    this.seo.updateMeta({ title: 'בלוג', description: 'הבלוג של עינת שומונוב' });
    this.loadPosts();
  }

  loadPosts() {
    this.api.get<PaginatedResponse<BlogPost>>('/blog', {
      locale: 'he',
      page: this.currentPage(),
      limit: this.limit,
    }).subscribe(res => {
      this.posts.set(res.data);
      this.totalPages.set(Math.ceil(res.meta.total / this.limit));
      this.loaded.set(true);
    });
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadPosts();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadPosts();
    }
  }
}
