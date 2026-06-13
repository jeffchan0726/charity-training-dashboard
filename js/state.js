// js/state.js
// Core application state extracted as part of architecture refactor (Option A)
// This centralizes globals to make the app more maintainable and testable.

let currentUser = null;
let workoutLogs = [];

let currentWorkout = null;           // { date: 'YYYY-MM-DD', exercises: [{name, sets: [{weight, reps, notes, volume, id?, _clientLogId? }]}] }
let workoutHistory = [];             // Array of finished workouts

// History view/edit mode state (completely separate from active new-training currentWorkout)
let currentViewingHistoryIndex = -1;   // index in workoutHistory at time of opening

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

// Sync state
let activeBackgroundSyncs = 0;
let isFinishingWorkout = false;
let lastFinishClick = 0;
let globalPendingSyncs = 0;
let lastSyncError = null;

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
let analysisChart1RM = null;
let analysisChartVolume = null;
let bodyPartChart = null;
let weeklyVolumeChart = null;

// Add any other top-level state vars here as we extract more modules.