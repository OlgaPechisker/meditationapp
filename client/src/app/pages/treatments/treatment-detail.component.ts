import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ApiService } from '../../core/services/api.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { SeoService } from '../../core/services/seo.service';

interface Treatment {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  locale: string;
  sortOrder: number;
}

@Component({
  selector: 'app-treatment-detail',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './treatment-detail.component.html',
  styleUrl: './treatment-detail.component.scss',
})
export class TreatmentDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private whatsapp = inject(WhatsappService);
  private seo = inject(SeoService);

  treatment = signal<Treatment | null>(null);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.get<Treatment>(`/treatments/${slug}`, { locale: 'he' })
      .subscribe(t => {
        this.treatment.set(t);
        this.seo.updateMeta({ title: t.title, description: t.description });
      });
  }

  getWhatsappLink(): string {
    return this.whatsapp.buildTreatmentLink(this.treatment()?.title ?? '');
  }
}
