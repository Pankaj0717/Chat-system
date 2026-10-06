import jwt from "jsonwebtoken"

const verifyToken = (req, res, next) => {
    const token = req.cookies.jwt;
    if(!token) {
        return res.status(401).json({message: 'Unauthorized: Token not provided'});
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decodedToken.userId;
        next();
    } catch (error) {
        return res.status(401).json({message: 'Unauthorized: Invalid Token'});
    }
}

export default verifyToken;