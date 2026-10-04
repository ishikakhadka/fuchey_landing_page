// NFT-style trait list ({ trait_type, value }), matching Metaplex metadata.
function AttributeList({ attributes }) {
  return (
    <ul className="attribute-list">
      {attributes.map((attr) => (
        <li key={attr.trait_type}>
          <span>{attr.trait_type}</span>
          <strong>{attr.value}</strong>
        </li>
      ))}
    </ul>
  );
}

export default AttributeList;
