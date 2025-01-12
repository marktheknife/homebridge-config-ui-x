import { NgClass } from '@angular/common'
import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'
import { DragulaModule, DragulaService } from 'ng2-dragula'
import { Subscription } from 'rxjs'

import { AccessoriesService } from '@/app/core/accessories/accessories.service'
import { AccessoryTileComponent } from '@/app/core/accessories/accessory-tile/accessory-tile.component'
import { AuthService } from '@/app/core/auth/auth.service'
import { MobileDetectService } from '@/app/core/mobile-detect.service'
import { SettingsService } from '@/app/core/settings.service'
import { AccessorySupportComponent } from '@/app/modules/accessories/accessory-support/accessory-support.component'
import { AddRoomComponent } from '@/app/modules/accessories/add-room/add-room.component'
import { DragHerePlaceholderComponent } from '@/app/modules/accessories/drag-here-placeholder/drag-here-placeholder.component'

@Component({
  selector: 'app-accessories',
  templateUrl: './accessories.component.html',
  styleUrls: ['./accessories.component.scss'],
  standalone: true,
  imports: [
    NgbTooltip,
    NgClass,
    DragulaModule,
    AccessoryTileComponent,
    DragHerePlaceholderComponent,
    TranslatePipe,
  ],
})
export class AccessoriesComponent implements OnInit, OnDestroy {
  $auth = inject(AuthService)
  private dragulaService = inject(DragulaService)
  private $modal = inject(NgbModal)
  $settings = inject(SettingsService)
  private $md = inject(MobileDetectService)
  protected $accessories = inject(AccessoriesService)

  public isMobile: any = false
  public hideHidden = true
  private orderSubscription: Subscription

  public readonly linkInsecure = '<a href="https://github.com/homebridge/homebridge-config-ui-x/wiki/Enabling-Accessory-Control" target="_blank"><i class="fa fa-fw fa-external-link-alt"></i></a>'

  constructor() {
    const dragulaService = this.dragulaService

    this.isMobile = this.$md.detect.mobile()

    // Disable drag and drop for everything except the room title
    dragulaService.createGroup('rooms-bag', {
      moves: (_el, _container, handle) => !this.isMobile && handle.classList.contains('drag-handle'),
    })

    // Disable drag and drop for the .no-drag class
    dragulaService.createGroup('services-bag', {
      moves: el => !this.isMobile && !el.classList.contains('no-drag'),
    })

    // Save the room and service layout
    this.orderSubscription = dragulaService.drop().subscribe(() => {
      setTimeout(() => {
        this.$accessories.saveLayout()
      })
    })

    // Check to see if the layout should be locked
    if (window.localStorage.getItem('accessories-layout-locked')) {
      this.isMobile = true
    }
  }

  ngOnInit() {
    this.$accessories.start()
  }

  addRoom() {
    this.$modal
      .open(AddRoomComponent, {
        size: 'lg',
        backdrop: 'static',
      })
      .result
      .then((roomName) => {
      // No room name provided
        if (!roomName || !roomName.length) {
          return
        }

        // Duplicate room name
        if (this.$accessories.rooms.find(r => r.name === roomName)) {
          return
        }

        this.$accessories.rooms.push({
          name: roomName,
          services: [],
        })

        if (this.isMobile) {
          this.toggleLayoutLock()
        }
      })
      .catch(() => { /* modal dismissed */ })
  }

  toggleLayoutLock() {
    this.isMobile = !this.isMobile

    if (this.isMobile) {
      // Layout locked
      window.localStorage.setItem('accessories-layout-locked', 'yes')
    } else {
      // Layout unlocked
      window.localStorage.removeItem('accessories-layout-locked')
    }
  }

  openSupport() {
    this.$modal.open(AccessorySupportComponent, {
      size: 'lg',
      backdrop: 'static',
    })
  }

  ngOnDestroy() {
    this.$accessories.stop()

    // Destroy drag and drop bags
    this.orderSubscription.unsubscribe()
    this.dragulaService.destroy('rooms-bag')
    this.dragulaService.destroy('services-bag')
  }
}
