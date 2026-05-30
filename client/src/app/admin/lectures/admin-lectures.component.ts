import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { ImageUploadComponent } from '../_shared/image-upload/image-upload.component';

interface Lecture {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-admin-lectures',
  standalone: true,
  imports: [ReactiveFormsModule, ImageUploadComponent],
  templateUrl: './admin-lectures.component.html',
  styleUrl: './admin-lectures.component.scss',
})
export class AdminLecturesComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  lectures = signal<Lecture[]>([]);
  loading = signal(true);
  error = signal('');
  editing = signal<Lecture | null>(null);
  showForm = signal(false);

  form = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    date: ['', Validators.required],
    location: ['', Validators.required],
    price: [0, [Validators.min(0)]],
    imageUrl: [''],
    isActive: [true],
  });

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<PaginatedResponse<Lecture>>('/lectures/admin/all', { locale: 'he', limit: 100 }).subscribe({
      next: (res) => { this.lectures.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת הרצאות'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ title: '', description: '', date: '', location: '', price: 0, imageUrl: '', isActive: true });
    this.showForm.set(true);
  }

  openEdit(item: Lecture) {
    this.editing.set(item);
    this.form.patchValue({ ...item, price: item.price ?? 0 });
    this.showForm.set(true);
  }

  cancel() { this.showForm.set(false); }

  onImageUrlChange(url: string | null): void {
    this.form.patchValue({ imageUrl: url ?? '' });
  }

  save() {
    if (this.form.invalid) { this.error.set('אנא מלא את כל השדות הנדרשים'); return; }
    const formVal = this.form.value;
    const body: Record<string, unknown> = { ...formVal, locale: 'he' };
    if (!body['imageUrl']) delete body['imageUrl'];
    const editing = this.editing();

    if (!editing) {
      const title = String(body['title'] ?? '');
      body['slug'] = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    }

    if (editing) {
      this.api.patch(`/lectures/${editing.id}`, body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה בעדכון'),
      });
    } else {
      this.api.post('/lectures', body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה ביצירה'),
      });
    }
  }

  deleteItem(item: Lecture) {
    this.api.delete(`/lectures/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
