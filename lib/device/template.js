/* jshint node: true, esversion: 10, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = class deviceTemplate {
  constructor (platform, accessory) {
    // Set up variables from the platform
    this.eveChar = platform.eveChar
    this.funcs = platform.funcs
    this.hapChar = platform.api.hap.Characteristic
    this.hapErr = platform.api.hap.HapStatusError
    this.hapServ = platform.api.hap.Service
    this.lang = platform.lang
    this.log = platform.log
    this.platform = platform

    // Set up variables from the accessory
    this.name = accessory.displayName
    this.accessory = accessory

    // Initially set the online flag as true (to be then updated as false if necessary)
    this.isOnline = true

    // Set the correct logging variables for this accessory
    this.enableLogging = true
    this.enableDebugLogging = true

    // Output the customised options to the log
    const opts = JSON.stringify({
      logging: this.enableDebugLogging ? 'debug' : this.enableLogging ? 'standard' : 'disable'
    })
    this.log('[%s] %s %s.', this.name, this.lang.devInitOpts, opts)
  }

  async externalUpdate (params) {
    try {
      this.log.warn('New Command Received:')
      this.log(JSON.stringify(params))
    } catch (err) {
      this.platform.deviceUpdateError(this.accessory, err, false)
    }
  }

  markStatus (isOnline) {
    this.isOnline = isOnline
  }
}
