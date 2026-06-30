// js/state.js
// Core application state extracted as part of architecture refactor (Option A)
// This centralizes globals to make the app more maintainable and testable.

let currentUser = null;
let workoutLogs = [];

let currentWorkout = null;           // { date: 'YYYY-MM-DD', exercises: [{name, sets: [{weight, reps, notes, volume, id?, _clientLogId? }]}] }
let workoutHistory = [];             // Array of finished workouts

// History view/edit mode state (completely separate from active new-training currentWorkout)
let currentViewingHistory = null;        // cloned workout being viewed/edited in modal
let currentViewingHistoryIndex = -1;   // index in workoutHistory at time of opening
let historyEditOriginalSnapshot = null; // deep clone at open — used to skip no-op saves

let isInFullScreenTraining = false;
let immersivePanelOriginalParent = null;

// For workout sets / presets
let workoutSets = [];
let workoutSetsCache = null;
let lastWorkoutSetName = null;

// Library and custom data
let exerciseLibrary = [];
let routines = [];
let lastPerformed = {};
let lastBodyWeightKg = null;   // 最近一次記錄嘅體重 (kg)，用於自重動作預填

// Sync state
let activeBackgroundSyncs = 0;
let isFinishingWorkout = false;
let lastFinishClick = 0;
let globalPendingSyncs = 0;
let lastGlobalSyncOutcome = 'synced';
let lastSyncError = null;
let pendingWorkoutSyncQueue = []; // { sessionId, workout, notes } — 完成訓練同步失敗時待重試
let retryGlobalSyncInFlight = false;
let cloudLogsReady = false; // getLogs + workoutHistory 重建已完成
let isSavingHistory = false;
let isDeletingHistory = false;
let sessionCloudDeletedIds = new Set(); // 本 session 已背景 deleteLog 的 id，避免 finish 重複刪

// Other UI state
let isInitializing = true;
let originalLogContent = null;

// Calendar state
let currentCalendarYear = null;
let currentCalendarMonth = null;

// Library modal state
let currentLibraryFilter = null;

// Workout set editing state
let currentEditingSet = null;
let editingSetExercises = [];

// Immersive mode collapse state
let _immersiveTopCollapsed = false;

// Analysis UI state (charts + time range filter) - moved here as part of A refactor
let analysisTimeRange = 'all'; // 'all' | '12w' | '30d'
let analysisExerciseFilter = 'all'; // ANALYSIS_EXERCISE_FILTERS key
let analysisChart1RM = null;
let analysisChartVolume = null;
let bodyPartChart = null;
let weeklyVolumeChart = null;

// Hold / isometric timer state (new rules: time x sets for static holds, keep counting on screen off, disable auto sleep)
let activeHoldTimer = null; // { exIdx, targetSeconds, startTimestamp, intervalId, wakeLock }
let holdTimerSettings = {
    keepCountingOnScreenOff: true,
    disableAutoSleep: true
};

// Add any other top-level state vars here as we extract more modules.