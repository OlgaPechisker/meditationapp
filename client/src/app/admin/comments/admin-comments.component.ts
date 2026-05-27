import { Component, inject, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

interface Comment {
  id: string;
  authorName: string;
  content: string;
  postTitle?: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-comments',
  standalone: true,
  imports: [],
  templateUrl: './admin-comments.component.html',
  styleUrl: './admin-comments.component.scss',
})
export class AdminCommentsComponent implements OnInit {
  private api = inject(ApiService);

  comments = signal<Comment[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<Comment[]>('/comments/admin/pending').subscribe({
      next: (data) => { this.comments.set(data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת תגובות'); this.loading.set(false); },
    });
  }

  approve(item: Comment) {
    this.api.patch(`/comments/${item.id}`, { approved: true }).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה באישור תגובה'),
    });
  }

  reject(item: Comment) {
    this.api.delete(`/comments/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה בדחיית תגובה'),
    });
  }
}
