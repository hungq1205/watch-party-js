import { Router } from 'express'
import DAO from './DAO.js'
import asyncHandler from 'express-async-handler'
import jwt from 'jsonwebtoken'
import 'dotenv/config.js'

const router = Router()

function authenticateSelf(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) 
        return res.status(401).json({ message: "Unauthorized" })

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) 
            return res.status(403).json({ message: "Invalid jwt token" })
        req.user = user
        next()
    })
}

router.get("/", asyncHandler(async (req, res) => {
    if (req.query.ofOwner !== undefined)
        res.json(await DAO.getBoxOfOwner(req.query.ofOwner))
    else if (req.query.ofUser !== undefined)
        res.json(await DAO.getBoxOfUser(req.query.ofUser))
    else 
        res.json(await DAO.getAll())
}))

router.get("/:id", asyncHandler(async (req, res) => {
    res.json(await DAO.get(req.params.id))
}))

router.post("/", authenticateSelf, asyncHandler(async (req, res) => {
    const { password, msgboxId } = req.body
    if (msgboxId === undefined)
        res.status(400).json({ message: "Missing arguments" })

    if (password !== undefined)
        res.status(201).json(await DAO.create(req.user.id, password, msgboxId))
    else
        res.status(201).json(await DAO.create(req.user.id, "", msgboxId))
}))

router.post("/:id/checkPassword", asyncHandler(async (req, res) => {
    const { password } = req.body
    let rs;
    if (password === undefined)
        rs = await DAO.checkPassword(req.params.id, "")
    else
        rs = await DAO.checkPassword(req.params.id, password)
    res.json({ isCorrect: rs })
}))

router.delete("/", asyncHandler(async (req, res) => {
    const { id } = req.body
    if (id === undefined)
        res.status(400).send("Invalid arguments")

    res.json(await DAO.remove(id))
}))

router.patch("/:id", asyncHandler(async (req, res) => {
    res.json(await DAO.patch(req.params.id, req.body))
}))

router.route("/:id/users")
    .post(authenticateSelf, asyncHandler(async (req, res) => {
        res.json(await DAO.addUser(req.params.id, req.user.id))
    }))
    .delete(authenticateSelf, asyncHandler(async (req, res) => {
        const uid = req.body.userId
        if (uid === undefined)
            return res.status(400).send("userId is required")        

        const box = await DAO.getBoxOfUser(uid)
        if (!box || (box.owner_id !== uid && uid !== req.user.id))
            res.status(401).json({ message: "Unauthorized" })

        if (box.owner_id === uid)
            res.json(await DAO.remove(box.id))
        else
            res.json(await DAO.removeUser(box.id, uid))
    }))

export default router