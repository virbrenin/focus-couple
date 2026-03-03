import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Calendar, CheckCircle2, TrendingUp, UserCircle2, Loader2,
  Sparkles, Volume2, X, Lightbulb, ChevronRight, Settings,
  Trash2, PlusCircle, Save, FileText, RotateCcw, Clock,
  Pencil, TableProperties, Activity
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCirCvtggECv_sPRnxFwN9j2ViW2UksjFc",
  authDomain: "focus-couple.firebaseapp.com",
  projectId: "focus-couple",
  storageBucket: "focus-couple.firebasestorage.app",
  messagingSenderId: "1087370622343",
  appId: "1:1087370622343:web:b13763f7ba37fbec7e4f22"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'focus-couple-app';

// Available Emojis for Tasks
const EMOJI_LIST = ['📌', '📖', '🏃‍♂️', '💪', '💊', '🍎', '🥤', '☕', '📱', '💻', '⛪', '🏍️', '🚗', '🍱', '🧹', '🛒', '💰', '🙏', '😴', '🎮'];

const App = () => {
  const [user, setUser] = useState(null);
  const [activeUser, setActiveUser] = useState('Gunawan');
  const [view, setView] = useState('weekly'); // 'weekly', 'monthly', 'settings', 'logs'
  const [reportTab, setReportTab] = useState('table'); // 'table', 'history'
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Gemini AI States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Custom Confirm Modal State
  const [confirmAction, setConfirmAction] = useState({ isOpen: false, message: '', action: null });

  // Back Office (BO) States
  const [editName, setEditName] = useState("");
  const [editingTask, setEditingTask] = useState(null); // { id, category }
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskTarget, setNewTaskTarget] = useState(1);
  const [newTaskIcon, setNewTaskIcon] = useState("📌");
  const [newTaskCategory, setNewTaskCategory] = useState("weekly");

  // Initial template if no data exists in Cloud
  const initialDataTemplate = {
    weekly: [
      { id: 'w1', label: 'Baca Alkitab', target: 7, current: 0, icon: '📖' },
      { id: 'w2', label: 'Live Stream', target: 1, current: 0, icon: '🎥' },
      { id: 'w3', label: 'Olahraga di rumah', target: 2, current: 0, icon: '🏠' },
      { id: 'w4', label: 'Minum Vitamin D', target: 7, current: 0, icon: '💊' },
      { id: 'w5', label: 'Ngurus Kost', target: 1, current: 0, icon: '🏘️' },
      { id: 'w6', label: 'Makan Buah', target: 2, current: 0, icon: '🍎' },
      { id: 'w7', label: 'Snacking Manis', target: 2, current: 0, icon: '🍪' },
      { id: 'w8', label: 'Minum Manis', target: 1, current: 0, icon: '🥤' },
      { id: 'w9', label: 'Doa Sebelum Tidur', target: 7, current: 0, icon: '🙏' },
    ],
    monthly: [
      { id: 'm1', label: 'Bikin Konten', target: 2, current: 0, icon: '📱' },
      { id: 'm2', label: 'Gereja', target: 2, current: 0, icon: '⛪' },
      { id: 'm3', label: 'Ke Kantor (Motor)', target: 4, current: 0, icon: '🏍️' },
      { id: 'm4', label: 'Bawa Bekal', target: 4, current: 0, icon: '🍱' },
    ]
  };

  const [globalData, setGlobalData] = useState({
    Gunawan: initialDataTemplate,
    Istri: initialDataTemplate,
    logs: [],
    lastWeeklyReset: new Date().toISOString(),
    lastMonthlyReset: new Date().toISOString()
  });

  const userKeys = Object.keys(globalData).filter(key => !['logs', 'lastWeeklyReset', 'lastMonthlyReset'].includes(key));

  // --- Reset Forms on View/User Change ---
  useEffect(() => {
    cancelEdit();
  }, [activeUser, view]);

  // 1. Authentication Lifecycle
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Real-time Data Sync with Firestore
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'coupleProgress', 'sharedState');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          if (!data.logs) data.logs = [];
          if (!data.lastWeeklyReset) data.lastWeeklyReset = new Date().toISOString();
          if (!data.lastMonthlyReset) data.lastMonthlyReset = new Date().toISOString();

          setGlobalData(data);

          const currentUsers = Object.keys(data).filter(k => !['logs', 'lastWeeklyReset', 'lastMonthlyReset'].includes(k));
          if (!currentUsers.includes(activeUser) && currentUsers.length > 0) {
            setActiveUser(currentUsers[0]);
          }
        }
      } else {
        const initialState = {
          Gunawan: initialDataTemplate,
          Istri: initialDataTemplate,
          logs: [],
          lastWeeklyReset: new Date().toISOString(),
          lastMonthlyReset: new Date().toISOString()
        };
        setDoc(docRef, initialState);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, [user, activeUser]);

  const saveToCloud = async (newData) => {
    setGlobalData(newData);
    const docRef = doc(db, 'coupleProgress', 'sharedState');
    try {
      await setDoc(docRef, newData);
    } catch (e) {
      console.error("Error saving to cloud:", e);
    }
  };

  // --- Utility Functions for Dates ---
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getFirstOfMonth = (d) => {
    const date = new Date(d);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // --- Auto Reset System (Cron-like) ---
  useEffect(() => {
    if (isLoadingData || !globalData || !globalData.lastWeeklyReset) return;

    const now = new Date();
    const currentMonday = getMonday(now).getTime();
    const currentFirstOfMonth = getFirstOfMonth(now).getTime();

    const lastW = new Date(globalData.lastWeeklyReset).getTime();
    const lastM = new Date(globalData.lastMonthlyReset).getTime();

    let newData = null;
    let needsUpdate = false;

    // Trigger Weekly Auto-Reset
    if (now.getTime() >= currentMonday && lastW < currentMonday) {
      newData = newData || { ...globalData };
      newData = executeReset(newData, 'weekly', true);
      newData.lastWeeklyReset = now.toISOString();
      needsUpdate = true;
    }

    // Trigger Monthly Auto-Reset
    if (now.getTime() >= currentFirstOfMonth && lastM < currentFirstOfMonth) {
      newData = newData || { ...globalData };
      newData = executeReset(newData, 'monthly', true);
      newData.lastMonthlyReset = now.toISOString();
      needsUpdate = true;
    }

    if (needsUpdate && newData) {
      saveToCloud(newData);
    }
  }, [globalData.lastWeeklyReset, globalData.lastMonthlyReset, isLoadingData]);


  // --- Helper: Process Reset & Generate Report Data ---
  const executeReset = (currentData, period, isAuto = false) => {
    let reportMessage = `📊 LAPORAN ${period === 'weekly' ? 'MINGGUAN' : 'BULANAN'} ${isAuto ? '(OTOMATIS)' : '(MANUAL)'}:\n`;
    let reportScores = {};

    userKeys.forEach(u => {
      const tasks = currentData[u][period];
      const pct = calculateProgress(tasks);
      reportMessage += `• ${u}: ${pct}%\n`;
      reportScores[u] = pct;

      // Reset targets current to 0
      currentData[u][period] = tasks.map(t => ({ ...t, current: 0 }));
    });

    const newLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: new Date().toISOString(),
      message: reportMessage,
      type: 'report',
      reportData: { period, scores: reportScores, isAuto }
    };

    currentData.logs = [newLog, ...(currentData.logs || [])].slice(0, 50);
    return currentData;
  };

  const addLogEntry = (currentData, message, type = 'system') => {
    const newLog = { id: Date.now().toString() + Math.random(), date: new Date().toISOString(), message, type };
    return [newLog, ...(currentData.logs || [])].slice(0, 50);
  };

  // --- Core Actions ---
  const updateProgress = (userId, category, taskId, increment) => {
    if (!user) return;
    const currentTasks = globalData[userId][category];
    const updatedTasks = currentTasks.map(task => {
      if (task.id === taskId) {
        const newVal = Math.max(0, Math.min(task.target, task.current + increment));
        return { ...task, current: newVal };
      }
      return task;
    });
    const newData = { ...globalData, [userId]: { ...globalData[userId], [category]: updatedTasks } };
    saveToCloud(newData);
  };

  // --- BO / Settings Actions ---
  const handleRenameUser = () => {
    if (!editName.trim() || editName === activeUser || globalData[editName]) return;
    const newData = { ...globalData };
    newData[editName] = newData[activeUser];
    delete newData[activeUser];

    newData.logs = addLogEntry(newData, `Profil '${activeUser}' diubah menjadi '${editName}'`, 'system');
    setActiveUser(editName);
    setEditName("");
    saveToCloud(newData);
  };

  const startEditTask = (category, task) => {
    setEditingTask({ id: task.id, category });
    setNewTaskLabel(task.label);
    setNewTaskTarget(task.target);
    setNewTaskIcon(task.icon);
    setNewTaskCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setNewTaskLabel('');
    setNewTaskTarget(1);
    setNewTaskIcon('📌');
    setNewTaskCategory('weekly');
  };

  const handleSaveTask = () => {
    if (!newTaskLabel.trim() || newTaskTarget < 1) return;

    const newData = { ...globalData };

    if (editingTask) {
      // EDIT EXISTING
      const oldCat = editingTask.category;
      const newCat = newTaskCategory;

      if (oldCat === newCat) {
        // Same category update
        newData[activeUser][newCat] = newData[activeUser][newCat].map(t =>
          t.id === editingTask.id ? { ...t, label: newTaskLabel, target: Number(newTaskTarget), icon: newTaskIcon } : t
        );
      } else {
        // Moving to different category
        const taskToMove = newData[activeUser][oldCat].find(t => t.id === editingTask.id);
        newData[activeUser][oldCat] = newData[activeUser][oldCat].filter(t => t.id !== editingTask.id);
        newData[activeUser][newCat].push({
          ...taskToMove,
          label: newTaskLabel,
          target: Number(newTaskTarget),
          icon: newTaskIcon,
          current: Math.min(taskToMove.current, Number(newTaskTarget)) // Ensure current doesn't exceed new target
        });
      }
      newData.logs = addLogEntry(newData, `${activeUser} mengedit tugas: '${newTaskLabel}'`, 'system');
    } else {
      // ADD NEW
      const newTaskObj = {
        id: 't_' + Date.now(), label: newTaskLabel, target: Number(newTaskTarget), current: 0, icon: newTaskIcon
      };
      newData[activeUser][newTaskCategory] = [...newData[activeUser][newTaskCategory], newTaskObj];
      newData.logs = addLogEntry(newData, `${activeUser} menambah tugas baru: '${newTaskLabel}'`, 'system');
    }

    cancelEdit();
    saveToCloud(newData);
  };

  const handleDeleteTask = (category, taskId) => {
    setConfirmAction({
      isOpen: true,
      message: "Yakin ingin menghapus tugas ini secara permanen?",
      action: () => {
        const newData = { ...globalData };
        const taskToDelete = newData[activeUser][category].find(t => t.id === taskId);
        newData[activeUser][category] = newData[activeUser][category].filter(t => t.id !== taskId);

        if (taskToDelete) {
          newData.logs = addLogEntry(newData, `${activeUser} menghapus tugas: '${taskToDelete.label}'`, 'system');
        }
        saveToCloud(newData);
      }
    });
  };

  const handleManualReset = (period) => {
    setConfirmAction({
      isOpen: true,
      message: `Buat Laporan ${period === 'weekly' ? 'Mingguan' : 'Bulanan'} manual & reset progress ke 0?`,
      action: () => {
        let newData = { ...globalData };
        newData = executeReset(newData, period, false);

        // Update last reset so it doesn't double trigger
        if (period === 'weekly') newData.lastWeeklyReset = new Date().toISOString();
        if (period === 'monthly') newData.lastMonthlyReset = new Date().toISOString();

        saveToCloud(newData);
        setView('logs');
        setReportTab('table');
      }
    });
  };

  // --- Gemini API Implementations ---
  const callGemini = async (payload, endpoint = "generateContent", model = "gemini-2.5-flash-preview-09-2025") => {
    const geminiApiKey = ""; // Environment handles this
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${geminiApiKey}`;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) return await response.json();
      } catch (e) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
    throw new Error("Gemini API is currently unavailable");
  };

  const getAiInsight = async (type = 'motivation') => {
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    setAiResponse("");

    const tasks = globalData[activeUser][view === 'settings' || view === 'logs' ? 'weekly' : view] || [];
    const progressText = tasks.map(t => `${t.label}: ${t.current}/${t.target}`).join(", ");

    let prompt = "";
    if (type === 'motivation') {
      prompt = `Kamu adalah asisten penyemangat yang sangat hangat dan ceria. Saat ini ${activeUser} sedang melihat targetnya. Progres mereka: ${progressText}. Berikan pesan motivasi singkat (maksimal 2 kalimat) dalam Bahasa Indonesia gaul untuk menyemangati mereka menyelesaikan sisanya. Sertakan emoji lucu.`;
    } else if (type === 'content') {
      prompt = `Berdasarkan aktivitas bulan ini: ${progressText}, berikan 2 ide konten sosial media (Reels/TikTok) yang kreatif. Format: "1. [Judul] - [Ide]. 2. [Judul] - [Ide]." Bahasa Indonesia asik.`;
    }

    try {
      const result = await callGemini({ contents: [{ parts: [{ text: prompt }] }] });
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiResponse(typeof text === 'string' ? text : "AI sedang kehabisan kata-kata...");
    } catch (e) {
      setAiResponse("Koneksi ke AI terputus. Coba klik lagi ya!");
    } finally {
      setIsAiLoading(false);
    }
  };

  const playTts = async (textToSpeak) => {
    if (isSpeaking || !textToSpeak) return;
    setIsSpeaking(true);
    try {
      const result = await callGemini({
        contents: [{ parts: [{ text: `Katakan dengan nada hangat, dan ceria: ${textToSpeak}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
        },
        model: "gemini-2.5-flash-preview-tts"
      }, "generateContent", "gemini-2.5-flash-preview-tts");

      const audioData = result.candidates[0].content.parts[0].inlineData.data;
      const audioBlob = await fetch(`data:audio/wav;base64,${audioData}`).then(res => res.blob());
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const totalTarget = tasks.reduce((acc, t) => acc + (t.target || 0), 0);
    const totalCurrent = tasks.reduce((acc, t) => acc + (t.current || 0), 0);
    return totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (isoString) => {
    return new Date(isoString).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-bold">Menghubungkan ke Cloud...</p>
        </div>
      </div>
    );
  }

  const activeTasks = globalData[activeUser]?.[view === 'settings' || view === 'logs' ? 'weekly' : view] || [];
  const overallPercentage = calculateProgress(activeTasks);

  // Filters for tables
  const reportLogs = globalData.logs.filter(l => l.type === 'report');
  const systemLogs = globalData.logs.filter(l => l.type === 'system');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header Profile Switcher */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-4 py-4 flex justify-between items-center shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 mr-4">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 shrink-0">
            <TrendingUp size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight hidden sm:block">FocusCouple</h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl whitespace-nowrap overflow-x-auto">
          {userKeys.map(u => (
            <button
              key={u}
              onClick={() => { setActiveUser(u); setView('weekly'); }}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeUser === u ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-slate-500 opacity-70 hover:opacity-100'}`}
            >
              {u}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-8">

        {/* Progress Summary Card */}
        {(view === 'weekly' || view === 'monthly') && (
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-[32px] p-7 text-white mb-8 shadow-2xl shadow-indigo-200 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-[0.2em] mb-1">Target {view === 'weekly' ? 'Mingguan' : 'Bulanan'}</p>
                  <h2 className="text-2xl font-black truncate max-w-[200px]">Hi, {activeUser}!</h2>
                </div>
                <button
                  onClick={() => getAiInsight('motivation')}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl backdrop-blur-md transition-all active:scale-90 shadow-sm border border-white/20"
                >
                  <Sparkles size={22} className="text-yellow-300" />
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl font-black tracking-tighter tabular-nums">{String(overallPercentage)}%</span>
                <span className="text-indigo-200 font-bold uppercase text-[10px] tracking-widest">Selesai</span>
              </div>

              <div className="h-4 bg-black/10 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
            <div className="absolute -right-10 -top-10 bg-white/10 w-40 h-40 rounded-full blur-[60px] group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute -left-10 -bottom-10 bg-indigo-400/20 w-40 h-40 rounded-full blur-[60px]"></div>
          </div>
        )}

        {/* View Toggle */}
        <div className="grid grid-cols-4 gap-1.5 mb-8 bg-slate-200/50 p-1.5 rounded-[26px]">
          <button
            onClick={() => setView('weekly')}
            className={`py-3 rounded-[20px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${view === 'weekly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Calendar size={18} />
            <span className="text-[9px] uppercase tracking-wider">Mingguan</span>
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`py-3 rounded-[20px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${view === 'monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <TrendingUp size={18} />
            <span className="text-[9px] uppercase tracking-wider">Bulanan</span>
          </button>
          <button
            onClick={() => setView('logs')}
            className={`py-3 rounded-[20px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${view === 'logs' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <FileText size={18} />
            <span className="text-[9px] uppercase tracking-wider">Laporan</span>
          </button>
          <button
            onClick={() => setView('settings')}
            className={`py-3 rounded-[20px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${view === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Settings size={18} />
            <span className="text-[9px] uppercase tracking-wider">Setting</span>
          </button>
        </div>

        {/* --- SETTINGS / BO VIEW --- */}
        {view === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Rename User Section */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 flex items-center gap-2 mb-4">
                <UserCircle2 size={18} className="text-indigo-600" />
                Ubah Nama Profil
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={`Nama Baru (Ganti ${activeUser})`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleRenameUser}
                  disabled={!editName.trim()}
                  className="bg-indigo-600 text-white px-5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <Save size={18} />
                </button>
              </div>
            </div>

            {/* Add / Edit Task Section */}
            <div className={`rounded-[26px] p-6 border shadow-sm transition-colors ${editingTask ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
              <h3 className={`font-black flex items-center gap-2 mb-4 ${editingTask ? 'text-amber-700' : 'text-slate-800'}`}>
                {editingTask ? <Pencil size={18} /> : <PlusCircle size={18} className="text-indigo-600" />}
                {editingTask ? 'Edit Checklist' : 'Tambah Checklist Baru'}
              </h3>

              <div className="space-y-4">
                {/* Visual Icon Picker */}
                <div>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_LIST.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setNewTaskIcon(emoji)}
                        className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl border-2 transition-all ${newTaskIcon === emoji ? 'border-indigo-500 bg-white scale-110 shadow-sm' : 'border-transparent bg-slate-100 hover:bg-slate-200'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200/50">
                  <div className="w-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                    {newTaskIcon}
                  </div>
                  <input
                    type="text"
                    value={newTaskLabel}
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    placeholder="Nama Aktivitas"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  >
                    <option value="weekly">Target Mingguan</option>
                    <option value="monthly">Target Bulanan</option>
                  </select>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 w-32 shadow-sm">
                    <span className="text-xs font-bold text-slate-400">Target:</span>
                    <input
                      type="number"
                      min="1"
                      value={newTaskTarget}
                      onChange={(e) => setNewTaskTarget(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold focus:outline-none text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  {editingTask && (
                    <button
                      onClick={cancelEdit}
                      className="py-3 px-4 bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center justify-center hover:bg-slate-300 transition-colors"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    onClick={handleSaveTask}
                    disabled={!newTaskLabel.trim()}
                    className={`flex-1 py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all ${editingTask ? 'bg-amber-500 shadow-amber-200' : 'bg-indigo-600 shadow-indigo-200'}`}
                  >
                    {editingTask ? <><Save size={18} /> Simpan Perubahan</> : <><PlusCircle size={18} /> Tambahkan ke List</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Manage Existing Tasks */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 mb-4 text-sm">Kelola Tugas Mingguan</h3>
              <div className="space-y-2 mb-6">
                {globalData[activeUser]?.weekly?.map(task => (
                  <div key={task.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-xl">{task.icon}</span>
                      <span className="text-sm font-bold text-slate-700 truncate">{task.label} (x{task.target})</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEditTask('weekly', task)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteTask('weekly', task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="font-black text-slate-800 mb-4 text-sm">Kelola Tugas Bulanan</h3>
              <div className="space-y-2">
                {globalData[activeUser]?.monthly?.map(task => (
                  <div key={task.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-xl">{task.icon}</span>
                      <span className="text-sm font-bold text-slate-700 truncate">{task.label} (x{task.target})</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEditTask('monthly', task)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteTask('monthly', task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- LOGS / REPORTS VIEW --- */}
        {view === 'logs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Generate Reports Section */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 flex items-center gap-2 mb-2">
                <FileText size={18} className="text-amber-500" />
                Buat Laporan & Reset
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Sistem <strong>otomatis reset</strong> tiap hari Senin & Tanggal 1. Jika butuh reset manual, gunakan tombol di bawah.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleManualReset('weekly')}
                  className="py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <RotateCcw size={18} /> Manual Mingguan
                </button>
                <button
                  onClick={() => handleManualReset('monthly')}
                  className="py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <RotateCcw size={18} /> Manual Bulanan
                </button>
              </div>
            </div>

            {/* History Feed & Tables */}
            <div className="bg-white rounded-[26px] p-4 border border-slate-100 shadow-sm relative">

              {/* Report Tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${reportTab === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setReportTab('table')}
                >
                  <TableProperties size={16} /> Tabel Rekap
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${reportTab === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setReportTab('history')}
                >
                  <Activity size={16} /> Log Sistem
                </button>
              </div>

              {/* TABLE VIEW */}
              {reportTab === 'table' && (
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-left text-sm border-collapse min-w-[300px]">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-2">Tanggal</th>
                        <th className="py-3 px-2">Periode</th>
                        <th className="py-3 px-2">{userKeys[0]}</th>
                        <th className="py-3 px-2">{userKeys[1] || 'Partner'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportLogs.length > 0 ? reportLogs.map(log => (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-2 font-medium text-slate-700">
                            {formatDateShort(log.date)}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${log.reportData?.period === 'weekly' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {log.reportData?.period === 'weekly' ? 'Mingguan' : 'Bulanan'}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-black text-indigo-600">
                            {log.reportData?.scores?.[userKeys[0]] ?? 0}%
                          </td>
                          <td className="py-3 px-2 font-black text-pink-600">
                            {log.reportData?.scores?.[userKeys[1]] ?? 0}%
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-400 text-xs italic">Belum ada laporan yang di-generate.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SYSTEM LOGS VIEW */}
              {reportTab === 'history' && (
                <div className="space-y-6 pl-2 border-l-2 border-slate-100 mt-4 px-2">
                  {systemLogs.length > 0 ? (
                    systemLogs.map(log => (
                      <div key={log.id} className="relative pl-4">
                        <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-white bg-indigo-400"></div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 mb-1">{formatDate(log.date)}</span>
                          <div className="p-3 rounded-xl text-sm bg-slate-50 text-slate-700">
                            {log.message}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Belum ada aktivitas sistem yang dicatat.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TRACKER VIEW --- */}
        {(view === 'weekly' || view === 'monthly') && (
          <>
            {/* ✨ AI Helper for Monthly Content */}
            {view === 'monthly' && (
              <button
                onClick={() => getAiInsight('content')}
                className="w-full mb-8 py-4 px-6 bg-gradient-to-r from-white to-indigo-50 border border-indigo-100 rounded-[22px] flex items-center justify-between text-indigo-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <Lightbulb size={20} className="text-indigo-600" />
                  </div>
                  <span className="font-bold text-sm">✨ Butuh Ide Konten?</span>
                </div>
                <ChevronRight size={18} className="text-indigo-300 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {/* Checklist Section */}
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-indigo-600" />
                  List Aktivitas ({activeTasks.length})
                </h3>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full tracking-tighter">CLOUD SYNC ACTIVE</span>
              </div>

              {activeTasks.length === 0 && (
                <div className="text-center py-10 bg-white rounded-[26px] border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold text-sm">Belum ada tugas.</p>
                  <p className="text-slate-400 text-xs mt-1">Buka tab ⚙️ Setting untuk menambahkan.</p>
                </div>
              )}

              {activeTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-[26px] p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:bg-indigo-50 transition-colors">
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-sm leading-tight pr-2 mb-1">{task.label}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 ${task.current >= task.target ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-indigo-500'}`}
                            style={{ width: `${(task.current / task.target) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black text-slate-400 tabular-nums">
                          {String(task.current)}/{String(task.target)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => updateProgress(activeUser, view, task.id, -1)}
                      disabled={task.current === 0}
                      className="w-16 h-12 rounded-[18px] bg-slate-50 text-slate-400 font-black flex items-center justify-center border border-slate-100 active:bg-slate-200 transition-all disabled:opacity-20"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateProgress(activeUser, view, task.id, 1)}
                      disabled={task.current >= task.target}
                      className={`flex-1 h-12 rounded-[18px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${task.current >= task.target ? 'bg-green-50 text-green-600 border border-green-100 cursor-default shadow-none' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}
                    >
                      {task.current >= task.target ? "🚀 SELESAI" : "+ Progress"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer Info */}
        <div className="mt-12 mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <UserCircle2 size={14} /> Shared Accountability App
          </div>
          <p className="text-slate-400 text-[11px] max-w-[220px] mx-auto italic font-medium leading-relaxed">
            Dashboard ini tersinkronisasi otomatis. Perubahan yang Anda buat akan terlihat oleh pasangan secara real-time.
          </p>
        </div>
      </main>

      {/* ✨ Modern AI Modal ✨ */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white flex justify-between items-center relative">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Sparkles size={20} className="text-yellow-300" />
                </div>
                <h3 className="font-black text-lg tracking-tight">AI Companion</h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-10">
              {isAiLoading ? (
                <div className="flex flex-col items-center py-10">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25"></div>
                    <Loader2 className="animate-spin text-indigo-600 relative z-10" size={50} />
                  </div>
                  <p className="text-slate-500 font-bold animate-pulse text-sm">Gemini sedang berpikir...</p>
                </div>
              ) : (
                <>
                  <div className="bg-indigo-50/50 rounded-3xl p-6 mb-8 border border-indigo-100 text-slate-700 leading-relaxed font-medium italic relative">
                    <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase">Respon AI</div>
                    {String(aiResponse)}
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => playTts(aiResponse)}
                      disabled={isSpeaking}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {isSpeaking ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} />}
                      Dengarkan Suara
                    </button>
                    <button
                      onClick={() => setIsAiModalOpen(false)}
                      className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmAction.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Trash2 size={28} />
            </div>
            <h3 className="font-black text-xl text-slate-800 mb-2">Konfirmasi</h3>
            <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction({ isOpen: false, message: '', action: null })}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action) confirmAction.action();
                  setConfirmAction({ isOpen: false, message: '', action: null });
                }}
                className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-colors active:scale-95"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;