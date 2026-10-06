import User from "../models/user.model.js";

export const logout = (req, res) => {
    res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "strict",
        secure: false
    });
    return res.status(200).json({ message: "Logged out" });
};

export const me = async (req, res) => {
    try {
        const user = await User.findById(req.userId, "username");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized: user not found" });
        }
        return res.status(200).json({ _id: user._id, username: user.username });
    } catch (error) {
        console.error("Unable to load authenticated user:", error.message);
        return res.status(500).json({ message: "Unable to load authenticated user" });
    }
};
