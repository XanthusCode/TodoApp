import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TodoItem from './TodoItem';

const DIFF_LABELS = {
  easy:   '★ Fácil',
  medium: '★★ Normal',
  hard:   '★★★ Épico',
};

const DIFF_WEIGHT = { easy: 1, medium: 2, hard: 3 };

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getLast30Days = () => {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDateKey(d));
  }
  return days;
};

const extractTags = (text) =>
  (text.match(/#(\w+)/g) || []).map(t => t.slice(1).toLowerCase());

const TodoList = () => {
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('todos');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newTask, setNewTask]             = useState('');
  const [difficulty, setDifficulty]       = useState('medium');
  const [focusMode, setFocusMode]         = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activityLog, setActivityLog]     = useState(() => {
    try {
      const saved = localStorage.getItem('activityLog');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [pickedId, setPickedId]   = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  const todosRef = useRef(todos);
  const inputRef = useRef(null);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  useEffect(() => { localStorage.setItem('todos', JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem('activityLog', JSON.stringify(activityLog)); }, [activityLog]);

  // Procrastination tax
  useEffect(() => {
    const applyTax = () => {
      setTodos(prev => prev.map(todo => {
        if (todo.completed) return todo;
        const hours = (Date.now() - (todo.createdAt || Date.now())) / (1000 * 60 * 60);
        if (hours >= 72  && todo.difficulty === 'easy')   return { ...todo, difficulty: 'medium', taxed: true };
        if (hours >= 168 && todo.difficulty === 'medium') return { ...todo, difficulty: 'hard',   taxed: true };
        return todo;
      }));
    };
    applyTax();
    const interval = setInterval(applyTax, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts: N → nueva tarea · F → enfoque · R → aleatoria
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); if (pending.length > 0) setFocusMode(f => !f); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); handleRandomPick(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddTask = useCallback((e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const tags = extractTags(newTask);
    setTodos(prev => [...prev, {
      id: Date.now(),
      text: newTask.trim(),
      completed: false,
      difficulty,
      pomodorosCompleted: 0,
      createdAt: Date.now(),
      taxed: false,
      tags,
    }]);
    setNewTask('');
  }, [newTask, difficulty]);

  const handleFormKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(e); }
  }, [handleAddTask]);

  const handleToggleComplete = useCallback((id) => {
    const current = todosRef.current.find(t => t.id === id);
    if (!current) return;
    const nowCompleting = !current.completed;
    setTodos(prev => prev.map(t =>
      t.id === id
        ? { ...t, completed: nowCompleting, completedAt: nowCompleting ? Date.now() : undefined }
        : t
    ));
    if (nowCompleting) {
      const today = getDateKey();
      setActivityLog(prev => ({ ...prev, [today]: (prev[today] || 0) + 1 }));
    }
  }, []);

  const handleUpdate = useCallback((id, newText) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, text: newText, tags: extractTags(newText) } : t
    ));
  }, []);

  const handleDelete = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const handlePomodoroComplete = useCallback((id) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t
    ));
  }, []);

  const pending   = useMemo(() => todos.filter(t => !t.completed), [todos]);
  const completed = useMemo(() => todos.filter(t => t.completed),  [todos]);
  const focusTask = useMemo(() => pending[0] ?? null, [pending]);

  const allTags = useMemo(() => {
    const set = new Set();
    pending.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    return [...set].sort();
  }, [pending]);

  const filteredPending = useMemo(() => {
    if (!activeTag) return pending;
    return pending.filter(t => (t.tags || []).includes(activeTag));
  }, [pending, activeTag]);

  const handleFocusComplete = useCallback(() => {
    if (focusTask) handleToggleComplete(focusTask.id);
  }, [focusTask, handleToggleComplete]);

  const handleFocusSkip = useCallback(() => {
    if (!focusTask) return;
    setTodos(prev => [...prev.filter(t => t.id !== focusTask.id), focusTask]);
  }, [focusTask]);

  const handleRandomPick = useCallback(() => {
    if (pending.length < 2) return;
    const weighted = pending.map(t => {
      const ageHours = (Date.now() - (t.createdAt || Date.now())) / (1000 * 60 * 60);
      return { id: t.id, weight: (ageHours / 24 + 1) * DIFF_WEIGHT[t.difficulty] };
    });
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * total;
    let picked = weighted[0].id;
    for (const { id, weight } of weighted) {
      rand -= weight;
      if (rand <= 0) { picked = id; break; }
    }
    setPickedId(picked);
    setTimeout(() => setPickedId(null), 3500);
  }, [pending]);

  // Dynamic subtitle based on current state
  const dynamicSubtitle = useMemo(() => {
    const todayCount = activityLog[getDateKey()] || 0;
    const total = pending.length;
    const oldest = pending.reduce((o, t) => (!o || t.createdAt < o.createdAt) ? t : o, null);
    const oldestDays = oldest ? Math.floor((Date.now() - oldest.createdAt) / 86400000) : 0;

    if (total === 0 && todayCount > 0) return `${todayCount} tarea${todayCount > 1 ? 's' : ''} completada${todayCount > 1 ? 's' : ''} hoy. Excelente.`;
    if (total === 0)                   return 'Sin pendientes. Momento de crear nuevas metas.';
    if (todayCount >= 5)               return `${todayCount} completadas hoy. Imparable.`;
    if (oldestDays >= 7)               return `Una tarea lleva ${oldestDays} días esperando.`;
    if (todayCount === 0 && total > 0) return `${total} tarea${total > 1 ? 's' : ''} esperando. ¿Por cuál empezamos?`;
    return `${todayCount} completada${todayCount > 1 ? 's' : ''} hoy · ${total} pendiente${total > 1 ? 's' : ''}.`;
  }, [pending, activityLog]);

  const last30Days  = useMemo(() => getLast30Days(), []);
  const maxActivity = useMemo(() => Math.max(1, ...Object.values(activityLog)), [activityLog]);
  const sortedCompleted = useMemo(
    () => [...completed].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [completed]
  );

  return (
    <>
      <p className="subtitulo">{dynamicSubtitle}</p>

      <div className="todo-container">
        <form className="todo-form" onSubmit={handleAddTask}>
          <div className="todo-form-row">
            <textarea
              ref={inputRef}
              className="todo-edit-input"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={handleFormKeyDown}
              placeholder="Nueva tarea... usa #etiquetas"
              rows={2}
            />
            <button type="submit" className="btn btn-add">Agregar</button>
          </div>
          <div className="difficulty-selector" role="group" aria-label="Dificultad">
            {Object.entries(DIFF_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`diff-btn ${key} ${difficulty === key ? 'active' : ''}`}
                onClick={() => setDifficulty(key)}
                aria-pressed={difficulty === key}
              >
                {label}
              </button>
            ))}
          </div>
        </form>

        <div className="list-header">
          <span className="task-counter">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            {activeTag && <span className="filter-indicator"> · #{activeTag}</span>}
          </span>
          <div className="list-header-actions">
            {pending.length > 1 && (
              <button
                className="btn-random"
                onClick={handleRandomPick}
                title="¿Qué hago ahora? (R)"
                aria-label="Elegir tarea aleatoria"
              >
                ⚄
              </button>
            )}
            <button
              className={`focus-toggle ${focusMode ? 'active' : ''}`}
              onClick={() => setFocusMode(f => !f)}
              disabled={pending.length === 0}
              aria-pressed={focusMode}
              title="Modo enfoque (F)"
            >
              {focusMode ? '← Lista' : '⊙ Enfoque'}
            </button>
          </div>
        </div>

        {/* Tag filter bar */}
        {allTags.length > 0 && !focusMode && (
          <div className="tag-filter">
            <button
              className={`tag-filter-chip ${activeTag === null ? 'active' : ''}`}
              onClick={() => setActiveTag(null)}
            >
              Todas
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter-chip ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(t => t === tag ? null : tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {focusMode && focusTask ? (
          <div className="focus-card">
            <p className="focus-card-label">Tarea actual</p>
            <p className="focus-card-text">{focusTask.text}</p>
            <div className="focus-card-meta">
              <span className={`difficulty-badge ${focusTask.difficulty}`}>
                {DIFF_LABELS[focusTask.difficulty]}
              </span>
            </div>
            <div className="focus-card-actions">
              <button className="btn-complete-focus" onClick={handleFocusComplete}>Completar ✓</button>
              {pending.length > 1 && (
                <button className="btn-skip-focus" onClick={handleFocusSkip}>Saltar →</button>
              )}
            </div>
          </div>
        ) : focusMode && !focusTask ? (
          <div className="empty-state">Sin pendientes. ¡Todo listo!</div>
        ) : pending.length === 0 && completed.length === 0 ? (
          <div className="empty-state">No hay tareas. Agrega una arriba.</div>
        ) : (
          <>
            {filteredPending.length === 0 && activeTag ? (
              <div className="empty-state">Sin tareas con #{activeTag}.</div>
            ) : (
              <ul className="todo-list">
                {filteredPending.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    isPicked={todo.id === pickedId}
                    onToggleComplete={handleToggleComplete}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onPomodoroComplete={handlePomodoroComplete}
                  />
                ))}
              </ul>
            )}

            {completed.length > 0 && (
              <div className="completed-section">
                <button
                  className="completed-toggle"
                  onClick={() => setShowCompleted(s => !s)}
                  aria-expanded={showCompleted}
                >
                  {showCompleted ? '▾' : '▸'} Cementerio ({completed.length})
                </button>
                {showCompleted && (
                  <ul className="completed-list">
                    {sortedCompleted.map(todo => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        isPicked={false}
                        onToggleComplete={handleToggleComplete}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onPomodoroComplete={handlePomodoroComplete}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="heat-map">
        <p className="heat-map-label">actividad — 30 días</p>
        <div className="heat-map-grid">
          {last30Days.map(day => {
            const count     = activityLog[day] || 0;
            const intensity = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxActivity) * 4));
            return (
              <div
                key={day}
                className={`heat-cell heat-${intensity}`}
                title={`${day}: ${count} tarea${count !== 1 ? 's' : ''}`}
              />
            );
          })}
        </div>
        <p className="shortcuts-hint">N · nueva tarea &nbsp;·&nbsp; F · enfoque &nbsp;·&nbsp; R · aleatoria</p>
      </div>
    </>
  );
};

export default TodoList;
