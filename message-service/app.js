import express from 'express'
import cors from 'cors'
import msgRouter from './message/router.js'
import msgBoxRouter from './message-box/router.js'

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use((err, req, res, next) => {
    const status = res.statusCode ? res.statusCode : 500
    res.status(status).json({
        message: err.message,
        stack: err.stack
    })
})

app.use("/api/messages", msgRouter)
app.use("/api/msgboxes", msgBoxRouter)

app.listen(3002, () => {
    console.log("Message service running on port 3002")
})
