import { Component, inject, OnInit } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit {
  private whatsapp = inject(WhatsappService);
  private seo = inject(SeoService);

  email = 'einat@example.com';
  phone = '050-1234567';
  whatsappLink = this.whatsapp.buildLink('שלום, אשמח ליצור קשר');

  ngOnInit() {
    this.seo.updateMeta({ title: 'צור קשר', description: 'יצירת קשר עם עינת שומונוב' });
  }
}
