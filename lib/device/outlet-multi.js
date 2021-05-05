/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'

module.exports = class deviceOutletMulti {
  constructor (platform, accessory, devicesInHB) {
    // Set up variables from the platform
    this.devicesInHB = devicesInHB
    this.funcs = platform.funcs
    this.hapChar = platform.api.hap.Characteristic
    this.hapErr = platform.api.hap.HapStatusError
    this.hapServ = platform.api.hap.Service
    this.hapUUIDGen = platform.api.hap.uuid.generate
    this.lang = platform.lang
    this.log = platform.log
    this.platform = platform

    // Set up variables from the accessory
    this.name = accessory.displayName
    this.accessory = accessory

    // Set up custom variables for this device type
    const deviceConf = platform.multiDevices[accessory.context.eweDeviceId]
    this.hideChannels = deviceConf && deviceConf.hideChannels
      ? deviceConf.hideChannels
      : undefined
    this.disableDeviceLogging = deviceConf && deviceConf.overrideDisabledLogging
      ? false
      : platform.config.disableDeviceLogging

    // If the accessory has a switch service then remove it
    if (this.accessory.getService(this.hapServ.Switch)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.Switch))
    }

    // Add the outlet service if it doesn't already exist
    this.service = this.accessory.getService(this.hapServ.Outlet) ||
      this.accessory.addService(this.hapServ.Outlet)

    // Add the set handler to the switch/outlet on/off characteristic
    this.service.getCharacteristic(this.hapChar.On).onSet(async value => {
      await this.internalStateUpdate(value)
    })

    // Remove any OutletInUse characteristics from previous plugin versions
    if (this.service.testCharacteristic(this.hapChar.OutletInUse)) {
      this.service.removeCharacteristic(
        this.service.getCharacteristic(this.hapChar.OutletInUse)
      )
    }

    // Output the customised options to the log if in debug mode
    if (platform.config.debug) {
      const opts = JSON.stringify({
        disableDeviceLogging: this.disableDeviceLogging,
        hideChannels: this.hideChannels
      })
      this.log('[%s] %s %s.', this.name, this.lang.devInitOpts, opts)
    }
  }

  async internalStateUpdate (value) {
    try {
      let primaryState = false
      const params = {
        switches: []
      }
      const switchNumber = this.accessory.context.switchNumber
      switch (switchNumber) {
        case '0':
          params.switches.push({ switch: value ? 'on' : 'off', outlet: 0 })
          params.switches.push({ switch: value ? 'on' : 'off', outlet: 1 })
          params.switches.push({ switch: value ? 'on' : 'off', outlet: 2 })
          params.switches.push({ switch: value ? 'on' : 'off', outlet: 3 })
          break
        case '1':
        case '2':
        case '3':
        case '4':
          params.switches.push({ switch: value ? 'on' : 'off', outlet: switchNumber - 1 })
          break
      }
      await this.platform.sendDeviceUpdate(this.accessory, params)
      switch (switchNumber) {
        case '0':
          for (let i = 0; i <= this.accessory.context.channelCount; i++) {
            const idToCheck = this.accessory.context.eweDeviceId + 'SW' + i
            const uuid = this.hapUUIDGen(idToCheck)
            if (this.devicesInHB.has(uuid)) {
              const subAccessory = this.devicesInHB.get(uuid)
              subAccessory.getService(this.hapServ.Outlet).updateCharacteristic(
                this.hapChar.On,
                value
              )
              if (i > 0 && !this.disableDeviceLogging) {
                this.log(
                  '[%s] %s [%s].',
                  subAccessory.displayName,
                  this.lang.curState,
                  value ? 'on' : 'off'
                )
              }
            }
          }
          break
        case '1':
        case '2':
        case '3':
        case '4':
          for (let i = 1; i <= this.accessory.context.channelCount; i++) {
            const idToCheck = this.accessory.context.eweDeviceId + 'SW' + i
            const uuid = this.hapUUIDGen(idToCheck)
            if (this.devicesInHB.has(uuid)) {
              const subAccessory = this.devicesInHB.get(uuid)
              if (i === parseInt(switchNumber)) {
                if (value) {
                  primaryState = true
                }
                if (i > 0 && !this.disableDeviceLogging) {
                  this.log(
                    '[%s] %s [%s].',
                    subAccessory.displayName,
                    this.lang.curState,
                    value ? 'on' : 'off'
                  )
                }
              } else {
                if (
                  subAccessory.getService(this.hapServ.Outlet)
                    .getCharacteristic(this.hapChar.On).value
                ) {
                  primaryState = true
                }
              }
            }
          }
          if (!this.platform.hideMasters.includes(this.accessory.context.eweDeviceId)) {
            const idToCheck = this.accessory.context.eweDeviceId + 'SW0'
            const uuid = this.hapUUIDGen(idToCheck)
            const priAccessory = this.devicesInHB.get(uuid)
            priAccessory.getService(this.hapServ.Outlet).updateCharacteristic(
              this.hapChar.On,
              primaryState
            )
          }
          break
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, true)
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.On, !value)
      }, 5000)
      throw new this.hapErr(-70402)
    }
  }

  async externalUpdate (params) {
    try {
      if (!params.switches) {
        return
      }
      const idToCheck = this.accessory.context.eweDeviceId + 'SW'
      let primaryState = false
      for (let i = 1; i <= this.accessory.context.channelCount; i++) {
        const uuid = this.hapUUIDGen(idToCheck + i)
        if (this.devicesInHB.has(uuid)) {
          if (params.switches[i - 1].switch === 'on') {
            primaryState = true
          }
          const subAccessory = this.devicesInHB.get(uuid)
          const service = subAccessory.getService(this.hapServ.Outlet)
          const currentState = service.getCharacteristic(this.hapChar.On).value
            ? 'on'
            : 'off'
          if (params.updateSource && params.switches[i - 1].switch === currentState) {
            continue
          }
          service.updateCharacteristic(
            this.hapChar.On,
            params.switches[i - 1].switch === 'on'
          )
          if (params.updateSource && !this.disableDeviceLogging) {
            this.log(
              '[%s] %s [%s].',
              subAccessory.displayName,
              this.lang.curState,
              params.switches[i - 1].switch
            )
          }
        }
      }
      if (!this.platform.hideMasters.includes(this.accessory.context.eweDeviceId)) {
        this.service.updateCharacteristic(this.hapChar.On, primaryState)
      }
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }
}