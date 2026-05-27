import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  navLinks = [
    { path: 'treatments', label: 'טיפולים' },
    { path: 'blog', label: 'בלוג' },
    { path: 'comments', label: 'תגובות' },
    { path: 'lectures', label: 'הרצאות' },
    { path: 'songs', label: 'שירים' },
    { path: 'content', label: 'תוכן האתר' },
  ];

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
