import { firestore } from 'firebase'
import { Subject, Observable, Subscription } from 'rxjs'
import Vue, { ComponentOptions, VueConstructor } from 'vue'
import { IModelFactoryBase } from './model-factory'
import { DocumentReference } from '@firebase/firestore-types'

export type DR = firestore.DocumentReference
export type DS = firestore.DocumentSnapshot
export type Q = firestore.Query
export type QS = firestore.QuerySnapshot
export type Model = IModelFactoryBase<{}, {}, {}>

export interface ITypedDocumentReference <M extends Model> extends firestore.DocumentReference {
  get (): Promise<ITypedDocumentSnapshot<M>>
}

export interface IMappableDocumentReference <M extends Model> extends ITypedDocumentReference<M> {
  get (): Promise<IMappedDocumentSnapshot<M>>
}

export interface ITypedDocumentSnapshot <M extends Model> extends firestore.DocumentSnapshot {
  data (): M['types']['base'] & M['types']['remote']
}

export interface IMappedDocumentSnapshot <M extends Model> extends ITypedDocumentSnapshot<M> {
  readonly mapped: M['types']['stored']
}

export interface ITypedDocumentChange <M extends Model> extends firestore.DocumentChange {
  readonly doc: ITypedDocumentSnapshot<M>
}

export interface IMappedDocumentChange <M extends Model> extends firestore.DocumentChange {
  readonly doc: IMappedDocumentSnapshot<M>
}

export interface ITypedQuerySnapshot <M extends Model> extends firestore.QuerySnapshot {
  readonly docs: Array<ITypedDocumentSnapshot<M>>
  readonly docChanges: Array<ITypedDocumentChange<M>>
}

export interface IMappedQuerySnapshot <M extends Model> extends ITypedQuerySnapshot<M> {
  readonly docs: Array<IMappedDocumentSnapshot<M>>
  readonly docChanges: Array<IMappedDocumentChange<M>>
}

export type DocumentMapper <M extends Model> = (from: DS) => Promise<IMappedDocumentSnapshot<M>>
export type DocumentOptions <M extends Model> = firestore.DocumentListenOptions & { mapper?: DocumentMapper<M> }

export class DocumentSnapshotSubject <M extends Model> extends Subject<IMappedDocumentSnapshot<M>> {
  private readonly beforeUnsubscribe: () => void
  constructor (
    public documentReference: DR,
    mapper: DocumentMapper<M>,
    options: firestore.DocumentListenOptions = {},
  ) {
    super()
    this.beforeUnsubscribe = documentReference.onSnapshot(options, async (snapshot) => {
      this.next(await mapper(snapshot))
    })
  }

  public unsubscribe () {
    this.beforeUnsubscribe()
    super.unsubscribe()
  }
}

export class QuerySnapshotSubject <M extends Model> extends Subject<IMappedQuerySnapshot<M>> {
  private readonly beforeUnsubscribe: () => void
  constructor (
    public queryReference: Q,
    mapper: DocumentMapper<M>,
    options: firestore.QueryListenOptions = {},
  ) {
    super()
    const unsubscriber = queryReference.onSnapshot(options, async (snapshot) => {
      Object.defineProperty(snapshot, 'docs', {
        writable: false,
        configurable: true,
        enumerable: false,
        value: await Promise.all(snapshot.docs.map((doc) => mapper(doc))),
      })
      Object.defineProperty(snapshot, 'docChanges', {
        writable: false,
        configurable: true,
        enumerable: false,
        value: await Promise.all(snapshot.docChanges.map(async (docChange) => {
          return {
            ...docChange,
            doc: await mapper(docChange.doc),
          }
        })),
      })
      this.next(snapshot as IMappedQuerySnapshot<M>)
    })
    this.beforeUnsubscribe = unsubscriber
  }

  public unsubscribe () {
    this.beforeUnsubscribe()
    super.unsubscribe()
  }
}

export class FirestoreStreamManager {
  private subjects = new Set<DocumentSnapshotSubject<any> | QuerySnapshotSubject<any>>()

  constructor (
    public readonly db: firestore.Firestore,
    public documentMapper: DocumentMapper<any>,
  ) {
  }

  public document <M extends Model> (docOrPath: DR | string, options: firestore.DocumentListenOptions = {}): DocumentSnapshotSubject<M> {
    const subject = this.documentInner<M>(this.convertToDocument(docOrPath), options)
    this.subjects.add(subject)
    return subject
  }

  public query <M extends Model> (queryOrPath: Q | string, options: firestore.QueryListenOptions = {}): QuerySnapshotSubject<M> {
    const subject = this.queryInner<M>(this.convertToQuery(queryOrPath), options)
    this.subjects.add(subject)
    return subject
  }

  public unsubscribe () {
    for (const subject of this.subjects) {
      try {
        subject.unsubscribe()
      } catch (err) {
        if (err.name !== 'ObjectUnsubscribedError') {
          throw err
        }
      }
    }
    this.subjects = new Set()
  }

  private documentInner <M extends Model> (doc: DR, options: firestore.DocumentListenOptions = {}): DocumentSnapshotSubject<M> {
    return new DocumentSnapshotSubject<M>(doc, this.documentMapper, options)
  }

  private queryInner <M extends Model> (q: Q, options: firestore.QueryListenOptions = {}): QuerySnapshotSubject<M> {
    return new QuerySnapshotSubject<M>(q, this.documentMapper, options)
  }

  private convertToDocument (docOrPath: DR | string) {
    if (typeof docOrPath === 'string') {
      return this.db.doc(docOrPath)
    }
    return docOrPath
  }

  private convertToQuery (queryOrPath: Q | string) {
    if (typeof queryOrPath === 'string') {
      return this.db.collection(queryOrPath)
    }
    return queryOrPath
  }
}

export interface IPlugin {
  mixin: ComponentOptions<Vue>
  streams: { [key: number]: FirestoreStreamManager | undefined }
  install (vue: VueConstructor): void
}

export function VuePlugin (db: firestore.Firestore, documentMapper: DocumentMapper<any>, keyname = '$firestream'): IPlugin {
  const plugin: IPlugin = {
    mixin: {
      beforeDestroy () {
        const uid: number = (this as any)._uid
        const stream = plugin.streams[uid]
        if (stream) {
          stream.unsubscribe()
          delete plugin.streams[uid]
        }
      },
    },
    streams: {},
    install (vue) {
      vue.mixin(plugin.mixin)
      Object.defineProperty(vue.prototype, keyname, {
        get () {
          const uid: number = (this as any)._uid
          if (!plugin.streams[uid]) {
            plugin.streams[uid] = new FirestoreStreamManager(db, documentMapper)
          }
          return plugin.streams[uid]
        },
      })
    },
  }
  return plugin
}
