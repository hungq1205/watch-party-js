import 'bootstrap/dist/css/bootstrap.min.css'
import { useState, useContext, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserGroup, faPlus } from "@fortawesome/free-solid-svg-icons"
import Cookies from 'js-cookie'

import './Lobby.css'
import { UserContext } from './UserContextNode'
import { ModalProps } from './Modal'
import { GlobalPopupContext } from './App'

const defaultPosterUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzMP_KMX-JYjb9tSoCTdzSNlC9BKI9rSBM7Q&s"

interface MovieBoxItem {
    boxId: number
    moviePosterUrl?: string
    movieTitle: string
    ownerDisplayName: string
    memberNum: number
    elapsed: number
}

const backendUrl = "http://localhost:3000"

const postCheckPassword = async (boxId: number, password: string, onDone: (val: boolean) => void) => {
    try {
        const res = await fetch(
            `${backendUrl}/api/boxes/${boxId}/checkPassword`, 
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: password })
            }
        )
        if (!res.ok)
            return console.error(await res.text())
        const data = await res.json()
        onDone(data.isCorrect)
    } catch (e) {
        console.error("Error fetching movies:", e)
    }
}

const postJoinBox = async (boxId: number) => {
    try {
        const res = await fetch(
            `${backendUrl}/api/boxes/${boxId}/users`, 
            {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${Cookies.get("token")}`
                },
            }
        )
        if (!res.ok)
            return console.error(await res.text())
    } catch (e) {
        console.error("Error fetching movies:", e)
    }
}

const postCreateBox = async (password: string) => {
    try {
        const mbres = await fetch(
            `${backendUrl}/api/msgboxes`,
            {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Cookies.get("token")}`
                }
            }
        )
        if (mbres.status !== 201)
            return console.error(await mbres.text())
        const data = await mbres.json()

        const res = await fetch(
            `${backendUrl}/api/boxes`,
            {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Cookies.get("token")}`
                },
                body: JSON.stringify({
                    password: password,
                    msgboxId: data.id
                })
            }
        )
        if (res.status !== 201)
            return console.error(await res.text())
        window.location.href = "/box"
    } catch (e) {
        console.error("Error creating box: ", e)
    }
}

const fetchBoxes = async (setBoxes: (boxes: MovieBoxItem[]) => void) => {
    try {
        const res = await fetch(`${backendUrl}/api/boxes`)
        const data = await res.json()
    
        const boxes: MovieBoxItem[] = await Promise.all(data.map(async (box: any) => {
            const owner = await fetchUser(box.owner_id)
            const movie = await fetchMovie(box.movie_id)

            return {
                boxId: box.id,
                moviePosterUrl: movie?.poster_url || defaultPosterUrl,
                movieTitle: movie?.title || "...",
                ownerDisplayName: owner.displayName,
                memberNum: box.users.length,
                elapsed: box.elapsed
            }
        }))
        setBoxes(boxes)
    } catch (e) {
        console.error("Error fetching movies:", e)
    }
}

const fetchMovie = async (id: number) => {
    try {
        const res = await fetch(`${backendUrl}/api/movies/${id}`)
        return await res.json()
    } catch (e){
        console.error("Error fetching movie:", e);
    }
}

const fetchUser = async (id: number) => {
    try {
        const res = await fetch(`${backendUrl}/api/users/${id}`)
        return await res.json()
    } catch (e){
        console.error("Error fetching user:", e);
    }
}

const Lobby = () => {
    const userCtx = useContext(UserContext)
    if (!userCtx || !userCtx.user)
        window.location.href = "/login"
    if (userCtx!.isInBox)
        window.location.href = "/box"

    const [boxes, setBoxes] = useState<MovieBoxItem[]>([])

    useEffect(() => {
        fetchBoxes(setBoxes)
    }, [])

    return (
        <div className="container">
            <Header />
            <BoxContainer boxes={boxes}/>
        </div>
    )
}

const Header = () => {
    const setModalState = useContext(GlobalPopupContext)?.setModalState
    const handleNewBox = () => {
        if (!setModalState)
            return
        setModalState({
            isOpen: true,
            title: "Create Box:",
            fields: ["Password"],
            onSubmit: (evt, data) => {
                evt.preventDefault()
                postCreateBox(data["Password"])
                setModalState({ isOpen: false } as ModalProps)
            },
        } as ModalProps)
    }

    return (
        <div className="header">
            <h1>Movie Box</h1>
            <button className="new-box-button" onClick={ handleNewBox }>
                <FontAwesomeIcon icon={faPlus} />&nbsp;New Box
            </button>
        </div>
    )
}

const BoxContainer = ({ boxes }: { boxes: MovieBoxItem[] }) => {
    return (
        <div className="grid" id="box-container">
            { boxes.map(box => <MovieItem key={box.boxId} {...box} />) }
        </div>
    )
}

const MovieItem: React.FC<MovieBoxItem> = (props) => {
    const posterUrl = props.moviePosterUrl
    const progressWidth = props.elapsed ? (props.elapsed / (2 * 60 * 60)) * 100 : 0

    const setModalState = useContext(GlobalPopupContext)?.setModalState
    const handleMovieItemJoin = () => {
        if (!setModalState)
            return
        setModalState({
            isOpen: true,
            title: "Join Box:",
            fields: ["Password"],
            onSubmit: (evt, data) => {
                evt.preventDefault()
                postCheckPassword(props.boxId, data.Password, async (val: boolean) => {
                    if (!val) 
                        alert("Incorrect password for box #" + props.boxId)
                    await postJoinBox(props.boxId)
                    window.location.href = "/box"
                })
                setModalState({ isOpen: false } as ModalProps)
            },
        } as ModalProps)
    }

    return (
        <div className="movie-box" data-id={props.boxId} onClick={handleMovieItemJoin}>
            <img src={posterUrl} alt={props.movieTitle} className="poster" />
            <div className="info">
                <h3 className="title">{props.movieTitle}</h3>
                <p className="username">Owner: {props.ownerDisplayName}</p>
                <p className="members">
                    <FontAwesomeIcon icon={faUserGroup}/> {props.memberNum}
                </p>
                <div className="progress-bar">
                    <div className="progress" style={{ width: `${progressWidth}%` }}></div>
                </div>
            </div>
        </div>
    )
}

export default Lobby