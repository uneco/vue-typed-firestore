import { firestore } from 'firebase'
import { ITypedDocumentSnapshot } from './stream-manager'
export { Reference } from './data-link'

export type Mapper = () => void

export interface IBlankModel {
  readonly blank: true
}

export interface IConcreteModel {
  readonly blank: false
}

export type Frozen <T> = {
  readonly [P in keyof T]: T[P]
}

export type Stored <T> = Frozen<T & IConcreteModel & { id: string }>

export interface IModelFactoryBase <B extends {}, L extends {}, R extends {}> {
  types: {
    base: B,
    localOnly: L,
    remoteOnly: R,
    local: IConcreteModel & B & L,
    remote: Frozen<B & R>,
    stored: Stored<B & R>,
    blank: IBlankModel,
    blankOrStored: IBlankModel | Stored<B & R>,
    blankOrLocal: IBlankModel | (IConcreteModel & B & L),
  }
  create (): IBlankModel | (IConcreteModel & B & L)
  placeholder (): IBlankModel | Stored<B & R>
  fromDocument (source: firestore.DocumentSnapshot): IConcreteModel & Frozen<B & R & { id: string }>
}

export function ModelFactory <B extends {}, L extends {}, R extends {}> (mapper?: Mapper): IModelFactoryBase<B, L, R> {
  return {
    types: {} as any,
    create () {
      return { blank: true }
    },
    placeholder () {
      return { blank: true }
    },
    fromDocument (source: ITypedDocumentSnapshot<IModelFactoryBase<B, L, R>>): IConcreteModel & Stored<B & R> {
      return {
        blank: false,
        id: source.id,
        ...(source.data() as any),
      }
    },
  }
}
