
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Bell, AlertCircle, Wand2, Loader2, Calendar, X } from 'lucide-react';
import { Task } from '../types';
import { parseNaturalLanguageTask } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { cloudService } from '../services/cloudService';
import { notificationService } from '../services/notificationService';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [showNotifBanner, setShowNotifBanner] = useState(true);
  
  const { user, setSyncStatus } = useAuth();
  const isInitialMount = useRef(true);

  // Load from local storage initially
  useEffect(() => {
    const saved = localStorage.getItem('ls_tasks');
    if (saved) {
      setTasks(JSON.parse(saved));
    }
    setNotifPermission(notificationService.getPermission());
  }, []);

  // Sync Logic
  useEffect(() => {
    // Save to local storage
    localStorage.setItem('ls_tasks', JSON.stringify(tasks));

    // Sync to Cloud if logged in
    const syncToCloud = async () => {
      if (user && !isInitialMount.current) {
        setSyncStatus('syncing');
        try {
          await cloudService.syncTasks(user.id, tasks);
          setSyncStatus('synced');
        } catch (e) {
          setSyncStatus('error');
        }
      }
    };

    const timeoutId = setTimeout(syncToCloud, 1000); // Debounce sync
    
    return () => clearTimeout(timeoutId);
  }, [tasks, user, setSyncStatus]);

  // Fetch from cloud on login
  useEffect(() => {
    const fetchCloudTasks = async () => {
        if (user) {
            setSyncStatus('syncing');
            const cloudTasks = await cloudService.fetchTasks(user.id);
            if (cloudTasks && cloudTasks.length > 0) {
                setTasks(cloudTasks); // In a real app, you might merge. Here we replace.
            }
            setSyncStatus('synced');
        }
    };
    
    if (user) {
        fetchCloudTasks();
    }
    isInitialMount.current = false;
  }, [user, setSyncStatus]);


  // Check for notifications interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks(currentTasks => {
        let hasChanges = false;
        const updatedTasks = currentTasks.map(task => {
          if (!task.isCompleted && !task.notified && new Date(task.dueDate) <= now) {
            
            // Trigger Service Notification
            notificationService.sendNotification('Task Due: ' + task.title, {
                body: task.description || 'This task is due now!',
                tag: task.id // Prevent duplicate notifications
            });

            // If permissions are not granted, fallback to alert
            if (notificationService.getPermission() !== 'granted') {
                 // We don't want to spam alerts, but we should inform the user if they're in the app
                 console.log(`Task Due: ${task.title} (Notification blocked)`);
            }

            hasChanges = true;
            return { ...task, notified: true };
          }
          return task;
        });
        return hasChanges ? updatedTasks : currentTasks;
      });
    }, 15000); // Check every 15 seconds for responsiveness

    return () => clearInterval(interval);
  }, []);

  const handleSmartAdd = async () => {
    if (!newTaskInput.trim()) return;
    setIsAiLoading(true);
    
    const result = await parseNaturalLanguageTask(newTaskInput);
    
    if (result) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: result.title,
        description: '',
        dueDate: result.dueDate,
        priority: result.priority as any,
        isCompleted: false,
        notified: false
      };
      setTasks(prev => [newTask, ...prev]);
      setNewTaskInput('');
      setShowAddModal(false);
    } else {
      alert("Could not parse task. Please try again.");
    }
    setIsAiLoading(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const requestNotificationPermission = async () => {
      const result = await notificationService.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
          notificationService.sendNotification('Notifications Enabled', { body: 'You will receive task reminders.'});
      }
  };

  const formatDueTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      weekday: isToday ? undefined : 'short'
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const pendingTasks = sortedTasks.filter(t => !t.isCompleted);
  const completedTasks = sortedTasks.filter(t => t.isCompleted);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Tasks</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition transform active:scale-95"
        >
          <Plus />
        </button>
      </div>

      {/* Permission Banner */}
      {notifPermission === 'default' && showNotifBanner && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
                <Bell className="text-indigo-500 w-5 h-5 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">Enable Notifications</h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 mb-2">
                        Don't miss your tasks! Tap enable to get reminders.
                    </p>
                    <button 
                        onClick={requestNotificationPermission}
                        className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition"
                    >
                        Enable Now
                    </button>
                </div>
            </div>
            <button onClick={() => setShowNotifBanner(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
            </button>
        </div>
      )}

      {/* Due Soon / Important */}
      {pendingTasks.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
           <div className="flex items-center gap-2 mb-2 text-orange-700 dark:text-orange-400 font-semibold">
              <AlertCircle size={18} />
              <span>Next Up</span>
           </div>
           <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800 dark:text-gray-200">{pendingTasks[0].title}</span>
              <span className="text-sm bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded text-nowrap">
                {formatDueTime(pendingTasks[0].dueDate)}
              </span>
           </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {pendingTasks.map(task => (
           <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleTask(task.id)}
                  className="w-6 h-6 rounded-full border-2 border-indigo-400 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                />
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">{task.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                     <Calendar size={12} />
                     {formatDueTime(task.dueDate)}
                     {task.priority === 'high' && <span className="text-red-500 font-bold">!</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={18} />
              </button>
           </div>
        ))}
        
        {completedTasks.length > 0 && (
          <div className="pt-4">
             <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Completed</h3>
             <div className="space-y-2 opacity-60">
                {completedTasks.map(task => (
                   <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleTask(task.id)}
                          className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <span className="line-through text-gray-500">{task.title}</span>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                   </div>
                ))}
             </div>
          </div>
        )}
        
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No tasks yet. Add one!</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 fade-in">
            <h3 className="text-lg font-bold">New Task</h3>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Tell me what to remind you...</label>
              <textarea 
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="e.g., Buy milk tomorrow at 10am"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSmartAdd}
                disabled={isAiLoading || !newTaskInput}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                {isAiLoading ? 'Parsing...' : 'Smart Add'}
              </button>
            </div>
            <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
              <Wand2 size={10} /> Powered by Gemini AI
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
