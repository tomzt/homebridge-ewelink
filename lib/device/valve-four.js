/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'
module.exports = class deviceValveFour {
  constructor (platform, accessory) {
    this.platform = platform
    this.log = platform.log
    this.helpers = platform.helpers
    this.Service = platform.api.hap.Service
    this.Characteristic = platform.api.hap.Characteristic
    ;['A', 'B', 'C', 'D'].forEach(v => {
      let valveService
      if (!(valveService = accessory.getService('Valve ' + v))) {
        accessory
          .addService(this.Service.Valve, 'Valve ' + v, 'valve' + v.toLowerCase())
          .setCharacteristic(this.Characteristic.Active, 0)
          .setCharacteristic(this.Characteristic.InUse, 0)
          .setCharacteristic(this.Characteristic.ValveType, 1)
          .setCharacteristic(this.Characteristic.SetDuration, 120)
          .addCharacteristic(this.Characteristic.RemainingDuration)
        valveService = accessory.getService('Valve ' + v)
      }
      valveService
        .getCharacteristic(this.Characteristic.Active)
        .on('set', (value, callback) => this.internalUpdate('Valve ' + v, value, callback))
      valveService
        .getCharacteristic(this.Characteristic.SetDuration)
        .on('set', (value, callback) => {
          if (valveService.getCharacteristic(this.Characteristic.InUse).value === 1) {
            valveService.updateCharacteristic(this.Characteristic.RemainingDuration, value)
            clearTimeout(valveService.timer)
            valveService.timer = setTimeout(() => valveService.setCharacteristic(this.Characteristic.Active, 0), value * 1000)
          }
          callback()
        })
    })
    this.accessory = accessory
  }

  async internalUpdate (valve, value, callback) {
    try {
      callback()
      const params = { switches: this.helpers.defaultMultiSwitchOff }
      const valveService = this.accessory.getService(valve)
      switch (valve) {
        case 'Valve A':
          params.switches[0].switch = value ? 'on' : 'off'
          params.switches[1].switch = this.accessory.getService('Valve B').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[2].switch = this.accessory.getService('Valve C').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[3].switch = this.accessory.getService('Valve D').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          break
        case 'Valve B':
          params.switches[0].switch = this.accessory.getService('Valve A').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[1].switch = value ? 'on' : 'off'
          params.switches[2].switch = this.accessory.getService('Valve C').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[3].switch = this.accessory.getService('Valve D').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          break
        case 'Valve C':
          params.switches[0].switch = this.accessory.getService('Valve A').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[1].switch = this.accessory.getService('Valve B').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[2].switch = value ? 'on' : 'off'
          params.switches[3].switch = this.accessory.getService('Valve D').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          break
        case 'Valve D':
          params.switches[0].switch = this.accessory.getService('Valve A').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[1].switch = this.accessory.getService('Valve B').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[2].switch = this.accessory.getService('Valve C').getCharacteristic(this.Characteristic.Active).value === 1
            ? 'on'
            : 'off'
          params.switches[3].switch = value ? 'on' : 'off'
          break
      }
      valveService.updateCharacteristic(this.Characteristic.InUse, value)
      switch (value) {
        case 0:
          valveService.updateCharacteristic(this.Characteristic.RemainingDuration, 0)
          clearTimeout(this.accessory.getService(valve).timer)
          this.log('[%s] current state [%s stopped].', this.accessory.displayName, valve)
          break
        case 1: {
          const timer = valveService.getCharacteristic(this.Characteristic.SetDuration).value
          valveService.updateCharacteristic(this.Characteristic.RemainingDuration, timer)
          this.log('[%s] current state [%s watering].', this.accessory.displayName, valve)
          valveService.timer = setTimeout(() => {
            valveService.setCharacteristic(this.Characteristic.Active, 0)
          }, timer * 1000)
          break
        }
      }
      await this.platform.sendDeviceUpdate(this.accessory, params)
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, true)
    }
  }

  async externalUpdate (params) {
    try {
      if (!params.switches) return
      ;['A', 'B', 'C', 'D'].forEach((v, k) => {
        const valveService = this.accessory.getService('Valve ' + v)
        if (params.switches[k].switch === 'on') {
          if (valveService.getCharacteristic(this.Characteristic.Active).value === 0) {
            const timer = valveService.getCharacteristic(this.Characteristic.SetDuration).value
            valveService
              .updateCharacteristic(this.Characteristic.Active, 1)
              .updateCharacteristic(this.Characteristic.InUse, 1)
              .updateCharacteristic(this.Characteristic.RemainingDuration, timer)
            if (params.updateSource) this.log('[%s] current state [Valve %s watering].', this.accessory.displayName, v)
            valveService.timer = setTimeout(() => {
              valveService.setCharacteristic(this.Characteristic.Active, 0)
            }, timer * 1000)
          }
          return
        }
        valveService
          .updateCharacteristic(this.Characteristic.Active, 0)
          .updateCharacteristic(this.Characteristic.InUse, 0)
          .updateCharacteristic(this.Characteristic.RemainingDuration, 0)
        clearTimeout(valveService.timer)
      })
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }
}