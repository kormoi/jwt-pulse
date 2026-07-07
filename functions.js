const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const links = require("./links");




async function readJsonFile(filePath) {
    // 1. Immediate validation check: if extension is wrong, don't waste time retrying
    if (path.extname(filePath).toLowerCase() !== ".json") {
        console.error(`Error: The file at ${filePath} is not a JSON file.`);
        return null;
    }

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Read the file as a string
            const fileContent = await fs.readFile(filePath, "utf-8");

            // Parse the JSON string into an object
            const jsonData = JSON.parse(fileContent);
            return jsonData;
            
        } catch (error) {
            // If it's a syntax error (corrupted JSON text), retrying won't fix it. Exit early.
            if (error instanceof SyntaxError) {
                console.error(`JSON Syntax Error at ${filePath}:`, error.message);
                return null;
            }

            console.warn(`Attempt ${attempt} failed reading file at ${filePath}. Error: ${error.message}`);

            // If all attempts are exhausted, log final error and return null
            if (attempt === maxRetries) {
                console.error(`All ${maxRetries} attempts failed reading from ${filePath}.`);
                return null;
            }

            // Small 100ms breathing room before next attempt
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

async function writeJsonFile(filePath, data) {
    const maxRetries = 3;
    const jsonString = JSON.stringify(data, null, 2);

    // Ensure the parent directory structure exists before writing
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
    } catch (dirError) {
        console.error(`Error creating directory for ${filePath}:`, dirError);
        return null;
    }

    // Loop through the retry attempts
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await fs.writeFile(filePath, jsonString, "utf-8");
            console.log(`File written successfully to ${filePath} (Attempt ${attempt})`);
            return true;
        } catch (error) {
            console.warn(`Attempt ${attempt} failed writing JSON file at ${filePath}. Error: ${error.message}`);

            // If we hit the maximum threshold, log the final error and exit
            if (attempt === maxRetries) {
                console.error(`All ${maxRetries} attempts failed writing to ${filePath}.`);
                return null;
            }

            // Optional: Give the disk a brief 100ms breather before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
function stringifyAny(data) {
    // If the data is undefined or a symbol, handle it explicitly.
    if (typeof data === 'undefined') {
        return 'undefined';
    } else if (data === null) {
        return 'null';
    } else if (data === true) {
        return "true";
    } else if (data === false) {
        return "false";
    }
    if (typeof data === 'symbol') {
        return data.toString();
    }
    // 💡 TOP-LEVEL CHECK: Convert raw top-level buffers directly to base64
    if (Buffer.isBuffer(data)) {
        return data.toString('base64');
    }
    // For non-objects (primitives) that are not undefined, simply convert them.
    if (typeof data !== 'object' && typeof data !== 'function') {
        return String(data);
    }
    if (typeof data === "string") {
        return data;
    }

    // Handle objects and functions using JSON.stringify with a custom replacer.
    const seen = new WeakSet();
    const replacer = (key, value) => {
        // 💡 NESTED CHECK: Catch buffers embedded inside objects or arrays
        if (Buffer.isBuffer(value)) {
            return value.toString('base64');
        }
        if (typeof value === 'function') {
            // Convert functions to their string representation.
            return value.toString();
        }
        if (typeof value === 'undefined') {
            return 'undefined';
        }
        if (typeof value === 'object' && value !== null) {
            // Check for circular references
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    };

    try {
        return JSON.stringify(data, replacer, 2);
    } catch (error) {
        // Fallback to a simple string conversion if JSON.stringify fails
        return String(data);
    }
}
async function matchPassword(password, hashedPassword) {
    try {
        const sha512Hash = crypto.createHash('sha512').update(password).digest('hex');
        const result = await bcrypt.compare(sha512Hash, hashedPassword);
        return { success: true, result: result }
    } catch (error) {
        return { success: false, error_type: "server", servererror: true, message: error.message }
    }
}
function isNumber(str) {
    if (str === null || str === undefined) {
        return false;
    }
    if (typeof str === "number") {
        return true;
    }
    if (Array.isArray(str) || typeof str === "object") {
        return false;
    }
    return !isNaN(str) && str.trim() !== "";
}
function isJsonObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//checks if the string is JSON string or not
function isJsonString(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        return (
            typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        );
    } catch (error) {
        return false;
    }
}
function parseDate(dateValue) {
    try {// 1. If it's already a Date instance, check if it's "Invalid Date"
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }

        // 2. If it's a string or number, try to parse it
        const date = new Date(dateValue);

        // 3. Validate that it resulted in a real date
        if (date instanceof Date && !isNaN(date.getTime())) {
            return date;
        }

        return null;
    } catch (e) {
        console.error(e.message);
        return null;
    }
}


function generateTokenSecret(length = 32) {
    // Generates strong pseudo-random bytes and converts to a hex string
    return crypto.randomBytes(length).toString('hex');
}



module.exports = {
    readJsonFile,
    writeJsonFile,
    stringifyAny,
    matchPassword,
    isNumber,
    isJsonObject,
    isJsonString,
    parseDate,
    generateTokenSecret,
};