import { Component, inject, Input, OnInit } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'

import { SettingsService } from '@/app/core/settings.service'

@Component({
  templateUrl: './widget-visibility.component.html',
  standalone: true,
  imports: [
    TranslatePipe,
  ],
})
export class WidgetVisibilityComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)
  private $settings = inject(SettingsService)
  private $translate = inject(TranslateService)

  @Input() dashboard: any
  @Input() resetLayout: () => void
  @Input() lockLayout: () => void
  @Input() unlockLayout: () => void
  @Input() public isLayoutUnlocked: boolean

  public availableWidgets = []

  constructor() {}

  ngOnInit() {
    const allWidgets = [
      {
        name: this.$translate.instant('status.widget.add.label_homebridge_status'),
        component: 'HomebridgeStatusWidgetComponent',
        hidden: false,
        cols: 10,
        rows: 3,
        mobileOrder: 10,
      },
      {
        name: this.$translate.instant('status.widget.weather.title_weather'),
        component: 'WeatherWidgetComponent',
        hidden: false,
        cols: 3,
        rows: 5,
        mobileOrder: 20,
        requiresConfig: true,
      },
      {
        name: this.$translate.instant('accessories.title_accessories'),
        component: 'AccessoriesWidgetComponent',
        hidden: !this.$settings.env.enableAccessories,
        cols: 7,
        rows: 9,
        mobileOrder: 30,
        hideOnMobile: false,
      },
      {
        name: 'Child Bridge Status',
        component: 'ChildBridgeWidgetComponent',
        hidden: !this.$settings.env.serviceMode,
        cols: 5,
        rows: 9,
        mobileOrder: 35,
      },
      {
        name: this.$translate.instant('status.cpu.title_cpu'),
        component: 'CpuWidgetComponent',
        hidden: false,
        cols: 5,
        rows: 3,
        mobileOrder: 40,
      },
      {
        name: this.$translate.instant('status.memory.title_memory'),
        component: 'MemoryWidgetComponent',
        hidden: false,
        cols: 5,
        rows: 3,
        mobileOrder: 50,
      },
      {
        name: this.$translate.instant('status.network.title_network'),
        component: 'NetworkWidgetComponent',
        hidden: false,
        cols: 10,
        rows: 3,
        mobileOrder: 55,
      },
      {
        name: this.$translate.instant('status.uptime.title_uptime'),
        component: 'UptimeWidgetComponent',
        hidden: false,
        cols: 5,
        rows: 3,
        mobileOrder: 60,
      },
      {
        name: this.$translate.instant('status.widget.info'),
        component: 'SystemInfoWidgetComponent',
        hidden: false,
        cols: 5,
        rows: 9,
        mobileOrder: 70,
      },
      {
        name: this.$translate.instant('status.widget.add.label_pairing_code'),
        component: 'HapQrcodeWidgetComponent',
        hidden: false,
        cols: 3,
        rows: 7,
        mobileOrder: 100,
      },
      {
        name: this.$translate.instant('status.widget.homebridge_logs'),
        component: 'HomebridgeLogsWidgetComponent',
        hidden: false,
        cols: 7,
        rows: 6,
        mobileOrder: 1000,
        hideOnMobile: true,
      },
      {
        name: `Homebridge ${this.$translate.instant('menu.docker.terminal')}`,
        component: 'TerminalWidgetComponent',
        hidden: !this.$settings.env.enableTerminalAccess,
        cols: 7,
        rows: 6,
        mobileOrder: 1000,
        hideOnMobile: true,
      },
      {
        name: this.$translate.instant('status.widget.clock'),
        component: 'ClockWidgetComponent',
        cols: 5,
        rows: 3,
        mobileOrder: 23,
        hideOnMobile: true,
      },
    ]
    this.availableWidgets = allWidgets
      .filter(x => !x.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(x => ({
        ...x,
        shown: !this.dashboard.some((i: any) => i.component === x.component),
      }))
  }

  selectWidget(widget: any) {
    this.$activeModal.close(widget)
  }

  doResetLayout() {
    this.resetLayout()
    this.$activeModal.dismiss()
  }
}
