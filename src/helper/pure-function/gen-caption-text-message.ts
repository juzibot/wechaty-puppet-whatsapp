import { MessageTypes as WhatsAppMessageType } from '../../schema/whatsapp-interface.js'

import type { WhatsAppMessagePayload } from '../../schema/whatsapp-type.js'

export function genCaptionTextMessage (message: WhatsAppMessagePayload): WhatsAppMessagePayload {
  return {
    ...message,
    id: {
      ...message.id,
      id: `${message.id.id}_TEXT`,
    },
    type: WhatsAppMessageType.TEXT,
    hasMedia: false,
    _data: {
      type: message._data.type,
      quotedStanzaID: message._data.quotedStanzaID,
    },
  }
}
