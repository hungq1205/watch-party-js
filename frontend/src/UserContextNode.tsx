import { createContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import Cookies from 'js-cookie'

export interface User {
    id: number,
    username: string,
    displayName: string,
    isOnline: boolean
}

const MESSAGE_TYPES = [
    "enterRoom",         // boxId
    "user:message",      // data: { senderId, receiverId, content | senderUsername }
    "box:message",       // data: { senderId, content, boxId | senderUsername }
    "box:playbackUpdate",// data: { elapsed, isPaused, movieId | boxId }
    "box:movieUpdate",   // data: { movieId | boxId }
    "box:memberUpdate"   // data: { boxId | users }
] as const

export type MessageType = (typeof MESSAGE_TYPES)[number]

const backendUrl = "http://localhost:3000"

export const UserContext = createContext<{ user: User | null, isInBox: boolean } | null>(null)
export const socket = io(`${backendUrl}`,  {
    extraHeaders: {
        Authorization: `Bearer ${Cookies.get('token')}`
    }
})

const fetchBoxOfUser = async (userId: number) => {
    try {
        const res = await fetch(`${backendUrl}/api/boxes?ofUser=${userId}`)
        if (!res.ok) {
            console.error(await res.text())
            return null
        }
        return await res.json()
    } catch (e) {
        console.error("Error fetching box of user: ", e)
    }
}

const UserContextNode = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [fetched, setFetched] = useState<boolean>(false)
    const isInBox = useRef(false)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${Cookies.get('token')}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    const box = await fetchBoxOfUser(data._id)
                    isInBox.current = !!box
                    if (!user || user.id !== data._id)
                        setUser({
                            id: data._id,
                            username: data.username,
                            displayName: data.display_name,
                            isOnline: data.is_online
                        } as User)
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setFetched(true)
            }
        }
        fetchUser()
    }, [])

    useEffect(() => {
        if (!user) 
            socket.connected && socket.disconnect()
        else
            socket.disconnected && socket.connect()
    }, [user])

    return (
        <UserContext.Provider value={{ user: user, isInBox: isInBox.current}}>
            { fetched && children }
        </UserContext.Provider>
    )
}

export const sendSocket = (type: MessageType, data: any) => {
    socket.emit(type, data)
}

export default UserContextNode