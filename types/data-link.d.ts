import { firestore } from 'firebase';
import { VueConstructor } from 'vue';
import { IModelFactoryBase } from './model-factory';
import { IMappedDocumentSnapshot, IMappedQuerySnapshot } from './stream-manager';
export interface IEntity {
    ts: number;
    data: firestore.DocumentSnapshot;
}
export declare type Model = IModelFactoryBase<{}, {}, {}>;
export interface IDataLinkOptions {
    keyname: string;
    expires: number;
    fetch: (path: string) => Promise<firestore.DocumentSnapshot>;
}
export declare class DataLink {
    protected readonly options: IDataLinkOptions;
    protected entities: {
        [key: string]: IEntity;
    };
    protected fetchRequests: {
        [key: string]: Promise<firestore.DocumentSnapshot>;
    };
    constructor(options: IDataLinkOptions);
    documentMapper: <M extends IModelFactoryBase<{}, {}, {}>>(snapshot: firestore.DocumentSnapshot) => Promise<IMappedDocumentSnapshot<M>>;
    query<M extends Model>(query: firestore.Query): QueryReference<M>;
    reference<M extends Model>(ref: firestore.DocumentReference): Reference<M>;
    referenceFromPath<M extends Model>(path: string): Reference<M>;
    fetchQuery(query: firestore.Query): Promise<firestore.QuerySnapshot>;
    fetch(path: string): Promise<firestore.DocumentSnapshot>;
    private newFetchRequest(path);
}
export declare class QueryReference<M extends Model> {
    dataLink: DataLink;
    query: firestore.Query;
    constructor(dataLink: DataLink, query: firestore.Query);
    fetch(): Promise<IMappedQuerySnapshot<M>>;
}
export declare class Reference<M extends Model> {
    dataLink: DataLink;
    path: string;
    snapshot: IMappedDocumentSnapshot<M>;
    data: M['types']['stored'];
    constructor(dataLink: DataLink, pathOrRef: string | firestore.DocumentReference);
    readonly id: string;
    fetch(): Promise<M['types']['stored']>;
}
export interface IPlugin {
    dataLink: DataLink;
    install(vue: VueConstructor): void;
}
export declare function VuePlugin(options: IDataLinkOptions): IPlugin;
