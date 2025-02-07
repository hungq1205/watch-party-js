import { Router } from 'express'
import DAO from './DAO.js';
import asyncHandler from 'express-async-handler';

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
    const query = req.query.query;
    if (!query)
        res.json(await DAO.getMovies());
    else 
        res.json(await DAO.queryMovies(query));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    res.json(await DAO.getMovie(req.params.id));
}));

export default router;