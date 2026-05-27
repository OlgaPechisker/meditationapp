import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

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
  imports: [ReactiveFormsModule],
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
    price: [0, [Validators.required, Validators.min(0)]],
    imageUrl: [''],
    sortOrder: [0],
    isActive: [true],
  });

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading.set(true);
    this.api.get<Treatment[]>('/treatments/admin/all', { locale: 'he' }).subscribe({
      next: (data) => { this.treatments.set(data); this.loading.set(false); },
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
    this.form.patchValue(item);
    this.showForm.set(true);
  }

  cancel() {
    this.showForm.set(false);
  }

  save() {
    if (this.form.invalid) return;
    const body = { ...this.form.value, locale: 'he' };
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
    if (!confirm(`למחוק את "${item.title}"?`)) return;
    this.api.delete(`/treatments/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
