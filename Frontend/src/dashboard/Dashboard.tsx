import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Radio,
    ShieldAlert,
    Wifi,
} from "lucide-react";

import "./dashboard.css";

interface Emergency {
    id: number;
    type: string;
    severity: string;
    latitude: number;
    longitude: number;
    status: string;
    createdAt: string;
}

interface WebSocketEvent {
    event: string;
    data: Emergency;
}

function Dashboard() {
    const [
        emergencies,
        setEmergencies,
    ] = useState<Emergency[]>([]);

    const [
        connected,
        setConnected,
    ] = useState(false);

    const [
        lastUpdate,
        setLastUpdate,
    ] = useState<Date | null>(
        null,
    );

    const socketRef =
        useRef<WebSocket | null>(null);

    const reconnectTimer =
        useRef<number | null>(null);

    useEffect(() => {
        void loadEmergencies();

        connectWebSocket();

        return () => {
            if (
                reconnectTimer.current !==
                null
            ) {
                window.clearTimeout(
                    reconnectTimer.current,
                );
            }

            socketRef.current?.close();
        };
    }, []);

    async function loadEmergencies() {
        try {
            const response = await fetch(
                "/api/emergencies",
                {
                    cache: "no-store",
                },
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`,
                );
            }

            const data =
                (await response.json()) as Emergency[];

            setEmergencies(data);
        } catch (error) {
            console.error(
                "Failed to load emergencies:",
                error,
            );
        }
    }

    function connectWebSocket() {
        if (
            socketRef.current?.readyState ===
            WebSocket.OPEN
        ) {
            return;
        }

        const protocol =
            window.location.protocol ===
            "https:"
                ? "wss:"
                : "ws:";

        const socket =
            new WebSocket(
                `${protocol}//${window.location.host}/ws`,
            );

        socketRef.current =
            socket;

        socket.onopen = () => {
            console.log(
                "ResQMesh WebSocket connected",
            );

            setConnected(true);
        };

        socket.onmessage = (
            message,
        ) => {
            try {
                const event =
                    JSON.parse(
                        message.data,
                    ) as WebSocketEvent;

                if (
                    event.event ===
                    "emergency.created"
                ) {
                    setEmergencies(
                        (current) => [
                            event.data,
                            ...current.filter(
                                (item) =>
                                    item.id !==
                                    event.data.id,
                            ),
                        ],
                    );

                    setLastUpdate(
                        new Date(),
                    );
                }
            } catch (error) {
                console.error(
                    "Invalid WebSocket event:",
                    error,
                );
            }
        };

        socket.onclose = () => {
            console.log(
                "ResQMesh WebSocket disconnected",
            );

            setConnected(false);

            reconnectTimer.current =
                window.setTimeout(() => {
                    connectWebSocket();
                }, 3000);
        };

        socket.onerror = (
            error,
        ) => {
            console.error(
                "ResQMesh WebSocket error:",
                error,
            );

            setConnected(false);
        };
    }

    const statistics = useMemo(
        () => ({
            total: emergencies.length,

            critical:
            emergencies.filter(
                (item) =>
                    item.severity ===
                    "CRITICAL",
            ).length,

            medical:
            emergencies.filter(
                (item) =>
                    item.type ===
                    "MEDICAL",
            ).length,

            evacuation:
            emergencies.filter(
                (item) =>
                    item.type ===
                    "EVACUATION",
            ).length,
        }),
        [emergencies],
    );

    function formatTime(
        value: string,
    ) {
        return new Date(
            value,
        ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <div className="dashboard-logo">
                        <Radio size={20} />
                    </div>

                    <div>
                        <strong>
                            ResQMesh
                        </strong>

                        <span>
              Emergency Command Center
            </span>
                    </div>
                </div>

                <div
                    className={`live-status ${
                        connected
                            ? "connected"
                            : ""
                    }`}
                >
                    <span />

                    {connected
                        ? "LIVE"
                        : "DISCONNECTED"}
                </div>
            </header>

            <section className="dashboard-title">
                <div>
                    <p className="dashboard-eyebrow">
                        LOCAL EMERGENCY NETWORK
                    </p>

                    <h1>
                        Command Center
                    </h1>

                    <p>
                        Real-time emergency events
                        received by the ResQMesh
                        gateway.
                    </p>
                </div>

                <div className="gateway-card">
                    <Wifi size={18} />

                    <div>
                        <strong>
                            Gateway Online
                        </strong>

                        <span>
              Local network operational
            </span>
                    </div>
                </div>
            </section>

            <section className="stat-grid">
                <article className="stat-card">
                    <div className="stat-icon neutral">
                        <Activity size={20} />
                    </div>

                    <span>
            ACTIVE EVENTS
          </span>

                    <strong>
                        {statistics.total}
                    </strong>
                </article>

                <article className="stat-card">
                    <div className="stat-icon critical">
                        <ShieldAlert size={20} />
                    </div>

                    <span>
            CRITICAL
          </span>

                    <strong>
                        {statistics.critical}
                    </strong>
                </article>

                <article className="stat-card">
                    <div className="stat-icon medical">
                        <AlertTriangle size={20} />
                    </div>

                    <span>
            MEDICAL
          </span>

                    <strong>
                        {statistics.medical}
                    </strong>
                </article>

                <article className="stat-card">
                    <div className="stat-icon evacuation">
                        <Radio size={20} />
                    </div>

                    <span>
            EVACUATION
          </span>

                    <strong>
                        {statistics.evacuation}
                    </strong>
                </article>
            </section>

            <section className="events-panel">
                <div className="events-heading">
                    <div>
                        <p className="dashboard-eyebrow">
                            INCOMING TRANSMISSIONS
                        </p>

                        <h2>
                            Emergency Events
                        </h2>
                    </div>

                    <div className="update-time">
                        <Clock3 size={14} />

                        {lastUpdate
                            ? `Updated ${lastUpdate.toLocaleTimeString()}`
                            : "Waiting for events"}
                    </div>
                </div>

                {emergencies.length ===
                0 ? (
                    <div className="empty-state">
                        <CheckCircle2 size={34} />

                        <strong>
                            No active emergencies
                        </strong>

                        <span>
              New alerts will appear
              here automatically.
            </span>
                    </div>
                ) : (
                    <div className="event-list">
                        {emergencies.map(
                            (emergency) => (
                                <article
                                    key={emergency.id}
                                    className={`event-row ${emergency.severity.toLowerCase()}`}
                                >
                                    <div className="event-status">
                                        <span />
                                    </div>

                                    <div className="event-main">
                                        <div className="event-top">
                                            <strong>
                                                {
                                                    emergency.type
                                                }
                                            </strong>

                                            <span
                                                className={`severity-tag ${emergency.severity.toLowerCase()}`}
                                            >
                        {
                            emergency.severity
                        }
                      </span>
                                        </div>

                                        <div className="event-meta">
                      <span>
                        Location
                      </span>

                                            <strong>
                                                {emergency.latitude.toFixed(
                                                    5,
                                                )}
                                                {" , "}
                                                {emergency.longitude.toFixed(
                                                    5,
                                                )}
                                            </strong>

                                            <span>
                        {formatTime(
                            emergency.createdAt,
                        )}
                      </span>
                                        </div>
                                    </div>

                                    <div className="event-id">
                                        #{emergency.id}
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}

export default Dashboard;