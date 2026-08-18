import { useState } from "react";
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

type HelpType =
  | "SOS"
  | "MEDICAL"
  | "EVACUATION"
  | "FOOD_WATER"
  | "SHELTER"
  | "SAFE";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const helpOptions: {
  type: HelpType;
  label: string;
  description: string;
  color: string;
  icon: typeof TriangleAlert;
}[] = [
  {
    type: "SOS",
    label: "SOS",
    description: "Immediate danger",
    color: "critical",
    icon: TriangleAlert
  },
  {
    type: "MEDICAL",
    label: "Medical Help",
    description: "Injury or medical emergency",
    color: "medical",
    icon: HeartPulse
  },
  {
    type: "EVACUATION",
    label: "Evacuation",
    description: "I need to leave the area",
    color: "evacuation",
    icon: Truck
  },
  {
    type: "FOOD_WATER",
    label: "Food / Water",
    description: "Essential supplies needed",
    color: "resources",
    icon: Droplets
  },
  {
    type: "SHELTER",
    label: "Shelter",
    description: "I need a safe place",
    color: "shelter",
    icon: Home
  },
  {
    type: "SAFE",
    label: "I Am Safe",
    description: "Send a safety status",
    color: "safe",
    icon: CheckCircle2
  }
];

const severityOptions: {
  value: Severity;
  label: string;
  description: string;
}[] = [
  { value: "LOW", label: "Low", description: "Non-urgent" },
  { value: "MEDIUM", label: "Medium", description: "Needs attention" },
  { value: "HIGH", label: "High", description: "Urgent" },
  { value: "CRITICAL", label: "Critical", description: "Life-threatening" }
];

function App() {
  const [selected, setSelected] = useState<HelpType | null>(null);
  const [severity, setSeverity] = useState<Severity>("HIGH");
  const [sent, setSent] = useState(false);

  const selectedOption = helpOptions.find((item) => item.type === selected);

  function chooseHelp(type: HelpType) {
    setSelected(type);
    setSent(false);

    if (type === "SOS") {
      setSeverity("CRITICAL");
    }
  }

  function sendRequest() {
    // Frontend-only for now.
    // Step 2 will replace this with POST /api/emergencies.
    setSent(true);
  }

  function reset() {
    setSelected(null);
    setSeverity("HIGH");
    setSent(false);
  }

  if (sent && selectedOption) {
    return (
      <main className="page">
        <section className="success-screen">
          <div className="success-icon">
            <Check size={44} strokeWidth={3} />
          </div>

          <div className="brand">
            <div className="brand-icon"><Radio size={18} /></div>
            <span>ResQMesh</span>
          </div>

          <p className="eyebrow">TRANSMISSION COMPLETE</p>
          <h1>Help Sent</h1>
          <p className="success-copy">
            Your emergency request has been broadcast to the local ResQMesh network.
          </p>

          <div className="receipt">
            <div>
              <span>Request</span>
              <strong>{selectedOption.label}</strong>
            </div>
            <div>
              <span>Severity</span>
              <strong>{selected === "SAFE" ? "Low" : severity}</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>Attached automatically</strong>
            </div>
            <div>
              <span>Network</span>
              <strong>ResQMesh Local</strong>
            </div>
          </div>

          <div className="encrypted">
            <ShieldCheck size={17} />
            Encrypted emergency data · Offline capable
          </div>

          <button className="primary-button" onClick={reset}>
            Back to Home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Radio size={19} /></div>
          <div>
            <strong>ResQMesh</strong>
            <span>Emergency Communication</span>
          </div>
        </div>

        <div className="network-status">
          <span className="status-dot" />
          Network ready
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">OFFLINE · RESILIENT · CONNECTED</p>
          <h1>
            Get help.
            <br />
            <span>Immediately.</span>
          </h1>
          <p>
            No account. No Internet. No complicated setup.
            <br />
            Just choose what you need.
          </p>
        </div>

        <div className="hero-badge">
          <Radio size={18} />
          <div>
            <strong>ResQMesh</strong>
            <span>Local network active</span>
          </div>
        </div>
      </section>

      <section className="help-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EMERGENCY ACTIONS</p>
            <h2>What do you need?</h2>
          </div>
          <span className="location-badge">
            <LocateFixed size={14} />
            Location ready
          </span>
        </div>

        <div className="help-grid">
          {helpOptions.map((option) => {
            const Icon = option.icon;
            const active = selected === option.type;

            return (
              <button
                key={option.type}
                className={`help-card ${option.color} ${active ? "active" : ""}`}
                onClick={() => chooseHelp(option.type)}
              >
                <div className="card-icon">
                  <Icon size={28} strokeWidth={2.2} />
                </div>
                <div className="card-copy">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedOption && (
        <section className="request-panel">
          <div className="request-header">
            <div>
              <p className="eyebrow">REQUEST</p>
              <h2>{selectedOption.label}</h2>
            </div>
            <div className={`request-chip ${selectedOption.color}`}>
              <selectedOption.icon size={17} />
              Ready
            </div>
          </div>

          {selected !== "SAFE" && (
            <>
              <p className="field-label">Severity</p>

              <div className="severity-grid">
                {severityOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`severity-card ${
                      severity === option.value ? "selected" : ""
                    }`}
                    onClick={() => setSeverity(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="auto-location">
            <div className="location-icon">
              <LocateFixed size={19} />
            </div>
            <div>
              <strong>Location attached automatically</strong>
              <span>We will use your device's current location.</span>
            </div>
            <CheckCircle2 size={20} className="location-check" />
          </div>

          <button className="primary-button" onClick={sendRequest}>
            {selected === "SAFE" ? "Send Safe Status" : "Confirm & Send"}
          </button>

          <button className="cancel-button" onClick={() => setSelected(null)}>
            Cancel
          </button>
        </section>
      )}

      <footer>
        <ShieldCheck size={15} />
        <span>Emergency information stays within the local ResQMesh network.</span>
      </footer>
    </main>
  );
}

export default App;
