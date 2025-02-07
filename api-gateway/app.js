import express from 'express'
import 'dotenv/config.js'
import SocketServer from './socket.js'
import { createServer } from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()

app.use((req, res, next) => {
    if (req.method === "GET")
        res.header("Access-Control-Allow-Origin", "*")
    else
        res.header("Access-Control-Allow-Origin", "http://localhost:5173")

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    next()
});

app.use((req, res, next) => {
    // console.log(`${req.method}: ${req.originalUrl}`)
    next()
})

app.use("/api/movies", createProxyMiddleware({ target: process.env.MOVIE_SERVICE_DES + "/api/movies" }))
app.use("/api/boxes", createProxyMiddleware({ target: process.env.MOVIE_SERVICE_DES + "/api/boxes" }))

app.use("/api/messages", createProxyMiddleware({ target: process.env.MESSAGE_SERVICE_DES + "/api/messages" }))
app.use("/api/msgboxes", createProxyMiddleware({ target: process.env.MESSAGE_SERVICE_DES + "/api/msgboxes" }))

app.use("/api/users", createProxyMiddleware({ target: process.env.USER_SERVICE_DES + "/api/users" }))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const httpServer = createServer(app)
SocketServer.init(httpServer)

httpServer.listen(process.env.PORT, () => {
    console.log("API gateway running on port " + process.env.PORT)
})