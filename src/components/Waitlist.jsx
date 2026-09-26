import { useEffect, useState } from "react";

function Waitlist({ edition }) {
  const [selectedEdition, setSelectedEdition] = useState(edition.id);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    if (!submitted) return;

    const timer = setTimeout(() => {
      setSubmitted(false);
      setRank(null);
    }, 20000);

    return () => clearTimeout(timer);
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const form = e.target;

    const formData = new URLSearchParams();

    formData.append("name", form.name.value);
    formData.append("email", form.email.value);
    formData.append("phone", form.phone.value);
    formData.append("edition", selectedEdition);

    setSubmitting(true);

    try {
      const response = await fetch(import.meta.env.VITE_WAITLIST_API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      console.log("WAITLIST RESPONSE:", data);

      if (data.success) {
        setRank(data.rank);
        setSubmitted(true);
        form.reset();
      } else {
        console.error("WAITLIST ERROR:", data.error);
      }
    } catch (error) {
      console.error("WAITLIST ERROR:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="waitlist-section">
      <div className="container">
        <div className="waitlist-card">
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

                <div className="form-field">
                  <label>Choose your Fuchey</label>

                  <div className="waitlist-editions">
                    <button
                      type="button"
                      className={selectedEdition === "dev" ? "selected" : ""}
                      onClick={() => setSelectedEdition("dev")}>
                      <span>🛠️</span>

                      <div>
                        <strong>Dev Edition</strong>
                        <small>For builders & hackers</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={
                        selectedEdition === "companion" ? "selected" : ""
                      }
                      onClick={() => setSelectedEdition("companion")}>
                      <span>🐾</span>

                      <div>
                        <strong>Companion Edition</strong>
                        <small>For everyday Solana users</small>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-button waitlist-submit">
                  {submitting ? "Joining the waitlist..." : "Join the waitlist"}{" "}
                  <span>→</span>
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
