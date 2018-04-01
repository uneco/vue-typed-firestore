"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
class DocumentSnapshotSubject extends rxjs_1.Subject {
    constructor(documentReference, mapper, options = {}) {
        super();
        this.documentReference = documentReference;
        this.beforeUnsubscribe = documentReference.onSnapshot(options, (snapshot) => __awaiter(this, void 0, void 0, function* () {
            this.next(yield mapper(snapshot));
        }));
    }
    unsubscribe() {
        this.beforeUnsubscribe();
        super.unsubscribe();
    }
}
exports.DocumentSnapshotSubject = DocumentSnapshotSubject;
class QuerySnapshotSubject extends rxjs_1.Subject {
    constructor(queryReference, mapper, options = {}) {
        super();
        this.queryReference = queryReference;
        const unsubscriber = queryReference.onSnapshot(options, (snapshot) => __awaiter(this, void 0, void 0, function* () {
            Object.defineProperty(snapshot, 'docs', {
                writable: false,
                configurable: true,
                enumerable: false,
                value: yield Promise.all(snapshot.docs.map((doc) => mapper(doc))),
            });
            Object.defineProperty(snapshot, 'docChanges', {
                writable: false,
                configurable: true,
                enumerable: false,
                value: yield Promise.all(snapshot.docChanges.map((docChange) => __awaiter(this, void 0, void 0, function* () {
                    return Object.assign({}, docChange, { doc: yield mapper(docChange.doc) });
                }))),
            });
            this.next(snapshot);
        }));
        this.beforeUnsubscribe = unsubscriber;
    }
    unsubscribe() {
        this.beforeUnsubscribe();
        super.unsubscribe();
    }
}
exports.QuerySnapshotSubject = QuerySnapshotSubject;
class FirestoreStreamManager {
    constructor(db, documentMapper) {
        this.db = db;
        this.documentMapper = documentMapper;
        this.subjects = new Set();
    }
    document(docOrPath, options = {}) {
        const subject = this.documentInner(this.convertToDocument(docOrPath), options);
        this.subjects.add(subject);
        return subject;
    }
    query(queryOrPath, options = {}) {
        const subject = this.queryInner(this.convertToQuery(queryOrPath), options);
        this.subjects.add(subject);
        return subject;
    }
    unsubscribe() {
        for (const subject of this.subjects) {
            try {
                subject.unsubscribe();
            }
            catch (err) {
                if (err.name !== 'ObjectUnsubscribedError') {
                    throw err;
                }
            }
        }
        this.subjects = new Set();
    }
    documentInner(doc, options = {}) {
        return new DocumentSnapshotSubject(doc, this.documentMapper, options);
    }
    queryInner(q, options = {}) {
        return new QuerySnapshotSubject(q, this.documentMapper, options);
    }
    convertToDocument(docOrPath) {
        if (typeof docOrPath === 'string') {
            return this.db.doc(docOrPath);
        }
        return docOrPath;
    }
    convertToQuery(queryOrPath) {
        if (typeof queryOrPath === 'string') {
            return this.db.collection(queryOrPath);
        }
        return queryOrPath;
    }
}
exports.FirestoreStreamManager = FirestoreStreamManager;
function VuePlugin(db, documentMapper, keyname = '$firestream') {
    const plugin = {
        mixin: {
            beforeDestroy() {
                const uid = this._uid;
                const stream = plugin.streams[uid];
                if (stream) {
                    stream.unsubscribe();
                    delete plugin.streams[uid];
                }
            },
        },
        streams: {},
        install(vue) {
            vue.mixin(plugin.mixin);
            Object.defineProperty(vue.prototype, keyname, {
                get() {
                    const uid = this._uid;
                    if (!plugin.streams[uid]) {
                        plugin.streams[uid] = new FirestoreStreamManager(db, documentMapper);
                    }
                    return plugin.streams[uid];
                },
            });
        },
    };
    return plugin;
}
exports.VuePlugin = VuePlugin;
//# sourceMappingURL=stream-manager.js.map