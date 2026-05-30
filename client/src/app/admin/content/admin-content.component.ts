import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';

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
    this.api.get<PaginatedResponse<ContentItem>>('/content/admin/all', { locale: 'he', limit: 100 }).subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
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
    if (this.form.invalid) { this.error.set('אנא מלא את כל השדות הנדרשים'); return; }
    const editing = this.editing();
    const key = editing ? editing.key : this.form.value.key!;
    const body = { key, value: this.form.value.value!, locale: 'he' };
    this.api.put('/content', body).subscribe({
      next: () => { this.showForm.set(false); this.loadItems(); },
      error: () => this.error.set('שגיאה בשמירה'),
    });
  }
}
