import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface Song {
  id: string;
  title: string;
  content: string;
}

@Component({
  selector: 'app-admin-songs',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-songs.component.html',
  styleUrl: './admin-songs.component.scss',
})
export class AdminSongsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  songs = signal<Song[]>([]);
  loading = signal(true);
  error = signal('');
  editing = signal<Song | null>(null);
  showForm = signal(false);

  form = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
  });

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading.set(true);
    this.api.get<Song[]>('/songs/admin/all', { locale: 'he' }).subscribe({
      next: (data) => { this.songs.set(data); this.loading.set(false); },
      error: () => { this.error.set('שגיאה בטעינת שירים'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ title: '', content: '' });
    this.showForm.set(true);
  }

  openEdit(item: Song) {
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
      this.api.patch(`/songs/${editing.id}`, body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה בעדכון'),
      });
    } else {
      this.api.post('/songs', body).subscribe({
        next: () => { this.showForm.set(false); this.loadItems(); },
        error: () => this.error.set('שגיאה ביצירה'),
      });
    }
  }

  deleteItem(item: Song) {
    if (!confirm(`למחוק את "${item.title}"?`)) return;
    this.api.delete(`/songs/${item.id}`).subscribe({
      next: () => this.loadItems(),
      error: () => this.error.set('שגיאה במחיקה'),
    });
  }
}
