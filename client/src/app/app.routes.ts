import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'treatments', loadComponent: () => import('./pages/treatments/treatment-list.component').then(m => m.TreatmentListComponent) },
  { path: 'treatments/:slug', loadComponent: () => import('./pages/treatments/treatment-detail.component').then(m => m.TreatmentDetailComponent) },
  { path: 'blog', loadComponent: () => import('./pages/blog/blog-list.component').then(m => m.BlogListComponent) },
  { path: 'blog/:slug', loadComponent: () => import('./pages/blog/blog-post.component').then(m => m.BlogPostComponent) },
  { path: 'lectures', loadComponent: () => import('./pages/lectures/lectures.component').then(m => m.LecturesComponent) },
  { path: 'songs', loadComponent: () => import('./pages/songs/songs.component').then(m => m.SongsComponent) },
  { path: 'about', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent) },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent) },
  { path: 'admin/login', loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent) },
  { path: 'admin', canActivate: [authGuard], loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
