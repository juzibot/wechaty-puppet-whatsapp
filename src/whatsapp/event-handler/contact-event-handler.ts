/* eslint-disable no-case-declarations */
import WhatsAppBase from '../whatsapp-base.js'

import * as PUPPET from '@juzi/wechaty-puppet'
import { log } from '../../config.js'
import type { Contact } from '@juzi/whatsapp-web.js'
import { v4 } from 'uuid'

const PRE = 'ContactEventHandler'

export default class ContactEventHandler extends WhatsAppBase {

  public async onContactNameChange (contact: Contact, newName: string, oldName: string) {
    log.info(PRE, `onContactNameChange(${contact.id._serialized}, ${newName}, ${oldName})`)
    const type = contact.isGroup ? PUPPET.types.Dirty.Room : PUPPET.types.Dirty.Contact
    this.emit('dirty', {
      payloadType: type,
      payloadId: contact.id._serialized,
    })
  }

  public async onContactAdd (contact: Contact) {
    log.info(PRE, `onContactAdd(${contact.id._serialized})`)
    const friendship: PUPPET.payloads.Friendship = {
      contactId: contact.id._serialized,
      hello: '',
      id: v4(),
      timestamp: Date.now(),
      type: PUPPET.types.Friendship.Confirm,
    }
    this.emit('friendship', { friendshipId: friendship.id })
  }

  public async onContactRemove (contact: Contact) {
    log.info(PRE, `onContactRemove(${contact.id._serialized})`)
    const friendship: PUPPET.payloads.Friendship = {
      contactId: contact.id._serialized,
      hello: '',
      id: v4(),
      timestamp: Date.now(),
      type: PUPPET.types.Friendship.Delete,
    }
    this.emit('friendship', { friendshipId: friendship.id })
  }

}
