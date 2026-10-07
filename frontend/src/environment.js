const server = import.meta.env.VITE_SERVER_URL || (
    import.meta.env.DEV
        ? "http://localhost:8000"
        : window.location.origin
);

export default server;