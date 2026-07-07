const cstyler = require("cstyler");
const links = require("./links.js");
const fncs = require(links.functions);
const path = require("path");





const lvsecond = ['s', 'sec', 'secs', 'second', 'seconds'];
const lvminute = ['m', 'min', 'mins', 'minute', 'minutes'];
const lvhour = ['h', 'hr', 'hrs', 'hour', 'hours'];
const lvday = ['d', 'day', 'days'];
const lvweek = ['w', 'wk', 'wks', 'week', 'weeks'];
const lvmonth = ['mo', 'mon', 'mons', 'month', 'months'];
const lvyear = ['y', 'yr', 'yrs', 'year', 'years'];
const lvdecade = ['d', 'decade', 'decades'];
const allowedUnits = [...lvsecond, ...lvminute, ...lvhour, ...lvday, ...lvweek, ...lvmonth, ...lvyear, ...lvdecade];
const name_variables = [
    "name",
    "token_name",
    "tokenname",
    "token_id",
    "token_identifier",
    "id",
    "identifier",
    "session_name",
    "session_id",
    "key_name",
    "key_id",
    "auth_name",
    "auth_token_name",
    "jwt_name",
    "access_token_name",
    "refresh_token_name",
    "item_name",
    "record_name",
    "client_name",
    "app_name"
];
const lifespan_variables = [
    "life",
    "lifespan",
    "lifetime",
    "token_lifespan",
    "token_lifetime",
    "ttl",
    "time_to_live",
    "expiry",
    "expires_in",
    "expires_at",
    "expiration",
    "expiration_time",
    "duration",
    "max_age",
    "validity",
    "validity_period",
    "lease_time",
    "timeout",
    "session_duration",
    "active_duration",
    "life_cycle"
];
const unit_variables = [
    "unit",
    "time_unit",
    "timeunit",
    "duration_unit",
    "measure",
    "measurement",
    "metric",
    "scale",
    "interval",
    "interval_unit",
    "period_type",
    "format",
    "type"
];
const from_variable = ["start", "begin", "from", "beginfrom", "begin_from", "begin from", "startfrom", "start_from", "start from", "fromtime", "from time", "from_time", "beginetime", "begin_time", "begin time", "starttime", "start time", "start_time"];
const token_size_synonyms = [
    "length",
    "entropy",
    "strength",
    "capacity",
    "bitdepth",
    "scale",
    "complexity",
    "magnitude",
    "volume",
    "span",
    "breadth",
    "tokensize",
    "secrettokensize",
    "size",
    "token_size",
    "token size",
    "secret_token_size",
    "secret token size"
];

function convertToMilliseconds(value, key) {
    const msPerSecond = 1000;
    const msPerMinute = 60 * msPerSecond;
    const msPerHour = 60 * msPerMinute;
    const msPerDay = 24 * msPerHour;
    const msPerWeek = 7 * msPerDay;
    const msPerYear = 365.25 * msPerDay;
    const msPerMonth = msPerYear / 12;

    const unitMap = {
        'second': msPerSecond,
        'seconds': msPerSecond,
        'minute': msPerMinute,
        'minutes': msPerMinute,
        'hour': msPerHour,
        'hours': msPerHour,
        'day': msPerDay,
        'days': msPerDay,
        'week': msPerWeek,
        'weeks': msPerWeek,
        'month': msPerMonth,
        'months': msPerMonth,
        'year': msPerYear,
        'years': msPerYear
    };

    if (!(key in unitMap)) {
        throw new Error(`Invalid time unit: "${key}"`);
    }

    return Math.round(value * unitMap[key]);
}
function generateTokenSecret(length = 32) {
    // Generates strong pseudo-random bytes and converts to a hex string
    return crypto.randomBytes(length).toString('hex');
}
async function tokenWriter(tokenName, tokenSize) {
    try {
        let tokenFile = require(links.token);
        tokenFile[tokenName].old = tokenFile[tokenName].new;
        tokenFile[tokenName].new = generateTokenSecret(tokenSize);
        const writeFile = await fncs.writeJsonFile(links.token, tokenFile);
        return writeFile;
    } catch (e) {
        console.error("Having problem writing token. Error message: ", e.message);
        return null;
    }
}
async function createFile(data) {
    try {
        if (
            !Array.isArray(data) ||
            !data.every(element => {
                // Iterate over the keys of the current object
                for (const item of Object.keys(element)) {
                    const key = item.toLowerCase();
                    const value = element[item];

                    const isLifespan = lifespan_variables.includes(key);
                    const isName = name_variables.includes(key);
                    const isUnit = unit_variables.includes(key);
                    const isFrom = from_variable.includes(key);
                    const isSize = token_size_synonyms.includes(key);

                    // 1. Check if the key is allowed at all
                    if (!isLifespan && !isName && !isUnit) {
                        return false;
                    }

                    // 2. Validate 'name' variables (must be string)
                    if (isName && typeof value !== "string") {
                        return false;
                    }

                    // 3. Validate 'lifespan' variables (must be a number)
                    // Note: I changed this from your original code assuming it was a typo!
                    if (isLifespan && !fncs.isNumber(value)) {
                        return false;
                    }

                    // 4. Validate 'unit' variables (must be string AND in the allowed list)
                    if (isUnit && (typeof value !== "string" || !allowedUnits.includes(value))) {
                        return false;
                    }

                    // 5. validate from time
                    if (isFrom) {
                        if (typeof value === "string" && value.toLowerCase() !== "now" && !fncs.parseDate(value)) {
                            return false;
                        } else if (!fncs.parseDate(value)) {
                            return false;
                        }
                    }
                    if (isSize && typeof value !== "number") {
                        return false;
                    }
                }

                // If it survives all checks, this object is valid
                return true;
            })
        ) {
            return { success: false, message: "Valid input required" };
        }
        let JSONfileData = {};
        let functionRunner = {};
        for (const token of data) {
            let isLifespan = null;
            let isName = null;
            let isUnit = null;
            let isFrom = null;
            let isSize = null;
            for (const key of Object.keys(token)) {
                if (lifespan_variables.includes(key)) {
                    isLifespan = token[key];
                } else if (name_variables.includes(key)) {
                    isName = token[key];
                } else if (unit_variables.includes(key)) {
                    isUnit = token[key];
                } else if (from_variable.includes(key)) {
                    isFrom = token[key];
                } else if (token_size_synonyms.includes(key)) {
                    isSize = token[key];
                    if (isSize < 12) {
                        isSize = 12;
                    }
                }
            }
            // Lets clear up variables
            let fromTime = null;
            if (fncs.parseDate(isFrom)) {
                fromTime = fncs.parseDate(isFrom);
            } else {
                fromTime = new Date();
            }
            // lets work on unit and lifespan
            if (lvsecond.includes(isUnit)) {
                isUnit = "second";
            } else if (lvminute.includes(isUnit)) {
                isUnit = "minute";
            } else if (lvhour.includes(isUnit)) {
                isUnit = "hour";
            } else if (lvday.includes(isUnit)) {
                isUnit = "day";
            } else if (lvweek.includes(isUnit)) {
                isUnit = "week";
            } else if (lvmonth.includes(isUnit)) {
                isUnit = "month";
            } else if (lvyear.includes(isUnit)) {
                isUnit = "year";
            } else if (lvdecade.includes(isUnit)) {
                isUnit = "year";
                isLifespan = isLifespan * 10;
            }
            isLifespan = convertToMilliseconds(isLifespan, isUnit);

            if (isUnit === "year") {
                isSize = 64;
            } else if (isUnit === "month") {
                if (!isSize || isSize < 32) {
                    isSize = 32;
                }
            } else if (isSize && isSize > 64) {
                isSize = 64;
            } else {
                isSize = 12;
            }

            // Lets add token to json file
            JSONfileData[isName].new = generateTokenSecret(isSize);
            functionRunner[isName].life = isLifespan;
            functionRunner[isName].size = isSize;
            functionRunner[isName].start = isFrom;
        }
        const writeJson = await fncs.writeJsonFile(path.join(__dirname, links.token), JSONfileData);
        if (!writeJson) {
            throw new Error("Having problem writing token to file");
        }
        console.log(cstyler.bold.green("Successfully written all token to JSON file."));
        for (const item of Object.keys(functionRunner)) {
            scheduleRecurringTask(functionRunner[item].start, functionRunner[item].life, tokenWriter, [item, functionRunner[item].size]);
        }
        console.log(cstyler.bold.green("Successfully running all the token with time cycle."));
        return true;
    } catch (error) {
        console.error("Error creating file:", error.message);
        return null;
    }
}

/**
 * Schedules a task to run periodically based on a millisecond interval, anchored to a start date.
 * Supports passing custom arguments to the task function.
 * @param {Date} anchoredDate - The Date instance to start from.
 * @param {number} intervalMs - How many milliseconds between each run.
 * @param {Function} task - The function to execute.
 * @param {...*} taskArgs - Arguments to pass directly into the task function.
 */
function scheduleRecurringTask(anchoredDate, intervalMs, task, ...taskArgs) {
    const anchorTime = anchoredDate.getTime();

    function run() {
        const now = Date.now();
        let nextRunTime;

        if (now < anchorTime) {
            nextRunTime = anchorTime;
        } else {
            const msPassed = now - anchorTime;
            const intervalsPassed = Math.floor(msPassed / intervalMs);
            nextRunTime = anchorTime + (intervalsPassed + 1) * intervalMs;
        }

        const delay = nextRunTime - now;

        // 32-bit setTimeout safeguard
        const MAX_TIMEOUT_MS = 2147483647;
        if (delay > MAX_TIMEOUT_MS) {
            setTimeout(run, 20 * 24 * 60 * 60 * 1000);
            return;
        }

        console.log(`Task scheduled to run at: ${new Date(nextRunTime).toLocaleString()}`);

        setTimeout(() => {
            try {
                // Execute the task with the passed parameters
                task(...taskArgs);
            } catch (err) {
                console.error("Error executing scheduled task:", err);
            }

            run();
        }, delay);
    }

    run();
}

let dataStructure = [
    { name: "NEW_JWT_SECRET", lifetime: 20, unit: "min", startfrom: "now" },
    { name: "Oldfilesecret", life: 10, unit: "min", start: new Date() }
]

module.exports = {
    createFile,
}