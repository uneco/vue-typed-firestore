import { firestore } from 'firebase';
export { Reference } from './data-link';
export declare type Mapper = () => void;
export interface IBlankModel {
    readonly blank: true;
}
export interface IConcreteModel {
    readonly blank: false;
}
export declare type Frozen<T> = {
    readonly [P in keyof T]: T[P];
};
export declare type Stored<T> = Frozen<T & IConcreteModel & {
    id: string;
}>;
export interface IModelFactoryBase<B extends {}, L extends {}, R extends {}> {
    types: {
        base: B;
        localOnly: L;
        remoteOnly: R;
        local: IConcreteModel & B & L;
        remote: Frozen<B & R>;
        stored: Stored<B & R>;
        blank: IBlankModel;
        blankOrStored: IBlankModel | Stored<B & R>;
        blankOrLocal: IBlankModel | (IConcreteModel & B & L);
    };
    create(): IBlankModel | (IConcreteModel & B & L);
    placeholder(): IBlankModel | Stored<B & R>;
    fromDocument(source: firestore.DocumentSnapshot): IConcreteModel & Frozen<B & R & {
        id: string;
    }>;
}
export declare function ModelFactory<B extends {}, L extends {}, R extends {}>(mapper?: Mapper): IModelFactoryBase<B, L, R>;
