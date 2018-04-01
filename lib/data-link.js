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
const firebase_1 = require("firebase");
const vue_1 = require("vue");
class DataLink {
    constructor(options) {
        this.options = options;
        this.entities = {};
        this.fetchRequests = {};
        this.documentMapper = (snapshot) => __awaiter(this, void 0, void 0, function* () {
            if (!snapshot.exists) {
                Object.defineProperty(snapshot, 'mapped', {
                    writable: false,
                    configurable: true,
                    enumerable: false,
                    value: { blank: true },
                });
                return snapshot;
            }
            const props = snapshot.data();
            for (const key of Object.keys(props)) {
                const value = props[key];
                if (value instanceof firebase_1.firestore.DocumentReference) {
                    const associatedSnapshot = yield this.fetch(value.path);
                    props[key] = (yield this.documentMapper(associatedSnapshot)).mapped;
                }
            }
            Object.defineProperty(snapshot, 'mapped', {
                writable: false,
                configurable: true,
                enumerable: false,
                value: Object.assign({ blank: false, id: snapshot.id }, props),
            });
            return snapshot;
        });
    }
    query(query) {
        return new QueryReference(this, query);
    }
    reference(ref) {
        return new Reference(this, ref);
    }
    referenceFromPath(path) {
        return new Reference(this, path);
    }
    fetchQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const ts = new Date().getTime();
            const snapshot = yield query.get();
            for (const data of snapshot.docs) {
                this.entities[data.ref.path] = { ts, data };
            }
            return snapshot;
        });
    }
    fetch(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const entity = this.entities[path];
            const ts = new Date().getTime();
            if (entity && entity.ts + this.options.expires > ts) {
                return entity.data;
            }
            const data = yield (this.fetchRequests[path] || this.newFetchRequest(path));
            this.entities[path] = { ts, data };
            return data;
        });
    }
    newFetchRequest(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield (this.fetchRequests[path] = this.options.fetch(path));
            delete this.fetchRequests[path];
            return data;
        });
    }
}
exports.DataLink = DataLink;
class QueryReference {
    constructor(dataLink, query) {
        this.dataLink = dataLink;
        this.query = query;
    }
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.dataLink.fetchQuery(this.query);
            Object.defineProperty(snapshot, 'docs', {
                writable: false,
                configurable: true,
                enumerable: false,
                value: yield Promise.all(snapshot.docs.map((doc) => this.dataLink.documentMapper(doc))),
            });
            Object.defineProperty(snapshot, 'docChanges', {
                writable: false,
                configurable: true,
                enumerable: false,
                value: yield Promise.all(snapshot.docChanges.map((docChange) => __awaiter(this, void 0, void 0, function* () {
                    return Object.assign({}, docChange, { doc: yield this.dataLink.documentMapper(docChange.doc) });
                }))),
            });
            return snapshot;
        });
    }
}
exports.QueryReference = QueryReference;
class Reference {
    constructor(dataLink, pathOrRef) {
        this.dataLink = dataLink;
        this.data = { blank: true };
        this.path = (typeof pathOrRef === 'string') ? pathOrRef : pathOrRef.path;
    }
    get id() {
        const components = this.path.split('/');
        return components[components.length - 1];
    }
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.dataLink.fetch(this.path);
            this.snapshot = yield this.dataLink.documentMapper(snapshot);
            for (const key of Object.keys(this.snapshot.mapped)) {
                vue_1.default.set(this.data, key, this.snapshot.mapped[key]);
            }
            return this.data;
        });
    }
}
exports.Reference = Reference;
function VuePlugin(options) {
    const dataLink = new DataLink(options);
    return {
        dataLink,
        install(vue) {
            Object.defineProperty(vue.prototype, options.keyname || '$firelink', {
                get() {
                    return dataLink;
                },
            });
        },
    };
}
exports.VuePlugin = VuePlugin;
//# sourceMappingURL=data-link.js.map