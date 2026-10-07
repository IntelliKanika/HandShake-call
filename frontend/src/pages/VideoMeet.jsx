import { useCallback, useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();
    const peerConnectionsRef = useRef({});

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState();
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([])
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    let [videos, setVideos] = useState([])
    let [mediaError, setMediaError] = useState("")
    let [callStatus, setCallStatus] = useState("Waiting for others to join")
    const permissionRequestRef = useRef(null)

    let addLocalTracks = (peerConnection, stream) => {
        if (!stream) return;
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    }

    let setRemoteStream = (socketListId, stream) => {
        setVideos((previousVideos) => {
            const existingVideo = previousVideos.find((video) => video.socketId === socketListId);
            if (existingVideo) {
                return previousVideos.map((video) =>
                    video.socketId === socketListId ? { ...video, stream } : video
                );
            }

            const nextVideo = {
                socketId: socketListId,
                stream
            };

            return [...previousVideos, nextVideo];
        });
    }

    let createPeerConnection = (socketListId) => {
        if (peerConnectionsRef.current[socketListId]) {
            return peerConnectionsRef.current[socketListId];
        }

        const peerConnection = new RTCPeerConnection(peerConfigConnections);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate != null) {
                socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }))
            }
        }

        peerConnection.ontrack = (event) => {
            const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
            setRemoteStream(socketListId, stream);
        }

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'connected') {
                setCallStatus("Connected");
            } else if (peerConnection.connectionState === 'failed') {
                setCallStatus("Connection failed. Check your network and try again.");
            } else if (peerConnection.connectionState === 'connecting') {
                setCallStatus("Connecting…");
            }
        }

        peerConnection.oniceconnectionstatechange = () => {
            if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
                setCallStatus("Connected");
            } else if (peerConnection.iceConnectionState === 'checking') {
                setCallStatus("Connecting…");
            } else if (peerConnection.iceConnectionState === 'disconnected') {
                setCallStatus("Reconnecting…");
            } else if (peerConnection.iceConnectionState === 'failed') {
                setCallStatus("Connection failed. Check your network and try again.");
            }
        }

        peerConnection.onsignalingstatechange = () => {
            if (peerConnection.signalingState === 'closed') {
                setCallStatus("Call ended");
            }
        }

        if (window.localStream) {
            addLocalTracks(peerConnection, window.localStream)
        }

        peerConnectionsRef.current[socketListId] = peerConnection;
        return peerConnection;
    }

    let createOfferForPeer = (socketListId) => {
        const peerConnection = createPeerConnection(socketListId);
        peerConnection.createOffer()
            .then((description) => peerConnection.setLocalDescription(description))
            .then(() => {
                socketRef.current.emit('signal', socketListId, JSON.stringify({ sdp: peerConnection.localDescription }))
            })
            .catch((error) => {
                console.error("[WEBRTC] Failed to create offer", socketListId, error)
            })
    }

    const getPermissions = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setMediaError("This browser does not support camera or microphone access.");
            console.error("[MEDIA] Browser does not support getUserMedia");
            setVideoAvailable(false);
            setAudioAvailable(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }

            setVideoAvailable(true);
            setAudioAvailable(true);
            setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));
            setMediaError("");
        } catch (error) {
            if (error && error.name === 'NotAllowedError') {
                setMediaError("Camera or microphone permission was denied. Allow access in your browser settings and try again.");
                console.error("[MEDIA] Camera or microphone permission denied");
            } else if (error && error.name === 'NotFoundError') {
                setMediaError("No camera or microphone was found on this device.");
                console.error("[MEDIA] Camera or microphone unavailable");
            } else {
                setMediaError("Unable to access your camera or microphone. Check device settings and try again.");
                console.error("[MEDIA] Unable to access media devices", error);
            }

            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    }, []);

    let getUserMedia = () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setMediaError("This browser does not support camera or microphone access.");
            console.error("[MEDIA] Browser does not support getUserMedia")
            return;
        }

        const mediaOptions = {
            video: videoAvailable && video,
            audio: audioAvailable && audio
        };

        if (!mediaOptions.video && !mediaOptions.audio) {
            setMediaError("Enable your camera or microphone before joining.");
            return;
        }

        navigator.mediaDevices.getUserMedia(mediaOptions)
            .then((stream) => {
                setMediaError("");
                if (!window.localStream) {
                    window.localStream = stream;
                } else {
                    window.localStream.getTracks().forEach(track => track.stop())
                    window.localStream = stream;
                }

                if (localVideoref.current) {
                    localVideoref.current.srcObject = stream;
                }

                Object.keys(peerConnectionsRef.current).forEach((peerId) => {
                    const peerConnection = peerConnectionsRef.current[peerId];
                    const existingTracks = peerConnection.getSenders().map((sender) => sender.track);
                    stream.getTracks().forEach((track) => {
                        if (!existingTracks.includes(track)) {
                            peerConnection.addTrack(track, stream);
                        }
                    });
                })
            })
            .catch((e) => {
                setMediaError(e.name === 'NotAllowedError'
                    ? "Camera or microphone permission was denied."
                    : "Unable to start your camera or microphone.");
                console.error("[MEDIA] Unable to acquire media stream", e)
            })
    }

    let getDisplayMediaSuccess = useCallback((stream) => {
        if (window.localStream) {
            window.localStream.getTracks().forEach(track => track.stop())
        }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        Object.keys(peerConnectionsRef.current).forEach((peerId) => {
            const peerConnection = peerConnectionsRef.current[peerId];
            stream.getTracks().forEach((track) => {
                if (!peerConnection.getSenders().some((sender) => sender.track === track)) {
                    peerConnection.addTrack(track, stream);
                }
            });
        });
    }, [])

    const getDisplayMedia = useCallback(() => {
        if (screen && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDisplayMediaSuccess)
                .catch((error) => console.error("[MEDIA] Display media error", error))
        }
    }, [screen, getDisplayMediaSuccess])

    let gotMessageFromServer = (fromId, message) => {
        const signal = typeof message === 'string' ? JSON.parse(message) : message;

        if (!fromId || fromId === socketIdRef.current) {
            return;
        }

        const peerConnection = createPeerConnection(fromId);

        if (signal && signal.sdp) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                if (signal.sdp.type === 'offer') {
                    return peerConnection.createAnswer();
                }
                return null;
            }).then((description) => {
                if (!description) return;
                return peerConnection.setLocalDescription(description).then(() => {
                    socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: peerConnection.localDescription }))
                })
            }).catch((error) => {
                console.error("[WEBRTC] SDP handling failed", error)
            })
        }

        if (signal && signal.ice) {
            peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((error) => {
                console.error("[WEBRTC] ICE candidate failed", error)
            })
        }
    }

    let connectToSocketServer = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        socketRef.current = io(server_url)

        socketRef.current.on('signal', gotMessageFromServer)
        socketRef.current.on('connect_error', () => {
            setCallStatus("Call server unavailable. Check your connection.");
        })
        socketRef.current.on('disconnect', () => {
            setCallStatus("Call server disconnected.");
        })

        socketRef.current.on('connect', () => {
            setCallStatus("Waiting for others to join");
            socketIdRef.current = socketRef.current.id
            socketRef.current.emit('join-call', { path: window.location.href, userId: username || socketIdRef.current })

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                if (peerConnectionsRef.current[id]) {
                    peerConnectionsRef.current[id].close();
                    delete peerConnectionsRef.current[id];
                }
                setVideos((previousVideos) => previousVideos.filter((video) => video.socketId !== id))
                setCallStatus("Waiting for others to join");
            })

            socketRef.current.on('user-joined', (id, clients) => {
                if (clients.some((clientId) => clientId !== socketIdRef.current)) {
                    setCallStatus("Connecting…");
                }
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    createPeerConnection(socketListId);
                })

                if (id === socketIdRef.current) {
                    Object.keys(peerConnectionsRef.current).forEach((socketListId) => {
                        if (socketListId !== socketIdRef.current) {
                            createOfferForPeer(socketListId);
                        }
                    })
                }
            })
        })
    }

    let handleVideo = () => {
        setVideo(!video);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            })
        }
    }
    let handleAudio = () => {
        setAudio(!audio)
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            })
        }
    }

    useEffect(() => {
        if (!permissionRequestRef.current) {
            permissionRequestRef.current = Promise.resolve().then(getPermissions);
        }
    }, [getPermissions])

    useEffect(() => {
        if (screen) {
            getDisplayMedia();
        }
    }, [screen, getDisplayMedia])
    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        if (localVideoref.current && localVideoref.current.srcObject) {
            localVideoref.current.srcObject.getTracks().forEach(track => track.stop())
        }
        Object.keys(peerConnectionsRef.current).forEach((peerId) => {
            peerConnectionsRef.current[peerId].close();
        });
        peerConnectionsRef.current = {};
        window.location.href = "/"
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        if (!message.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', message, username)
        setMessage("");
    }

    let connect = () => {
        if (!username.trim()) {
            setMediaError("Enter your name to join the meeting.");
            return;
        }
        setAskForUsername(false);
        setCallStatus("Waiting for others to join");
        getMedia();
    }

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        getUserMedia();
        connectToSocketServer();
    }

    return (
        <div>

            {askForUsername === true ?

                <div>
                    <div className={styles.lobby}>
                        <div className={styles.lobbyCard}>
                            <span className={styles.brandMark}>H</span>
                            <p className={styles.eyebrow}>HandShake meeting</p>
                            <h1>Join meeting</h1>
                            <p className={styles.muted}>Enter the name other people will see.</p>
                            <TextField id="outlined-basic" label="Your name" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" fullWidth onKeyDown={e => e.key === "Enter" && connect()} />
                            {mediaError && <p className={styles.mediaError} role="alert">{mediaError}</p>}
                            <Button variant="contained" onClick={connect} fullWidth>Join meeting</Button>
                            <video className={styles.lobbyPreview} ref={localVideoref} autoPlay muted playsInline></video>
                            <p className={styles.muted}>Camera preview</p>
                        </div>
                    </div>
                </div> :


                <div className={styles.meetVideoContainer}>

                    {showModal ? <aside className={styles.chatRoom}>

                        <div className={styles.chatContainer}>
                            <div className={styles.chatHeader}>
                                <div>
                                            <h1>Chat</h1>
                                </div>
                                <IconButton onClick={() => setModal(false)} aria-label="Close chat">×</IconButton>
                            </div>

                            <div className={styles.chattingDisplay}>

                                {messages.length !== 0 ? messages.map((item, index) => {

                                    return (
                                        <div className={styles.chatMessage} key={index}>
                                            <p>{item.sender}</p>
                                            <span>{item.data}</span>
                                        </div>
                                    )
                                }) : <p className={styles.chatEmpty}>No messages yet. Say hello to get things started.</p>}


                            </div>

                            <div className={styles.chattingArea}>
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Message" variant="outlined" size="small" onKeyDown={e => e.key === "Enter" && sendMessage()} />
                                <Button variant='contained' onClick={sendMessage} disabled={!message.trim()}>Send</Button>
                            </div>


                        </div>
                    </aside> : <></>}


                    <div className={styles.callHeader}>
                        <div>
                            <strong>HandShake call</strong>
                            <span aria-live="polite">{callStatus}</span>
                        </div>
                        {mediaError && <p className={styles.mediaError} role="alert">{mediaError}</p>}
                    </div>

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} className={video ? "" : styles.controlDisabled} aria-label={video ? "Turn camera off" : "Turn camera on"}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} className={styles.endCall} aria-label="End call">
                            <CallEndIcon  />
                        </IconButton>
                        <IconButton onClick={handleAudio} className={audio ? "" : styles.controlDisabled} aria-label={audio ? "Mute microphone" : "Unmute microphone"}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} aria-label={screen ? "Stop screen sharing" : "Share screen"}>
                                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} aria-label="Open chat">
                                <ChatIcon />
                            </IconButton>
                        </Badge>


                    </div>


                    <div className={styles.videoStage}>
                        {videos.length === 0 && <div className={styles.waitingCard}>
                            <h2>Waiting for another participant</h2>
                            <p>Share this room’s URL to invite someone.</p>
                        </div>}
                        {mediaError && !window.localStream && <div className={styles.stageError} role="alert">{mediaError}</div>}
                        <div className={styles.localVideoCard}>
                            <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted playsInline></video>
                            <span>You</span>
                        </div>

                        <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div className={styles.remoteVideoCard} key={video.socketId}>
                                <video
                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay playsInline
                                />
                                <span>Participant</span>
                            </div>

                        ))}
                        </div>
                    </div>

                </div>

            }

        </div>
    )
}