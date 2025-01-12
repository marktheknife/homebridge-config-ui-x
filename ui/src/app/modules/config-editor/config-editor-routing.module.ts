import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { ConfigEditorResolver } from '@/app/modules/config-editor/config-editor.resolver'

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@/app/modules/config-editor/config-editor.component').then(m => m.ConfigEditorComponent),
    resolve: {
      config: ConfigEditorResolver,
    },
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfigEditorRoutingModule {}
