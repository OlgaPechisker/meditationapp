import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SlicePipe } from '@angular/common';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
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
  selector: 'app-treatment-list',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, SlicePipe],
  templateUrl: './treatment-list.component.html',
  styleUrl: './treatment-list.component.scss',
})
export class TreatmentListComponent implements OnInit {
  private api = inject(ApiService);
  private whatsapp = inject(WhatsappService);
  private seo = inject(SeoService);

  treatments = signal<Treatment[]>([]);

  ngOnInit() {
    this.seo.updateMeta({ title: 'טיפולים', description: 'טיפולים של עינת שומונוב' });
    this.api.get<PaginatedResponse<Treatment>>('/treatments', { locale: 'he' })
      .subscribe(res => this.treatments.set(res.data));
  }

  getWhatsappLink(title: string): string {
    return this.whatsapp.buildTreatmentLink(title);
  }
}
