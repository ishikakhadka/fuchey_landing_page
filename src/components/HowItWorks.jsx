import { Activity, Sparkles, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Activity,
    title: "Your wallet moves",
    text: "Send, receive, mint or sign on Solana — just like you do today.",
  },
  {
    icon: Sparkles,
    title: "Fuchey feels it",
    text: "Every transaction becomes a reaction on the display, right there on your desk.",
  },
  {
    icon: TrendingUp,
    title: "It grows with you",
    text: "Moods, levels and collectibles build Fuchey's personality over time.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="how-section">
      <div className="container">
        <div className="section-heading reveal">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>Crypto you can actually see.</h2>
          <p>
            Wallets are functional, but rarely personal. Fuchey gives your
            on-chain life a physical presence — tangible, approachable and
            honestly, more fun.
          </p>
        </div>

        <ol className="steps">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <li className="step reveal" key={step.title}>
                <div className="step-top">
                  <span className="step-number">0{index + 1}</span>
                  <span className="step-icon">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
