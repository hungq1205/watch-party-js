import 'bootstrap/dist/css/bootstrap.min.css'
import 'video.js/dist/video-js.css'
import videojs from 'video.js'
import Cookies from 'js-cookie'
import { useState, useRef, useEffect, Fragment, useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExpand, faUser, faRightFromBracket, faPowerOff, faComment, faUserGroup, IconDefinition, faTurnUp, faCrown, faXmark } from "@fortawesome/free-solid-svg-icons"
import { UserContext, User, sendSocket, socket, MessageType } from './UserContextNode'
import './MovieBox.css'
import Player from 'video.js/dist/types/player'
import { GlobalPopupContext } from './App'
import { ContextMenuProps } from './ContextMenu'

const backendUrl = "http://localhost:3000"

interface PlaybackInfo {
    elapsed: number,
    isPaused: boolean
}

interface Box {
    id: number,
    ownerId: number,
    msgBoxId: number,
    movie: Movie | null
}

interface Movie {
    id: number
    title: string
    posterUrl: string
    url: string
}

interface Message {
    id: number
    content: string
    senderId: number
    senderName: string
}

const patchBox = async (boxId: number, data: any) => {
    try {
        const res = await fetch(
            `${backendUrl}/api/boxes/${boxId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            }
        )
        if (!res.ok)
            return console.error(await res.text())
    } catch (e) {
        console.error("Error fetching movie:", e)
    }
}

const postLeaveBox = async (boxId: number, userId: number) => {
    try {
        const res = await fetch(
            `${backendUrl}/api/boxes/${boxId}/users`,
            {
                method: "DELETE",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Cookies.get("token")}`            
                },
                body: JSON.stringify({ userId: userId })
            }
        )
        if (!res.ok) {
            console.error("Error leaving box: ", await res.text())
            window.location.href = "/box"
        }
    } catch (e) {
        console.error("Error leaving box: ", e)
        window.location.href = "/box"
    }
}

const postMessage = async (msgBoxId: number, senderId: number, content: string) => {
    try {
        const res = await fetch(
            `${backendUrl}/api/msgboxes/${msgBoxId}/messages`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: senderId,
                    content: content
                })
            }
        )
        if (!res.ok) {
            console.error(await res.text())
            return null
        }
        const data = await res.json()

        const users = await fetchUsers([data.user_id])
        if (users.length === 0) {
            console.error(`User of id ${data.user_id} does not exist`)
            return null
        }

        return {
            id: data.id,
            content: data.content,
            senderId: data.user_id,
            senderName: users[0].displayName
        } as Message
    } catch (e) {
        console.error("Error posting message to box: ", e)
    }
    return null
}

const fetchBoxMessages = async (setMessages: (msgs: Message[]) => void, msgboxId: number) => {
    try {
        const res = await fetch(`${backendUrl}/api/msgboxes/${msgboxId}/messages`)
        if (!res.ok) {
            console.error(await res.text())
            setMessages([])
        }
        
        const data = await res.json()
        const userIds = [...new Set<number>(data.map((msg: any) => msg.user_id))]
        const userDict: { [key: number]: string } = {}
        const users = await fetchUsers(userIds)
        users.forEach(user => userDict[user.id] = user.displayName)

        const msgs = data.map((msg: any) => {
            return {
                id: msg.id,
                content: msg.content,
                senderId: msg.user_id,
                senderName: userDict[msg.user_id]
            } as Message
        })
        setMessages(msgs)
    } catch (e) {
        console.error("Error fetching messages in box: ", e)
    }
}

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

const fetchMovie = async (movieId: number | null) => {
    try {
        if (movieId === null)
            return null
    
        const res = await fetch(`${backendUrl}/api/movies/${movieId}`)
        if (!res.ok) {
            console.error(await res.text())
            return null
        }
        const data = await res.json()
    
        return {
            id: data.id,
            title: data.title,
            posterUrl: data.poster_url,
            url: data.url
        }
    } catch (e) {
        console.error("Error fetching movie:", e)
    }
    return null
}

const fetchBox = async (setBox: React.Dispatch<React.SetStateAction<Box | null>>, userId: number) => {
    try {
        const data = await fetchBoxOfUser(userId)
        if (!data) return 

        if (data.movie_id === null || data.movie_id < 0) {
            setBox({
                id: data.id,
                ownerId: data.owner_id,
                msgBoxId: data.msg_box_id,
                movie: null
            })
            return
        }

        setBox({
            id: data.id,
            ownerId: data.owner_id,
            msgBoxId: data.msg_box_id,
            movie: await fetchMovie(data.movie_id)
        })
    } catch (error) {
        console.error("Error fetching box:", error)
    }
}

const fetchMembers = async (setMembers: React.Dispatch<React.SetStateAction<User[]>>, boxId: number, userId: number) => {
    try {
        const res = await fetch(`${backendUrl}/api/boxes/${boxId}`)
        if (!res.ok)
            return console.error(await res.text())

        const data = await res.json()
        if (!data || data.users.every((usr: number) => usr !== userId))
            window.location.href = "/lobby"

        setMembers(await fetchUsers(data.users))
    } catch (error) {
        console.error("Error fetching movie:", error)
    }
}

const fetchUsers = async (ids: number[]) => {
    try {
        const res = await fetch(`${backendUrl}/api/users?ids=${ids.join(',')}`)
        if (!res.ok) {
            console.error(await res.text())
            return []
        }

        const data = await res.json()
        const users: User[] = data.map((usr: any) => {
            return {
                id: usr._id,
                username: usr.username,
                displayName: usr.displayName,
                isOnline: usr.isOnline
            }
        })
        return users
    } catch (error) {
        console.error("Error fetching movie:", error)
    }

    return []
}

const fetchMovies = async (setMovies: React.Dispatch<React.SetStateAction<Movie[]>>, query: string | null = null) => {
    try {
        let url = `${backendUrl}/api/movies`
        if (query)
            url = `${url}?query=${query}`

        const res = await fetch(url)
        if (!res.ok)
            return console.error(await res.text())

        const data = await res.json()
        const movies: Movie[] = data.map((movie: any) => ({
            id: movie.id,
            title: movie.title,
            posterUrl: movie.poster_url,
            url: movie.url,
        }))

        setMovies(movies)
    } catch (error) {
        console.error("Error fetching movies:", error)
    }
}

const MovieSearch = ({ movies, visible, setQuery, onMovieSelect }: { movies: Movie[], visible: boolean, setQuery: React.Dispatch<React.SetStateAction<string>>, onMovieSelect: (id: number) => void }) => {
    const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        clearTimeout((window as any).queryTimeout);
        (window as any).queryTimeout = setTimeout(() => setQuery(value), 500)
    }

    return (
        <div className="movie-search">
            {
                visible &&
                <>
                    <input
                        id="movie-query-input"
                        type="text"
                        placeholder="Search movie..."
                        style={{ caretColor: 'black' }}
                        onChange={ onQueryChange }
                    />
                    <div id="movie-grid">
                        { movies.map((movie) => 
                            <MovieItem key={movie.id} title={movie.title} posterUrl={movie.posterUrl} onClick={ () => onMovieSelect(movie.id) } /> )}
                    </div>
                </>
            }
        </div>
    )
}

const MediaContainer = ({ src, playbackInfo, control, playerRef }: { src: string, playbackInfo: PlaybackInfo, control: boolean, playerRef: React.MutableRefObject<Player | null> }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (!playerRef.current && videoRef.current) {
            playerRef.current = videojs(videoRef.current, {
                controls: control,
                autoplay: true,
                preload: 'auto'
            })
            playerRef.current.src({ type: 'application/x-mpegURL', src })
        }
    }, [src])

    useEffect(() => {
        if (!playerRef.current || !src) 
            return
        playerRef.current.currentTime(playbackInfo.elapsed)
        playbackInfo.isPaused ? playerRef.current.pause() : playerRef.current.play()
    }, [playbackInfo, src])

    return (  
        <div className="media-container">
          <div className="d-flex flex-column justify-content-center h-100 w-100">
            <video ref={videoRef} className="video-js" src={src} ></video>
          </div>
        </div>
    )
}

const PlayerMenu = ({ onNewMovieClick, isOwner, movieTitle }: { onNewMovieClick: () => void, isOwner: boolean, movieTitle: string }) => {
    return (
        <ul className="player-menu">
          <li id="movie-title">{ movieTitle }</li>
          <li className="flex-placeholder"></li>
          { isOwner && 
            <li id="new-movie" className="btn btn-primary" onClick={onNewMovieClick}>
                <div>New movie</div>
            </li>}
          <li id="expand">
            <FontAwesomeIcon icon={faExpand} />
          </li>
        </ul>
    )
}

const BoxInfo = ({ memberNum, boxName, boxId, isOwner, handleLeave }: {memberNum: number, boxName: string, boxId: number, isOwner: boolean, handleLeave: () => void}) => {
    return (  
        <div className="header">
            <div className="desc">
                <div className="media-box-desc">
                    <div id="media-box-name">{boxName}</div>
                    <div id="box-id">#{boxId}</div>
                </div>
                <div className="media-participant-count">
                    <FontAwesomeIcon icon={ faUser } />
                    <div id="participant-value">{memberNum}</div>
                </div>
            </div>
            { isOwner ? 
                ( <div id="power-off" onClick={handleLeave}>
                    <FontAwesomeIcon icon={ faPowerOff } />
                </div> )
                :
                ( <div id="leave" onClick={handleLeave}>
                    <FontAwesomeIcon icon={ faRightFromBracket } />
                </div> )
            }
        </div>
    )
}

const MessageTabContent = ({ isActive, userId, messages, handleSendMessage } : { isActive: boolean, userId: number, messages: Message[], handleSendMessage: (content: string) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const handleSendMsgOfInput = () => {
        handleSendMessage(inputRef.current?.value || '')
        inputRef.current!.value = ''
    }

    let prevSenderId = -1
    const displayMessages = messages.map(msg => {
        if (prevSenderId !== msg.senderId || prevSenderId === -1)
            prevSenderId = msg.senderId
        else
            msg.senderName = ""
        return msg
    })
    return (
        <li className={`tab-content${isActive ? " active" : ""} message-tab-content`}>
            <div>
                <ul className="message-box tab-list">
                    {displayMessages.map((msg) => (
                        <Fragment key={msg.id}>
                            { msg.senderName && 
                                <MessageSender senderName={msg.senderName} isUserSent={msg.senderId === userId} /> }  
                            <Message content={msg.content} isUserSent={msg.senderId === userId} />
                        </Fragment>
                    ))}
                </ul>
                <div className="message-input">
                    <input
                        ref = {inputRef}
                        name="input-text"
                        autoComplete="off"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMsgOfInput()}
                    />
                    <FontAwesomeIcon icon={ faTurnUp } onClick={handleSendMsgOfInput} />
                </div>
            </div>
        </li>
    )
}

const MemberTabContent = ({ isActive, members, boxOwnerId, handleKick } : {  isActive: boolean, members: User[], boxOwnerId: number, handleKick: (userId: number) => void }) => {
    return (
        <li className={`tab-content${isActive ? " active" : ""} member-tab-content`}>
            <div>
                <ul className="member-box auth tab-list">
                    {members.map((member) => (
                        <Member key={member.id} userId={member.id} name={member.username} isOwner={member.id === boxOwnerId} handleKick={handleKick} />
                    ))}
                </ul>
            </div>
        </li>
    )
}

const Tab = ({ tabClass, icon, isActive, onSelect }: { tabClass: string, icon: IconDefinition, isActive: boolean, onSelect: () => void }) => {
    return (
        <li className={`tab${isActive ? " active" : ""} ${tabClass}`} onClick={ onSelect }>
            <FontAwesomeIcon icon={icon} />
        </li>
    )
}

const Message = ({ content, isUserSent }: { content: string, isUserSent: boolean }) => {
    return (
        <li className={ isUserSent ? "message user-sent" : "message" }>{content}</li>
    )
}

const MessageSender = ({ senderName, isUserSent }: { senderName: string, isUserSent: boolean }) => {
    return (
        <li className={ isUserSent ? "sender user-sent" : "sender" }>{senderName}</li>
    )
}

const Member = ({ userId, name, isOwner, handleKick }: { userId: number, name: string, isOwner: boolean, handleKick: (userId: number) => void }) => {
    const setContextMenuState = useContext(GlobalPopupContext)?.setContextMenuState

    const handleAddFriend = () => {
        fetch(
            `${backendUrl}/api/users/friends`,
            {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Cookies.get("token")}`
                },
                body: JSON.stringify({
                    receiverId: userId
                })
            }
        ).then(res => {
            if (res.status !== 201)
                res.text().then(text => console.error("Error sending friend request: ", text))
        }).catch(e => 
            console.error("Error sending friend request: ", e)
        )
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
                { name: "Add friend", onSelect: handleAddFriend },
            ],
        } as ContextMenuProps)
    }

    return (
        <li className={ isOwner ? "member-item owner" : "member-item" } data-user-id={userId} onContextMenu={handleContextMenu}>
            <div className="icon">
                <FontAwesomeIcon icon={faUser} />
            </div>
            <div className="title">{name}</div>
            {
                isOwner ? 
                    <FontAwesomeIcon className="after" icon={faCrown} /> :
                    <FontAwesomeIcon className="after" icon={faXmark} onClick={ () => handleKick(userId) }/>
            }
        </li>
    )
}

const MovieItem = ({ title, posterUrl, onClick }: { title: string, posterUrl: string, onClick: () => void }) => {
    return (
        <div className="movie-item" onClick={onClick}>
            <img src={posterUrl} />
            <h3 className="movie-title">{title}</h3>
        </div>
    )
}

const MovieBox = () => {
    const userCtx = useContext(UserContext)
    if (!userCtx || !userCtx.user)
        window.location.href = "/login"
    if (!userCtx!.isInBox)
        window.location.href = "/lobby"
    const user = userCtx!.user!
    
    const [query, setQuery] = useState("")
    const [isChatTabActive, setChatTabActive] = useState(false)
    const [movies, setMovies] = useState<Movie[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [members, setMembers] = useState<User[]>([])
    const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo>({ elapsed: 0, isPaused: true })
    const [box, setBox] = useState<Box | null>(null)
    
    const playerRef = useRef<Player | null>(null)
    const boxFirstFound = useRef<boolean>(true)

    let pbUpdateInterval: NodeJS.Timeout | null = null;
    
    useEffect(() => {
        fetchBox(setBox, user.id)
    
        return () => {
            if (pbUpdateInterval)
                clearInterval(pbUpdateInterval)
        }
    }, [])

    useEffect(() => {
        if (!box) {
            return
        } else if (boxFirstFound.current) {
            boxFirstFound.current = false
            handleBoxFirstFound()
            isChatTabActive ? 
                fetchBoxMessages(setMessages, box.msgBoxId) :
                fetchMembers(setMembers, box.id, user!.id)
                
            if (user!.id === box.ownerId) {
                pbUpdateInterval = setInterval(() => {
                    if (!box.movie) return
                    setPlaybackInfo({
                        elapsed: playerRef.current!.currentTime() ?? 0,
                        isPaused: playerRef.current!.paused()
                    })
                    sendSocket("box:playbackUpdate", {
                        elapsed: playerRef.current!.currentTime() ?? 0,
                        isPaused: playerRef.current!.readyState() > 1 ? playerRef.current!.paused() : true
                    })
                }, 1500)
            }
        } else {
            sendMovieDataToSocket()
        }
    }, [box])

    useEffect(() => {
        fetchMovies(setMovies, query)
    }, [query])

    useEffect(() => {
        if (!box) return
        isChatTabActive ? 
            fetchBoxMessages(setMessages, box.msgBoxId) :
            fetchMembers(setMembers, box.id, user!.id)
    }, [boxFirstFound, isChatTabActive])

    if (!box) 
        return

    const handleBoxFirstFound = () => {
        sendSocket("enterRoom", box!.id)
        sendSocket("box:memberUpdate", { boxId: box.id })

        const type_memUpdate: MessageType = "box:memberUpdate"
        socket.on(type_memUpdate, (data: any) => {
            if (data.senderId === user!.id)
                return
            fetchMembers(setMembers, box!.id, user!.id)
        })

        const type_msgUpdate: MessageType = "box:message"
        socket.on(type_msgUpdate, (data: any) => {
            if (data.senderId === user!.id)
                return
            fetchBoxMessages(setMessages, box!.msgBoxId)
        })

        const type_mvUpdate: MessageType = "box:movieUpdate"
        socket.on(type_mvUpdate, async (data: any) => {
            console.log("movie")
            if (data.senderId === user!.id)
                return

            if (data.movieId !== box.movie?.id) {
                const movie = await fetchMovie(data.movieId)
                setBox(pbox => ({
                    ...pbox,
                    movie: movie
                } as Box))
            }
        })

        const type_pbUpdate: MessageType = "box:playbackUpdate"
        socket.on(type_pbUpdate, async (data: any) => {
            console.log("pb")
            if (data.senderId === user!.id)
                return

            setPlaybackInfo({
                elapsed: data.elapsed,
                isPaused: data.isPaused
            })
        })
    }

    const sendMovieDataToSocket = () => {
        sendSocket("box:movieUpdate", {
            movieId: box.movie ? box.movie.id : null
        })
    }

    const handleSendMessage = async (content: string) => {
        const msg = await postMessage(box.msgBoxId, user!.id, content)
        if (msg) {
            setMessages([...messages, msg])
            sendSocket("box:message", {
                senderId: user!.id,
                content: content,
                boxId: box.id
            })
        }
    }

    const handleLeaveBox = async () => {
        await postLeaveBox(box.id, user!.id)
        sendSocket("box:memberUpdate", { boxId: box.id })
        window.location.href = "/lobby"
    }

    const handleKick = async (userId: number) => {
        await postLeaveBox(box.id, userId)
        sendSocket("box:memberUpdate", { boxId: box.id })
    }

    const patchMovie = async (movieId: number) => {
        await patchBox(box.id, { 
            movieId: movieId, 
            elapsed: 0, 
            isPaused: playbackInfo.isPaused 
        })
        await fetchBox(setBox, user!.id)
    }

    return (
        <main className="d-flex vw-100 vh-100 overflow-hidden" style={{ paddingLeft: "75px" }} >
            <div className="player-container">
                { box.movie ?
                    <MediaContainer src={box.movie.url} playbackInfo={playbackInfo} control={ true } playerRef={playerRef} /> :
                    <MovieSearch movies={movies} visible={ box.ownerId === user!.id } setQuery={setQuery} onMovieSelect={patchMovie} />
                }
                <PlayerMenu 
                    onNewMovieClick={ () => patchMovie(-1) } 
                    isOwner={ box.ownerId === user!.id } 
                    movieTitle={ box.movie ? box.movie.title : "Movie title" } 
                />
            </div>
            
            <div className="chat-box">
                <BoxInfo boxName="Movie Box" boxId={box.id} memberNum={members.length} isOwner={ box.ownerId === user!.id } handleLeave={handleLeaveBox} />
                <ul className="tabcontainer">
                    <MessageTabContent key="messages" messages={messages} userId={user!.id} handleSendMessage={handleSendMessage} isActive={isChatTabActive} />
                    <MemberTabContent key="members" members={members} isActive={!isChatTabActive} boxOwnerId={box.ownerId} handleKick={handleKick} />
                </ul>   
                <ul className="tabs">
                    <Tab key="chat-tab" tabClass="chat-tab" icon={faComment} isActive={isChatTabActive} onSelect={ () => setChatTabActive(true) } />
                    <Tab key="member-tab" tabClass="member-tab" icon={faUserGroup} isActive={!isChatTabActive} onSelect={ () => setChatTabActive(false) } />
                </ul>
            </div>
        </main>
    )
}

export default MovieBox
