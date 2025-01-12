import type { Systeminformation } from 'systeminformation'

import { exec, spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import process from 'node:process'

import { Categories } from '@homebridge/hap-client/dist/hap-types'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { alloc } from 'buffer-shims'
import {
  pathExists,
  readdir,
  readJson,
  remove,
  unlink,
  writeJson,
} from 'fs-extra'
import NodeCache from 'node-cache'
import { networkInterfaces } from 'systeminformation'
import { check as tcpCheck } from 'tcp-port-used'

import { ConfigService, HomebridgeConfig } from '../../core/config/config.service'
import { HomebridgeIpcService } from '../../core/homebridge-ipc/homebridge-ipc.service'
import { Logger } from '../../core/logger/logger.service'
import { AccessoriesService } from '../accessories/accessories.service'
import { ConfigEditorService } from '../config-editor/config-editor.service'
import { HomebridgeMdnsSettingDto } from './server.dto'

@Injectable()
export class ServerService {
  private serverServiceCache = new NodeCache({ stdTTL: 300 })

  private readonly accessoryId: string
  private readonly accessoryInfoPath: string

  public setupCode: string | null = null
  public paired: boolean = false

  constructor(
    private readonly configService: ConfigService,
    private readonly configEditorService: ConfigEditorService,
    private readonly accessoriesService: AccessoriesService,
    private readonly homebridgeIpcService: HomebridgeIpcService,
    private readonly logger: Logger,
  ) {
    this.accessoryId = this.configService.homebridgeConfig.bridge.username.split(':').join('')
    this.accessoryInfoPath = join(this.configService.storagePath, 'persist', `AccessoryInfo.${this.accessoryId}.json`)
  }

  private async deleteSingleDeviceAccessories(id: string, cachedAccessoriesDir: string) {
    const cachedAccessories = join(cachedAccessoriesDir, `cachedAccessories.${id}`)
    const cachedAccessoriesBackup = join(cachedAccessoriesDir, `.cachedAccessories.${id}.bak`)

    if (await pathExists(cachedAccessories)) {
      await unlink(cachedAccessories)
      this.logger.warn(`Bridge ${id} accessory removal: removed ${cachedAccessories}.`)
    }

    if (await pathExists(cachedAccessoriesBackup)) {
      await unlink(cachedAccessoriesBackup)
      this.logger.warn(`Bridge ${id} accessory removal: removed ${cachedAccessoriesBackup}.`)
    }
  }

  private async deleteSingleDevicePairing(id: string, resetPairingInfo: boolean) {
    const persistPath = join(this.configService.storagePath, 'persist')
    const accessoryInfo = join(persistPath, `AccessoryInfo.${id}.json`)
    const identifierCache = join(persistPath, `IdentifierCache.${id}.json`)

    // Only available for child bridges
    if (resetPairingInfo) {
      // An error thrown here should not interrupt the process, this is a convenience feature
      try {
        const configFile = await this.configEditorService.getConfigFile()
        const username = id.match(/.{1,2}/g).join(':')
        const pluginBlocks = configFile.accessories
          .concat(configFile.platforms)
          .concat([{ _bridge: configFile.bridge }])
          .filter((block: any) => block._bridge?.username?.toUpperCase() === username.toUpperCase())

        const pluginBlock = pluginBlocks.find((block: any) => block._bridge?.port)
        const otherBlocks = pluginBlocks.filter((block: any) => !block._bridge?.port)

        if (pluginBlock) {
          // Generate new random username and pin, and save the config file
          pluginBlock._bridge.username = this.configEditorService.generateUsername()
          pluginBlock._bridge.pin = this.configEditorService.generatePin()

          // Multiple blocks may share the same username, for accessory blocks that are part of the same bridge
          otherBlocks.forEach((block: any) => {
            block._bridge.username = pluginBlock._bridge.username
          })

          this.logger.warn(`Bridge ${id} reset: new username: ${pluginBlock._bridge.username} and new pin: ${pluginBlock._bridge.pin}.`)
          await this.configEditorService.updateConfigFile(configFile)
        } else {
          this.logger.error(`Failed to reset username and pin for child bridge ${id} as the plugin block could not be found.`)
        }
      } catch (e) {
        this.logger.error(`Failed to reset username and pin for child bridge ${id} as ${e.message}.`)
      }
    }

    if (await pathExists(accessoryInfo)) {
      await unlink(accessoryInfo)
      this.logger.warn(`Bridge ${id} reset: removed ${accessoryInfo}.`)
    }

    if (await pathExists(identifierCache)) {
      await unlink(identifierCache)
      this.logger.warn(`Bridge ${id} reset: removed ${identifierCache}.`)
    }

    await this.deleteDeviceAccessories(id)
  }

  /**
   * Restart the server
   */
  public async restartServer() {
    this.logger.log('Homebridge restart request received.')

    if (this.configService.serviceMode && !(await this.configService.uiRestartRequired() || await this.nodeVersionChanged())) {
      this.logger.log('UI/Bridge settings have not changed - only restarting Homebridge process.')
      // Restart homebridge by killing child process
      this.homebridgeIpcService.restartHomebridge()

      // Reset the pool of discovered homebridge instances
      this.accessoriesService.resetInstancePool()
      return { ok: true, command: 'SIGTERM', restartingUI: false }
    }

    setTimeout(() => {
      if (this.configService.ui.restart) {
        this.logger.log(`Executing restart command ${this.configService.ui.restart}.`)
        exec(this.configService.ui.restart, (err) => {
          if (err) {
            this.logger.log('Restart command exited with an error, failed to restart Homebridge.')
          }
        })
      } else {
        this.logger.log('Sending SIGTERM to process...')
        process.kill(process.pid, 'SIGTERM')
      }
    }, 500)

    return { ok: true, command: this.configService.ui.restart, restartingUI: true }
  }

  /**
   * Resets homebridge accessory and deletes all accessory cache.
   * Preserves plugin config.
   */
  public async resetHomebridgeAccessory() {
    // Restart ui on next restart
    this.configService.hbServiceUiRestartRequired = true

    const configFile = await this.configEditorService.getConfigFile()

    // Generate new random username and pin
    configFile.bridge.pin = this.configEditorService.generatePin()
    configFile.bridge.username = this.configEditorService.generateUsername()

    this.logger.warn(`Homebridge bridge reset: new username ${configFile.bridge.username} and new pin ${configFile.bridge.pin}.`)

    // Save the config file
    await this.configEditorService.updateConfigFile(configFile)

    // Remove accessories and persist directories
    await remove(resolve(this.configService.storagePath, 'accessories'))
    await remove(resolve(this.configService.storagePath, 'persist'))

    this.logger.log('Homebridge bridge reset: accessories and persist directories were removed.')
  }

  /**
   * Return a list of the device pairings in the homebridge persist folder
   */
  public async getDevicePairings() {
    const persistPath = join(this.configService.storagePath, 'persist')

    const devices = (await readdir(persistPath))
      .filter(x => x.match(/AccessoryInfo\.([A-F,a-f0-9]+)\.json/))

    const configFile = await this.configEditorService.getConfigFile()

    return Promise.all(devices.map(async (x) => {
      return await this.getDevicePairingById(x.split('.')[1], configFile)
    }))
  }

  /**
   * Return a single device pairing
   * @param deviceId
   * @param configFile
   */
  public async getDevicePairingById(deviceId: string, configFile = null) {
    const persistPath = join(this.configService.storagePath, 'persist')

    let device: any
    try {
      device = await readJson(join(persistPath, `AccessoryInfo.${deviceId}.json`))
    } catch (e) {
      throw new NotFoundException()
    }

    if (!configFile) {
      configFile = await this.configEditorService.getConfigFile()
    }

    const username = deviceId.match(/.{1,2}/g).join(':')
    const isMain = this.configService.homebridgeConfig.bridge.username.toUpperCase() === username.toUpperCase()
    const pluginBlock = configFile.accessories
      .concat(configFile.platforms)
      .concat([{ _bridge: configFile.bridge }])
      .find((block: any) => block._bridge?.username?.toUpperCase() === username.toUpperCase() && block._bridge?.port)

    try {
      device._category = Object.entries(Categories).find(([, value]) => value === device.category)[0].toLowerCase()
    } catch (e) {
      device._category = 'Other'
    }

    device.name = pluginBlock?._bridge.name || pluginBlock?.name || device.displayName
    device._id = deviceId
    device._username = username
    device._main = isMain
    device._isPaired = device.pairedClients && Object.keys(device.pairedClients).length > 0
    device._setupCode = this.generateSetupCode(device)
    device._couldBeStale = !device._main && device._category === 'bridge' && !pluginBlock

    // Filter out some properties
    delete device.signSk
    delete device.signPk
    delete device.configHash
    delete device.pairedClients
    delete device.pairedClientsPermission

    return device
  }

  /**
   * Remove a device pairing
   */
  public async deleteDevicePairing(id: string, resetPairingInfo: boolean) {
    if (!this.configService.serviceMode) {
      this.logger.error('The reset paired bridge command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    this.logger.warn(`Shutting down Homebridge before resetting paired bridge ${id}...`)

    // Wait for homebridge to stop
    await this.homebridgeIpcService.restartAndWaitForClose()

    // Remove the bridge cache files
    await this.deleteSingleDevicePairing(id, resetPairingInfo)

    return { ok: true }
  }

  /**
   * Remove multiple device pairings
   */
  public async deleteDevicesPairing(bridges: { id: string, resetPairingInfo: boolean }[]) {
    if (!this.configService.serviceMode) {
      this.logger.error('The reset multiple paired bridges command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    this.logger.warn(`Shutting down Homebridge before resetting paired bridges ${bridges.map(x => x.id).join(', ')}...`)

    // Wait for homebridge to stop
    await this.homebridgeIpcService.restartAndWaitForClose()

    for (const { id, resetPairingInfo } of bridges) {
      try {
        // Remove the bridge cache files
        await this.deleteSingleDevicePairing(id, resetPairingInfo)
      } catch (e) {
        this.logger.error(`Failed to reset paired bridge ${id} as ${e.message}.`)
      }
    }

    return { ok: true }
  }

  /**
   * Remove a device's accessories
   */
  public async deleteDeviceAccessories(id: string) {
    if (!this.configService.serviceMode) {
      this.logger.error('The remove bridge\'s accessories command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    this.logger.warn(`Shutting down Homebridge before removing accessories for paired bridge ${id}...`)

    // Wait for homebridge to stop.
    await this.homebridgeIpcService.restartAndWaitForClose()

    const cachedAccessoriesDir = join(this.configService.storagePath, 'accessories')

    await this.deleteSingleDeviceAccessories(id, cachedAccessoriesDir)
  }

  /**
   * Remove multiple devices' accessories
   */
  public async deleteDevicesAccessories(bridges: { id: string }[]) {
    if (!this.configService.serviceMode) {
      this.logger.error('The remove bridges\' accessories command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    this.logger.warn(`Shutting down Homebridge before removing accessories for paired bridges ${bridges.map(x => x.id).join(', ')}...`)

    // Wait for homebridge to stop.
    await this.homebridgeIpcService.restartAndWaitForClose()

    const cachedAccessoriesDir = join(this.configService.storagePath, 'accessories')

    for (const { id } of bridges) {
      try {
        await this.deleteSingleDeviceAccessories(id, cachedAccessoriesDir)
      } catch (e) {
        this.logger.error(`Failed to remove accessories for bridge ${id} as ${e.message}.`)
      }
    }
  }

  /**
   * Returns all cached accessories
   */
  public async getCachedAccessories() {
    const cachedAccessoriesDir = join(this.configService.storagePath, 'accessories')

    const cachedAccessoryFiles = (await readdir(cachedAccessoriesDir))
      .filter(x => x.match(/^cachedAccessories\.([A-F,0-9]+)$/) || x === 'cachedAccessories')

    const cachedAccessories = []

    await Promise.all(cachedAccessoryFiles.map(async (x) => {
      const accessories = await readJson(join(cachedAccessoriesDir, x))
      for (const accessory of accessories) {
        accessory.$cacheFile = x
        cachedAccessories.push(accessory)
      }
    }))

    return cachedAccessories
  }

  /**
   * Remove a single cached accessory
   */
  public async deleteCachedAccessory(uuid: string, cacheFile: string) {
    if (!this.configService.serviceMode) {
      this.logger.error('The remove cached accessory command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    cacheFile = cacheFile || 'cachedAccessories'

    const cachedAccessoriesPath = resolve(this.configService.storagePath, 'accessories', cacheFile)

    this.logger.warn(`Shutting down Homebridge before removing cached accessory ${uuid}...`)

    // Wait for homebridge to stop.
    await this.homebridgeIpcService.restartAndWaitForClose()

    const cachedAccessories = await readJson(cachedAccessoriesPath) as Array<any>
    const accessoryIndex = cachedAccessories.findIndex(x => x.UUID === uuid)

    if (accessoryIndex > -1) {
      cachedAccessories.splice(accessoryIndex, 1)
      await writeJson(cachedAccessoriesPath, cachedAccessories)
      this.logger.warn(`Removed cached accessory with UUID ${uuid} from file ${cacheFile}.`)
    } else {
      this.logger.error(`Cannot find cached accessory with UUID ${uuid} from file ${cacheFile}.`)
      throw new NotFoundException()
    }

    return { ok: true }
  }

  /**
   * Remove multiple cached accessories
   */
  public async deleteCachedAccessories(accessories: { uuid: string, cacheFile: string }[]) {
    if (!this.configService.serviceMode) {
      this.logger.error('The remove cached accessories command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    this.logger.warn(`Shutting down Homebridge before removing cached accessories ${accessories.map(x => x.uuid).join(', ')}.`)

    // Wait for homebridge to stop.
    await this.homebridgeIpcService.restartAndWaitForClose()

    const accessoriesByCacheFile = new Map<string, { uuid: string }[]>()

    // Group accessories by cacheFile
    for (const { cacheFile, uuid } of accessories) {
      const accessoryCacheFile = cacheFile || 'cachedAccessories'
      if (!accessoriesByCacheFile.has(accessoryCacheFile)) {
        accessoriesByCacheFile.set(accessoryCacheFile, [])
      }
      accessoriesByCacheFile.get(accessoryCacheFile).push({ uuid })
    }

    // Process each group of accessories
    for (const [cacheFile, accessories] of accessoriesByCacheFile.entries()) {
      const cachedAccessoriesPath = resolve(this.configService.storagePath, 'accessories', cacheFile)
      const cachedAccessories = await readJson(cachedAccessoriesPath) as Array<any>
      for (const { uuid } of accessories) {
        try {
          const accessoryIndex = cachedAccessories.findIndex(x => x.UUID === uuid)
          if (accessoryIndex > -1) {
            cachedAccessories.splice(accessoryIndex, 1)
            this.logger.warn(`Removed cached accessory with UUID ${uuid} from file ${cacheFile}.`)
          } else {
            this.logger.error(`Cannot find cached accessory with UUID ${uuid} from file ${cacheFile}.`)
          }
        } catch (e) {
          this.logger.error(`Failed to remove cached accessory with UUID ${uuid} from file ${cacheFile} as ${e.message}.`)
        }
      }
      await writeJson(cachedAccessoriesPath, cachedAccessories)
    }

    return { ok: true }
  }

  /**
   * Clears the Homebridge Accessory Cache
   */
  public async deleteAllCachedAccessories() {
    if (!this.configService.serviceMode) {
      this.logger.error('The remove all cached accessories command is only available in service mode.')
      throw new BadRequestException('This command is only available in service mode.')
    }

    const cachedAccessoriesDir = join(this.configService.storagePath, 'accessories')
    const cachedAccessoryPaths = (await readdir(cachedAccessoriesDir))
      .filter(x => x.match(/cachedAccessories\.([A-F,0-9]+)/) || x === 'cachedAccessories' || x === '.cachedAccessories.bak')
      .map(x => resolve(cachedAccessoriesDir, x))

    const cachedAccessoriesPath = resolve(this.configService.storagePath, 'accessories', 'cachedAccessories')

    // Wait for homebridge to stop.
    await this.homebridgeIpcService.restartAndWaitForClose()

    this.logger.warn('Shutting down Homebridge before removing cached accessories')

    try {
      this.logger.log('Clearing all cached accessories...')
      for (const thisCachedAccessoriesPath of cachedAccessoryPaths) {
        if (await pathExists(thisCachedAccessoriesPath)) {
          await unlink(thisCachedAccessoriesPath)
          this.logger.warn(`Removed ${thisCachedAccessoriesPath}.`)
        }
      }
    } catch (e) {
      this.logger.error(`Failed to clear all cached accessories at ${cachedAccessoriesPath} as ${e.message}.`)
      console.error(e)
      throw new InternalServerErrorException('Failed to clear Homebridge accessory cache - see logs.')
    }

    return { ok: true }
  }

  /**
   * Returns existing setup code if cached, or requests one
   */
  public async getSetupCode(): Promise<string | null> {
    if (this.setupCode) {
      return this.setupCode
    } else {
      if (!await pathExists(this.accessoryInfoPath)) {
        return null
      }

      const accessoryInfo = await readJson(this.accessoryInfoPath)
      this.setupCode = this.generateSetupCode(accessoryInfo)
      return this.setupCode
    }
  }

  /**
   * Generates the setup code
   */
  private generateSetupCode(accessoryInfo: any): string {
    // This code is from https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/Accessory.js#L369
    const buffer = alloc(8)
    let valueLow = Number.parseInt(accessoryInfo.pincode.replace(/-/g, ''), 10)
    const valueHigh = accessoryInfo.category >> 1

    valueLow |= 1 << 28 // Supports IP;

    buffer.writeUInt32BE(valueLow, 4)

    if (accessoryInfo.category & 1) {
      buffer[4] = buffer[4] | 1 << 7
    }

    buffer.writeUInt32BE(valueHigh, 0)

    let encodedPayload = (buffer.readUInt32BE(4) + (buffer.readUInt32BE(0) * 2 ** 32)).toString(36).toUpperCase()

    if (encodedPayload.length !== 9) {
      for (let i = 0; i <= 9 - encodedPayload.length; i++) {
        encodedPayload = `0${encodedPayload}`
      }
    }

    return `X-HM://${encodedPayload}${accessoryInfo.setupID}`
  }

  /**
   * Return the current pairing information for the main bridge
   */
  public async getBridgePairingInformation() {
    if (!await pathExists(this.accessoryInfoPath)) {
      return new ServiceUnavailableException('Pairing Information Not Available Yet')
    }

    const accessoryInfo = await readJson(this.accessoryInfoPath)

    return {
      displayName: accessoryInfo.displayName,
      pincode: accessoryInfo.pincode,
      setupCode: await this.getSetupCode(),
      isPaired: accessoryInfo.pairedClients && Object.keys(accessoryInfo.pairedClients).length > 0,
    }
  }

  /**
   * Returns a list of network adapters on the current host
   */
  public async getSystemNetworkInterfaces(): Promise<Systeminformation.NetworkInterfacesData[]> {
    const fromCache: Systeminformation.NetworkInterfacesData[] = this.serverServiceCache.get('network-interfaces')

    // See https://github.com/sebhildebrandt/systeminformation/issues/775#issuecomment-1741836906
    // @ts-expect-error - These ts-ignore should be able to be removed in the next major release of 'systeminformation' (v6)
    const interfaces = fromCache || (await networkInterfaces()).filter((adapter: any) => {
      return !adapter.internal
        && (adapter.ip4 || (adapter.ip6))
    })

    if (!fromCache) {
      this.serverServiceCache.set('network-interfaces', interfaces)
    }

    return interfaces
  }

  /**
   * Returns a list of network adapters the bridge is currently configured to listen on
   */
  public async getHomebridgeNetworkInterfaces() {
    const config = await this.configEditorService.getConfigFile()

    if (!config.bridge?.bind) {
      return []
    }

    if (Array.isArray(config.bridge?.bind)) {
      return config.bridge.bind
    }

    if (typeof config.bridge?.bind === 'string') {
      return [config.bridge.bind]
    }

    return []
  }

  /**
   * Return the current setting for the config.bridge.advertiser value
   */
  public async getHomebridgeMdnsSetting(): Promise<HomebridgeMdnsSettingDto> {
    const config = await this.configEditorService.getConfigFile()

    if (!config.bridge.advertiser) {
      config.bridge.advertiser = 'bonjour-hap'
    }

    return {
      advertiser: config.bridge.advertiser,
    }
  }

  /**
   * Return the current setting for the config.bridge.advertiser value
   */
  public async setHomebridgeMdnsSetting(setting: HomebridgeMdnsSettingDto) {
    const config = await this.configEditorService.getConfigFile()

    config.bridge.advertiser = setting.advertiser

    await this.configEditorService.updateConfigFile(config)
  }

  /**
   * Set the bridge interfaces
   */
  public async setHomebridgeNetworkInterfaces(adapters: string[]) {
    const config = await this.configEditorService.getConfigFile()

    if (!config.bridge) {
      config.bridge = {} as HomebridgeConfig['bridge']
    }

    if (!adapters.length) {
      delete config.bridge.bind
    } else {
      config.bridge.bind = adapters
    }

    await this.configEditorService.updateConfigFile(config)
  }

  /**
   * Generate a random, unused port and return it
   */
  public async lookupUnusedPort() {
    const randomPort = () => Math.floor(Math.random() * (60000 - 30000 + 1) + 30000)

    let port = randomPort()
    while (await tcpCheck(port)) {
      port = randomPort()
    }

    return { port }
  }

  /**
   * Get the Homebridge port
   */
  public async getHomebridgePort(): Promise<{ port: number }> {
    const config = await this.configEditorService.getConfigFile()

    return { port: config.bridge.port }
  }

  /**
   * Set the Homebridge port
   */
  public async setHomebridgePort(port: number): Promise<void> {
    // Validate port is between 1 and 65535
    if (!port || typeof port !== 'number' || !Number.isInteger(port) || port < 1025 || port > 65533) {
      throw new BadRequestException('Invalid port number')
    }

    const config = await this.configEditorService.getConfigFile()

    config.bridge.port = port

    console.error('port', port)

    await this.configEditorService.updateConfigFile(config)
  }

  /**
   * Check if the system Node.js version has changed
   */
  private async nodeVersionChanged(): Promise<boolean> {
    return new Promise((res) => {
      let result = false

      const child = spawn(process.execPath, ['-v'])

      child.stdout.once('data', (data) => {
        result = data.toString().trim() !== process.version
      })

      child.on('error', () => {
        result = true
      })

      child.on('close', () => {
        return res(result)
      })
    })
  }
}
