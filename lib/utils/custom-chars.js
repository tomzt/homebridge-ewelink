/* jshint node: true, esversion: 10, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = class customCharacteristics {
  constructor (api) {
    this.hapServ = api.hap.Service
    this.hapChar = api.hap.Characteristic
    this.uuids = {
      invertSwitch: 'E965F001-079E-48FF-8F27-9C2605A29F52',
      festiveScene: 'E965F002-079E-48FF-8F27-9C2605A29F52'
    }
    const self = this
    this.InvertSwitch = function () {
      self.hapChar.call(this, 'Invert Switch', self.uuids.invertSwitch)
      this.setProps({
        format: self.hapChar.Formats.BOOL,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.WRITE, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    this.FestiveScene = function () {
      self.hapChar.call(this, 'Festive Scene', self.uuids.festiveScene)
      this.setProps({
        format: self.hapChar.Formats.BOOL,
        perms: [self.hapChar.Perms.READ, self.hapChar.Perms.WRITE, self.hapChar.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    const inherits = require('util').inherits
    inherits(this.InvertSwitch, this.hapChar)
    inherits(this.FestiveScene, this.hapChar)
    this.InvertSwitch.UUID = this.uuids.invertSwitch
    this.FestiveScene.UUID = this.uuids.festiveScene
  }
}
