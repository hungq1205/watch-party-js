import express from 'express'
import cors from 'cors'
import movieRouter from './movie/router.js'
import movieBoxRouter from './movie-box/router.js'
import { errorHandler } from './middleware.js'

var app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(errorHandler)
app.use("/api/movies", movieRouter)
app.use("/api/boxes", movieBoxRouter)

app.listen(3001, () => {
    console.log("Movie service running on port 3001")
})