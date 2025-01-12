import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { AdminGuard } from '@/app/core/auth/admin.guard'

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@/app/modules/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [AdminGuard],
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
