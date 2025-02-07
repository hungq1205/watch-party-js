import { Router } from 'express'
import asyncHandler from 'express-async-handler'
import jwt from 'jsonwebtoken'
import DAO from './DAO.js'
import 'dotenv/config'

const router = Router()

function authenticateSelf(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) 
        return res.status(401).json({ message: "Unauthorized" })

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) 
            return res.status(403).json({ message: "Invalid token" })
        req.user = user
        next()
    })
}

router.post("/login", asyncHandler(async (req, res) => {
    const { username, password } = req.body
    if (username === undefined && password === undefined)
        return res.status(400).json({ message: "Missing arguments" })
    const user = await DAO.checkLogin(username, password)
    if (user === null)
        return res.status(401).json({ message: "Incorrect username or password" })

    const token = jwt.sign(
        { 
            id: user._id, 
            username: user.username, 
            displayName: user.displayName
        }, 
        process.env.SECRET_KEY, 
        { expiresIn: '1h' }
    )
    
    return res.json({ token: token, message: "Logged in" })
}))

router.get("/", asyncHandler(async (req, res) => {
    const idsStr = req.query.ids
    if (idsStr) {
        const ids = idsStr.split(',').map(id => Number(id))
        res.json(await DAO.get(ids))
    }
    else  
        res.json(await DAO.getAll())
}))

router.get("/me", authenticateSelf, asyncHandler(async (req, res) => {
    res.json((await DAO.get([req.user.id]))[0])
}))

router.get("/:id", asyncHandler(async (req, res) => {
    res.json((await DAO.get([Number(req.params.id)]))[0])
}))

router.post("/", asyncHandler(async (req, res) => {
    const { username, password, displayName } = req.body
    if (username === undefined || password === undefined || displayName === undefined)
        return res.status(400).json({ message: "Missing arguments" })

    res.status(201).json(await DAO.create(username, password, displayName))
}))

router.get("/:id/friends",  asyncHandler(async (req, res) => {
    res.json(await DAO.getFriends(Number(req.params.id)))
}))

router.patch("/:id", asyncHandler(async (req, res) => {
    const isOnline = req.body.isOnline
    if (isOnline === undefined)
        res.status(400).json({ message: "Missing arguments" })
    else
        res.json(await DAO.patchStatus(Number(req.params.id), Boolean(isOnline)))
}))

// Protected routes

router.post("/friends", authenticateSelf, asyncHandler(async (req, res) => {
    const { receiverId } = req.body
    if (receiverId === undefined)
        return res.status(400).json({ message: "Missing arguments" })

    res.status(201).json(await DAO.sendFriendRequest(req.user.id, Number(receiverId)))
}))

router.delete("/friends", authenticateSelf, asyncHandler(async (req, res) => {
    const { friendId } = req.body
    if (friendId === undefined)
        return res.status(400).json({ message: "Missing arguments" })

    res.json(await DAO.deleteFriend(req.user.id, Number(friendId)))
}))

export default router