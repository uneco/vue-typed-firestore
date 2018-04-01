// tslint:disable:interface-name
// tslint:disable:no-shadowed-variable

import Vue from 'vue'
import { FirestoreStreamManager } from './stream-manager'
import { DataLink, Reference } from './data-link'
import { DocumentReference } from '@firebase/firestore-types'
import { IModelFactoryBase } from './model-factory'

declare module 'vue/types/vue' {
  interface Vue {
    $firestream: FirestoreStreamManager
    $firelink: DataLink
  }
}
