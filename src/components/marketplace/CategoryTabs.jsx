// Pill tabs for filtering. An option with id null means "All".
function CategoryTabs({ options, value, onChange, label }) {
  return (
    <div className="category-tabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id ?? "all"}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}>
          {option.label}
          {option.count != null && <span className="category-count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
