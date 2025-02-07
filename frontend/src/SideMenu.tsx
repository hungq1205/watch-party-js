import 'bootstrap/dist/css/bootstrap.min.css'
import { useState, CSSProperties, useContext, createContext, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faComment, faUser, faUserGroup } from "@fortawesome/free-solid-svg-icons"
import { Outlet } from 'react-router-dom'
import Cookies from 'js-cookie'
import { GlobalPopupContext } from './App'
import { ContextMenuProps } from './ContextMenu'
import { UserContext, User, sendSocket, socket, MessageType } from './UserContextNode'
import './SideMenu.css'

const backendUrl = "http://localhost:3000"
const token = Cookies.get('token')
const FriendContext = createContext<{ setFriends: React.Dispatch<React.SetStateAction<User[]>>, handleDirectFriend: (friend: User) => void } | null>(null)
const ChatUserContext = createContext<{ chatUsers: User[], setChatUsers: React.Dispatch<React.SetStateAction<User[]>> } | null>(null)

interface Message {
    id: number
    senderId: number
    content: string
}

interface ChatWindowProps {
    isActive: boolean
    userId: number
    displayName: string
    onClick: (userId: number) => void
}

enum TabType {
    Chat = 'chat',
    Friend = 'friend',
}

const fetchFriends = async (userId: number, setFriends: (friends: User[]) => void) => {
    try {
        const res = await fetch(`${backendUrl}/api/users/${userId}/friends`)
        const data = await res.json()
        if (data == null)
            setFriends([])
        const friends: User[] = await data.map((friend: any) => {
            return {
                id: friend._id,
                username: friend.username,
                displayName: friend.displayName,
                isOnline: friend.isOnline
            }
        })
        setFriends(friends)
    } catch (e) {
        console.error("Error fetching user: ", e)
    }
}

const fetchDirects = async (userId: number, oppId: number, setMessages: (messages: Message[]) => void) => {
    try {
        const res = await fetch(`${backendUrl}/api/messages?user1=${userId}&user2=${oppId}`)
        const data = await res.json()
        if (data == null) 
            setMessages([])
        const messages: Message[] = await data.map((msg: any) => {
            return {
                id: msg.id,
                senderId: msg.user_id,
                content: msg.content
            }
        })
        setMessages(messages)
    } catch (e) {
        console.error("Error fetching user: ", e)
    }
}

const postDirect = async (oppId: number, content: string, onSucces: () => void) => {
    try {
        const res = await fetch(`${backendUrl}/api/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                receiverId: oppId,
                content: content
            })
        })

        if (res.ok)
            onSucces()
        else
            console.error(await res.text())
    } catch (e) {
        console.error("Error fetching user: ", e)
    }
}

const Tab = ({type, onSelect, iconStyle}: {
    type: TabType, 
    onSelect: (tab: TabType) => void, 
    iconStyle?: CSSProperties}) => 
{
    let icon
    switch (type) {
        case TabType.Chat:
            icon = faComment
            break
        case TabType.Friend:
            icon = faUserGroup
            break
        default:
            icon = faEye
    }

    return (
        <li className="side-item" id={`${type}-toggle`} onClick={ () => onSelect(type) }>
            <div className="p-3">
                <FontAwesomeIcon icon={icon} className="icon" style={iconStyle}/>
            </div>
        </li>
    )
}

const NavMenu = ({onItemSelect}: {onItemSelect: (tab: TabType) => void}) => {
    return (
        <aside>
            <div className="d-flex flex-column flex-shrink-0" style={{ width: '75px', height: '100vh' }}>
                <ul className="side-menu nav flex-shrink-0 flex-column mb-auto text-center">
                    <li className="side-item border-bottom" id="app-icon">
                        <div className="p-3 brand-item">
                            <FontAwesomeIcon icon={faEye}/>
                        </div>
                    </li>
                    <Tab type={TabType.Chat} onSelect={onItemSelect}/>
                    <Tab type={TabType.Friend} onSelect={onItemSelect} iconStyle={{ fontSize: '1.1rem' }}/>
                    <li className="flex-placeholder"></li>
                </ul>
                <div>
                    <div className="border-top text-center mx-auto p-3" style={{ width: '75%' }}>
                        <FontAwesomeIcon icon={faUser}/>
                    </div>
                </div>
            </div>
        </aside>
    )
}

const FriendItem: React.FC<User> = (friend) => {
    const friendCtx = useContext(FriendContext)
    const setContextMenuState = useContext(GlobalPopupContext)?.setContextMenuState

    if (!friendCtx) return

    const handleDelete = () => {
        friendCtx.setFriends(friends => friends.filter(fr => fr.id !== friend.id))
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (!setContextMenuState)
            return
        e.preventDefault()
        setContextMenuState({
            isOpen: true,
            left: e.clientX,
            top: e.clientY,
            items: [
                { name: "Delete", onSelect: handleDelete },
            ],
        } as ContextMenuProps)
    }

    return (
        <li className={friend.isOnline ? "friend-item online" : "friend-item"} onContextMenu={handleContextMenu}>
            <span className="friend-name">{friend.username}</span>
            <span className="friend-status online-status-dot"></span>
            <button className="dm-icon-button" onClick={ () => friendCtx.handleDirectFriend(friend) }>
                <FontAwesomeIcon icon={faComment} className="icon"/>
            </button>
        </li>
    )
}

const FriendTab = ({ isOpen, handleDirectFriend }: { isOpen: boolean, handleDirectFriend: (friend: User) => void }) => {
    const userCtx = useContext(UserContext)
    const [friends, setFriends] = useState<User[]>([])

    useEffect(() => {
        if (isOpen && userCtx?.user) 
            fetchFriends(userCtx.user.id, setFriends)
    }, [isOpen])

    return (
        <div id="lfriend-box" className={ isOpen ? "side-tab open" : "side-tab" }>
            <div className="lfriend-header border-bottom">Friends</div>
            <div className="lfriend-content" style={{ paddingTop: '5px' }}>
                <ul id="friend-list-container">
                    <FriendContext.Provider value={{ setFriends, handleDirectFriend }}> 
                        { friends.sort((a, b) => b.isOnline ? 1 : -1).map(friend => <FriendItem key={friend.id} {...friend} />) }
                    </FriendContext.Provider>
                </ul>
            </div>
        </div>
    )
}

const Message: React.FC<Message> = ({senderId, content}) => {
    const userCtx = useContext(UserContext)
    return (
        <li className={`message${userCtx!.user!.id === senderId ? ' user-sent' : ''}`}>
          {content}
        </li>
    )
}

const ChatWindow: React.FC<ChatWindowProps> = ({isActive, userId, displayName, onClick}) => {
    const chatUserContext = useContext(ChatUserContext)
    const setContextMenuState = useContext(GlobalPopupContext)?.setContextMenuState

    const handleDelete = () => {
        chatUserContext?.setChatUsers(users => users.filter(user => user.id !== userId))
    }
    const handleContextMenu = (e: React.MouseEvent) => {
        if (!setContextMenuState)
            return
        e.preventDefault()
        setContextMenuState({
            isOpen: true,
            left: e.clientX,
            top: e.clientY,
            items: [
                { name: "Delete", onSelect: handleDelete },
            ],
        } as ContextMenuProps)
    }

    return (
        <div 
            className={isActive ? "chat-tab active" : "chat-tab"} 
            data-user-id={userId} 
            onClick={ () => onClick(userId) }
            onContextMenu={handleContextMenu}
        >
            {displayName}
        </div>
    )
}

const ChatTab = ({isOpen, chattingId, setChattingId}: {isOpen: boolean, chattingId: number, setChattingId: React.Dispatch<React.SetStateAction<number>>}) => {
    const userCtx = useContext(UserContext)
    if (!userCtx || !userCtx.user)
        window.location.href = "/login"

    const [messages, setMessages] = useState<Message[]>([])
    
    const chatUserContext = useContext(ChatUserContext)
    const msgSentRef = useRef<HTMLInputElement>(null)

    const onMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && msgSentRef.current!.value.trim() !== '') {
            postDirect(chattingId, msgSentRef.current!.value, () => {
                fetchDirects(userCtx!.user!.id, chattingId, setMessages)
                sendSocket("user:message", { 
                    senderId: userCtx!.user!.id,
                    receiverId: chattingId,
                    content: msgSentRef.current!.value
                })
                msgSentRef.current!.value = ''
            })
        }
    }

    if (!chatUserContext)
        return
    
    useEffect(() => {
        const type: MessageType = "user:message"
        socket.on(type, (data: any) => {
            if (data.senderId !== chattingId) return
            fetchDirects(userCtx!.user!.id, chattingId, setMessages)
        })
    }, [])

    useEffect(() => {
        if (isOpen && chattingId >= 0) 
            fetchDirects(userCtx!.user!.id, chattingId, setMessages)
    }, [isOpen, chattingId])

    return (
        <div id="lchat-box" className={ isOpen ? "side-tab open" : "side-tab" }>
            <div className="lchat-header">
                <span id="chat-header-user">Chat</span>
            </div>
            <div className="chat-tabs">
                { chatUserContext.chatUsers.map(usr => 
                    <ChatWindow 
                    key={usr.id} 
                    userId={usr.id} 
                    displayName={usr.username} 
                    isActive={usr.id === chattingId}
                    onClick={setChattingId}
                    />
                )}
            </div>
            <div className="lchat-content">
                <div className="lchat-msg-wrapper">
                    <ul className="msg-ctn">
                        { chatUserContext.chatUsers.find(user => user.id === chattingId) && messages.map(msg => 
                            <Message key={msg.id} {...msg}/>
                        ) }
                    </ul>
                </div>
                <input 
                    id="private-sent-input" 
                    className={ chatUserContext.chatUsers.find(user => user.id === chattingId) ? "" : "d-none" } 
                    type="text" 
                    placeholder="Type your message..." 
                    onKeyDown={onMessageKeyDown}
                    ref={msgSentRef}
                />
            </div>
        </div>
    )
}

const SideMenu = () => {
    const [menuTab, setMenuTab] = useState<TabType | null>(null)
    const [chatUsers, setChatUsers] = useState<User[]>([])
    const [chattingId, setChattingId] = useState<number>(-1)

    const toggleSelectMenuTab = (tab: TabType) => {
        menuTab == tab ? setMenuTab(null) : setMenuTab(tab)
    }

    const handleDirectFriend = (friend: User) => {
        setChatUsers([friend, ...chatUsers.filter(usr => usr.id !== friend.id)])
        setChattingId(friend.id)
        setMenuTab(TabType.Chat)
    }

    return (
        <ChatUserContext.Provider value={{ chatUsers, setChatUsers }}>
            <ChatTab isOpen={menuTab === TabType.Chat} chattingId={chattingId} setChattingId={setChattingId} />
            <FriendTab isOpen={menuTab === TabType.Friend} handleDirectFriend={handleDirectFriend} />
            <NavMenu onItemSelect={toggleSelectMenuTab} />
            <Outlet />
        </ChatUserContext.Provider>
    )
}

export default SideMenu