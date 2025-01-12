import { NgClass } from '@angular/common'
import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { Title } from '@angular/platform-browser'
import { RouterLink } from '@angular/router'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom } from 'rxjs'

import { ApiService } from '@/app/core/api.service'
import { AuthService } from '@/app/core/auth/auth.service'
import { SettingsService } from '@/app/core/settings.service'
import { RestoreComponent } from '@/app/modules/settings/backup/restore/restore.component'
import { environment } from '@/environments/environment'

@Component({
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    RouterLink,
    TranslatePipe,
  ],
})
export class SetupWizardComponent implements OnInit, OnDestroy {
  private $api = inject(ApiService)
  private $auth = inject(AuthService)
  private $modal = inject(NgbModal)
  private $settings = inject(SettingsService)
  private $title = inject(Title)
  private $toastr = inject(ToastrService)
  private $translate = inject(TranslateService)

  public previousTitle: string
  public step: 'welcome' | 'create-account' | 'setup-complete' | 'restore-backup' | 'restarting' = 'welcome'

  public createUserForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.compose([Validators.required, Validators.minLength(4)])]),
    passwordConfirm: new FormControl('', [Validators.required]),
  }, this.matchPassword)

  public loading = false

  public selectedFile: File
  public restoreUploading = false

  constructor() {}

  ngOnInit(): void {
    this.previousTitle = this.$title.getTitle()
    this.$title.setTitle('Setup Homebridge')
  }

  matchPassword(AC: AbstractControl) {
    const password = AC.get('password').value
    const passwordConfirm = AC.get('passwordConfirm').value
    if (password !== passwordConfirm) {
      AC.get('passwordConfirm').setErrors({ matchPassword: true })
    } else {
      return null
    }
  }

  ngOnDestroy() {
    this.$title.setTitle(this.previousTitle)
  }

  onClickGettingStarted() {
    this.step = 'create-account'
  }

  onClickRestoreBackup() {
    this.step = 'restore-backup'
  }

  onClickCancelRestore() {
    this.selectedFile = null
    this.step = 'welcome'
  }

  createFirstUser() {
    this.loading = true

    const payload = this.createUserForm.getRawValue() as Record<string, string>
    payload.name = payload.username

    this.$api.post('/setup-wizard/create-first-user', payload).subscribe({
      next: async () => {
        this.$settings.env.setupWizardComplete = true
        await this.$auth.login({
          username: payload.username,
          password: payload.password,
        })
        this.step = 'setup-complete'
      },
      error: (error) => {
        this.loading = false
        console.error(error)
        this.$toastr.error(error.error.message || this.$translate.instant('users.toast_failed_to_add_user'), this.$translate.instant('toast.title_error'))
      },
    })
  }

  handleRestoreFileInput(files: FileList) {
    if (files.length) {
      this.selectedFile = files[0]
    } else {
      delete this.selectedFile
    }
  }

  onRestoreBackupClick() {
    this.restoreUploading = true
    this.uploadHomebridgeArchive()
  }

  async uploadHomebridgeArchive() {
    try {
      // Get and set a temporary access token
      const authorization = await firstValueFrom(this.$api.get('/setup-wizard/get-setup-wizard-token'))
      window.localStorage.setItem(environment.jwt.tokenKey, authorization.access_token)
      this.$auth.token = authorization.access_token

      // Upload archive
      const formData: FormData = new FormData()
      formData.append('restoreArchive', this.selectedFile, this.selectedFile.name)
      await firstValueFrom(this.$api.post('/backup/restore', formData))

      // Open restore modal
      this.openRestoreModal()
      this.restoreUploading = false
    } catch (error) {
      this.restoreUploading = false
      console.error(error)
      this.$toastr.error(error.error.message || this.$translate.instant('users.toast_failed_to_add_user'), this.$translate.instant('toast.title_error'))
    }
  }

  openRestoreModal() {
    const ref = this.$modal.open(RestoreComponent, {
      size: 'lg',
      backdrop: 'static',
    })
    ref.componentInstance.setupWizardRestore = true

    ref.result.then((success) => {
      if (success === true) {
        this.waitForHomebridgeToRestart()
      }
    })
  }

  async waitForHomebridgeToRestart() {
    this.step = 'restarting'

    // Remove tokens
    window.localStorage.removeItem(environment.jwt.tokenKey)
    this.$auth.token = null

    // Wait at least 15 seconds
    await new Promise(resolve => setTimeout(resolve, 15000))

    const checkHomebridgeInterval = setInterval(async () => {
      try {
        await firstValueFrom(this.$api.get('/auth/settings'))
        clearInterval(checkHomebridgeInterval)
        location.reload()
      } catch (e) {
        // Not up yet
      }
    }, 1000)
  }
}
