import pg from 'pg'

class DAO {
    static pool = new pg.Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'message_service',
        password: 'hungthoi',
        port: 5432,
    })
    
    static {
        this.pool
            .connect()
            .then(client => {
                console.log('Connected to PostgreSQL')
                client.release()
            })
            .catch(err => console.error('Connection error', err.stack))
    }

    static get = async (boxId) => {
        const boxResult = await this.pool.query(
            `SELECT * FROM box WHERE id = $1`,
            [boxId]
        )
        const usersResult = await this.pool.query(
            `SELECT user_id 
            FROM box_user 
            WHERE box_id = $1`,
            [boxId]
        )

        if (boxResult.rows.length === 0)
            return null

        const box = boxResult.rows[0]
        box.users = usersResult.rows.map(row => row.user_id)

        return box
    }

    static create = async () => {
        const result = await this.pool.query(
            "INSERT INTO box DEFAULT VALUES RETURNING id"   
        )
        return result.rows[0]
    }

    static delete = async (boxId) => {
        await this.deleteMessages(boxId)
        await this.pool.query(
            "DELETE FROM box WHERE id = ?",
            [boxId]
        )
    }

    static addUser = async (boxId, userId) => {
        await this.pool.query(
            "INSERT INTO box_user (box_id, user_id) VALUES (?, ?)",
            [boxId, userId]
        )
        return await this.get(boxId)
    }

    static removeUser = async (boxId, userId) => {
        await this.pool.query(
            "DELETE FROM box_user WHERE box_id = ? AND user_id = ?",
            [boxId, userId]
        )
    }

    static createMessage = async (userId, boxId, content) => {
        const res = await this.pool.query(
            'select sent_msg_to_box($1, $2, $3)',
            [userId, boxId, content]
        )
        const id = res.rows[0]?.sent_msg_to_box
        const mres = await this.pool.query("SELECT * FROM message WHERE id = $1", [id])

        if (mres.rows.length === 0)
            return null
        return mres.rows[0];
    }

    static filterMessages = async (boxId, userId) => {
        const res = await this.pool.query(
            `SELECT m.*
            FROM message m
            JOIN box_msg bm ON bm.msg_id = m.id
            WHERE bm.box_id = $1 AND m.user_id = $2`,
            [boxId, userId]
        )
        return res.rows || null
    }

    static getMessages = async (boxId) => {
        const res = await this.pool.query(
            `SELECT m.*
            FROM message m
            JOIN box_msg bm ON bm.msg_id = m.id
            WHERE bm.box_id = $1`,
            [boxId]
        )
        return res.rows || null
    }

    static deleteMessages = async (boxId) => {
        return await this.pool.query(
            `DELETE FROM message 
            WHERE id IN (
                SELECT m.id
                FROM message m
                JOIN box_msg bm ON m.id = bm.msg_id
                WHERE bm.box_id = ?
            )`,
            [boxId]
        )
    }
}

export default DAO