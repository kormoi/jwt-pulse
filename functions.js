const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const links = require("./links");




async function readJsonFile(filePath) {
    if (path.extname(filePath).toLowerCase() !== ".json") {
        console.error(`Error: The file at ${filePath} is not a JSON file.`);
        return null;
    }

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const fileContent = await fs.readFile(filePath, "utf-8");
            
            // --- FIX: If the file is completely empty, return an empty object instead of crashing ---
            if (!fileContent || fileContent.trim() === "") {
                return {}; 
            }

            return JSON.parse(fileContent);
        } catch (error) {
            // If the file simply doesn't exist yet, return an empty object so the app can start
            if (error.code === 'ENOENT') {
                return {};
            }

            if (error instanceof SyntaxError) {
                console.error(`JSON Syntax Error at ${filePath}:`, error.message);
                return null;
            }
            if (attempt === maxRetries) {
                console.error(`All ${maxRetries} attempts failed reading from ${filePath}:`, error.message);
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
async function writeJsonFile(filePath, data) {
    const maxRetries = 3;
    const jsonString = JSON.stringify(data, null, 2);
    
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
    } catch (dirError) {
        console.error(`Error creating directory for ${filePath}:`, dirError);
        return null;
    }

    // Create a safe temp file path in the same directory
    const tempFilePath = `${filePath}.${Date.now()}.tmp`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // 1. Write everything safely to the temporary file first
            await fs.writeFile(tempFilePath, jsonString, "utf-8");
            
            // 2. Instantly rename/move it over the real file (Atomic Swap)
            await fs.rename(tempFilePath, filePath);
            return true;
        } catch (error) {
            // Clean up the temp file if this specific attempt failed
            try { await fs.unlink(tempFilePath); } catch (_) {}

            if (attempt === maxRetries) {
                console.error(`All ${maxRetries} attempts failed writing to ${filePath}:`, error.message);
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
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
    isNumber,
    isJsonObject,
    parseDate,
    generateTokenSecret,
};