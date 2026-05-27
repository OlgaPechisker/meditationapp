import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private phoneNumber = '972501234567';

  buildLink(message: string): string {
    return `https://wa.me/${this.phoneNumber}?text=${encodeURIComponent(message)}`;
  }

  buildTreatmentLink(treatmentTitle: string): string {
    return this.buildLink(`שלום, אני מתעניין/ת בטיפול: ${treatmentTitle}`);
  }
}
