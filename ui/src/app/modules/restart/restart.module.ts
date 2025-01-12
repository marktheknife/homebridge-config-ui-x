import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { RestartComponent } from '@/app/modules/restart/restart.component'

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),
    RestartComponent,
  ],
})
export class RestartModule {}
