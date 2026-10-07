import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/authContextValue'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';

import { IconButton, CircularProgress } from '@mui/material';
export default function History() {


    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")


    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (requestError) {
                setError(requestError.response?.data?.message || "Could not load your meeting history.");
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [getHistoryOfUser])

    let formatDate = (dateString) => {

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();

        return `${day}/${month}/${year}`

    }

    return (
        <main className="historyPage">
            <header className="historyHeader">
                <IconButton onClick={() => routeTo("/home")} aria-label="Back to home">
                    <HomeIcon />
                </IconButton>
                <h1>Meeting history</h1>
            </header>
            <section className="historyContent">
                {loading ? (
                    <div className="historyEmpty"><CircularProgress size={28} aria-label="Loading meeting history" /></div>
                ) : error ? (
                    <div className="historyError" role="alert">{error}</div>
                ) : meetings.length ? meetings.map((meeting, index) => (
                    <Card key={`${meeting.meetingCode}-${meeting.date}-${index}`} variant="outlined" className="historyCard">
                        <CardContent>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }} gutterBottom>
                                MEETING CODE
                            </Typography>
                            <Typography sx={{ mb: 1, fontSize: 18, fontWeight: 650, color: 'text.primary' }}>
                                {meeting.meetingCode}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary' }}>
                                {formatDate(meeting.date)}
                            </Typography>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="historyEmpty">
                        <strong>No meetings yet</strong>
                        Your recent calls will appear here.
                    </div>
                )}
            </section>
        </main>
    )
}