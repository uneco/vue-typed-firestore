import { firestore } from 'firebase'
import * as streamManager from './stream-manager'
import * as dataLink from './data-link'
import { VueConstructor } from 'vue'
export * from './model-factory'

import './vue'

export default {
  link: dataLink.VuePlugin,
  stream: streamManager.VuePlugin,
}
