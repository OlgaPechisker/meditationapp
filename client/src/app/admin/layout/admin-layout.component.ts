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
    { path: 'treatments', label: 'טיפולים', testid: 'treatments' },
    { path: 'blog', label: 'בלוג', testid: 'blog' },
    { path: 'comments', label: 'תגובות', testid: 'comments' },
    { path: 'lectures', label: 'הרצאות', testid: 'lectures' },
    { path: 'songs', label: 'שירים', testid: 'songs' },
    { path: 'content', label: 'תוכן האתר', testid: 'content' },
  ];

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
