function EmptyState({ art, title, children, action }) {
  return (
    <div className="empty-state">
      {art && <div className="empty-state-art">{art}</div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
