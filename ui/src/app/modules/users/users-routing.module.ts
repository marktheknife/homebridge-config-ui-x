import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { UsersResolver } from '@/app/modules/users/users.resolver'

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@/app/modules/users/users.component').then(m => m.UsersComponent),
    resolve: {
      homebridgeUsers: UsersResolver,
    },
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsersRoutingModule {}
