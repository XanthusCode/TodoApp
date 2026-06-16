import React, { useEffect } from 'react';

import TodoList from './components/TodoList';

import './App.css';

const APP_NAME = 'Mis Tareas';

const App = () => {
  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="titulo">{APP_NAME}</h1>
      </header>
      <main className="app-main">
        <TodoList />
      </main>
    </div>
  );
};

export default App;
