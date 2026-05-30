import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { ImageUploadComponent } from '../_shared/image-upload/image-upload.component';

interface Treatment {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  sortOrder?: number;
  isActive: boolean;
}

@Component({
  selector: 'app-admin-treatments',
  standalone: true,
  imports: [ReactiveFormsModule, ImageUploadComponent],
  templateUrl: './admin-treatments.component.html',
  styleUrl: './admin-treatments.component.scss',
})
export class AdminTreatmentsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  treatments = signal<Treatment[]>([]);
  loading = signal(true);
  error = signal('');
  editing = signal<Treatment | null>(null);
  showForm = signal(false);

  form = this.fb.group({
    slug: ['', Validators.required],
    title: ['', Validators.required],
    description: ['', Validators.required],
    price: [0, [Validators.min(0)]],
    imageUrl: [''],
    sortOrder: [0],
    isActive: [true],
  });

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading.set(true);
    this.api.get<PaginatedResponse<Treatment>>('/treatments/admin/all', { locale: 'he', limit: 100 }).subscribe({
      next: (res) => { this.treatments.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת טיפולים'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ slug: '', title: '', description: '', price: 0, imageUrl: '', sortOrder: 0, isActive: true });
    this.showForm.set(true);
  }

  openEdit(item: Treatment) {
    this.editing.set(item);
    this.form.patchValue({ ...item, price: item.price ?? 0 });
    this.showForm.set(true);
  }

  cancel() {
    this.showForm.set(false);
  }

  onImageUrlChange(url: string | null): void {
    this.form.patchValue({ imageUrl: url ?? '' });
  }

  save() {
    if (this.form.invalid) { this.error.set('אנא מלא את כל השדות הנדרשים'); return; }
    const formVal = this.form.value;
    const body: Record<string, unknown> = { ...formVal, locale: 'he' };
    if (!body['imageUrl']) delete body['imageUrl'];
    const editing = this.editing();

    if (editing) {
      this.api.patch(`/treatments/${editing.id}`, body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה בעדכון'),
      });
    } else {
      this.api.post('/treatments', body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה ביצירה'),
      });
    }
  }

  deleteItem(item: Treatment) {
    this.api.delete(`/treatments/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
