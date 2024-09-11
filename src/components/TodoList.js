import React, { useState } from 'react';
import TodoItem from './TodoItem';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');

  const handleAddTask = (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario
    if (newTask.trim()) {
      setTodos([
        ...todos,
        { id: Date.now(), text: newTask, completed: false }
      ]);
      setNewTask(''); // Limpia el campo de entrada
    }
  };

  const handleToggleComplete = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleUpdate = (id, newText) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, text: newText } : todo
    ));
  };

  const handleDelete = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <>
    <div className="form-container">
        <form onSubmit={handleAddTask}>
            <input
                className='form-input'
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a new task" />
            <button type="submit" className='btn'>Add Task</button>
        </form>
    </div>
    <div>
        <ul>
            {todos.map(todo => (
                <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggleComplete={handleToggleComplete}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete} />
            ))}
        </ul>
    </div>
    </>
  );
};

export default TodoList;
