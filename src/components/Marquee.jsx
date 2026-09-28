function Marquee({ edition }) {
  // Duplicate the list so the track can loop seamlessly at -50%.
  const words = [...edition.marquee, ...edition.marquee];

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track" key={edition.id}>
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            {word}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}

export default Marquee;
