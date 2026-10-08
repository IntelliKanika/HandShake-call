const server = import.meta.env.VITE_SERVER_URL || (
    import.meta.env.DEV
        ? "http://localhost:8000"
        : "https://handshake-callbackend.onrender.com"
);

export default server;