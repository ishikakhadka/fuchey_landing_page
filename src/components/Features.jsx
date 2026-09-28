import {
  Activity,
  Bug,
  Code2,
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
        <div className="section-heading reveal">
          <p className="eyebrow">{edition.featuresEyebrow}</p>
          <h2>{edition.featuresTitle}</h2>
        </div>

        <div className="feature-grid" key={edition.id}>
          {edition.features.map((feature, index) => {
            const Icon = icons[index];

            return (
              <article
                className="feature-card"
                key={feature.title}
                style={{ "--delay": `${index * 70}ms` }}>
                <div className="feature-top">
                  <div className="feature-icon">
                    <Icon size={22} strokeWidth={1.7} />
                  </div>

                  <span className="feature-number">0{index + 1}</span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
