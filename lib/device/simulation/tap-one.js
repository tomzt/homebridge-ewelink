/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'
module.exports = class deviceTapOne {
  constructor (platform, accessory) {
    this.platform = platform
    this.log = platform.log
    this.disableDeviceLogging = platform.config.disableDeviceLogging
    this.helpers = platform.helpers
    this.S = platform.api.hap.Service
    this.C = platform.api.hap.Characteristic
    this.dName = accessory.displayName
    this.accessory = accessory

    const asConfig = platform.cusG.get(this.accessory.context.eweDeviceId)
    if (!['oneSwitch', 'twoSwitch'].includes(asConfig.setup)) {
      this.error = 'setup must be oneSwitch or twoSwitch'
    }
    this.setup = asConfig.setup

    if (!(this.service = this.accessory.getService(this.S.Valve))) {
      this.service = this.accessory.addService(this.S.Valve)
      this.service.setCharacteristic(this.C.Active, 0)
        .setCharacteristic(this.C.InUse, 0)
        .setCharacteristic(this.C.ValveType, 3)
    }
    this.service.getCharacteristic(this.C.Active)
      .on('set', this.internalUpdate.bind(this))
  }

  async internalUpdate (value, callback) {
    try {
      callback()
      if (this.error) {
        this.log.warn('[%s] invalid config - %s.', this.dName, this.error)
        return
      }
      const params = {}
      switch (this.setup) {
        case 'oneSwitch':
          params.switch = value ? 'on' : 'off'
          break
        case 'twoSwitch':
          params.switches = this.helpers.defaultMultiSwitchOff
          params.switches[0].switch = value ? 'on' : 'off'
          break
      }
      await this.platform.sendDeviceUpdate(this.accessory, params)
      this.cacheOnOff = value ? 'on' : 'off'
      this.service.updateCharacteristic(this.C.InUse, value)
      if (!this.disableDeviceLogging) {
        this.log('[%s] current state [%s].', this.dName, this.cacheOnOff)
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, true)
    }
  }

  async externalUpdate (params) {
    try {
      if (this.error) {
        this.log.warn('[%s] invalid config - %s.', this.dName, this.error)
        return
      }
      switch (this.setup) {
        case 'oneSwitch':
          if (!params.switch || params.switch === this.cacheOnOff) {
            return
          }
          this.cacheOnOff = params.switch
          break
        case 'twoSwitch':
          if (!params.switches || params.switches[0].switch === this.cacheOnOff) {
            return
          }
          this.cacheOnOff = params.switches[0].switch
          break
      }
      this.service.updateCharacteristic(this.C.Active, this.cacheOnOff === 'on' ? 1 : 0)
        .updateCharacteristic(this.C.InUse, this.cacheOnOff === 'on' ? 1 : 0)
      if (params.updateSource && !this.disableDeviceLogging) {
        this.log('[%s] current state [%s].', this.dName, this.cacheOnOff)
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }
}