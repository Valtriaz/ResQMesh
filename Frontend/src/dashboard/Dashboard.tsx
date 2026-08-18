import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Activity,
    AlertTriangle,
    Check,
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
    latitude: number | null;
    longitude: number | null;
    status: string;
    createdAt: string;
}

interface WebSocketEvent {
    event: string;
    data: Emergency;
}

function Dashboard() {
    const [emergencies, setEmergencies] =
        useState<Emergency[]>([]);

    const [connected, setConnected] =
        useState(false);

    const [lastUpdate, setLastUpdate] =
        useState<Date | null>(null);

    const socketRef =
        useRef<WebSocket | null>(null);

    const reconnectTimerRef =
        useRef<number | null>(null);

    const mountedRef =
        useRef(true);

    const loadEmergencies =
        useCallback(async () => {
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

                if (mountedRef.current) {
                    setEmergencies(data);
                }
            } catch (error) {
                console.error(
                    "Failed to load emergencies:",
                    error,
                );
            }
        }, []);

    const connectWebSocket =
        useCallback(() => {
            if (!mountedRef.current) {
                return;
            }

            const existing =
                socketRef.current;

            if (
                existing &&
                (
                    existing.readyState ===
                    WebSocket.OPEN ||
                    existing.readyState ===
                    WebSocket.CONNECTING
                )
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

            socketRef.current = socket;

            socket.onopen = () => {
                if (!mountedRef.current) {
                    return;
                }

                console.log(
                    "ResQMesh WebSocket connected",
                );

                setConnected(true);
            };

            socket.onmessage = (
                message,
            ) => {
                if (!mountedRef.current) {
                    return;
                }

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

                    if (
                        event.event ===
                        "emergency.updated"
                    ) {
                        setEmergencies(
                            (current) =>
                                current.map(
                                    (item) =>
                                        item.id ===
                                        event.data.id
                                            ? event.data
                                            : item,
                                ),
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

            socket.onerror = (
                error,
            ) => {
                console.error(
                    "ResQMesh WebSocket error:",
                    error,
                );

                if (mountedRef.current) {
                    setConnected(false);
                }
            };

            socket.onclose = (
                event,
            ) => {
                console.log(
                    "ResQMesh WebSocket closed:",
                    {
                        code: event.code,
                        reason: event.reason,
                    },
                );

                socketRef.current = null;

                if (!mountedRef.current) {
                    return;
                }

                setConnected(false);

                if (
                    reconnectTimerRef.current !==
                    null
                ) {
                    window.clearTimeout(
                        reconnectTimerRef.current,
                    );
                }

                reconnectTimerRef.current =
                    window.setTimeout(() => {
                        connectWebSocket();
                    }, 3000);
            };
        }, []);

    useEffect(() => {
        mountedRef.current = true;

        void loadEmergencies();

        connectWebSocket();

        return () => {
            mountedRef.current = false;

            if (
                reconnectTimerRef.current !==
                null
            ) {
                window.clearTimeout(
                    reconnectTimerRef.current,
                );

                reconnectTimerRef.current = null;
            }

            const socket =
                socketRef.current;

            socketRef.current = null;

            if (socket) {
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;

                if (
                    socket.readyState ===
                    WebSocket.OPEN ||
                    socket.readyState ===
                    WebSocket.CONNECTING
                ) {
                    socket.close();
                }
            }
        };
    }, [
        connectWebSocket,
        loadEmergencies,
    ]);

    async function resolveEmergency(
        id: number,
    ) {
        try {
            const response =
                await fetch(
                    `/api/emergencies/${id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            status: "resolved",
                        }),
                    },
                );

            const responseText =
                await response.text();

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${responseText}`,
                );
            }

            const updated =
                JSON.parse(
                    responseText,
                ) as Emergency;

            setEmergencies(
                (current) =>
                    current.map(
                        (item) =>
                            item.id === updated.id
                                ? updated
                                : item,
                    ),
            );

            setLastUpdate(
                new Date(),
            );
        } catch (error) {
            console.error(
                "Failed to resolve emergency:",
                error,
            );

            window.alert(
                error instanceof Error
                    ? error.message
                    : "Failed to resolve emergency.",
            );
        }
    }

    const statistics = useMemo(
        () => ({
            total:
            emergencies.filter(
                (item) =>
                    item.status !==
                    "resolved",
            ).length,

            critical:
            emergencies.filter(
                (item) =>
                    item.status !==
                    "resolved" &&
                    item.severity ===
                    "CRITICAL",
            ).length,

            medical:
            emergencies.filter(
                (item) =>
                    item.status !==
                    "resolved" &&
                    item.type ===
                    "MEDICAL",
            ).length,

            evacuation:
            emergencies.filter(
                (item) =>
                    item.status !==
                    "resolved" &&
                    item.type ===
                    "EVACUATION",
            ).length,
        }),
        [emergencies],
    );

    function formatTime(
        value: string,
    ): string {
        return new Date(
            value,
        ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    function formatLocation(
        emergency: Emergency,
    ): string {
        if (
            emergency.latitude ===
            null ||
            emergency.longitude ===
            null
        ) {
            return "Location unavailable";
        }

        return `${emergency.latitude.toFixed(
            5,
        )} , ${emergency.longitude.toFixed(
            5,
        )}`;
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
                            No emergency events
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
                                    className={`event-row ${emergency.severity.toLowerCase()} ${
                                        emergency.status ===
                                        "resolved"
                                            ? "resolved"
                                            : ""
                                    }`}
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

                                            {emergency.status ===
                                                "resolved" && (
                                                    <span className="resolved-badge">
                          <CheckCircle2
                              size={13}
                          />
                          Resolved
                        </span>
                                                )}
                                        </div>

                                        <div className="event-meta">
                      <span>
                        Location
                      </span>

                                            <strong>
                                                {formatLocation(
                                                    emergency,
                                                )}
                                            </strong>

                                            <span>
                        {formatTime(
                            emergency.createdAt,
                        )}
                      </span>
                                        </div>
                                    </div>

                                    <div className="event-actions">
                                        <div className="event-id">
                                            #{emergency.id}
                                        </div>

                                        {emergency.status !==
                                            "resolved" && (
                                                <button
                                                    className="resolve-button"
                                                    onClick={() =>
                                                        void resolveEmergency(
                                                            emergency.id,
                                                        )
                                                    }
                                                >
                                                    <Check
                                                        size={14}
                                                    />
                                                    Resolve
                                                </button>
                                            )}
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