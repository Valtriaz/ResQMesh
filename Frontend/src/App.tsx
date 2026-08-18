import { useEffect, useState } from "react";
import {
    Check,
    CheckCircle2,
    Droplets,
    HeartPulse,
    Home,
    LocateFixed,
    Radio,
    ShieldCheck,
    TriangleAlert,
    Truck,
} from "lucide-react";

import Dashboard from "./dashboard/Dashboard";

type HelpType =
    | "SOS"
    | "MEDICAL"
    | "EVACUATION"
    | "FOOD_WATER"
    | "SHELTER"
    | "SAFE";

type Severity =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

interface HelpOption {
    type: HelpType;
    label: string;
    description: string;
    color: string;
    icon: typeof TriangleAlert;
}

interface SeverityOption {
    value: Severity;
    label: string;
    description: string;
}

interface EmergencyResponse {
    id: number;
    type: string;
    severity: string;
    latitude: number | null;
    longitude: number | null;
    status: string;
    createdAt: string;
}

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    available: boolean;
    accuracy: number | null;
}

const helpOptions: HelpOption[] = [
    {
        type: "SOS",
        label: "SOS",
        description: "Immediate danger",
        color: "critical",
        icon: TriangleAlert,
    },
    {
        type: "MEDICAL",
        label: "Medical Help",
        description: "Injury or medical emergency",
        color: "medical",
        icon: HeartPulse,
    },
    {
        type: "EVACUATION",
        label: "Evacuation",
        description: "I need to leave the area",
        color: "evacuation",
        icon: Truck,
    },
    {
        type: "FOOD_WATER",
        label: "Food / Water",
        description: "Essential supplies needed",
        color: "resources",
        icon: Droplets,
    },
    {
        type: "SHELTER",
        label: "Shelter",
        description: "I need a safe place",
        color: "shelter",
        icon: Home,
    },
    {
        type: "SAFE",
        label: "I Am Safe",
        description: "Send a safety status",
        color: "safe",
        icon: CheckCircle2,
    },
];

const severityOptions: SeverityOption[] = [
    {
        value: "LOW",
        label: "Low",
        description: "Non-urgent",
    },
    {
        value: "MEDIUM",
        label: "Medium",
        description: "Needs attention",
    },
    {
        value: "HIGH",
        label: "High",
        description: "Urgent",
    },
    {
        value: "CRITICAL",
        label: "Critical",
        description: "Life-threatening",
    },
];

function App() {
    if (window.location.pathname === "/dashboard") {
        return <Dashboard />;
    }

    return <CitizenApp />;
}

function CitizenApp() {
    const [selected, setSelected] =
        useState<HelpType | null>(null);

    const [severity, setSeverity] =
        useState<Severity>("HIGH");

    const [sent, setSent] =
        useState(false);

    const [sending, setSending] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [networkStatus, setNetworkStatus] =
        useState<
            "checking" | "online" | "offline"
        >("checking");

    const [location, setLocation] =
        useState<LocationState>({
            latitude: null,
            longitude: null,
            available: false,
            accuracy: null,
        });

    const selectedOption =
        helpOptions.find(
            (option) => option.type === selected,
        );

    useEffect(() => {
        void checkServer();
        detectLocation();
    }, []);

    async function checkServer() {
        try {
            const response = await fetch(
                "/api/health",
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Health check failed: HTTP ${response.status}`,
                );
            }

            setNetworkStatus("online");
        } catch (error) {
            console.error(
                "ResQMesh health check failed:",
                error,
            );

            setNetworkStatus("offline");
        }
    }

    function detectLocation() {
        if (!("geolocation" in navigator)) {
            console.warn(
                "Geolocation is not supported.",
            );

            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                updateLocation(position);
            },
            (error) => {
                console.warn(
                    "Initial location unavailable:",
                    error.message,
                );

                // IMPORTANT:
                // Location failure does NOT block emergency communication.
                setLocation({
                    latitude: null,
                    longitude: null,
                    available: false,
                    accuracy: null,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 10000,
            },
        );
    }

    function updateLocation(
        position: GeolocationPosition,
    ) {
        setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            available: true,
            accuracy: position.coords.accuracy,
        });
    }

    function chooseHelp(type: HelpType) {
        setSelected(type);
        setSent(false);
        setError(null);

        if (type === "SOS") {
            setSeverity("CRITICAL");
        }
    }

    async function tryGetCurrentLocation(): Promise<LocationState> {
        if (!("geolocation" in navigator)) {
            return location;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const nextLocation: LocationState = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        available: true,
                        accuracy: position.coords.accuracy,
                    };

                    updateLocation(position);
                    resolve(nextLocation);
                },
                (error) => {
                    console.warn(
                        "Location unavailable during send:",
                        error.message,
                    );

                    // Resolve with unavailable location.
                    // Do NOT reject.
                    resolve(location);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 5000,
                },
            );
        });
    }

    async function sendRequest() {
        if (!selected) {
            return;
        }

        setSending(true);
        setError(null);

        try {
            /*
             * Try GPS, but NEVER allow GPS failure
             * to block the emergency request.
             */
            const currentLocation =
                await tryGetCurrentLocation();

            const emergencySeverity =
                selected === "SAFE"
                    ? "LOW"
                    : selected === "SOS"
                        ? "CRITICAL"
                        : severity;

            const requestBody = {
                type: selected,
                severity: emergencySeverity,

                latitude:
                currentLocation.latitude,

                longitude:
                currentLocation.longitude,
            };

            console.log(
                "Sending ResQMesh emergency:",
                requestBody,
            );

            const response =
                await fetch(
                    "/api/emergencies",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            requestBody,
                        ),
                    },
                );

            const responseText =
                await response.text();

            if (!response.ok) {
                throw new Error(
                    `Server returned HTTP ${response.status}: ${responseText}`,
                );
            }

            const data =
                JSON.parse(
                    responseText,
                ) as EmergencyResponse;

            console.log(
                "Emergency accepted:",
                data,
            );

            setSent(true);
        } catch (error) {
            console.error(
                "RESQMESH REQUEST FAILED:",
                error,
            );

            setError(
                error instanceof Error
                    ? error.message
                    : String(error),
            );
        } finally {
            setSending(false);
        }
    }

    function reset() {
        setSelected(null);
        setSeverity("HIGH");
        setSent(false);
        setError(null);
    }

    if (
        sent &&
        selected !== null &&
        selectedOption !== undefined
    ) {
        return (
            <SuccessScreen
                selected={selected}
                selectedOption={selectedOption}
                severity={severity}
                location={location}
                onReset={reset}
            />
        );
    }

    return (
        <main className="page">
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />

            <header className="topbar">
                <div className="brand">
                    <div className="brand-icon">
                        <Radio size={19} />
                    </div>

                    <div>
                        <strong>
                            ResQMesh
                        </strong>

                        <span>
              Emergency Communication
            </span>
                    </div>
                </div>

                <div className="network-status">
          <span
              className={`status-dot ${
                  networkStatus === "online"
                      ? "online"
                      : networkStatus === "checking"
                          ? "checking"
                          : "offline"
              }`}
          />

                    {networkStatus === "online"
                        ? "Network ready"
                        : networkStatus === "checking"
                            ? "Connecting…"
                            : "Server offline"}
                </div>
            </header>

            <section className="hero">
                <div>
                    <p className="eyebrow">
                        OFFLINE · RESILIENT · CONNECTED
                    </p>

                    <h1>
                        Get help.
                        <br />
                        <span>
              Immediately.
            </span>
                    </h1>

                    <p>
                        No account. No Internet. No
                        complicated setup.
                        <br />
                        Just choose what you need.
                    </p>
                </div>

                <div className="hero-badge">
                    <Radio size={18} />

                    <div>
                        <strong>
                            ResQMesh
                        </strong>

                        <span>
              Local network active
            </span>
                    </div>
                </div>
            </section>

            <section className="help-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">
                            EMERGENCY ACTIONS
                        </p>

                        <h2>
                            What do you need?
                        </h2>
                    </div>

                    <span className="location-badge">
            <LocateFixed size={14} />

                        {location.available
                            ? `Location ready · ±${Math.round(
                                location.accuracy ?? 0,
                            )} m`
                            : "Location unavailable"}
          </span>
                </div>

                <div className="help-grid">
                    {helpOptions.map(
                        (option) => {
                            const Icon =
                                option.icon;

                            return (
                                <button
                                    key={option.type}
                                    className={`help-card ${option.color} ${
                                        selected === option.type
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        chooseHelp(
                                            option.type,
                                        )
                                    }
                                >
                                    <div className="card-icon">
                                        <Icon
                                            size={28}
                                            strokeWidth={2.2}
                                        />
                                    </div>

                                    <div className="card-copy">
                                        <strong>
                                            {option.label}
                                        </strong>

                                        <span>
                      {
                          option.description
                      }
                    </span>
                                    </div>
                                </button>
                            );
                        },
                    )}
                </div>
            </section>

            {selectedOption && (
                <section className="request-panel">
                    <div className="request-header">
                        <div>
                            <p className="eyebrow">
                                REQUEST
                            </p>

                            <h2>
                                {selectedOption.label}
                            </h2>
                        </div>

                        <div
                            className={`request-chip ${selectedOption.color}`}
                        >
                            {(() => {
                                const Icon =
                                    selectedOption.icon;

                                return (
                                    <Icon size={17} />
                                );
                            })()}

                            Ready
                        </div>
                    </div>

                    {selected !== "SAFE" && (
                        <>
                            <p className="field-label">
                                Severity
                            </p>

                            <div className="severity-grid">
                                {severityOptions.map(
                                    (option) => (
                                        <button
                                            key={
                                                option.value
                                            }
                                            className={`severity-card ${
                                                severity ===
                                                option.value
                                                    ? "selected"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                setSeverity(
                                                    option.value,
                                                )
                                            }
                                        >
                                            <strong>
                                                {
                                                    option.label
                                                }
                                            </strong>

                                            <span>
                        {
                            option.description
                        }
                      </span>
                                        </button>
                                    ),
                                )}
                            </div>
                        </>
                    )}

                    <div className="auto-location">
                        <div className="location-icon">
                            <LocateFixed
                                size={19}
                            />
                        </div>

                        <div>
                            <strong>
                                {location.available
                                    ? "Location attached automatically"
                                    : "Location unavailable"}
                            </strong>

                            <span>
                {location.available
                    ? `${location.latitude?.toFixed(
                        6,
                    )}, ${location.longitude?.toFixed(
                        6,
                    )} · ±${Math.round(
                        location.accuracy ?? 0,
                    )} m`
                    : "Your emergency can still be sent without GPS."}
              </span>
                        </div>

                        <CheckCircle2
                            size={20}
                            className={
                                location.available
                                    ? "location-check"
                                    : "location-check muted"
                            }
                        />
                    </div>

                    {error && (
                        <div className="error-box">
                            <TriangleAlert
                                size={18}
                            />

                            <div>
                                <strong>
                                    Request failed
                                </strong>

                                <span>
                  {error}
                </span>
                            </div>
                        </div>
                    )}

                    <button
                        className="primary-button"
                        onClick={sendRequest}
                        disabled={sending}
                    >
                        {sending
                            ? "Sending…"
                            : selected === "SAFE"
                                ? "Send Safe Status"
                                : "Confirm & Send"}
                    </button>

                    <button
                        className="cancel-button"
                        onClick={() =>
                            setSelected(null)
                        }
                        disabled={sending}
                    >
                        Cancel
                    </button>
                </section>
            )}

            <footer>
                <ShieldCheck size={15} />

                <span>
          Emergency information stays
          within the local ResQMesh
          network.
        </span>
            </footer>
        </main>
    );
}

function SuccessScreen({
                           selected,
                           selectedOption,
                           severity,
                           location,
                           onReset,
                       }: {
    selected: HelpType;
    selectedOption: HelpOption;
    severity: Severity;
    location: LocationState;
    onReset: () => void;
}) {
    return (
        <main className="page">
            <section className="success-screen">
                <div className="success-icon">
                    <Check
                        size={44}
                        strokeWidth={3}
                    />
                </div>

                <div className="brand success-brand">
                    <div className="brand-icon">
                        <Radio size={18} />
                    </div>

                    <span>
            ResQMesh
          </span>
                </div>

                <p className="eyebrow">
                    TRANSMISSION COMPLETE
                </p>

                <h1>
                    Help Sent
                </h1>

                <p className="success-copy">
                    Your emergency request has
                    been received by the local
                    ResQMesh network.
                </p>

                <div className="receipt">
                    <div>
            <span>
              Request
            </span>

                        <strong>
                            {selectedOption.label}
                        </strong>
                    </div>

                    <div>
            <span>
              Severity
            </span>

                        <strong>
                            {selected === "SAFE"
                                ? "Low"
                                : severity}
                        </strong>
                    </div>

                    <div>
            <span>
              Location
            </span>

                        <strong>
                            {location.available
                                ? `${location.latitude?.toFixed(
                                    6,
                                )}, ${location.longitude?.toFixed(
                                    6,
                                )}`
                                : "Not available"}
                        </strong>
                    </div>

                    <div>
            <span>
              Network
            </span>

                        <strong>
                            ResQMesh Local
                        </strong>
                    </div>
                </div>

                <div className="encrypted">
                    <ShieldCheck size={17} />

                    Encrypted emergency data ·
                    Offline capable
                </div>

                <button
                    className="primary-button"
                    onClick={onReset}
                >
                    Back to Home
                </button>
            </section>
        </main>
    );
}

export default App;