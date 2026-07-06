async function readJsonFile(filePath) {
    try {
        // Check if the file has a .json extension
        if (path.extname(filePath).toLowerCase() !== ".json") {
            throw new Error(`The file at ${filePath} is not a JSON file.`);
        }

        // Read the file as a string
        const fileContent = await fs.readFile(filePath, "utf-8");

        // Parse the JSON string into an object
        const jsonData = JSON.parse(fileContent);
        return jsonData;
    } catch (error) {
        // Handle errors (e.g., file not found, invalid JSON)
        console.error(`Error reading or parsing JSON file at ${filePath}:`, error);
        return null;
    }
}

async function writeJsonFile(filePath, data) {
    try {
        // Ensure the directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // Convert the data object to a JSON string with indentation
        const jsonString = JSON.stringify(data, null, 2);

        // Write the JSON string to the file
        await fs.writeFile(filePath, jsonString, "utf-8");
        const successMessage = `File written successfully to ${filePath}`;
        console.log(successMessage);
        return successMessage;
    } catch (error) {
        // Handle errors (e.g., permission issues, invalid data)
        console.error(`Error writing JSON file at ${filePath}:`, error);
        return null;
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



module.exports = {
    readJsonFile,
    writeJsonFile,
    stringifyAny,
    matchPassword,
    isJsonObject,
    isJsonString
};