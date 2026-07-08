# jwt-pulse

A hyper-flexible, automated JSON Web Token (JWT) lifecycle manager and rotation engine for Node.js. Powered by a dynamic JavaScript `Proxy` interface, `jwt-pulse` entirely removes rigid naming rules by accepting case-insensitive methods, property synonyms, and fluid time configurations while handling cryptographic secrets safely on disk.

---

## 🚀 Key Architectural Concepts

1. **Token Names as Keys:** You never hardcode, handle, or pass raw cryptographic secret strings in your application routing. The **Secret Token Name** (e.g., `'ACCESS_TOKEN_SECRET'`) acts as your master identifier key.
2. **Automated Cryptographic Sizing:** You do not generate secrets manually. The engine automatically provisions cryptographically random keys behind the scenes. Secret lengths scale securely depending on your target rotation interval timeline unit:
   * **Years (`y`, `yr`, `years`...):** **64** characters long.
   * **Months (`mo`, `mon`, `months`...):** **32** characters long.
   * **Weeks (`w`, `wk`, `weeks`...):** **24** characters long.
   * **Days (`d`, `day`, `days`...):** **18** characters long.
   * **All shorter periods (Hours, Minutes, Seconds...):** **12** characters long.
3. **Fully Asynchronous API:** All primary functions utilize promise-based files and internal async routines. **You must use the `await` keyword for all operations.**

---

## 🛠 Installation

```bash
npm install jwt-pulse
```

## 📖 Main API Functions & Lifecycle Guide
### 1. Provision Vault / Setup Configuration (`async`)
Initializes your secret parameters database and schedules automatic rotation tracking rules directly from your configuration schema. No file paths required.


```js
const jwtPulse = require('jwt-pulse');

async function runAuth() {
    const configuration = [
        { name: "ACCESS_TOKEN_SECRET", lifetime: 15, unit: "mins", startfrom: "now" },
        { token_identifier: "REFRESH_TOKEN_SECRET", duration: 1, time_unit: "month", start: new Date() }
    ];
    
    // Configures and provisions your environment metadata seamlessly
    await jwtPulse.setupFile(configuration);
}
```

### 2. Generate / Mint Token (`async`)
To mint a token, pass your payload data along with the Secret Token Name. The Secret Token Name is strictly required here because the token's active configuration (lifespan and key length) depends directly on that profile.

```js
const userPayload = { userId: 42, role: "admin" };

// Remember to use await here
const token = await jwtPulse.generate(userPayload, "ACCESS_TOKEN_SECRET");
console.log("Generated Token String:", token);

```

### 3. Verify / Validate Token (`async`)
You can verify an incoming token using targeted lookups or global automated fallback scanning:

#### Targeted Verification (Recommended)
Pass the token alongside its known `SecretTokenName` identifier to validate instantly against that specific structural key signature.


```js
// Remember to use await here
const decoded = await jwtPulse.verify(token, "ACCESS_TOKEN_SECRET");

```

#### Blind Verification Scanning (Zero-Configuration Fallback)
If you forget the specific name or are parsing an inbound authorization header dynamically, leave the second argument completely empty! `jwt-pulse` will seamlessly cascade iterate through **every active token identity inside the vault** to attempt matching signatures. It returns your decoded payload as soon as a match passes.



```js
// Leave the name parameter empty to automatically test all file secrets
const decoded = await jwtPulse.verify(token); 
if (decoded) {
    console.log("Token authenticated dynamically via background matrix scan!", decoded);
}
```


## 🎯 Smart API Aliases (Dynamic Proxy Methods)
You don't need to memorize exact syntax parameters. Calling any matching alias profile from the dynamic tables below executes the underlying function seamlessly. **All aliases listed require** `await`.

#### Storage Initialization Synonyms (`async`)
| | | | |
| :--- | :--- | :--- | :--- |
| `initiate` | `initialize` | `provision` | `setup` |
| `seed` | `allocate` | `setupfile` | `setuptoken` |
| `initializestore` | `provisionvault` | `setupregistry` | `createcache` |
| `createfile` | `buildrepository` | `allocatestorage` | `originatedatabase` |
| `seedmanifest` | `createtoken` | `createtokenfile` | `create` |

#### Token Generation Synonyms (`async`)

| | | | |
| :--- | :--- | :--- | :--- |
| `generate` | `sign` | `mint` | `issue` |
| `spawn` | `produce` | `grant` | `build` |
| `createtoken` | `signtoken` | `minttoken` | `issuetoken` |
| `spawntoken` | `producetoken` | `granttoken` | `buildtoken` |
| `generatetoken` | `gettoken` | | |

#### Token Verification Synonyms (`async`)

| | | | |
| :--- | :--- | :--- | :--- |
| verify | validate | check | decode |
| inspect | parse | authenticate | confirm |
| verifytoken | validatetoken | checktoken | decodetoken |
| inspecttoken | parsetoken | authenticatetoken | confirmtoken |


## 🎛 Flexible Configuration Variables Matrix
When assembling configurations for storage target elements, keys inside your object arrays can adapt to any matching nomenclature parameter below.

- **Token Identifiers (**`name_variables`**):**
`name`, `token_name`, `tokenname`, `token_id`, `token_identifier`, `id`, `identifier`, `session_name`, `session_id`, `key_name`, `key_id`, `auth_name`

- **Lifespan Ranges (**`lifespan_variables`**):**
`life`, `lifespan`, `lifetime`, `token_lifespan`, `token_lifetime`, `ttl`, `time_to_live`, `expiry`, `expires_in`, `duration`, `timeout`

- **Metric Units (**`unit_variables`**):**
`unit`, `time_unit`, `timeunit`, `duration_unit`, `measure`, `measurement`, `metric`, `interval`, `period`

- **Epoch Anchors (**`from_variable`**):**
`start`, `begin`, `from`, `beginfrom`, `startfrom`, `start_from`, `fromtime`, `starttime`