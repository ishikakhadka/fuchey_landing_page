import { useEffect, useState } from "react";

const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_KEY = "fuchey_waitlist_cooldown";

function Waitlist({ edition }) {
  const [selectedEdition, setSelectedEdition] = useState(edition.id);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rank, setRank] = useState(null);

  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [message, setMessage] = useState("");

  // ----------------------------------
  // Keep edition in sync
  // ----------------------------------

  useEffect(() => {
    setSelectedEdition(edition.id);
  }, [edition.id]);

  // ----------------------------------
  // Check 5 minute cooldown
  // ----------------------------------

  useEffect(() => {
    const checkCooldown = () => {
      const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);

      if (!cooldownUntil) {
        setCooldownRemaining(0);
        return;
      }

      const remaining = Number(cooldownUntil) - Date.now();

      if (remaining <= 0) {
        localStorage.removeItem(COOLDOWN_KEY);
        setCooldownRemaining(0);
        setMessage("");
      } else {
        setCooldownRemaining(remaining);
      }
    };

    checkCooldown();

    const interval = setInterval(checkCooldown, 1000);

    return () => clearInterval(interval);
  }, []);

  // ----------------------------------
  // Hide success screen after 20 sec
  // ----------------------------------

  useEffect(() => {
    if (!submitted) return;

    const timer = setTimeout(() => {
      setSubmitted(false);
      setRank(null);
    }, 20000);

    return () => clearTimeout(timer);
  }, [submitted]);

  // ----------------------------------
  // Submit
  // ----------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple requests
    if (submitting) return;

    // Prevent submission during cooldown
    if (cooldownRemaining > 0) {
      setMessage(
        "You’ve already joined the waitlist. Please wait a few minutes before trying again.",
      );

      return;
    }

    const form = e.target;

    const formData = new URLSearchParams();

    formData.append("name", form.name.value.trim());

    formData.append("email", form.email.value.trim());

    formData.append("phone", form.phone.value.trim());

    formData.append("edition", selectedEdition);

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(import.meta.env.VITE_WAITLIST_API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      console.log("WAITLIST RESPONSE:", data);

      // ----------------------------------
      // SUCCESS
      // ----------------------------------

      if (data.success) {
        setRank(data.rank);
        setSubmitted(true);
        setMessage("");

        form.reset();

        // Start 5 minute cooldown
        const cooldownUntil = Date.now() + COOLDOWN_TIME;

        localStorage.setItem(COOLDOWN_KEY, cooldownUntil.toString());

        setCooldownRemaining(COOLDOWN_TIME);
      }

      // ----------------------------------
      // DUPLICATE EMAIL / NAME
      // ----------------------------------
      else if (data.duplicate) {
        setMessage(data.error || "You're already on the waitlist.");
      }

      // ----------------------------------
      // BACKEND COOLDOWN
      // ----------------------------------
      else if (data.cooldown) {
        setMessage(
          "You’ve already joined the waitlist. Please wait a few minutes before trying again.",
        );

        // If backend provides remaining time,
        // sync the frontend cooldown with it.
        if (data.remainingSeconds) {
          const cooldownUntil = Date.now() + data.remainingSeconds * 1000;

          localStorage.setItem(COOLDOWN_KEY, cooldownUntil.toString());

          setCooldownRemaining(data.remainingSeconds * 1000);
        }
      }

      // ----------------------------------
      // OTHER ERROR
      // ----------------------------------
      else {
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("WAITLIST ERROR:", error);

      setMessage("Unable to submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------
  // Cooldown display
  // ----------------------------------

  const cooldownMinutes = Math.ceil(cooldownRemaining / 60000);

  return (
    <section id="waitlist" className="waitlist-section">
      <div className="container">
        <div className="waitlist-card reveal">
          {/* ==========================
              SUCCESS STATE
          ========================== */}

          {submitted ? (
            <div className="waitlist-success">
              <span className="success-icon">✦</span>

              <p className="eyebrow">YOU'RE IN</p>

              <h2>
                Welcome to
                <br />
                the Fuchey list.
              </h2>

              <p>
                You're officially on the list. We'll keep you posted when Fuchey
                is ready.
              </p>

              <div className="rank-box">
                <span>YOUR RANK</span>

                <strong>#{rank}</strong>
              </div>

              <small className="success-note">
                This message will disappear in 20 seconds.
              </small>
            </div>
          ) : (
            /* ==========================
               FORM STATE
            ========================== */

            <>
              <div className="waitlist-content">
                <p className="eyebrow">GET EARLY ACCESS</p>

                <h2>
                  Get on the
                  <br />
                  Fuchey list.
                </h2>

                <p>
                  Be one of the first to get your hands on Fuchey. Choose the
                  edition that fits you.
                </p>
              </div>

              <form className="waitlist-form" onSubmit={handleSubmit}>
                {/* NAME */}

                <div className="form-field">
                  <label htmlFor="name">Name</label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    required
                  />
                </div>

                {/* EMAIL */}

                <div className="form-field">
                  <label htmlFor="email">Email</label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                {/* PHONE */}

                <div className="form-field">
                  <label htmlFor="phone">
                    Phone <span>(optional)</span>
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="98XXXXXXXX"
                  />
                </div>

                {/* EDITION */}

                <div className="form-field">
                  <label>Choose your Fuchey</label>

                  <div className="waitlist-editions">
                    {/* DEV */}

                    <button
                      type="button"
                      className={selectedEdition === "dev" ? "selected" : ""}
                      onClick={() => setSelectedEdition("dev")}>
                      <div>
                        <strong>Dev Edition</strong>

                        <small>For builders & hackers</small>
                      </div>
                    </button>

                    {/* COMPANION */}

                    <button
                      type="button"
                      className={
                        selectedEdition === "companion" ? "selected" : ""
                      }
                      onClick={() => setSelectedEdition("companion")}>
                      <div>
                        <strong>Companion Edition</strong>

                        <small>For everyday Solana users</small>
                      </div>
                    </button>
                  </div>
                </div>

                {/* MESSAGE */}

                {message && (
                  <div className="waitlist-message" role="status">
                    {message}
                  </div>
                )}

                {/* SUBMIT */}

                <button
                  type="submit"
                  className="primary-button waitlist-submit"
                  disabled={submitting || cooldownRemaining > 0}>
                  {submitting
                    ? "Joining the waitlist..."
                    : cooldownRemaining > 0
                      ? `Try again in ${cooldownMinutes} min`
                      : "Join the waitlist"}

                  {cooldownRemaining <= 0 && !submitting && <span>→</span>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Waitlist;
