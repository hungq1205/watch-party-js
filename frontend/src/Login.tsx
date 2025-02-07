import { useRef, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import { faEye } from "@fortawesome/free-solid-svg-icons"
import "./Login.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import FormFloating from "./FormFloating"

const backendUrl = "http://localhost:3000"

const postSignup = async (data: any) => {
    try {
        const res = await fetch(`${backendUrl}/api/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })

        if (res.status === 201) {
            alert("Signed up");
            await postLogin(data)
        }
        else 
            console.error(res.statusText)
    } catch (error) {
        console.error("Error logging in:", error)
    }
}

const postLogin = async (data: any) => {
    try {
        const res = await fetch(`${backendUrl}/api/users/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })

        if (res.status === 200) {
            const json = await res.json()
            document.cookie = `token=${json.token}; path=/;`;
            window.location.href = "/lobby"
        }
        else if (res.status === 401) 
            alert("Incorrect username or password")
        else 
            console.error(res.statusText)
    } catch (error) {
        console.error("Error logging in:", error)
    }
}

const LoginForm = () => {
    const [isLogin, setIsLogin] = useState(true)
    const formData = useRef<Record<string, string>>({})

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        formData.current && (formData.current[e.target.name] = e.target.value)
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        isLogin ? postLogin(formData.current) : postSignup(formData.current)
    }

    const toggleForm = () => {
        setIsLogin(!isLogin)
    }

    return (
        <main className="form-signin m-auto vw-100 vh-100 align-content-center">
            <form onSubmit={handleSubmit}>
                <div className="stadalone-logo">
                    <FontAwesomeIcon icon={faEye} />
                </div>
                <h1 className="h3 fw-normal operation-title">
                    {isLogin ? "Please log in" : "Please sign up"}
                </h1>

                <FormFloating
                    name="username"
                    displayName="Username"
                    onChange={handleInputChange}
                />
                <FormFloating
                    type="password"
                    name="password"
                    displayName="Password"
                    onChange={handleInputChange}
                />
                {!isLogin && (
                    <FormFloating
                        name="displayName"
                        displayName="Display Name"
                        onChange={handleInputChange}
                    />
                )}

                <button className="btn btn-primary w-100 py-2" type="submit" id="submit" style={{ marginTop: '12px' }}>
                    {isLogin ? "Log in" : "Sign up"}
                </button>
                <h3 className="alter-option" onClick={toggleForm} style={{ cursor: "pointer" }}>
                    {isLogin ? "Sign up" : "Log in"}
                </h3>
            </form>
        </main>
    )
}

export default LoginForm
