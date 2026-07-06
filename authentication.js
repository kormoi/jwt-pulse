const jwt = require('jsonwebtoken');
const path = require('path');
const k_paths = require('../../all_paths.js');
const fncs = require(k_paths.services.functions);
const ufncs = require(k_paths.users.functions);
const { sendmail } = require(k_paths.mailer.sendmail);
const crypto = require('crypto');
const tcl = require(k_paths.token.tokencycle);


async function encrypt(text) {
    try {
        if (typeof text !== "string") {
            text = fncs.stringifyAny(text);
        }
        const algorithm = 'aes-256-cbc';
        const token = await tcl.getTokens();
        const secretKey = Buffer.from(token.NEW_AES_SECRET, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        return iv.toString('hex') + "-" + encrypted.toString('hex');
    } catch (err) {
        return null;
    }
}

async function decrypt(encrypted) {
    try {
        if (typeof encrypted !== "string") {
            encrypted = fncs.stringifyAny(encrypted);
        }
        const [iv, content] = encrypted.split("-");
        const token = await tcl.getTokens();
        for (const key of [token.NEW_AES_SECRET, token.OLD_AES_SECRET]) {
            try {
                const secretKey = Buffer.from(key, 'hex');
                const decipher = crypto.createDecipheriv(
                    'aes-256-cbc',
                    secretKey,
                    Buffer.from(iv, 'hex')
                );
                const decrypted = Buffer.concat([
                    decipher.update(Buffer.from(content, 'hex')),
                    decipher.final()
                ]);
                return decrypted.toString();
            } catch (err) {
                continue;
            }
        }
        return false;
    } catch (err) {
        return null;
    }
}


// Generate access Token (short-lived)
async function generateaccesstoken(objdata) {
    try {
        let data = {};
        if (fncs.isReqObject(objdata)) {
            const result = await verifyrefreshtoken(objdata);
            if (result.success) {
                data.user_id = result.data.user_id ?? null;
                data.device_type = result.data.device_type ?? null;
                data.device_info_id = result.data.device_info_id ?? null;
                data.is_logedin = true;
            } else {
                return { success: false, error_type: result.error_type, message: result.message }
            }
        } else if (fncs.isJsonObject(objdata)) {
            data.user_id = objdata.user_id ?? null;
            data.device_type = objdata.device_type ?? null;
            data.device_info_id = objdata.device_info_id ?? null;
            data.is_logedin = objdata.is_logedin ?? null;
        } else {
            return { success: false, error_type: "internal", message: "Data must be JSON object" }
        }
        const expiretime = (Math.floor(Math.random() * 16) + 5);
        const gettoken = await tcl.getTokens();
        const token = jwt.sign({ user_id: data.user_id, device_type: data.device_type, device_info_id: data.device_info_id, is_logedin: data.is_logedin }, gettoken.NEW_JWT_SECRET, { expiresIn: expiretime + "m" });
        const encrypttoken = encrypt(token);
        return { success: true, token: encrypttoken, expiretime: expiretime * 60 * 1000 }
    } catch (err) {
        return { success: false, error_type: "server", servererror: true, message: "There is a problem perform this request. Please try again." }
    }
};
// Generate access Token (short-lived)
async function generatesettingaccesstoken(objdata) {
    try {
        let data = {};
        if (fncs.isReqObject(objdata)) {
            const result = await verifyrefreshtoken(objdata);
            if (result.success) {
                data.user_id = result.data.user_id ?? null;
                data.device_type = result.data.device_type ?? null;
                data.device_info_id = result.data.device_info_id ?? null;
                data.is_logedin = true;
            } else {
                return { success: false, error_type: result.error_type, message: result.message }
            }
            data.password = fncs.getkeyvalue(objdata.body, 'password');
        } else if (fncs.isJsonObject(objdata)) {
            data.user_id = objdata.user_id ?? null;
            data.device_type = objdata.device_type ?? null;
            data.device_info_id = objdata.device_info_id ?? null;
            data.is_logedin = true;
            data.password = objdata.password ?? null;
        } else {
            return { success: false, error_type: "internal", message: "Data must be JSON object" }
        }
        if (!data.user_id || !data.device_info_id || !data.device_type || !data.password) {
            return { success: false, dataerror: true, error_type: "client", message: "Valid data required" }
        }
        const getpassword = await fncs.getcolumnvaluebyuserid("setting", data.user_id, "password");
        if (getpassword.success && "found" in getpassword && getpassword.found) {
            data.hashedpassword = getpassword.value;
        } else {
            return { success: false, error_type: "server", servererror: true, message: "There is a problem perform this request. Please try again." }
        }
        const matchpass = fncs.matchPassword(data.password, data.hashedpassword);
        if (!matchpass.success) {
            return matchpass;
        } else if (matchpass.success && matchpass.result) {
            data.setting_access = true;
        } else {
            return { success: false, error_type: "client", message: "Valid password required" }
        }
        const gettoken = await tcl.getTokens();
        const token = jwt.sign({ user_id: data.user_id, device_type: data.device_type, device_info_id: data.device_info_id, is_logedin: true, setting_access: data.setting_access }, gettoken.NEW_JWT_SECRET, { expiresIn: "15m" });
        const encrypttoken = encrypt(token);
        const expiretime = 15 * 60 * 1000;
        return { success: true, token: encrypttoken, expiretime: expiretime }
    } catch (err) {
        return { success: false, error_type: "server", servererror: true, message: "There is a problem perform this request. Please try again." }
    }
};

// Generate Refresh Token (long-lived)
const generaterefreshtoken = async (objdata) => {
    try {
        let data = {};
        if (fncs.isJsonObject(objdata)) {
            data.user_id = objdata.user_id ?? null;
            data.device_type = objdata.device_type ?? null;
            data.device_info_id = objdata.device_info_id ?? null;
            data.is_logedin = objdata.is_logedin ?? null;
            data.remember_me = objdata.remember_me ?? null
        } else {
            return { success: false, error_type: "internal", message: "Data must be JSON object" }
        }
        if (!data.user_id || !data.device_type || !data.device_info_id) {
            return { success: false, error_type: "internal", message: "Valid info required" }
        }
        const expiresIn = data.remember_me ? '30d' : '7d'; // If rememberme is true, set expiration to 30 days, else 7 days.
        const payload = { user_id: data.user_id, device_type: data.device_type, device_info_id: data.device_info_id, is_logedin: data.is_logedin };
        const gettoken = await tcl.getTokens();
        const refreshtoken = jwt.sign(payload, gettoken.NEW_REFRESH_TOKEN_SECRET, { expiresIn });
        const encrypttoken = encrypt(refreshtoken);
        const expiretime = data.remember_me ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        return { success: true, token: encrypttoken, expiretime: expiretime }
    } catch (err) {
        return { success: false, error_type: "server", servererror: true, message: "There is a problem perform this request. Please try again." }
    }
};

async function updaterefreshtoken(objdata, updateobj) {
    try {
        let refresh_token = undefined;
        if (fncs.isReqObject(objdata)) {
            refresh_token = ufncs.getRefreshTokenfromreq(objdata);
        } else if (fncs.isJsonObject(objdata)) {
            refresh_token = fncs.getkeyvalue(objdata, "refresh_token");
        } else if (typeof objdata === "string") {
            refresh_token = objdata;
        } else {
            return { success: false, dataerror: true, error_type: "internal", message: "Valid data required" }
        }
        const decoded = await verifyrefreshtoken(refresh_token);
        if (decoded.success) {
            const newtokenobject = fncs.updateobject(decoded, updateobj);
            const new_refresh_token = await generaterefreshtoken(newtokenobject);
            if (new_refresh_token.success) {
                return { success: true, token: new_refresh_token.token, message: "Success" }
            } else {
                return { success: false, servererror: true, error_type: "server", message: "There is a problem perform this request. Please try again." }
            }
        } else {
            return { success: false, error_type: "client", message: "Valid refresh token required" }
        }
    } catch (err) {
        return { success: false, error_type: "server", servererror: true, message: "There is a problem perform this request. Please try again." }
    }
}
const verifyaccesstoken = async (objdata) => {
    let token = "";
    if (fncs.isReqObject(objdata)) {
        token = ufncs.getAccessTokenFromReq(objdata);
    } else if (fncs.isJsonObject(objdata)) {
        token = objdata.access_token ?? null;
    } else if (typeof objdata === "string") {
        token = objdata;
    } else {
        return { success: false, dataerror: true, error_type: "internal" }
    }
    if (!token) {
        return { success: false, error_type: "internal", message: "No token provided" };
    }
    const dycripted = decrypt(token);
    if (!dycripted) {
        return { success: false, tokenerror: true, message: "Valid token required" }
    }
    const gettoken = await tcl.getTokens();
    try {
        const result = jwt.verify(dycripted, gettoken.NEW_JWT_SECRET);
        return { success: true, data: result };
    } catch (err) {
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            try {
                const result = jwt.verify(dycripted, gettoken.OLD_JWT_SECRET);
                return { success: true, data: result };
            } catch (oldErr) {
                return { success: false, error_type: "client", message: "Invalid or expired token" };
            }
        }
        return { success: false, error_type: "server", message: "Token verification failed" };
    }
};

async function verifyrefreshtoken(objdata) {
    try {
        let token = "";
        if (fncs.isReqObject(objdata)) {
            token = ufncs.getRefreshTokenfromreq(objdata);
        } else if (fncs.isJsonObject(objdata)) {
            token = fncs.getkeyvalue(objdata, "refresh_token");
        } else if (typeof objdata === "string") {
            token = objdata;
        }
        if (!token) {
            return { success: false, error_type: "client", message: "No token provided" };
        }
        const gettoken = await tcl.getTokens();
        // Try verifying with the old secret first
        const ifexist = await fncs.ifexistindatabase("device_info", { refresh_token: token });
        if ("exists" in ifexist && ifexist.exists) {
            const dycripted = decrypt(token);
            if (!dycripted) {
                return { success: false, tokenerror: true, message: "Valid token required" }
            }
            const decoded = jwt.verify(dycripted, gettoken.NEW_REFRESH_TOKEN_SECRET);
            console.log('Token verified with OLD secret');
            //return data
            return { success: true, data: decoded };
        } else if ("exists" in ifexist && ifexist.exists === false) {
            return { success: false, error_type: "client", message: "Invalid refreshtoken" }
        } else {
            return { success: false, error_type: "client", message: "There is a problem perform this request. Please try again." }
        }
    } catch (oldSecretError) {
        try {
            const gettoken = await tcl.getTokens();
            // If old secret fails, try verifying with the new secret
            const ifexist = await fncs.ifexistindatabase("device_info", { refresh_token: token });
            if ("exists" in ifexist && ifexist.exists) {
                const dycripted = decrypt(token);
                if (!dycripted) {
                    return { success: false, tokenerror: true, message: "Valid token required" }
                }
                const decoded = jwt.verify(dycripted, gettoken.OLD_REFRESH_TOKEN_SECRET);
                console.log('Token verified with NEW secret');
                return { success: true, data: decoded };
            } else if ("exists" in ifexist && ifexist.exists === false) {
                return { success: false, error_type: "client", message: "Invalid refreshtoken" }
            } else {
                return { success: false, error_type: "client", message: "There is a problem perform this request. Please try again." }
            }
        } catch (newSecretError) {
            return { success: false, error_type: "client", message: 'Invalid or expired refresh token' }
        }

    }
};

module.exports = {
    encrypt,
    decrypt,
    generateaccesstoken, // takes user id, user role, device type, device id, is logedin
    generatesettingaccesstoken,
    generaterefreshtoken, // takes user id, user role, device type, device id, is logedin, remember me
    updaterefreshtoken,
    verifyaccesstoken,
    verifyrefreshtoken,
}
