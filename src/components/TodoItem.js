import React, { useState } from 'react';
//import './App.css'; 

const TodoItem = ({ todo, onToggleComplete, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState(todo.text);

  const handleUpdate = () => {
    onUpdate(todo.id, newText);
    setIsEditing(false);
  };

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="todo-item-content">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggleComplete(todo.id)}
          className="todo-checkbox"
        />
        {isEditing ? (
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="todo-edit-input"
          />
        ) : (
          <span className="todo-text">{todo.text}</span>
        )}
      </div>
      <div className="todo-item-actions">
        {isEditing ? (
          <>
            <button onClick={handleUpdate} className="btn btn-update">Update</button>
            <button onClick={() => setIsEditing(false)} className="btn btn-cancel">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setIsEditing(true)} className="btn btn-edit">Edit</button>
            <button onClick={() => onDelete(todo.id)} className="btn btn-delete">Delete</button>
          </>
        )}
      </div>
    </li>
  );
};

export default TodoItem;
