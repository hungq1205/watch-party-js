import { Router } from 'express';
import DAO from './DAO.js';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import 'dotenv/config.js'

const router = Router();

function authenticateSelf(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    if (token === undefined) 
        return res.status(401).send("Unauthorized");

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) 
            return res.status(403).send("Invalid token");
        req.user = user
        next()
    })
}

router.get("/", asyncHandler(async (req, res) => {
    const { user1, user2 } = req.query;
    if (user1 == undefined || user2 == undefined)
        return res.status(400).send("Missing arguments");;
    res.json(await DAO.getDirect(user1, user2));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    res.json(await DAO.get(req.params.id));
}));

router.delete("/:id", asyncHandler(async (req, res) => {
    res.json(await DAO.delete(req.params.id));
}));

// protected routes

router.post("/", authenticateSelf, asyncHandler(async (req, res) => {
    const { receiverId, content } = req.body;
    console.log(receiverId)
    console.log(content)
    if (content === undefined || receiverId === undefined) 
        return res.status(400).send("Missing arguments");
    res.status(201).json(await DAO.createToDirect(req.user.id, receiverId, content));
}));

export default router;