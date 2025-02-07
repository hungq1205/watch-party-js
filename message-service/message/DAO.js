import pg from 'pg';

class DAO {
    static pool = new pg.Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'message_service',
        password: 'hungthoi',
        port: 5432,
    });
    
    static {
        this.pool
            .connect()
            .then(client => {
                console.log('Connected to PostgreSQL');
                client.release();
            })
            .catch(err => console.error('Connection error', err.stack));
    }
    
    static getBoxesOfUser = async (userId) => {
        const res = await this.pool.query(
            `SELECT box_id FROM box_user 
            WHERE user_id = ?`,
            [userId]
        )
        return res.rows ? res.rows[0] : null;
    }

    static getDirect = async (user1, user2) => {
        const res= await this.pool.query(
            `SELECT m.*
            FROM message m
            JOIN box_msg bm ON bm.msg_id = m.id
            JOIN box b ON b.id = bm.box_id
            JOIN box_user bu1 ON bu1.box_id = b.id
            JOIN box_user bu2 ON bu2.box_id = b.id
            WHERE b.isDM and bu1.user_id = $1 AND bu2.user_id = $2`,
            [user1, user2]
        )
        return res.rows || null
    };
    
    static get = async (id) => {
        const res =  await this.pool.query('SELECT * FROM message WHERE id = $1', [id]);
        return res.rows ? res.rows[0] : null;
    };

    static createToDirect = async (senderId, receiverId, content) => {
        console.log("auth")
        await this.pool.query(
            'call sent_dm($1, $2, $3)',
            [senderId, receiverId, content]
        );
        console.log("auth2")
    };

    static delete = async (id) => {
        await this.pool.query('DELETE FROM message WHERE id = $1 RETURNING *', [id]);
        await this.pool.query('DELETE FROM box_msg WHERE msg_id = $1', [id]);
    };
}

export default DAO;