import { Link } from "react-router";
import EmptyState from "../components/collection/EmptyState";

function NotFound() {
  return (
    <div className="container market-page">
      <EmptyState
        title="Lost in the snow."
        action={
          <Link to="/" className="primary-button">
            Back home
          </Link>
        }>
        There’s nothing at this address.
      </EmptyState>
    </div>
  );
}

export default NotFound;
