import { Blocks, Gem, Palette, Shirt } from "lucide-react";

const items = [
  {
    icon: Gem,
    title: "Digital collectibles",
    text: "Items and moments your Fuchey earns and keeps.",
  },
  {
    icon: Palette,
    title: "Character customization",
    text: "Make your Fuchey unmistakably yours.",
  },
  {
    icon: Shirt,
    title: "Wearables & editions",
    text: "Scarves, beanies and limited device drops.",
  },
  {
    icon: Blocks,
    title: "Developer platform",
    text: "Build your own experiences on top of Fuchey.",
  },
];

function Ecosystem() {
  return (
    <section className="ecosystem-section">
      <div className="container ecosystem-grid">
        <div className="section-heading reveal">
          <p className="eyebrow">BEYOND THE DEVICE</p>
          <h2>The hardware is just the entry point.</h2>
          <p>
            Fuchey is a physical gateway into a growing digital world — not a
            one-time gadget.
          </p>
        </div>

        <ul className="ecosystem-list">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <li className="reveal" key={item.title}>
                <span className="ecosystem-icon">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default Ecosystem;
