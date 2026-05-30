import { Component, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
})
export class ImageUploadComponent {
  private api = inject(ApiService);

  label = input<string>('תמונה');
  imageUrl = input<string | null | undefined>(null);

  imageUrlChange = output<string | null>();

  uploading = signal(false);
  uploadError = signal('');

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set('');
    this.uploading.set(true);

    const formData = new FormData();
    formData.append('file', file);

    this.api.upload<{ url: string }>('/upload', formData).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.imageUrlChange.emit(res.url);
        input.value = '';
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('שגיאה בהעלאת התמונה');
        input.value = '';
      },
    });
  }

  removeImage(): void {
    this.uploadError.set('');
    this.imageUrlChange.emit(null);
  }
}
