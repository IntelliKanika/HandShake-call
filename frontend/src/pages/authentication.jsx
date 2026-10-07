import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/authContextValue';
import { Snackbar } from '@mui/material';



const defaultTheme = createTheme({
    palette: {
        primary: { main: "#4b5db5" }
    }
});

export default function Authentication() {

    

    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [loading, setLoading] = React.useState(false);


    const [formState, setFormState] = React.useState(0);

    const [open, setOpen] = React.useState(false)


    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async () => {
        setError("");
        setLoading(true);
        try {
            if (formState === 0) {
                await handleLogin(username, password)
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setFormState(0)
                setPassword("")
            }
        } catch (err) {
            setError(err.response?.data?.message || "We couldn't complete that request. Please try again.");
        } finally {
            setLoading(false);
        }
    }


    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" className="authPage" sx={{ minHeight: '100vh' }}>
                <CssBaseline />
                <Grid
                    size={{ sm: 4, md: 7 }}
                    className="authBrandPanel"
                    sx={{ display: { xs: 'none', sm: 'flex' } }}
                >
                    <div className="navHeader">
                        <span className="brandMark">H</span>
                        <strong>HandShake</strong>
                    </div>
                    <div>
                        <h1>Video calls for everyday conversations.</h1>
                        <p>Sign in to start or join a HandShake call.</p>
                    </div>
                </Grid>
                <Grid size={{ xs: 12, sm: 8, md: 5 }} component={Paper} elevation={0} square className="authFormPanel">
                    <div className="authForm">
                        <Avatar sx={{ bgcolor: 'rgba(78, 99, 232, 0.1)', color: 'primary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>
                        <h2>{formState === 0 ? "Sign in" : "Create account"}</h2>
                        <p className="authIntro">{formState === 0 ? "Use your HandShake account to continue." : "Enter your details to create an account."}</p>


                        <div>
                            <Button variant={formState === 0 ? "contained" : "text"} onClick={() => { setFormState(0); setError(""); }}>
                                Sign In
                            </Button>
                            <Button variant={formState === 1 ? "contained" : "text"} onClick={() => { setFormState(1); setError(""); }}>
                                Sign Up
                            </Button>
                        </div>

                        <Box component="form" noValidate sx={{ mt: 1 }} onSubmit={(event) => { event.preventDefault(); handleAuth(); }}>
                            {formState === 1 ? <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="full-name"
                                label="Full Name"
                                name="name"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                            /> : <></>}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                value={username}
                                autoComplete="username"
                                autoFocus={formState === 0}
                                onChange={(e) => setUsername(e.target.value)}

                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                value={password}
                                type="password"
                                autoComplete={formState === 0 ? "current-password" : "new-password"}
                                onChange={(e) => setPassword(e.target.value)}

                                id="password"
                            />

                            {error && <p className="authError" role="alert">{error}</p>}

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                disabled={loading}
                            >
                                {loading ? "Please wait..." : formState === 0 ? "Sign in" : "Create account"}
                            </Button>

                        </Box>
                    </div>
                </Grid>
            </Grid>

            <Snackbar

                open={open}
                autoHideDuration={4000}
                message={message}
            />

        </ThemeProvider>
    );
}