import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import 'dotenv/config'

class DAO {
    static client = new MongoClient(process.env.DB_URI)
    static db
    static users

    static init = async () => {
        await this.client.connect()
        this.db = this.client.db(process.env.DB_NAME)
        this.users = this.db.collection("users")
        console.log("Connected to MongoDB successfully")
    }

    static checkLogin = async (username, password) => {
        const user = await this.users.findOne({ username: username })
        if (user && user.pwHash === this.hash(password)){
            delete user.pwHash
            return user
        }
        return null
    }

    static getAll = async () => {
        return await this.users.find({}, { projection: { pwHash: 0 } }).toArray()
    }

    static get = async (ids) => {
        return await this.users.find({ _id: { $in: ids } }, { projection: { pwHash: 0 } }).toArray()
    }

    static getByUsername = async (username) => {
        return await this.users.findOne({ username: username }, { projection: { pwHash: 0 } })
    }

    static create = async (username, password, displayName) => {
        const id = await this.getNextSequence("userId")
        const result = await this.users.insertOne({ 
            _id: id,
            username: username,
            pwHash: this.hash(password),
            displayName: displayName,
            friends: [],
            friendReqs: [],
            isOnline: false
        })
        return await this.get([result.insertedId])[0]
    }
    
    static getFriends = async (userId) => {
        const user = await this.users.findOne({ _id: userId }, { projection: { friends: 1 } })
        if (!user || !user.friends) return []
        return await this.users.find({ _id: { $in: user.friends } }, { projection: { pwHash: 0 } }).toArray()
    }

    static sendFriendRequest = async (senderId, receiverId) => {
        if (senderId === receiverId) 
            return

        const sender = await this.users.findOne({ _id: senderId })
        if (!sender || sender.friendReqs.includes(receiverId))
            return
        
        const receiver = await this.users.findOne({ _id: receiverId })
        if (!receiver)
            return

        if (receiver.friendReqs.includes(senderId)) {
            await this.users.updateOne(
                { _id: senderId },
                { $push: { friends: receiverId } }
            )
            await this.users.updateOne(
                { _id: receiverId },
                { 
                    $push: { friends: senderId },
                    $pull: { friendReqs: senderId }    
                }
            )
        } else {
            await this.users.updateOne(
                { _id: senderId },
                { $push: { friendReqs: receiverId } }
            )
        }
    }

    static deleteFriend = async (userId, friendId) => {
        if (userId === friendId)
            return

        await this.users.updateMany(
            { _id: { $in: [userId, friendId] } },
            { $pull: { friends: { $in: [userId, friendId] } } }
        )
    }

    static patchStatus = async (userId, isOnline) => {
        await this.users.updateOne(
            { _id: userId },
            { $set: { isOnline: isOnline } }
        )
        return await this.get([userId])[0]
    }

    static getNextSequence = async (name) => {
        const result = await this.db.collection("counters").findOneAndUpdate(
            { _id: name },
            { $inc: { seq: 1 } },
            { returnDocument: "before" }
        )
        if (!result) {
            await this.db.collection("counters").insertOne({
                _id: name,
                seq: 1
            })
            return 0
        }
        return result.seq
    }

    static hash = (value) => {
        const hash = crypto.createHash('sha256')
        hash.update(value)
        return hash.digest('hex')
    }
}

DAO.init().catch(console.error)

export default DAO