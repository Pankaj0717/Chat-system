import express from "express"
import signup, { login } from "../controllers/auth.controller.js";
import { logout, me } from "../controllers/session.controller.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, me);

export default router;