import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

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
  imports: [ReactiveFormsModule],
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
    price: [0, [Validators.required, Validators.min(0)]],
    imageUrl: [''],
    isActive: [true],
  });

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<Lecture[]>('/lectures/admin/all', { locale: 'he' }).subscribe({
      next: (data) => { this.lectures.set(data); this.loading.set(false); },
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
    this.form.patchValue(item);
    this.showForm.set(true);
  }

  cancel() { this.showForm.set(false); }

  save() {
    if (this.form.invalid) return;
    const body = { ...this.form.value, locale: 'he' };
    const editing = this.editing();

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
    if (!confirm(`למחוק את "${item.title}"?`)) return;
    this.api.delete(`/lectures/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
