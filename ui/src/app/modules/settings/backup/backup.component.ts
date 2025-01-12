import { DatePipe, NgClass } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import { NgbActiveModal, NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { saveAs } from 'file-saver'
import { ToastrService } from 'ngx-toastr'

import { ApiService } from '@/app/core/api.service'
import { RestoreComponent } from '@/app/modules/settings/backup/restore/restore.component'

@Component({
  templateUrl: './backup.component.html',
  standalone: true,
  imports: [
    NgbTooltip,
    NgClass,
    DatePipe,
    TranslatePipe,
  ],
})
export class BackupComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)
  private $api = inject(ApiService)
  private $modal = inject(NgbModal)
  private $toastr = inject(ToastrService)
  private $translate = inject(TranslateService)

  public clicked = false
  public scheduledBackups = []
  public backupTime: string
  public deleting = null

  constructor() {}

  ngOnInit(): void {
    this.getScheduledBackups()
    this.getNextBackup()
  }

  getScheduledBackups() {
    this.$api.get('/backup/scheduled-backups').subscribe({
      next: (data) => {
        this.scheduledBackups = data
      },
      error: err => console.error(err),
    })
  }

  getNextBackup() {
    this.$api.get('/backup/scheduled-backups/next').subscribe({
      next: (data) => {
        this.backupTime = data.next
      },
      error: (err) => {
        console.error(err)
      },
    })
  }

  download(backup: { id: any, fileName: string }) {
    this.$api.get(`/backup/scheduled-backups/${backup.id}`, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (res) => {
        const archiveName = backup.fileName || 'homebridge-backup.tar.gz'
        const sizeInBytes = res.body.size
        if (sizeInBytes > globalThis.backup.maxBackupSize) {
          const message = this.$translate.instant('backup.backup_exceeds_max_size', {
            maxBackupSizeText: globalThis.backup.maxBackupSizeText,
            size: `${(sizeInBytes / (1024 * 1024)).toFixed(1)}MB`,
          })
          this.$toastr.warning(message, this.$translate.instant('toast.title_warning'))
        }
        saveAs(res.body, archiveName)
      },
      error: (error) => {
        console.error(error)
        this.$toastr.error(this.$translate.instant('backup.backup_download_failed'), this.$translate.instant('toast.title_error'))
      },
    })
  }

  restore(backup: { id: any, fileName: string } | null) {
    // Close the backup modal and open the restore modal
    this.$activeModal.close()
    const ref = this.$modal.open(RestoreComponent, {
      size: 'lg',
      backdrop: 'static',
    })

    ref.componentInstance.selectedBackup = backup
  }

  delete(backup: { id: any, fileName: string }) {
    this.deleting = backup.id
    this.$api.delete(`/backup/scheduled-backups/${backup.id}`).subscribe({
      next: () => {
        this.getScheduledBackups()
        this.deleting = null
      },
      error: (error) => {
        this.deleting = null
        console.error(error)
        this.$toastr.error(this.$translate.instant('backup.backup_delete_failed'), this.$translate.instant('toast.title_error'))
      },
    })
  }

  async onDownloadBackupClick() {
    this.clicked = true
    this.$api.get('/backup/download', { observe: 'response', responseType: 'blob' }).subscribe({
      next: (res) => {
        const archiveName = res.headers.get('File-Name') || 'homebridge-backup.tar.gz'
        this.clicked = false
        const sizeInBytes = res.body.size
        if (sizeInBytes > globalThis.backup.maxBackupSize) {
          const message = this.$translate.instant('backup.backup_exceeds_max_size', {
            maxBackupSizeText: globalThis.backup.maxBackupSizeText,
            size: `${(sizeInBytes / (1024 * 1024)).toFixed(1)}MB`,
          })
          this.$toastr.warning(message, this.$translate.instant('toast.title_warning'))
        }
        saveAs(res.body, archiveName)
      },
      error: (error) => {
        this.clicked = false
        console.error(error)
        this.$toastr.error(this.$translate.instant('backup.backup_download_failed'), this.$translate.instant('toast.title_error'))
      },
    })
  }

  protected readonly Date = Date
}
