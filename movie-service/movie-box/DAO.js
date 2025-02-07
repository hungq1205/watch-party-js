import mysql from 'mysql2';

class DAO {
    static pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'hungthoi',
        database: 'movie_service'
    }).promise();

    static async getAll() {
        const [boxRows] = await this.pool.query('SELECT id, elapsed, msg_box_id, owner_id, movie_id FROM box');
        for (const box of boxRows) {
            const [userRows] = await this.pool.query('SELECT user_id FROM box_user WHERE box_id = ?', [box.id]);
            box.users = userRows.map(row => row.user_id);
        }

        return boxRows || null;
    }

    static async get(id) {
        const res = (await this.pool.query('SELECT id, elapsed, msg_box_id, owner_id, movie_id FROM box WHERE id = ?', [id]))[0][0];
        if (!res)
            return null
        const box = res
        const [userRows] = await this.pool.query('SELECT user_id FROM box_user WHERE box_id = ?', [id]);
        box.users = userRows.map(user => user.user_id); 
        return box || null;
    }

    static async getBoxOfUser(userId) {
        const res = await this.pool.query(
            `SELECT b.*
            FROM box b
            JOIN box_user bu ON bu.box_id = b.id
            WHERE bu.user_id = ?`,
            [userId]
        );
        if (res[0].length === 0) return null;
        return res[0][0];
    }

    static async getBoxOfOwner(ownerId) {
        const res = await this.pool.query(
            `SELECT * FROM box
            WHERE owner_id = ?`,
            [ownerId]
        );
        if (res[0].length === 0) return null;
        return res[0][0];
    }

    static async create(ownerId, password, msgboxId) {
        const boxCmd = `
            INSERT INTO box (owner_id, password, msg_box_id, movie_id)
            VALUES (?, ?, ?, NULL)`;
        const boxUserCmd = `
            INSERT INTO box_user (box_id, user_id)
            VALUES (?, ?)`;

        const [boxResult] = await this.pool.query(boxCmd, [ownerId, password, msgboxId]);
        const boxId = boxResult.insertId;

        await this.pool.query(boxUserCmd, [boxId, ownerId]);
        return await this.get(boxId);
    }

    static async checkPassword(id, password) {
        const res = (await this.pool.query('SELECT password FROM box WHERE id = ?', [id]))[0][0];
        if (!res)
            return null
        return password == res.password
    }

    static async remove(id) {
        const cmd = 'DELETE FROM box WHERE id = ?';
        const ub_cmd = 'DELETE FROM box_user WHERE box_id = ?';

        await this.pool.query(ub_cmd, [id]);
        await this.pool.query(cmd, [id]);
    }

    static async patch(id, vals) {
        let fields = [], values = [];
    
        if (vals.elapsed !== undefined) {
            fields.push("elapsed = ?");
            values.push(vals.elapsed);
        }
        if (vals.movieId !== undefined) {
            fields.push("movie_id = ?");
            values.push(vals.movieId < 0 ? null : vals.movieId);
        }
        if (vals.password !== undefined) {
            fields.push("password = ?");
            values.push(vals.password);
        }
    
        if (fields.length === 0)
            throw new Error("No fields to patch");
    
        const cmd = `UPDATE box SET ${fields.join(", ")} WHERE id = ?`;
        values.push(id);
    
        await this.pool.query(cmd, values);
        return (await this.get(id));
    }

    static async addUser(boxId, userId) {
        const cmd = `INSERT INTO box_user (box_id, user_id) VALUES (?, ?)`;
        await this.pool.query(cmd, [boxId, userId]);
        return (await this.get(boxId));
    }

    static async removeUser(boxId, userId) {
        const cmd = `DELETE FROM box_user WHERE box_id = ? AND user_id = ?`;
        await this.pool.query(cmd, [boxId, userId]);
        return (await this.get(boxId));
    }
}

export default DAO;