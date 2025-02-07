import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import userRouter from './users/router.js'

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

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

app.use('/api/users', userRouter)

app.listen(3003, () => {
    console.log("User service running on port 3003")
})