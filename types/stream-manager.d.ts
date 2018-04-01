import { firestore } from 'firebase';
import { Subject } from 'rxjs';
import Vue, { ComponentOptions, VueConstructor } from 'vue';
import { IModelFactoryBase } from './model-factory';
export declare type DR = firestore.DocumentReference;
export declare type DS = firestore.DocumentSnapshot;
export declare type Q = firestore.Query;
export declare type QS = firestore.QuerySnapshot;
export declare type Model = IModelFactoryBase<{}, {}, {}>;
export interface ITypedDocumentReference<M extends Model> extends firestore.DocumentReference {
    get(): Promise<ITypedDocumentSnapshot<M>>;
}
export interface IMappableDocumentReference<M extends Model> extends ITypedDocumentReference<M> {
    get(): Promise<IMappedDocumentSnapshot<M>>;
}
export interface ITypedDocumentSnapshot<M extends Model> extends firestore.DocumentSnapshot {
    data(): M['types']['base'] & M['types']['remote'];
}
export interface IMappedDocumentSnapshot<M extends Model> extends ITypedDocumentSnapshot<M> {
    readonly mapped: M['types']['stored'];
}
export interface ITypedDocumentChange<M extends Model> extends firestore.DocumentChange {
    readonly doc: ITypedDocumentSnapshot<M>;
}
export interface IMappedDocumentChange<M extends Model> extends firestore.DocumentChange {
    readonly doc: IMappedDocumentSnapshot<M>;
}
export interface ITypedQuerySnapshot<M extends Model> extends firestore.QuerySnapshot {
    readonly docs: Array<ITypedDocumentSnapshot<M>>;
    readonly docChanges: Array<ITypedDocumentChange<M>>;
}
export interface IMappedQuerySnapshot<M extends Model> extends ITypedQuerySnapshot<M> {
    readonly docs: Array<IMappedDocumentSnapshot<M>>;
    readonly docChanges: Array<IMappedDocumentChange<M>>;
}
export declare type DocumentMapper<M extends Model> = (from: DS) => Promise<IMappedDocumentSnapshot<M>>;
export declare type DocumentOptions<M extends Model> = firestore.DocumentListenOptions & {
    mapper?: DocumentMapper<M>;
};
export declare class DocumentSnapshotSubject<M extends Model> extends Subject<IMappedDocumentSnapshot<M>> {
    documentReference: DR;
    private readonly beforeUnsubscribe;
    constructor(documentReference: DR, mapper: DocumentMapper<M>, options?: firestore.DocumentListenOptions);
    unsubscribe(): void;
}
export declare class QuerySnapshotSubject<M extends Model> extends Subject<IMappedQuerySnapshot<M>> {
    queryReference: Q;
    private readonly beforeUnsubscribe;
    constructor(queryReference: Q, mapper: DocumentMapper<M>, options?: firestore.QueryListenOptions);
    unsubscribe(): void;
}
export declare class FirestoreStreamManager {
    readonly db: firestore.Firestore;
    documentMapper: DocumentMapper<any>;
    private subjects;
    constructor(db: firestore.Firestore, documentMapper: DocumentMapper<any>);
    document<M extends Model>(docOrPath: DR | string, options?: firestore.DocumentListenOptions): DocumentSnapshotSubject<M>;
    query<M extends Model>(queryOrPath: Q | string, options?: firestore.QueryListenOptions): QuerySnapshotSubject<M>;
    unsubscribe(): void;
    private documentInner<M>(doc, options?);
    private queryInner<M>(q, options?);
    private convertToDocument(docOrPath);
    private convertToQuery(queryOrPath);
}
export interface IPlugin {
    mixin: ComponentOptions<Vue>;
    streams: {
        [key: number]: FirestoreStreamManager | undefined;
    };
    install(vue: VueConstructor): void;
}
export declare function VuePlugin(db: firestore.Firestore, documentMapper: DocumentMapper<any>, keyname?: string): IPlugin;
