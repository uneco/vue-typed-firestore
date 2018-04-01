import { FirestoreStreamManager } from './stream-manager';
import { DataLink } from './data-link';
declare module 'vue/types/vue' {
    interface Vue {
        $firestream: FirestoreStreamManager;
        $firelink: DataLink;
    }
}
