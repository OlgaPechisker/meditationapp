import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    password: ['', Validators.required],
  });

  error = signal('');
  loading = signal(false);

  onSubmit() {
    if (this.form.invalid) {
      this.error.set('אנא הזן סיסמה');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.form.value.password!).subscribe({
      next: () => {
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.error.set('סיסמה שגויה');
        this.loading.set(false);
      },
    });
  }
}
