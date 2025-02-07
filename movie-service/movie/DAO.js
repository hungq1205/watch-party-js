import mysql from 'mysql2';

class DAO {
    static pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'hungthoi',
        database: 'movie_service'
    }).promise();
    
    static async getMovie(id) {
        return (await this.pool.query('SELECT * FROM movie WHERE id = ?', [id]))[0][0] || null;
    };
    
    static async getMovies() {
        return (await this.pool.query('SELECT * FROM movie'))[0] || null;
    };
    
    static async queryMovies(query) {
        return (await this.pool.query(
            `SELECT * 
            FROM movie
            WHERE 
                title LIKE CONCAT(?, '%') OR
                title LIKE CONCAT('%', ?, '%')`, 
        [query, query]))[0] || null;
    };
}

export default DAO;