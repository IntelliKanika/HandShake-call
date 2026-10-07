import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/authContextValue';

function HomeComponent() {


    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [joinError, setJoinError] = useState("");


    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        const normalizedCode = meetingCode.trim();
        if (!normalizedCode) {
            setJoinError("Enter a meeting code to continue.");
            return;
        }
        setJoinError("");
        try {
            await addToUserHistory(normalizedCode)
            navigate(`/${encodeURIComponent(normalizedCode)}`)
        } catch (error) {
            setJoinError(error.response?.data?.message || "Could not join this meeting. Please try again.");
        }
    }

    return (
        <div className="meetPage">
            <header className="navBar">

                <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="brandMark">H</span>
                    <h2>HandShake</h2>
                </div>

                <div className="navActions">
                    <IconButton onClick={
                        () => {
                            navigate("/history")
                        }
                    } aria-label="Meeting history">
                        <RestoreIcon />
                    </IconButton>
                    <Button onClick={() => navigate("/history")}>History</Button>
                    <Button onClick={() => {
                        localStorage.removeItem("token")
                        navigate("/auth")
                    }} color="inherit">
                        Logout
                    </Button>
                </div>


            </header>


            <main className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h1>Join a meeting</h1>
                        <p>Enter the meeting code you received to join the call.</p>

                        <div className="joinForm">
                            <TextField onChange={e => setMeetingCode(e.target.value)} value={meetingCode} id="outlined-basic" label="Meeting code" variant="outlined" onKeyDown={e => e.key === "Enter" && handleJoinVideoCall()} />
                            <Button onClick={handleJoinVideoCall} variant='contained'>Join meeting</Button>

                        </div>
                        {joinError && <p className="authError" role="alert">{joinError}</p>}
                    </div>
                </div>
            </main>
        </div>
    )
}


export default HomeComponent