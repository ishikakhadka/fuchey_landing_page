function PageHeader({ eyebrow, title, children, aside }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="page-header-lede">{children}</p>}
      </div>

      {aside && <div className="page-header-aside">{aside}</div>}
    </header>
  );
}

export default PageHeader;
