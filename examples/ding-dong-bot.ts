/* eslint-disable promise/always-return */
/* eslint-disable sort-keys */
/* eslint-disable no-console */
/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import * as PUPPET from '@juzi/wechaty-puppet'

import qrTerm from 'qrcode-terminal'

import { PuppetWhatsapp } from '../src/mod.js'

/**
 *
 * 1. Declare your Bot!
 *
 */
const puppet = new PuppetWhatsapp({
  puppeteerOptions: {
    puppeteer: {
      headless: false,
    },
  },
})

/**
 *
 * 2. Register event handlers for Bot
 *
 */
puppet
  .on('logout', onLogout)
  .on('login',  onLogin)
  .on('scan',   onScan)
  .on('error',  onError)
  .on('message', onMessage)
  .on('ready', onReady)

/**
 *
 * 3. Start the bot!
 *
 */
puppet.start()
  .then(() => {
    puppet.on('dirty', onDirty)
  })
  .catch(async e => {
    console.error('Bot start() fail:', e)
    await puppet.stop()
    process.exit(-1)
  })

/**
 *
 * 4. You are all set. ;-]
 *
 */

/**
 *
 * 5. Define Event Handler Functions for:
 *  `scan`, `login`, `logout`, `error`, and `message`
 *
 */
function onScan (payload: PUPPET.payloads.EventScan) {
  if (payload.qrcode) {
    qrTerm.generate(payload.qrcode, { small: true })

    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      payload.qrcode,
    ].join('')
    console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  } else {
    console.info(`[${payload.status}]`)
  }
}

function onLogin (payload: PUPPET.payloads.EventLogin) {
  console.info(`${payload.contactId} login`)
}

function onLogout (payload: PUPPET.payloads.EventLogout) {
  console.info(`${payload.contactId} logouted`)
}

function onError (payload: PUPPET.payloads.EventError) {
  console.error('Bot error:', payload.data)
  /*
  if (bot.logonoff()) {
    bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  */
}

/**
 *
 * 6. The most important handler is for:
 *    dealing with Messages.
 *
 */
async function onMessage (payload: PUPPET.payloads.EventMessage) {
  const msgPayload = await puppet.messagePayload(payload.messageId)
  // eslint-disable-next-line no-console
  console.log(msgPayload)
  if (msgPayload.type === 8) {
    console.log(await puppet.messageLocation(msgPayload.id))
  }
  if ((/ding/i.test(msgPayload.text || ''))) {
    await puppet.messageSendText(msgPayload.talkerId!, 'dong')
    // await puppet.messageSendLocation(msgPayload.talkerId!, {
    //   latitude: -37.8773906,
    //   longitude: 145.0449860,
    //   name: 'Monash University',
    //   accuracy: 15,
    //   address: 'Melbourne Victoria Australia',
    // })
  }
}

async function onDirty (payload: PUPPET.payloads.EventDirty) {
  console.log(`onDirty(${JSON.stringify(payload)})`)
  if (payload.payloadType === PUPPET.types.Dirty.Contact) {
    const contactId = payload.payloadId
    const contact = await puppet.contactPayload(contactId)
    console.log('updated contact: ', JSON.stringify(contact))
  }
  if (payload.payloadType === PUPPET.types.Dirty.Message) {
    const messageId = payload.payloadId
    const message = await puppet.messagePayload(messageId)
    console.log('updated message: ', JSON.stringify(message))
  }
}

async function onReady () {
  console.log('onReady()')
}

/**
 *
 * 7. Output the Welcome Message
 *
 */
const welcome = `
Puppet Version: ${puppet.version()}

Please wait... I'm trying to login in...

`
console.info(welcome)
