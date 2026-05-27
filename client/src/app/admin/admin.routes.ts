import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'treatments', pathMatch: 'full' },
      { path: 'treatments', loadComponent: () => import('./treatments/admin-treatments.component').then(m => m.AdminTreatmentsComponent) },
      { path: 'blog', loadComponent: () => import('./blog/admin-blog.component').then(m => m.AdminBlogComponent) },
      { path: 'comments', loadComponent: () => import('./comments/admin-comments.component').then(m => m.AdminCommentsComponent) },
      { path: 'lectures', loadComponent: () => import('./lectures/admin-lectures.component').then(m => m.AdminLecturesComponent) },
      { path: 'songs', loadComponent: () => import('./songs/admin-songs.component').then(m => m.AdminSongsComponent) },
      { path: 'content', loadComponent: () => import('./content/admin-content.component').then(m => m.AdminContentComponent) },
    ],
  },
];
