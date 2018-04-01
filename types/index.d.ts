import { firestore } from 'firebase';
import * as streamManager from './stream-manager';
import * as dataLink from './data-link';
export * from './model-factory';
import './vue';
declare const _default: {
    link: (options: dataLink.IDataLinkOptions) => dataLink.IPlugin;
    stream: (db: firestore.Firestore, documentMapper: streamManager.DocumentMapper<any>, keyname?: string) => streamManager.IPlugin;
};
export default _default;
