import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { getOwnKeys, getPublicKey, registerKeys } from "../controllers/keys.controller.js";

const router = express.Router();

router.get("/me", verifyToken, getOwnKeys);
router.get("/:username", verifyToken, getPublicKey);
router.put("/me", verifyToken, registerKeys);

export default router;
