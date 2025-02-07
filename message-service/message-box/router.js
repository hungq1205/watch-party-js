import { Router } from 'express';
import DAO from './DAO.js';
import asyncHandler from 'express-async-handler';

const router = Router();

router.get("/:id", asyncHandler(async (req, res) => {
    res.json(await DAO.get(req.params.id));
}));

router.post("/", asyncHandler(async (req, res) => {
    res.status(201).json(await DAO.create());
}));

router.delete("/", asyncHandler(async (req, res) => {
    const id = req.body.id;
    if (id === undefined)
        return res.status(400).send("Missing argument");
    res.json(await DAO.delete(id));
}));

router.get("/:boxId/messages", asyncHandler(async (req, res) => {
    res.json(await DAO.getMessages(req.params.boxId));
}));

router.post("/:boxId/messages", asyncHandler(async (req, res) => {
    const boxId = req.params.boxId;
    const { userId, content } = req.body;
    if (userId === undefined || !content === undefined)
        return res.status(400).send("Missing arguments");
    res.json(await DAO.createMessage(userId, boxId, content));
}));

router.get("/:boxId/users/:userId/messages", asyncHandler(async (req, res) => {
    res.json(await DAO.filterMessages(req.params.boxId, req.params.userId));
}));

router.post("/:boxId/users", asyncHandler(async (req, res) => {
    const boxId = req.params.boxId;
    const userId = req.body.userId;
    if (userId === undefined)
        return res.status(400).send("Missing arguments");
    res.status(201).json(await DAO.addUser(boxId, userId));
}));

router.delete("/:boxId/users", asyncHandler(async (req, res) => {
    const boxId = req.params.boxId;
    const userId = req.body.userId;
    if (userId === undefined)
        return res.status(400).send("Missing arguments");
    res.json(await DAO.removeUser(boxId, userId));
}));

export default router;