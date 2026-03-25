import { Outlet, Link } from 'react-router-dom';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-header__link">
          <h1>CodePen Extractor</h1>
        </Link>
        <p>Extrae, almacena y transforma animaciones de CodePen</p>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
