import { Home } from './pages/Home.js';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>CodePen Extractor</h1>
        <p>Extrae, almacena y transforma animaciones de CodePen</p>
      </header>
      <main className="app-main">
        <Home />
      </main>
    </div>
  );
}
