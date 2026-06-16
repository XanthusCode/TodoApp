import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { launchConfetti } from '../utils/confetti';
import '../App.css';

const POMODORO_SECONDS = 25 * 60;
const DESTROY_MS       = 450;
const COLLAPSE_MS      = 240;

const DIFF_LABELS = { easy: 'Fácil', medium: 'Normal', hard: 'Épico' };

const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const getAgeTier = (createdAt) => {
  const hours = (Date.now() - (createdAt || Date.now())) / (1000 * 60 * 60);
  if (hours < 24)  return { cls: 'age-fresh',   label: null };
  if (hours < 72)  return { cls: 'age-aging',   label: '1d+' };
  if (hours < 168) return { cls: 'age-old',     label: '3d+' };
  return               { cls: 'age-ancient', label: '7d+' };
};

const TodoItem = ({ todo, isPicked, onToggleComplete, onUpdate, onDelete, onPomodoroComplete }) => {
  const [isEditing, setIsEditing]               = useState(false);
  const [newText, setNewText]                   = useState(todo.text);
  const [timeLeft, setTimeLeft]                 = useState(POMODORO_SECONDS);
  const [timerActive, setTimerActive]           = useState(false);
  const [destroying, setDestroying]             = useState(false);
  const [collapsing, setCollapsing]             = useState(false);
  const [showDeleteReason, setShowDeleteReason] = useState(false);
  const [deleteReason, setDeleteReason]         = useState('');

  const destroyTimerRef  = useRef(null);
  const collapseTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(destroyTimerRef.current);
    clearTimeout(collapseTimerRef.current);
  }, []);

  // Pomodoro countdown (deshabilitado en UI, lógica conservada)
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          onPomodoroComplete(todo.id);
          return POMODORO_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, todo.id, onPomodoroComplete]);

  const handleComplete = useCallback(() => {
    if (todo.completed) { onToggleComplete(todo.id); return; }
    if (todo.difficulty === 'hard') launchConfetti();
    setDestroying(true);
    destroyTimerRef.current = setTimeout(() => {
      setDestroying(false);
      setCollapsing(true);
      collapseTimerRef.current = setTimeout(() => {
        onToggleComplete(todo.id);
      }, COLLAPSE_MS);
    }, DESTROY_MS);
  }, [todo.completed, todo.id, todo.difficulty, onToggleComplete]);

  const handleUpdate = useCallback(() => {
    if (newText.trim()) onUpdate(todo.id, newText.trim());
    setIsEditing(false);
  }, [newText, todo.id, onUpdate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleUpdate();
    if (e.key === 'Escape') setIsEditing(false);
  }, [handleUpdate]);

  const handleStartEdit    = useCallback(() => setIsEditing(true),  []);
  const handleCancelEdit   = useCallback(() => setIsEditing(false), []);
  const handleToggleTimer  = useCallback(() => setTimerActive(a => !a), []);

  const handleDeleteClick  = useCallback(() => setShowDeleteReason(true), []);
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteReason(false);
    setDeleteReason('');
  }, []);
  const handleDeleteConfirm = useCallback(() => {
    onDelete(todo.id);
  }, [onDelete, todo.id]);
  const handleDeleteKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleDeleteConfirm();
    if (e.key === 'Escape') handleDeleteCancel();
  }, [handleDeleteConfirm, handleDeleteCancel]);

  const { cls: ageCls, label: ageLabel } = getAgeTier(todo.createdAt);

  // Strip #tags from display text when tags are parsed
  const displayText = useMemo(() => {
    if (!todo.tags?.length) return todo.text;
    return todo.text.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
  }, [todo.text, todo.tags]);

  const timerLabel = useMemo(() =>
    timerActive ? formatTime(timeLeft)
      : timeLeft < POMODORO_SECONDS ? `${formatTime(timeLeft)} ▶` : '▶'
  , [timerActive, timeLeft]);

  const itemClass = useMemo(() => [
    'todo-item',
    todo.completed ? 'completed' : ageCls,
    isEditing       ? 'editing'    : '',
    destroying      ? 'destroying' : '',
    collapsing      ? 'collapsing' : '',
    isPicked        ? 'picked'     : '',
  ].filter(Boolean).join(' '), [todo.completed, ageCls, isEditing, destroying, collapsing, isPicked]);

  return (
    <li className={itemClass}>
      <div className="todo-item-content">
        {!isEditing && (
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={handleComplete}
            className="todo-checkbox"
            aria-label={`Marcar "${todo.text}" como completada`}
          />
        )}
        {isEditing ? (
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="todo-edit-input"
            aria-label="Editar tarea"
            autoFocus
            rows={2}
          />
        ) : (
          <div className="todo-item-left">
            <span className="todo-text">{displayText}</span>
            <div className="todo-item-meta">
              <span className={`difficulty-badge ${todo.difficulty}`}>
                {DIFF_LABELS[todo.difficulty]}
              </span>
              {(todo.tags || []).map(tag => (
                <span key={tag} className="tag-chip">#{tag}</span>
              ))}
              {todo.taxed && !todo.completed && (
                <span className="taxed-badge" title="Dificultad subió por procrastinación">⬆ penalizado</span>
              )}
              {ageLabel && !todo.completed && (
                <span className="age-label" title="Esta tarea lleva varios días pendiente">{ageLabel}</span>
              )}
              {todo.completed && todo.completedAt && (
                <span className="completed-at-badge">
                  {new Date(todo.completedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  {' · '}
                  {new Date(todo.completedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {todo.pomodorosCompleted > 0 && (
                <div className="pomodoro-dots" aria-label={`${todo.pomodorosCompleted} pomodoros`}>
                  {Array.from({ length: todo.pomodorosCompleted }).map((_, i) => (
                    <span key={i} className="pomodoro-dot" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="todo-edit-actions">
          <button onClick={handleCancelEdit} className="btn btn-cancel" aria-label="Cancelar edición">
            Cancelar
          </button>
          <button onClick={handleUpdate} className="btn btn-update" aria-label="Guardar cambios">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Guardar
          </button>
        </div>
      ) : showDeleteReason ? (
        <div className="delete-reason-row">
          <input
            autoFocus
            className="reason-input"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            onKeyDown={handleDeleteKeyDown}
            placeholder="¿Por qué la eliminás?"
            maxLength={60}
          />
          <button onClick={handleDeleteConfirm} className="btn-reason-confirm" aria-label="Confirmar eliminación" title="Confirmar (Enter)">✓</button>
          <button onClick={handleDeleteCancel}  className="btn-reason-cancel"  aria-label="Cancelar"             title="Cancelar (Esc)">✕</button>
        </div>
      ) : (
        <div className="todo-item-actions">
          {/* Pomodoro timer — deshabilitado temporalmente
          {!todo.completed && (
            <button className={`timer-btn ${timerActive ? 'running' : ''}`} onClick={handleToggleTimer}
              aria-label={timerActive ? 'Pausar Pomodoro' : 'Iniciar Pomodoro'}>
              {timerLabel}
            </button>
          )}
          */}
          <button onClick={handleStartEdit} className="btn btn-edit" aria-label="Editar tarea">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={handleDeleteClick} className="btn btn-delete" aria-label="Eliminar tarea">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </li>
  );
};

export default TodoItem;
