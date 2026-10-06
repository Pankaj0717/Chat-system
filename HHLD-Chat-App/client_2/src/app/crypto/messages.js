const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const PBKDF2_ITERATIONS = 310000;

const toBase64 = (bytes) => {
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

const fromBase64 = (value) =>
    Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const deriveWrappingKey = async (password, salt, iterations) => {
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        textEncoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

const createIdentity = async (password) => {
    const pair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );
    const publicKey = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await deriveWrappingKey(
        password,
        salt,
        PBKDF2_ITERATIONS
    );
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        wrappingKey,
        textEncoder.encode(JSON.stringify(privateKey))
    );

    return {
        publicKey,
        encryptedPrivateKey: {
            version: 1,
            iterations: PBKDF2_ITERATIONS,
            salt: toBase64(salt),
            iv: toBase64(iv),
            ciphertext: toBase64(new Uint8Array(ciphertext))
        }
    };
};

const requestKeys = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || "Encryption key request failed");
        error.status = response.status;
        throw error;
    }

    return data;
};

export const getPublicKey = async (username, authApi) => {
    try {
        const data = await requestKeys(
            `${authApi}/keys/${encodeURIComponent(username)}`
        );
        return data.publicKey;
    } catch (error) {
        if (error.status === 404) {
            throw new Error(
                `${username} has not set up encryption yet. Ask them to log in again using the updated app, then try sending your message.`
            );
        }
        throw error;
    }
};

export const initializeEncryption = async (username, password, authApi) => {
    const ownKeysUrl = `${authApi}/keys/me`;
    let keys = await requestKeys(ownKeysUrl);

    if (!keys.publicKey && !keys.encryptedPrivateKey) {
        const identity = await createIdentity(password);
        try {
            await requestKeys(ownKeysUrl, {
                method: "PUT",
                body: JSON.stringify(identity)
            });
            keys = identity;
        } catch (error) {
            if (error.status !== 409) {
                throw error;
            }
            keys = await requestKeys(ownKeysUrl);
        }
    }

    if (!keys.publicKey || !keys.encryptedPrivateKey) {
        throw new Error("This account has incomplete encryption keys");
    }

    const encryptedKey = keys.encryptedPrivateKey;
    const wrappingKey = await deriveWrappingKey(
        password,
        fromBase64(encryptedKey.salt),
        encryptedKey.iterations
    );
    let privateKey;
    try {
        const plaintext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: fromBase64(encryptedKey.iv) },
            wrappingKey,
            fromBase64(encryptedKey.ciphertext)
        );
        privateKey = JSON.parse(textDecoder.decode(plaintext));
    } catch {
        throw new Error("Unable to unlock encryption keys with this password");
    }

    if (
        privateKey.kty !== "RSA" ||
        privateKey.n !== keys.publicKey.n ||
        privateKey.e !== keys.publicKey.e
    ) {
        throw new Error("The registered public key does not match this private key");
    }

    sessionStorage.setItem("chat-public-key", JSON.stringify(keys.publicKey));
    sessionStorage.setItem("chat-private-key", JSON.stringify(privateKey));
    sessionStorage.setItem("chat-encryption-user", username);
};

export const encryptMessage = async (text, sender, receiver, ownPublicKey, receiverPublicKey) => {
    const messageKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        messageKey,
        textEncoder.encode(text)
    );
    const rawMessageKey = await crypto.subtle.exportKey("raw", messageKey);
    const senderPublicCryptoKey = await crypto.subtle.importKey(
        "jwk",
        ownPublicKey,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    );
    const receiverPublicCryptoKey = await crypto.subtle.importKey(
        "jwk",
        receiverPublicKey,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    );
    const [senderKey, receiverKey] = await Promise.all([
        crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            senderPublicCryptoKey,
            rawMessageKey
        ),
        crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            receiverPublicCryptoKey,
            rawMessageKey
        )
    ]);

    return {
        ciphertext: toBase64(new Uint8Array(ciphertext)),
        iv: toBase64(iv),
        senderKey: toBase64(new Uint8Array(senderKey)),
        receiverKey: toBase64(new Uint8Array(receiverKey)),
        sender,
        receiver
    };
};

export const decryptMessage = async (message, username, privateJwk) => {
    if (typeof message.ciphertext !== "string") {
        return message;
    }
    if (message.sender !== username && message.receiver !== username) {
        throw new Error("This encrypted message is not addressed to this user");
    }

    const wrappedKey = message.sender === username
        ? message.senderKey
        : message.receiverKey;
    const privateKey = await crypto.subtle.importKey(
        "jwk",
        privateJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
    );
    const rawMessageKey = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        fromBase64(wrappedKey)
    );
    const messageKey = await crypto.subtle.importKey(
        "raw",
        rawMessageKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(message.iv) },
        messageKey,
        fromBase64(message.ciphertext)
    );

    return { ...message, text: textDecoder.decode(plaintext) };
};
