import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { ImageUploadComponent } from '../_shared/image-upload/image-upload.component';

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
  imports: [ReactiveFormsModule, ImageUploadComponent],
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
    excerpt: [''],
    content: ['', Validators.required],
    imageUrl: [''],
    publishedAt: [''],
  });

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<PaginatedResponse<BlogPost>>('/blog/admin/all', { locale: 'he' }).subscribe({
      next: (res) => { this.posts.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת פוסטים'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ slug: '', title: '', excerpt: '', content: '', imageUrl: '', publishedAt: '' });
    this.showForm.set(true);
  }

  openEdit(item: BlogPost) {
    this.editing.set(item);
    this.form.patchValue(item);
    this.showForm.set(true);
  }

  cancel() { this.showForm.set(false); }

  onImageUrlChange(url: string | null): void {
    this.form.patchValue({ imageUrl: url ?? '' });
  }

  save() {
    if (this.form.invalid) { this.error.set('אנא מלא את כל השדות הנדרשים'); return; }
    const { publishedAt, imageUrl, ...rest } = this.form.value;
    const body: Record<string, unknown> = { ...rest, locale: 'he' };
    if (imageUrl) body['imageUrl'] = imageUrl;
    if (publishedAt) {
      body['publishedAt'] = new Date(publishedAt).toISOString();
    }
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
    this.api.delete(`/blog/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
