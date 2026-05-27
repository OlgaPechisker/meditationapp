import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  navLinks = [
    { path: '/treatments', label: 'nav.treatments' },
    { path: '/blog', label: 'nav.blog' },
    { path: '/lectures', label: 'nav.lectures' },
    { path: '/songs', label: 'nav.songs' },
    { path: '/about', label: 'nav.about' },
    { path: '/contact', label: 'nav.contact' },
  ];
}
