/* eslint-disable sort-keys */
import { test } from 'tstest'
import { genCaptionTextMessage } from './gen-caption-text-message.js'
import { MessageTypes } from '../../schema/whatsapp-interface.js'

import type { WhatsAppMessagePayload } from '../../schema/whatsapp-type.js'

test('gen caption text message from an image message with caption', async t => {
  const imageMessageWithCaption = {
    id: {
      fromMe: false,
      remote: '120363021332004743@g.us',
      id: 'MSGID001',
      _serialized: 'false_120363021332004743@g.us_MSGID001',
    },
    type: MessageTypes.IMAGE,
    hasMedia: true,
    hasQuotedMsg: true,
    _data: {
      type: 'image',
      caption: '这是图片说明',
      quotedStanzaID: 'ABCD1234',
      body: 'base64-thumbnail',
    },
  } as unknown as WhatsAppMessagePayload

  const textMessage = genCaptionTextMessage(imageMessageWithCaption)

  t.equal(imageMessageWithCaption.type, MessageTypes.IMAGE, 'should not change the origin message type')
  t.equal(imageMessageWithCaption.id.id, 'MSGID001', 'should not change the origin message id')
  t.equal(imageMessageWithCaption._data.caption, '这是图片说明', 'should not remove the caption of the origin message')

  t.equal(textMessage.id.id, 'MSGID001_TEXT', 'should get the text message id with the _TEXT suffix')
  t.equal(textMessage.id._serialized, 'false_120363021332004743@g.us_MSGID001', 'should keep the origin serialized id')
  t.equal(textMessage.type, MessageTypes.TEXT, 'should get a text type message')
  t.equal(textMessage.hasMedia, false, 'should get a message without media')
  t.equal(textMessage.hasQuotedMsg, true, 'should keep the quoted flag for the quote id parsing')
  t.equal(textMessage._data.caption, undefined, 'should remove the caption of the text message')
  t.equal(textMessage._data.body, undefined, 'should not carry the thumbnail of the image message')
  t.equal(textMessage._data.quotedStanzaID, 'ABCD1234', 'should keep the quoted stanza id for the quote id parsing')
})
