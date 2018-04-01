import { firestore } from 'firebase'
import Vue, { VueConstructor } from 'vue'
import { IModelFactoryBase } from './model-factory'
import { IMappedDocumentSnapshot, IMappedQuerySnapshot } from './stream-manager'

export interface IEntity {
  ts: number
  data: firestore.DocumentSnapshot
}

export type Model = IModelFactoryBase<{}, {}, {}>

export interface IDataLinkOptions {
  keyname: string
  expires: number
  fetch: (path: string) => Promise<firestore.DocumentSnapshot>
}

export class DataLink {
  protected entities: { [key: string]: IEntity } = {}
  protected fetchRequests: { [key: string]: Promise<firestore.DocumentSnapshot> } = {}

  constructor (
    protected readonly options: IDataLinkOptions,
  ) {
  }

  public documentMapper = async <M extends Model> (snapshot: firestore.DocumentSnapshot) => {
    if (!snapshot.exists) {
      Object.defineProperty(snapshot, 'mapped', {
        writable: false,
        configurable: true,
        enumerable: false,
        value: { blank: true },
      })
      return snapshot as IMappedDocumentSnapshot<M>
    }

    const props = snapshot.data()!
    for (const key of Object.keys(props)) {
      const value = props[key]
      if (value instanceof firestore.DocumentReference) {
        const associatedSnapshot = await this.fetch(value.path)
        props[key] = (await this.documentMapper(associatedSnapshot)).mapped
      }
    }

    Object.defineProperty(snapshot, 'mapped', {
      writable: false,
      configurable: true,
      enumerable: false,
      value: {
        blank: false,
        id: snapshot.id,
        ...props,
      },
    })

    return snapshot as IMappedDocumentSnapshot<M>
  }

  public query <M extends Model> (query: firestore.Query) {
    return new QueryReference<M>(this, query)
  }

  public reference <M extends Model> (ref: firestore.DocumentReference) {
    return new Reference<M>(this, ref)
  }

  public referenceFromPath <M extends Model> (path: string) {
    return new Reference<M>(this, path)
  }

  public async fetchQuery (query: firestore.Query) {
    const ts = new Date().getTime()

    const snapshot = await query.get()

    for (const data of snapshot.docs) {
      this.entities[data.ref.path] = { ts, data }
    }

    return snapshot
  }

  public async fetch (path: string) {
    const entity = this.entities[path]
    const ts = new Date().getTime()

    if (entity && entity.ts + this.options.expires > ts) {
      return entity.data
    }

    const data = await (this.fetchRequests[path] || this.newFetchRequest(path))
    this.entities[path] = { ts, data }
    return data
  }

  private async newFetchRequest (path: string) {
    const data = await (this.fetchRequests[path] = this.options.fetch(path))
    delete this.fetchRequests[path]
    return data
  }
}

export class QueryReference<M extends Model> {
  constructor (
    public dataLink: DataLink,
    public query: firestore.Query,
  ) {
  }

  public async fetch (): Promise<IMappedQuerySnapshot<M>> {
    const snapshot = await this.dataLink.fetchQuery(this.query)
    Object.defineProperty(snapshot, 'docs', {
      writable: false,
      configurable: true,
      enumerable: false,
      value: await Promise.all(snapshot.docs.map((doc) => this.dataLink.documentMapper(doc))),
    })
    Object.defineProperty(snapshot, 'docChanges', {
      writable: false,
      configurable: true,
      enumerable: false,
      value: await Promise.all(snapshot.docChanges.map(async (docChange) => {
        return {
          ...docChange,
          doc: await this.dataLink.documentMapper(docChange.doc),
        }
      })),
    })
    return snapshot as IMappedQuerySnapshot<M>
  }
}

export class Reference<M extends Model> {
  public path: string
  public snapshot: IMappedDocumentSnapshot<M>
  public data: M['types']['stored'] = { blank: true } as any

  constructor (
    public dataLink: DataLink,
    pathOrRef: string | firestore.DocumentReference,
  ) {
    this.path = (typeof pathOrRef === 'string') ? pathOrRef : pathOrRef.path
  }

  public get id (): string {
    const components = this.path.split('/')
    return components[components.length - 1]
  }

  public async fetch (): Promise<M['types']['stored']> {
    const snapshot = await this.dataLink.fetch(this.path)
    this.snapshot = await this.dataLink.documentMapper(snapshot)
    for (const key of Object.keys(this.snapshot.mapped)) {
      Vue.set(this.data, key, (this.snapshot.mapped as any)[key])
    }
    return this.data
  }
}

export interface IPlugin {
  dataLink: DataLink
  install (vue: VueConstructor): void
}

export function VuePlugin (options: IDataLinkOptions): IPlugin {
  const dataLink = new DataLink(options)
  return {
    dataLink,
    install (vue) {
      Object.defineProperty(vue.prototype, options.keyname || '$firelink', {
        get () {
          return dataLink
        },
      })
    },
  }
}
