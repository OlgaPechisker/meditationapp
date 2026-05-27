import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface ContentItem {
  id: string;
  key: string;
  value: string;
}

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-content.component.html',
  styleUrl: './admin-content.component.scss',
})
export class AdminContentComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  items = signal<ContentItem[]>([]);
  loading = signal(true);
  error = signal('');
  editing = signal<ContentItem | null>(null);
  showForm = signal(false);

  form = this.fb.group({
    key: ['', Validators.required],
    value: ['', Validators.required],
  });

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<ContentItem[]>('/content/admin/all', { locale: 'he' }).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת תוכן'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ key: '', value: '' });
    this.showForm.set(true);
  }

  openEdit(item: ContentItem) {
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
      this.api.patch(`/content/${editing.id}`, body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה בעדכון'),
      });
    } else {
      this.api.post('/content', body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה ביצירה'),
      });
    }
  }
}
