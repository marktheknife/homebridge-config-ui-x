import { NgClass, NgStyle } from '@angular/common'
import { Component, inject, Input, OnInit } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
  templateUrl: './plugin-info.component.html',
  styleUrls: ['./plugin-info.component.scss'],
  standalone: true,
  imports: [TranslatePipe, NgClass, NgStyle],
})
export class PluginInfoComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)

  @Input() plugin: any

  public readonly defaultIcon = 'assets/hb-icon.png'
  public readonly linkScoped = '<a href="https://github.com/homebridge/plugins/wiki/Scoped-Plugins" target="_blank"><i class="fa fa/fw fas fa-fw fa-external-link-alt"></i></a>'
  public readonly linkVerified = '<a href="https://github.com/homebridge/plugins/wiki/Verified-Plugins" target="_blank"><i class="fa fa/fw fas fa-fw fa-external-link-alt"></i></a>'

  constructor() {}

  ngOnInit() {
    if (!this.plugin.icon) {
      this.plugin.icon = this.defaultIcon
    }
  }

  handleIconError() {
    this.plugin.icon = this.defaultIcon
  }
}
