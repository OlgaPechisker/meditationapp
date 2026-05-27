import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  publishedAt?: string;
}

@Component({
  selector: 'app-admin-blog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-blog.component.html',
  styleUrl: './admin-blog.component.scss',
})
export class AdminBlogComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  posts = signal<BlogPost[]>([]);
  loading = signal(true);
  error = signal('');
  editing = signal<BlogPost | null>(null);
  showForm = signal(false);

  form = this.fb.group({
    slug: ['', Validators.required],
    title: ['', Validators.required],
    excerpt: ['', Validators.required],
    content: ['', Validators.required],
    imageUrl: [''],
  });

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<BlogPost[]>('/blog/admin/all', { locale: 'he' }).subscribe({
      next: (data) => { this.posts.set(data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת פוסטים'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ slug: '', title: '', excerpt: '', content: '', imageUrl: '' });
    this.showForm.set(true);
  }

  openEdit(item: BlogPost) {
    this.editing.set(item);
    this.form.patchValue(item);
    this.showForm.set(true);
  }

  cancel() { this.showForm.set(false); }

  save() {
    if (this.form.invalid) return;
    const body = { ...this.form.value, locale: 'he' };
    const editing = this.editing();

    if (editing) {
      this.api.patch(`/blog/${editing.id}`, body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה בעדכון'),
      });
    } else {
      this.api.post('/blog', body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה ביצירה'),
      });
    }
  }

  deleteItem(item: BlogPost) {
    if (!confirm(`למחוק את "${item.title}"?`)) return;
    this.api.delete(`/blog/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
