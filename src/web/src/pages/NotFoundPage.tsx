import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="auth-page">
      <div className="auth-page__panel">
        <h1>Page not found</h1>
        <p>That page wandered off.</p>
        <Link to="/scrapbook">Back to your scrapbook</Link>
      </div>
    </main>
  );
}
