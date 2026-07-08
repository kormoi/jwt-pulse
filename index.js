const links = require("./links");
const tokencreator = require(links.tokencreator);
const auth = require(links.auth);

// ==========================================
// 1. ISOLATED SYNONYM ARRAYS (ALL LOWERCASE)
// ==========================================
const token_storage_actions = [
    "initiate", "initialize", "provision", "setup", "seed", "allocate", "setupfile", "setuptoken",
    "initializestore", "provisionvault", "setupregistry", "createcache", "createfile",
    "buildrepository", "allocatestorage", "originatedatabase", "seedmanifest", "createtoken", "createtokenfile", "create"
];

const token_minting_actions = [
    "generate", "sign", "mint", "issue", "spawn", "produce", "grant", "build",
    "createtoken", "signtoken", "minttoken", "issuetoken", "spawntoken",
    "producetoken", "granttoken", "buildtoken", "generatetoken", "gettoken"
];

const token_validation_actions = [
    "verify", "validate", "check", "decode", "inspect", "parse", "authenticate", "confirm",
    "verifytoken", "validatetoken", "checktoken", "decodetoken", "inspecttoken",
    "parsetoken", "authenticatetoken", "confirmtoken"
];

// ===============
// 2. Define class
// ===============

class JwtPulseEngine {
    constructor() {
        return new Proxy(this, {
            get(target, prop) {
                if (prop in target) return target[prop];

                const calledMethod = typeof prop === 'string' ? prop.toLowerCase() : prop;

                // 1. ASYNCHRONOUS STORAGE ROUTING (Needs async/await)
                if (token_storage_actions.includes(calledMethod)) {
                    return async (...args) => {
                        return await tokencreator.createFile(...args);
                    };
                }

                // 2. SYNCHRONOUS GENERATION ROUTING
                if (token_minting_actions.includes(calledMethod)) {
                    return async (...args) => {
                        return await auth.getToken(...args);
                    }
                }

                // 3. SYNCHRONOUS VERIFICATION ROUTING
                if (token_validation_actions.includes(calledMethod)) {
                    return async (...args) => {
                        return await auth.verifyToken(...args);
                    }
                }

                return undefined;
            }
        });
    }
}

module.exports = new Proxy(new JwtPulseEngine(), {});