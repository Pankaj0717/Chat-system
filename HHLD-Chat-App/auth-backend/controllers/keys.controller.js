import User from "../models/user.model.js";

const isPublicKey = (key) =>
    key &&
    key.kty === "RSA" &&
    typeof key.n === "string" &&
    typeof key.e === "string";

const isEncryptedPrivateKey = (key) =>
    key &&
    key.version === 1 &&
    typeof key.salt === "string" &&
    typeof key.iv === "string" &&
    typeof key.ciphertext === "string" &&
    Number.isInteger(key.iterations) &&
    key.iterations >= 100000 &&
    key.iterations <= 1000000;

export const getOwnKeys = async (req, res) => {
    try {
        const user = await User.findById(
            req.userId,
            "publicKey encryptedPrivateKey"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({
            publicKey: user.publicKey || null,
            encryptedPrivateKey: user.encryptedPrivateKey || null
        });
    } catch (error) {
        console.error("Unable to retrieve encryption keys:", error.message);
        return res.status(500).json({ message: "Unable to retrieve encryption keys" });
    }
};

export const getPublicKey = async (req, res) => {
    try {
        const user = await User.findOne(
            { username: req.params.username },
            "publicKey"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!isPublicKey(user.publicKey)) {
            return res.status(404).json({ message: "User has no encryption key" });
        }

        return res.json({ publicKey: user.publicKey });
    } catch (error) {
        console.error("Unable to retrieve public key:", error.message);
        return res.status(500).json({ message: "Unable to retrieve public key" });
    }
};

export const registerKeys = async (req, res) => {
    const { publicKey, encryptedPrivateKey } = req.body;
    if (!isPublicKey(publicKey) || !isEncryptedPrivateKey(encryptedPrivateKey)) {
        return res.status(400).json({ message: "Invalid encryption keys" });
    }

    try {
        const result = await User.updateOne(
            {
                _id: req.userId,
                $or: [
                    { publicKey: { $exists: false } },
                    { publicKey: null }
                ]
            },
            { $set: { publicKey, encryptedPrivateKey } }
        );

        if (result.matchedCount === 0) {
            return res.status(409).json({ message: "Encryption keys are already registered" });
        }

        return res.status(201).json({ message: "Encryption keys registered" });
    } catch (error) {
        console.error("Unable to register encryption keys:", error.message);
        return res.status(500).json({ message: "Unable to register encryption keys" });
    }
};
