import { inject, Pipe, PipeTransform } from '@angular/core'

import { SettingsService } from '@/app/core/settings.service'

@Pipe({
  name: 'convertTemp',
  standalone: true,
})
export class ConvertTempPipe implements PipeTransform {
  private $settings = inject(SettingsService)

  constructor() {}

  transform(value: number, unit: 'c' | 'f' = this.$settings.env.temperatureUnits): number {
    if (unit === 'f') {
      return value * 1.8 + 32
    }
    return value
  }
}
