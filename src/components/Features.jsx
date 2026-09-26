import "../index.css";
import {
  Activity,
  Bug,
  Code2,
  Database,
  Heart,
  Sparkles,
  Trophy,
  Wallet,
  Webhook,
  Zap,
  Terminal,
  Radio,
} from "lucide-react";

const devIcons = [Terminal, Activity, Bug, Code2, Radio, Webhook];

const companionIcons = [Wallet, Heart, Sparkles, Trophy, Activity, Zap];

function Features({ edition }) {
  const isDev = edition.id === "dev";
  const icons = isDev ? devIcons : companionIcons;

  return (
    <section id="features" className="features-section">
      <div className="container">
        <div className="section-heading">
          <p className="eyebrow">
            {isDev ? "DEVELOPER TOOLKIT" : "FUCHEY LIFE"}
          </p>

          <h2>
            {isDev
              ? "Closer to the chain."
              : "A wallet with a little personality."}
          </h2>
        </div>

        <div
          className={`feature-grid ${isDev ? "dev-grid" : "companion-grid"}`}>
          {edition.features.map((feature, index) => {
            const Icon = icons[index];

            return (
              <div
                className="feature-card"
                key={feature}
                style={{ "--delay": `${index * 80}ms` }}>
                <div className="feature-top">
                  <span className="feature-number">0{index + 1}</span>

                  <div className="feature-icon">
                    <Icon size={22} strokeWidth={1.7} />
                  </div>
                </div>

                <div className="feature-content">
                  <h3>{feature}</h3>
                </div>

                <div className="feature-glow" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
