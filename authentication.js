const cstyler = require("cstyler");
const links = require("./links");
const fncs = require(links.functions);
const jwt = require('jsonwebtoken');







function generateAccessToken(data, tokenSecret, durationMs) {
    // jsonwebtoken accepts numeric values for expiresIn measured in SECONDS
    const durationSeconds = Math.floor(durationMs / 1000);

    // Generate and return the token
    return jwt.sign({ payload: data }, tokenSecret, { expiresIn: durationSeconds });
}

function verifyAccessToken(token, tokenSecret) {
    try {
        // Automatically checks if current time > exp time
        const decoded = jwt.verify(token, tokenSecret);

        // Return only the data hidden inside the payload key
        return decoded.payload;
    } catch (error) {
        // Triggers automatically on TokenExpiredError or JsonWebTokenError (tampering)
        console.warn(`Token verification failed: ${error.message}`);
        return null;
    }
}



async function getToken(data, tokenName) {
    const tokenFile = await fncs.readJsonFile("./tokens.json");
    const token = tokenFile[tokenName];
    const generate = generateAccessToken(data, token.new, token.duration);
    return generate;
}

async function verifyToken(token, tokenName = null) {
    let tokenfound = false;
    const tokenFile = await fncs.readJsonFile("./tokens.json");
    let tokenSecret = [];
    if (typeof tokenName === "string" && tokenFile[tokenName]) {
        tokenfound = true;
        tokenSecret.push(tokenFile[tokenName].old);
        tokenSecret.push(tokenFile[tokenName].new);
    } else {
        console.warn(cstyler.red("You didn't provided any token NAME. "), cstyler.bold.yellow("We are checking with all token secret we have saved. This will take a little longer. Please wait..."));
        for (const name of Object.keys(tokenFile)) {
            tokenSecret.push(tokenFile[name].old);
            tokenSecret.push(tokenFile[name].new);
        }
    }
    if (tokenSecret.length === 0) {
        console.warn("You didn't saved any token yet. Please save token first to continue.");
        return { token: false, message: "You didn't saved any token yet. Please save token first to continue." };
    }
    for (const item of tokenSecret) {
        const isVerified = verifyAccessToken(token, item);
        if (isVerified !== null) {
            return { verified: true, expired: false, data: isVerified, message: "Successfully verified token." };
        }
    }
    if (tokenfound) {
        return { verified: false, expired: true, data: undefined, message: "The token have expired." }
    }
    return { verified: false, expired: undefined, data: undefined, message: "The token may have expired or couldn't find any match." }
}

module.exports = {
    getToken,
    verifyToken
}
