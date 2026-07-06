const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const fncs = require(k_paths.services.functions); // No need for template literals in require()

const { errorMonitor } = require("events");




async function generateSecretToken(slice_length) {
    return crypto.randomBytes(slice_length).toString('hex');
}

async function writeRefreshtoken() {
    try {
        const tokens = await fncs.readJsonFile(path.join(__dirname, "./tokens.json"));
        tokens.OLD_REFRESH_TOKEN_SECRET = tokens.NEW_REFRESH_TOKEN_SECRET;
        tokens.OLD_AES_SECRET = tokens.NEW_AES_SECRET;
        tokens.NEW_REFRESH_TOKEN_SECRET = await generateSecretToken(64);
        tokens.NEW_AES_SECRET = await generateSecretToken(32);

        const result = await fncs.writeJsonFile(path.join(__dirname, "./tokens.json"), tokens);
        if (result) {
            console.log("Successfully changed the Refresh token file");
        }
    } catch (err) {
        console.error(err.message);
    }
}

async function writeAccessToken() {
    try {
        const secrets = await fncs.readJsonFile(path.join(__dirname, "./tokens.json"));
        secrets.OLD_JWT_SECRET = secrets.NEW_JWT_SECRET;
        secrets.NEW_JWT_SECRET = await generateSecretToken(32);
        const result = await fncs.writeJsonFile(path.join(__dirname, "./tokens.json"), secrets);
        if (result) {
            console.log("Successfully changed the Access token file");
        }
    } catch (err) {
        console.error(err.message);
    }
}

const monthInMs = 24 * 24 * 60 * 60 * 1000;
setInterval(writeRefreshtoken, monthInMs);

const weekInMs = 7 * 24 * 60 * 60 * 1000;
setInterval(writeAccessToken, weekInMs);


async function tokencycle() {
    try {
        await writeRefreshtoken(); // Await so it finishes before moving to the next function
        await writeAccessToken(); // Also awaited to ensure proper execution order
    } catch (error) {
        console.error("Error in callFunctions:", error);
    }
}
//token server setup are above



async function getTokens() {
    const tokens = await fncs.readJsonFile(path.join(__dirname, "./tokens.json"));
    return tokens;
}


module.exports = {
    tokencycle,
    writeAccessToken,
    writeRefreshtoken,
    getTokens
}