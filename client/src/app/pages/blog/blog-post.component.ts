import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

interface Comment {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
}

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  locale: string;
  publishedAt: string;
  comments: Comment[];
}

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [TranslocoPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss',
})
export class BlogPostComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private fb = inject(FormBuilder);

  post = signal<BlogPost | null>(null);
  commentSubmitted = signal(false);
  submitting = signal(false);

  commentForm = this.fb.group({
    authorName: ['', Validators.required],
    content: ['', Validators.required],
    honeypot: [''],
  });

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.get<BlogPost>(`/blog/${slug}`, { locale: 'he' })
      .subscribe(post => {
        this.post.set(post);
        this.seo.updateMeta({ title: post.title, description: post.excerpt });
      });
  }

  submitComment() {
    if (this.commentForm.invalid || this.commentForm.value.honeypot) return;
    this.submitting.set(true);

    const postId = this.post()!.id;
    this.api.post('/comments', {
      postId,
      authorName: this.commentForm.value.authorName,
      content: this.commentForm.value.content,
      honeypot: this.commentForm.value.honeypot,
    }).subscribe({
      next: () => {
        this.commentSubmitted.set(true);
        this.submitting.set(false);
        this.commentForm.reset();
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }
}
